/**
 * JS Bundle 更新服务
 * 用于检测、下载和应用 JS Bundle 更新（简易版 OTA）
 * 
 * 注意：此服务独立于 EAS Updates，不影响现有的 EAS 更新流程
 */

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiService } from './api.service';

export interface JSBundleUpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  latestVersionCode: number;
  downloadUrl: string | null;
  filePath: string | null;
  fileSize: number;
  releaseDate: string | null;
}

export interface DownloadProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
  progress: number; // 0-1
}

class JSBundleUpdateService {
  private currentVersion: string;
  private currentVersionCode: number;
  private downloadTask: FileSystem.FileSystemDownloadResumable | null = null;

  constructor() {
    // 获取当前版本信息
    const nativeVersion = Constants.nativeAppVersion;
    const nativeBuildVersion = Constants.nativeBuildVersion;
    
    const nativeBuildVersionParsed = nativeBuildVersion 
      ? (typeof nativeBuildVersion === 'number' 
          ? nativeBuildVersion 
          : parseInt(String(nativeBuildVersion), 10))
      : null;
    
    const expoConfigVersion = Constants.expoConfig?.version;
    const expoConfigVersionCode = Constants.expoConfig?.android?.versionCode;
    
    this.currentVersion = nativeVersion || expoConfigVersion || '1.0.0';
    this.currentVersionCode = nativeBuildVersionParsed || expoConfigVersionCode || 1;
  }

  /**
   * 检查是否有 JS Bundle 更新
   */
  async checkForUpdate(): Promise<JSBundleUpdateInfo> {
    try {
      console.log('[JSBundleUpdateService] 检查更新...', {
        currentVersion: this.currentVersion,
        currentVersionCode: this.currentVersionCode,
      });

      // 调用云函数接口检查更新
      const { API_CONFIG, getHeaders } = await import('../config/api.config');
      const response = await fetch(
        `${API_CONFIG.BASE_URL}/app/check-js-bundle-update?currentVersion=${encodeURIComponent(this.currentVersion)}&versionCode=${this.currentVersionCode}&platform=${Platform.OS}`,
        {
          method: 'GET',
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.code !== 0) {
        throw new Error(result.message || '检查更新失败');
      }

      const updateInfo: JSBundleUpdateInfo = result.data;

      console.log('[JSBundleUpdateService] 更新检查结果:', updateInfo);

      // 客户端二次校验：如果服务器返回有更新，但版本号相同或更小，则标记为无更新
      if (updateInfo.hasUpdate) {
        if (updateInfo.latestVersionCode <= this.currentVersionCode) {
          console.warn('[JSBundleUpdateService] 服务器返回有更新，但版本号未增加，忽略更新', {
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
      console.error('[JSBundleUpdateService] 检查更新失败:', error);
      throw error;
    }
  }

  /**
   * 下载 JS Bundle
   */
  async downloadBundle(
    downloadUrl: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    try {
      if (!downloadUrl) {
        throw new Error('下载地址为空');
      }

      console.log('[JSBundleUpdateService] 开始下载 Bundle...', { downloadUrl });

      // 创建下载目录
      const bundleDir = `${FileSystem.documentDirectory}js-bundles/`;
      const bundlePath = `${bundleDir}index.android.bundle`;

      // 确保目录存在
      const dirInfo = await FileSystem.getInfoAsync(bundleDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(bundleDir, { intermediates: true });
      }

      // 创建下载任务
      this.downloadTask = FileSystem.createDownloadResumable(
        downloadUrl,
        bundlePath,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesExpectedToWrite > 0
            ? downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
            : 0;

          if (onProgress) {
            onProgress({
              totalBytesWritten: downloadProgress.totalBytesWritten,
              totalBytesExpectedToWrite: downloadProgress.totalBytesExpectedToWrite,
              progress: progress,
            });
          }

          console.log('[JSBundleUpdateService] 下载进度:', {
            progress: `${(progress * 100).toFixed(1)}%`,
            downloaded: `${(downloadProgress.totalBytesWritten / 1024 / 1024).toFixed(2)} MB`,
            total: downloadProgress.totalBytesExpectedToWrite > 0
              ? `${(downloadProgress.totalBytesExpectedToWrite / 1024 / 1024).toFixed(2)} MB`
              : '未知',
          });
        }
      );

      // 开始下载
      const result = await this.downloadTask.downloadAsync();

      if (!result) {
        throw new Error('下载失败：未返回结果');
      }

      console.log('[JSBundleUpdateService] Bundle 下载完成:', result.uri);

      return result.uri;
    } catch (error) {
      console.error('[JSBundleUpdateService] 下载失败:', error);
      throw error;
    }
  }

  /**
   * 取消下载
   */
  async cancelDownload(): Promise<void> {
    if (this.downloadTask) {
      try {
        await this.downloadTask.pauseAsync();
        this.downloadTask = null;
        console.log('[JSBundleUpdateService] 下载已取消');
      } catch (error) {
        console.error('[JSBundleUpdateService] 取消下载失败:', error);
      }
    }
  }

  /**
   * 应用更新（替换本地 bundle）
   * 
   * 注意：在 Expo 中，直接替换 bundle 文件可能比较复杂
   * 这里提供一个基础实现，实际使用时可能需要根据具体需求调整
   */
  async applyUpdate(bundlePath: string): Promise<void> {
    try {
      console.log('[JSBundleUpdateService] 应用更新...', { bundlePath });

      // 在 Expo 中，应用 bundle 更新通常需要重启应用
      // 这里我们保存 bundle 路径，应用重启后可以加载新的 bundle
      
      // 保存更新信息到本地存储
      const updateInfoPath = `${FileSystem.documentDirectory}js-bundle-update-info.json`;
      const updateInfo = {
        bundlePath: bundlePath,
        version: this.currentVersion,
        versionCode: this.currentVersionCode,
        appliedAt: new Date().toISOString(),
      };

      await FileSystem.writeAsStringAsync(
        updateInfoPath,
        JSON.stringify(updateInfo, null, 2)
      );

      console.log('[JSBundleUpdateService] 更新信息已保存，需要重启应用以应用更新');

      // 注意：在 Expo 中，直接替换 bundle 可能需要使用原生代码
      // 或者使用 expo-updates 的机制（但这里我们要独立于 EAS Updates）
      // 这里只保存更新信息，实际应用更新需要重启应用
    } catch (error) {
      console.error('[JSBundleUpdateService] 应用更新失败:', error);
      throw error;
    }
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
   * 检查是否有已下载的更新
   */
  async checkDownloadedUpdate(): Promise<string | null> {
    try {
      const updateInfoPath = `${FileSystem.documentDirectory}js-bundle-update-info.json`;
      const info = await FileSystem.getInfoAsync(updateInfoPath);

      if (!info.exists) {
        return null;
      }

      const updateInfoStr = await FileSystem.readAsStringAsync(updateInfoPath);
      const updateInfo = JSON.parse(updateInfoStr);

      // 检查 bundle 文件是否存在
      const bundleInfo = await FileSystem.getInfoAsync(updateInfo.bundlePath);
      if (!bundleInfo.exists) {
        return null;
      }

      return updateInfo.bundlePath;
    } catch (error) {
      console.error('[JSBundleUpdateService] 检查已下载更新失败:', error);
      return null;
    }
  }
}

// 导出单例
export const jsBundleUpdateService = new JSBundleUpdateService();

