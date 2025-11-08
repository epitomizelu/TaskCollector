/**
 * 应用更新服务（方案二：手动更新）
 * 支持检查更新、下载 APK、安装更新
 */

import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiService } from './api.service';
import * as Sharing from 'expo-sharing';

export interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  latestVersionCode: number;
  downloadUrl: string; // 腾讯云下载地址（备用）
  easDownloadUrl?: string; // EAS Build 下载地址（优先使用）
  forceUpdate: boolean;
  updateLog: string;
  fileSize: number;
  releaseDate: string;
  // 分片下载相关字段（如果使用分片上传）
  uploadId?: string;
  totalChunks?: number;
  chunkUrls?: string[];
  filePath?: string;
  useChunkedDownload?: boolean; // 是否使用分片下载
}

export interface DownloadProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
  progress: number; // 0-1
}

class AppUpdateService {
  private currentVersion: string;
  private currentVersionCode: number;
  private downloadTask: FileSystem.FileSystemDownloadResumable | null = null;

  constructor() {
    // 从 app.json 获取当前版本信息
    this.currentVersion = Constants.expoConfig?.version || '1.0.0';
    this.currentVersionCode = Constants.expoConfig?.android?.versionCode || 1;
  }

  /**
   * 手动检查更新
   */
  async checkForUpdate(): Promise<UpdateInfo> {
    try {
      console.log('[AppUpdateService] 检查更新...', {
        currentVersion: this.currentVersion,
        currentVersionCode: this.currentVersionCode,
      });

      const updateInfo = await apiService.checkAppUpdate(
        this.currentVersion,
        this.currentVersionCode,
        Platform.OS
      );

      console.log('[AppUpdateService] 更新检查结果:', updateInfo);

      return updateInfo;
    } catch (error) {
      console.error('[AppUpdateService] 检查更新失败:', error);
      throw error;
    }
  }

  /**
   * 下载 APK（支持普通下载和分片下载）
   * 优先从 EAS 下载，失败则从腾讯云下载
   */
  async downloadApk(
    updateInfo: UpdateInfo,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    try {
      // 如果使用分片下载
      if (updateInfo.useChunkedDownload && updateInfo.chunkUrls && updateInfo.chunkUrls.length > 0) {
        console.log('[AppUpdateService] 使用分片下载模式');
        return await this.downloadApkChunks(updateInfo, onProgress);
      }

      // 普通下载模式：优先从 EAS 下载，失败则从腾讯云下载
      if (updateInfo.easDownloadUrl) {
        console.log('[AppUpdateService] 尝试从 EAS 下载:', updateInfo.easDownloadUrl);
        try {
          return await this.downloadApkDirect(updateInfo.easDownloadUrl, onProgress);
        } catch (easError) {
          console.warn('[AppUpdateService] 从 EAS 下载失败，切换到腾讯云下载:', easError.message);
          // 继续尝试从腾讯云下载
        }
      }

      // 从腾讯云下载（备用）
      console.log('[AppUpdateService] 从腾讯云下载:', updateInfo.downloadUrl);
      return await this.downloadApkDirect(updateInfo.downloadUrl, onProgress);
    } catch (error) {
      console.error('[AppUpdateService] 下载失败:', error);
      throw error;
    }
  }

  /**
   * 直接下载 APK（单文件）
   */
  private async downloadApkDirect(
    downloadUrl: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    // 使用应用私有目录存储 APK
    const fileName = `app-update-${Date.now()}.apk`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // 创建下载任务
    this.downloadTask = FileSystem.createDownloadResumable(
      downloadUrl,
      fileUri,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        if (onProgress) {
          onProgress({
            totalBytesWritten: downloadProgress.totalBytesWritten,
            totalBytesExpectedToWrite: downloadProgress.totalBytesExpectedToWrite,
            progress: isNaN(progress) ? 0 : progress,
          });
        }
      }
    );

    // 开始下载
    const result = await this.downloadTask.downloadAsync();

    if (!result) {
      throw new Error('下载失败：未返回结果');
    }

