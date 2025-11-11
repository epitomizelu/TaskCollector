/**
 * 应用更新服务（方案二：手动更新）
 * 支持检查更新、下载 APK、安装更新
 */

// ✅ 从 legacy 导入以兼容新版本 expo-file-system
import * as FileSystem from 'expo-file-system/legacy';
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

// ✅ 使用 ReturnType 推断下载任务的类型
type FileSystemDownloadResumable = ReturnType<typeof FileSystem.createDownloadResumable>;

class AppUpdateService {
  private currentVersion: string;
  private currentVersionCode: number;
  private downloadTask: FileSystemDownloadResumable | null = null;

  constructor() {
    // 优先使用原生版本号（实际安装的版本）
    // Constants.nativeAppVersion: 实际安装的应用版本（如 "1.0.0"）
    // Constants.nativeBuildVersion: 实际安装的构建版本（如 "1"）
    // 如果原生版本不可用（Web 平台或开发环境），则使用 expoConfig 中的值
    const nativeVersion = Constants.nativeAppVersion;
    const nativeBuildVersion = Constants.nativeBuildVersion;
    
    // 详细的类型检查
    const nativeBuildVersionType = typeof nativeBuildVersion;
    const nativeBuildVersionValue = nativeBuildVersion;
    const nativeBuildVersionParsed = nativeBuildVersion 
      ? (nativeBuildVersionType === 'number' 
          ? nativeBuildVersion 
          : parseInt(String(nativeBuildVersion), 10))
      : null;
    
    // 读取 expoConfig 中的版本号
    const expoConfigVersion = Constants.expoConfig?.version;
    let expoConfigVersionCode = Constants.expoConfig?.android?.versionCode;
    
    // Web 端特殊处理：Expo Web 在开发模式下可能不会读取 android.versionCode
    // 尝试从 manifest 或其他来源读取
    if (Platform.OS === 'web' && !expoConfigVersionCode) {
      // 方法1：尝试从 manifest 读取（如果可用）
      if (Constants.manifest?.android?.versionCode) {
        expoConfigVersionCode = Constants.manifest.android.versionCode;
        console.log('[AppUpdateService] 从 manifest 读取 versionCode:', expoConfigVersionCode);
      }
      // 方法2：尝试从 manifest2 读取（Expo SDK 49+）
      else if (Constants.manifest2?.extra?.expoClient?.android?.versionCode) {
        expoConfigVersionCode = Constants.manifest2.extra.expoClient.android.versionCode;
        console.log('[AppUpdateService] 从 manifest2 读取 versionCode:', expoConfigVersionCode);
      }
      // 方法3：尝试从环境变量读取（如果设置了）
      else if (process.env.EXPO_PUBLIC_VERSION_CODE) {
        expoConfigVersionCode = parseInt(process.env.EXPO_PUBLIC_VERSION_CODE, 10);
        console.log('[AppUpdateService] 从环境变量读取 versionCode:', expoConfigVersionCode);
      }
      // 方法4：如果都不可用，使用默认值 2（因为 app.json 中已经是 2）
      else {
        console.warn('[AppUpdateService] Web 端无法读取 versionCode，使用默认值 2（app.json 中的值）');
        expoConfigVersionCode = 2; // 使用 app.json 中的值
      }
    }
    
    let finalVersionCode = nativeBuildVersionParsed 
      ? nativeBuildVersionParsed 
      : (expoConfigVersionCode || 1);
    
    // Web 端额外检查：如果最终版本号是 1，但应该是 2，强制使用 2
    if (Platform.OS === 'web' && finalVersionCode === 1) {
      console.warn('[AppUpdateService] Web 端检测到 versionCode 为 1，但 app.json 中应该是 2，强制使用 2');
      finalVersionCode = 2;
    }
    
    this.currentVersion = nativeVersion || expoConfigVersion || '1.0.0';
    this.currentVersionCode = finalVersionCode;
    
    console.log('[AppUpdateService] 初始化版本信息:', {
      version: this.currentVersion,
      versionCode: this.currentVersionCode,
      platform: Platform.OS,
      isDev: __DEV__,
      // 原生版本信息
      nativeVersion,
      nativeBuildVersion: {
        raw: nativeBuildVersionValue,
        type: nativeBuildVersionType,
        parsed: nativeBuildVersionParsed,
        isTruthy: !!nativeBuildVersion,
        isNumber: nativeBuildVersionType === 'number',
        isString: nativeBuildVersionType === 'string',
      },
      // expoConfig 版本信息
      expoConfigVersion: Constants.expoConfig?.version,
      expoConfigVersionCode: Constants.expoConfig?.android?.versionCode,
      // 环境变量版本号（Web 端备用）
      envVersionCode: process.env.EXPO_PUBLIC_VERSION_CODE,
      // 最终使用的版本号来源
      versionSource: nativeVersion ? 'native' : 'expoConfig',
      versionCodeSource: nativeBuildVersionParsed ? 'native' : 'expoConfig',
      // 完整的 Constants 对象（用于调试）
      constantsDebug: {
        nativeAppVersion: Constants.nativeAppVersion,
        nativeBuildVersion: Constants.nativeBuildVersion,
        expoConfig: {
          version: Constants.expoConfig?.version,
          androidVersionCode: Constants.expoConfig?.android?.versionCode,
        },
        // 检查 Constants 的所有属性
        allKeys: Object.keys(Constants),
      },
    });
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

      // 客户端二次校验：如果服务器返回有更新，但版本号相同或更小，则标记为无更新
      if (updateInfo.hasUpdate) {
        if (updateInfo.latestVersionCode <= this.currentVersionCode) {
          console.warn('[AppUpdateService] 服务器返回有更新，但版本号未增加，忽略更新', {
            currentVersionCode: this.currentVersionCode,
            latestVersionCode: updateInfo.latestVersionCode,
          });
          return {
            ...updateInfo,
            hasUpdate: false,
          };
        }
      }

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
    try {
      // 验证 URL
      if (!downloadUrl || !downloadUrl.startsWith('http')) {
        throw new Error(`无效的下载 URL: ${downloadUrl}`);
      }

      console.log('[AppUpdateService] 开始下载 APK:', {
        url: downloadUrl,
        platform: Platform.OS,
      });

      // 使用应用私有目录存储 APK
      const fileName = `app-update-${Date.now()}.apk`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      console.log('[AppUpdateService] 文件保存路径:', fileUri);

      // 检查目录是否存在
      const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory || '');
      if (!dirInfo.exists) {
        throw new Error('文档目录不存在');
      }

      // 创建下载任务
      this.downloadTask = FileSystem.createDownloadResumable(
        downloadUrl,
        fileUri,
        {},
        (downloadProgress) => {
          const totalBytes = downloadProgress.totalBytesExpectedToWrite || 0;
          const writtenBytes = downloadProgress.totalBytesWritten || 0;
          const progress = totalBytes > 0 ? writtenBytes / totalBytes : 0;
          
          if (onProgress) {
            onProgress({
              totalBytesWritten: writtenBytes,
              totalBytesExpectedToWrite: totalBytes,
              progress: isNaN(progress) ? 0 : Math.min(progress, 1),
            });
          }
        }
      );

      // 开始下载
      console.log('[AppUpdateService] 启动下载任务...');
      const result = await this.downloadTask.downloadAsync();

      if (!result) {
        throw new Error('下载失败：未返回结果');
      }

      // 验证下载的文件
      const fileInfo = await FileSystem.getInfoAsync(result.uri);
      if (!fileInfo.exists) {
        throw new Error('下载的文件不存在');
      }

      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
      if (fileSize === 0) {
        throw new Error('下载的文件大小为 0');
      }

      console.log('[AppUpdateService] 下载完成:', {
        uri: result.uri,
        size: this.formatFileSize(fileSize),
      });

      return result.uri;
    } catch (error: any) {
      console.error('[AppUpdateService] 下载失败:', {
        error: error.message,
        stack: error.stack,
        url: downloadUrl,
      });
      
      // 提供更详细的错误信息
      if (error.message?.includes('Network')) {
        throw new Error(`网络错误：无法连接到服务器。请检查网络连接。\n${error.message}`);
      } else if (error.message?.includes('timeout')) {
        throw new Error(`下载超时：请检查网络连接或稍后重试。\n${error.message}`);
      } else if (error.message?.includes('permission')) {
        throw new Error(`权限错误：应用没有下载文件的权限。请检查应用权限设置。\n${error.message}`);
      } else {
        throw new Error(`下载失败：${error.message || '未知错误'}`);
      }
    }
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

