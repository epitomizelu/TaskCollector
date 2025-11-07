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
  downloadUrl: string;
  forceUpdate: boolean;
  updateLog: string;
  fileSize: number;
  releaseDate: string;
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
   * 下载 APK
   */
  async downloadApk(
    downloadUrl: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    try {
      console.log('[AppUpdateService] 开始下载 APK:', downloadUrl);

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
    } catch (error) {
      console.error('[AppUpdateService] 下载失败:', error);
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
}

export const appUpdateService = new AppUpdateService();