    console.log('[AppUpdateService] 下载完成:', result.uri);
    return result.uri;
  }

  /**
   * 分片下载 APK（下载所有分片并合并）
   */
  private async downloadApkChunks(
    updateInfo: UpdateInfo,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    // 如果没有分片 URL，尝试从服务器获取
    let chunkUrls = updateInfo.chunkUrls;
    if (!chunkUrls || chunkUrls.length === 0) {
      if (updateInfo.uploadId && updateInfo.totalChunks && updateInfo.filePath) {
        console.log('[AppUpdateService] 从服务器获取分片 URL 列表...');
        try {
          const chunkInfo = await apiService.getChunkUrls(
            updateInfo.uploadId,
            updateInfo.totalChunks,
            updateInfo.filePath
          );
          chunkUrls = chunkInfo.chunkUrls;
          console.log(`[AppUpdateService] 成功获取 ${chunkUrls.length} 个分片 URL`);
        } catch (error) {
          console.error('[AppUpdateService] 获取分片 URL 失败:', error);
          throw new Error(`获取分片 URL 失败: ${error}`);
        }
      } else {
        throw new Error('分片 URL 列表为空，且缺少必要的参数（uploadId, totalChunks, filePath）');
      }
    }

    const totalChunks = chunkUrls.length;
    console.log(`[AppUpdateService] 开始分片下载: ${totalChunks} 个分片`);

    // 创建临时目录存储分片
    const tempDir = `${FileSystem.cacheDirectory}chunks_${Date.now()}/`;
    await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

    const chunkFiles: Array<{ index: number; path: string; size: number }> = [];
    const CONCURRENT_DOWNLOADS = 5; // 并发下载数量
    let totalDownloaded = 0;
    const estimatedTotalSize = updateInfo.fileSize || 0;
    const MAX_RETRIES = 3; // 最大重试次数

    try {
      // 下载所有分片（带重试机制）
      for (let i = 0; i < chunkUrls.length; i += CONCURRENT_DOWNLOADS) {
        const batch = chunkUrls.slice(i, i + CONCURRENT_DOWNLOADS);
        const batchIndex = Math.floor(i / CONCURRENT_DOWNLOADS) + 1;
        const totalBatches = Math.ceil(chunkUrls.length / CONCURRENT_DOWNLOADS);

        console.log(`[AppUpdateService] 下载批次 ${batchIndex}/${totalBatches}: 分片 ${i + 1}-${Math.min(i + CONCURRENT_DOWNLOADS, chunkUrls.length)}`);

        const downloadPromises = batch.map(async (url, batchOffset) => {
          const chunkIndex = i + batchOffset;
          const chunkPath = `${tempDir}chunk_${chunkIndex}.tmp`;

          // 重试机制
          let lastError: any = null;
          for (let retry = 0; retry < MAX_RETRIES; retry++) {
            try {
              if (retry > 0) {
                console.log(`[AppUpdateService] 重试下载分片 ${chunkIndex + 1} (第 ${retry + 1}/${MAX_RETRIES} 次)...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retry)); // 递增延迟
              }

              const downloadTask = FileSystem.createDownloadResumable(
                url,
                chunkPath,
                {}
              );

              const result = await downloadTask.downloadAsync();
              if (!result) {
                throw new Error(`分片 ${chunkIndex} 下载失败：未返回结果`);
              }

              // 验证文件是否存在
              const fileInfo = await FileSystem.getInfoAsync(chunkPath);
              if (!fileInfo.exists) {
                throw new Error(`分片 ${chunkIndex} 下载失败：文件不存在`);
              }

              // 获取文件大小
              const chunkSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
              if (chunkSize === 0) {
                throw new Error(`分片 ${chunkIndex} 下载失败：文件大小为 0`);
              }

              totalDownloaded += chunkSize;

              // 更新进度
              if (onProgress && estimatedTotalSize > 0) {
                onProgress({
                  totalBytesWritten: totalDownloaded,
                  totalBytesExpectedToWrite: estimatedTotalSize,
                  progress: Math.min(totalDownloaded / estimatedTotalSize, 0.9), // 下载阶段最多90%
                });
              }

              console.log(`[AppUpdateService] 分片 ${chunkIndex + 1}/${totalChunks} 下载成功: ${this.formatFileSize(chunkSize)}`);
              return { index: chunkIndex, path: chunkPath, size: chunkSize };
            } catch (error) {
              lastError = error;
              console.warn(`[AppUpdateService] 分片 ${chunkIndex + 1} 下载失败 (尝试 ${retry + 1}/${MAX_RETRIES}):`, error);
              
              // 删除可能不完整的文件
              try {
                const fileInfo = await FileSystem.getInfoAsync(chunkPath);
                if (fileInfo.exists) {
                  await FileSystem.deleteAsync(chunkPath, { idempotent: true });
                }
              } catch (deleteError) {
                // 忽略删除错误
              }
            }
          }

          // 所有重试都失败
          throw new Error(`分片 ${chunkIndex + 1} 下载失败（已重试 ${MAX_RETRIES} 次）: ${lastError?.message || '未知错误'}`);
        });

        const batchResults = await Promise.all(downloadPromises);
        chunkFiles.push(...batchResults);
      }

      console.log(`[AppUpdateService] 所有分片下载完成，开始合并...`);

      // 按索引排序
      chunkFiles.sort((a, b) => a.index - b.index);

      // 合并所有分片
      const fileName = `app-update-${Date.now()}.apk`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // 使用二进制方式合并（更高效）
      let mergedSize = 0;
      for (let i = 0; i < chunkFiles.length; i++) {
        const chunkFile = chunkFiles[i];
        console.log(`[AppUpdateService] 合并分片 ${i + 1}/${chunkFiles.length} (索引 ${chunkFile.index})...`);

        // 读取分片数据（使用二进制方式）
        const chunkData = await FileSystem.readAsStringAsync(chunkFile.path, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // 将 Base64 数据追加到文件
        if (i === 0) {
          await FileSystem.writeAsStringAsync(fileUri, chunkData, {
            encoding: FileSystem.EncodingType.Base64,
          });
        } else {
          await FileSystem.writeAsStringAsync(fileUri, chunkData, {
            encoding: FileSystem.EncodingType.Base64,
            append: true,
          });
        }

        mergedSize += chunkFile.size;

        // 更新进度（合并阶段 90%-100%）
        if (onProgress && estimatedTotalSize > 0) {
          const mergeProgress = 0.9 + (i + 1) / chunkFiles.length * 0.1;
          onProgress({
            totalBytesWritten: mergedSize,
            totalBytesExpectedToWrite: estimatedTotalSize,
            progress: Math.min(mergeProgress, 1),
          });
        }
      }

      // 清理临时文件
      console.log(`[AppUpdateService] 清理临时文件...`);
      try {
        await FileSystem.deleteAsync(tempDir, { idempotent: true });
      } catch (cleanupError) {
        console.warn('[AppUpdateService] 清理临时文件失败:', cleanupError);
      }

      console.log(`[AppUpdateService] 合并完成: ${fileUri}`);
      console.log(`[AppUpdateService] 文件大小: ${this.formatFileSize(mergedSize)}`);

      if (onProgress) {
        onProgress({
          totalBytesWritten: mergedSize,
          totalBytesExpectedToWrite: estimatedTotalSize || mergedSize,
          progress: 1,
        });
      }

      return fileUri;
    } catch (error) {
      // 清理临时文件
      try {
        await FileSystem.deleteAsync(tempDir, { idempotent: true });
      } catch (cleanupError) {
        console.warn('[AppUpdateService] 清理临时文件失败:', cleanupError);
      }
      throw error;
    }
  }

  /**
   * 暂停下载
   */
  async pauseDownload(): Promise<void> {
    if (this.downloadTask) {
      try {
        await this.downloadTask.pauseAsync();
        console.log('[AppUpdateService] 下载已暂停');
      } catch (error) {
        console.error('[AppUpdateService] 暂停下载失败:', error);
      }
    }
  }

  /**
   * 恢复下载
   */
  async resumeDownload(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    if (!this.downloadTask) {
      throw new Error('没有正在进行的下载任务');
    }

    try {
      const result = await this.downloadTask.resumeAsync();
      if (!result) {
        throw new Error('恢复下载失败：未返回结果');
      }
      return result.uri;
    } catch (error) {
      console.error('[AppUpdateService] 恢复下载失败:', error);
      throw error;
    }
  }

  /**
   * 安装 APK（Android）
   */
  async installApk(fileUri: string): Promise<void> {
    if (Platform.OS !== 'android') {
      throw new Error('只支持 Android 平台');
    }

    try {
      console.log('[AppUpdateService] 开始安装 APK:', fileUri);

      // 使用 IntentLauncher 调用系统安装器
      // 对于 Android 8.0+，需要使用 FileProvider 或直接使用 file:// URI
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_ACTIVITY_NEW_TASK
        type: 'application/vnd.android.package-archive',
      });

      console.log('[AppUpdateService] 安装器已启动');
    } catch (error: any) {
      // 如果 getContentUriAsync 失败，尝试使用 Sharing API
      if (error.message?.includes('getContentUriAsync')) {
        try {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/vnd.android.package-archive',
              dialogTitle: '安装应用',
            });
            console.log('[AppUpdateService] 使用 Sharing API 启动安装');
            return;
          }
        } catch (shareError) {
          console.error('[AppUpdateService] Sharing API 失败:', shareError);
        }
      }
      
      console.error('[AppUpdateService] 安装失败:', error);
      throw new Error(`无法启动安装程序: ${error.message || '未知错误'}`);
    }
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * 获取当前版本信息
   */
  getCurrentVersion(): { version: string; versionCode: number } {
    return {
      version: this.currentVersion,
      versionCode: this.currentVersionCode,
    };
  }

  /**
   * 完整的更新流程（检查 -> 下载 -> 安装）
   */
  async performUpdate(
    onProgress?: (progress: DownloadProgress) => void,
    onStatusChange?: (status: string) => void
  ): Promise<void> {
    try {
      // 1. 检查更新
      if (onStatusChange) {
        onStatusChange('检查更新中...');
      }
      const updateInfo = await this.checkForUpdate();

      if (!updateInfo.hasUpdate) {
        if (onStatusChange) {
          onStatusChange('已是最新版本');
        }
        return;
      }

      // 2. 下载 APK
      if (onStatusChange) {
        onStatusChange('下载更新中...');
      }
      const apkUri = await this.downloadApk(updateInfo, onProgress);

      // 3. 安装 APK
      if (onStatusChange) {
        onStatusChange('准备安装...');
      }
      await this.installApk(apkUri);

      if (onStatusChange) {
        onStatusChange('安装完成');
      }
    } catch (error) {
      console.error('[AppUpdateService] 更新失败:', error);
      if (onStatusChange) {
        onStatusChange(`更新失败: ${error}`);
      }
      throw error;
    }
  }
}

export const appUpdateService = new AppUpdateService();