      // 验证文件是否存在
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error(`APK 文件不存在: ${fileUri}`);
      }

      const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
      if (fileSize === 0) {
        throw new Error('APK 文件大小为 0');
      }

      console.log('[AppUpdateService] APK 文件验证通过:', {
        uri: fileUri,
        size: this.formatFileSize(fileSize),
      });

      // 使用 IntentLauncher 调用系统安装器
      // 对于 Android 8.0+，需要使用 FileProvider 或直接使用 file:// URI
      try {
        const contentUri = await FileSystem.getContentUriAsync(fileUri);
        console.log('[AppUpdateService] 获取 Content URI:', contentUri);
        
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1, // FLAG_ACTIVITY_NEW_TASK
          type: 'application/vnd.android.package-archive',
        });

        console.log('[AppUpdateService] 安装器已启动（使用 Content URI）');
        return;
      } catch (contentUriError: any) {
        console.warn('[AppUpdateService] 使用 Content URI 失败，尝试其他方法:', contentUriError.message);
        
        // 如果 getContentUriAsync 失败，尝试直接使用 file:// URI
        try {
          // 对于 Android 7.0 以下，可以直接使用 file:// URI
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: fileUri,
            flags: 1,
            type: 'application/vnd.android.package-archive',
          });
          
          console.log('[AppUpdateService] 安装器已启动（使用 file:// URI）');
          return;
        } catch (fileUriError: any) {
          console.warn('[AppUpdateService] 使用 file:// URI 失败，尝试 Sharing API:', fileUriError.message);
          
          // 最后尝试使用 Sharing API
          try {
            const canShare = await Sharing.isAvailableAsync();
            if (!canShare) {
              throw new Error('Sharing API 不可用');
            }
            
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/vnd.android.package-archive',
              dialogTitle: '安装应用',
            });
            console.log('[AppUpdateService] 使用 Sharing API 启动安装');
            return;
          } catch (shareError: any) {
            console.error('[AppUpdateService] Sharing API 失败:', shareError);
            throw new Error(`所有安装方法都失败。\n1. Content URI: ${contentUriError.message}\n2. File URI: ${fileUriError.message}\n3. Sharing API: ${shareError.message}`);
          }
        }
      }
    } catch (error: any) {
      console.error('[AppUpdateService] 安装失败:', {
        error: error.message,
        stack: error.stack,
        fileUri,
      });
      
      // 提供更详细的错误信息
      if (error.message?.includes('权限') || error.message?.includes('permission')) {
        throw new Error(`权限错误：应用没有安装 APK 的权限。\n请在设置中允许"安装未知来源应用"的权限。\n${error.message}`);
      } else if (error.message?.includes('文件不存在')) {
        throw new Error(`文件错误：APK 文件不存在或已删除。\n${error.message}`);
      } else {
        throw new Error(`无法启动安装程序：${error.message || '未知错误'}\n\n请确保：\n1. 已允许"安装未知来源应用"权限\n2. APK 文件完整且未损坏\n3. 设备存储空间充足`);
      }
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

