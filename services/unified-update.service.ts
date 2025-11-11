/**
 * 统一更新服务
 * 同时支持三种更新方式：
 * 1. EAS OTA 更新（使用 expo-updates）
 * 2. 自建 JS Bundle OTA 更新（简易版 OTA，仅支持手动更新）
 * 3. APK 更新（完整应用更新）
 * 三种更新方式互不干扰，根据更新类型自动选择
 * 
 * 注意：自建 JS Bundle OTA 更新仅支持手动更新，不会自动检查或下载
 */

import { updateService, UpdateInfo as EASOTAUpdateInfo } from './update.service';
import { jsBundleUpdateService, JSBundleUpdateInfo } from './js-bundle-update.service';
import { appUpdateService, UpdateInfo as APKUpdateInfo, DownloadProgress } from './app-update.service';
import Constants from 'expo-constants';

export type UpdateType = 'eas-ota' | 'js-bundle-ota' | 'apk' | 'both' | 'all' | 'none';

export interface UnifiedUpdateInfo {
  // 更新类型
  updateType: UpdateType;
  
  // EAS OTA 更新信息（如果可用）
  easOtaUpdate?: {
    isAvailable: boolean;
    isDownloaded: boolean;
    manifest?: any;
    error?: Error;
  };
  
  // 自建 JS Bundle OTA 更新信息（如果可用）
  jsBundleOtaUpdate?: {
    hasUpdate: boolean;
    latestVersion: string;
    latestJsVersionCode: number; // ✅ 使用独立的 jsVersionCode
    downloadUrl: string | null;
    filePath: string | null;
    fileSize: number;
    releaseDate: string | null;
  };
  
  // APK 更新信息（如果可用）
  apkUpdate?: {
    hasUpdate: boolean;
    latestVersion: string;
    latestVersionCode: number;
    downloadUrl: string;
    easDownloadUrl?: string;
    forceUpdate: boolean;
    updateLog: string;
    fileSize: number;
    releaseDate: string;
  };
  
  // 当前版本信息
  currentVersion: {
    version: string;
    versionCode: number;
  };
  
  // 错误信息
  error?: string;
}

class UnifiedUpdateService {
  /**
   * 检查所有类型的更新
   * 同时检查 EAS OTA、自建 JS Bundle OTA 和 APK 更新，返回统一的结果
   */
  async checkForUpdates(): Promise<UnifiedUpdateInfo> {
    const currentVersion = appUpdateService.getCurrentVersion();
    
    try {
      // 并行检查所有类型的更新
      const [easOtaResult, jsBundleOtaResult, apkResult] = await Promise.allSettled([
        this.checkEASOTAUpdate(),
        this.checkJSBundleOTAUpdate(),
        this.checkAPKUpdate(),
      ]);

      const easOtaUpdate = easOtaResult.status === 'fulfilled' ? easOtaResult.value : undefined;
      const jsBundleOtaUpdate = jsBundleOtaResult.status === 'fulfilled' ? jsBundleOtaResult.value : undefined;
      const apkUpdate = apkResult.status === 'fulfilled' ? apkResult.value : undefined;
      
      // 确定更新类型
      const hasEASOTA = easOtaUpdate?.isAvailable || false;
      const hasJSBundleOTA = jsBundleOtaUpdate?.hasUpdate || false;
      const hasAPK = apkUpdate?.hasUpdate || false;
      
      let updateType: UpdateType = 'none';
      if (hasEASOTA && hasJSBundleOTA && hasAPK) {
        updateType = 'all';
      } else if ((hasEASOTA && hasJSBundleOTA) || (hasEASOTA && hasAPK) || (hasJSBundleOTA && hasAPK)) {
        updateType = 'both';
      } else if (hasEASOTA) {
        updateType = 'eas-ota';
      } else if (hasJSBundleOTA) {
        updateType = 'js-bundle-ota';
      } else if (hasAPK) {
        updateType = 'apk';
      }

      return {
        updateType,
        easOtaUpdate,
        jsBundleOtaUpdate,
        apkUpdate,
        currentVersion,
      };
    } catch (error) {
      console.error('[UnifiedUpdateService] 检查更新失败:', error);
      return {
        updateType: 'none',
        currentVersion,
        error: error instanceof Error ? error.message : '检查更新失败',
      };
    }
  }

  /**
   * 检查 EAS OTA 更新（使用 expo-updates）
   */
  private async checkEASOTAUpdate(): Promise<EASOTAUpdateInfo> {
    try {
      // 检查是否支持 OTA 更新
      if (!updateService.isEnabled()) {
        console.log('[UnifiedUpdateService] EAS OTA 更新未启用');
        return {
          isAvailable: false,
          isDownloaded: false,
          error: new Error('EAS OTA 更新未启用'),
        };
      }

      // 开发环境：仍然检查，但会返回开发环境提示
      if (__DEV__) {
        console.log('[UnifiedUpdateService] 开发环境，EAS OTA 更新检查受限');
        // 尝试获取当前更新信息（即使不检查新更新）
        const updateInfo = updateService.getUpdateInfo();
        return {
          isAvailable: false,
          isDownloaded: false,
          error: new Error('开发环境不支持 EAS OTA 更新检查，请在生产环境中使用'),
          // 添加开发环境标识，方便 UI 显示
          manifest: updateInfo.updateId ? { updateId: updateInfo.updateId } : undefined,
        };
      }

      return await updateService.checkForUpdate();
    } catch (error) {
      console.error('[UnifiedUpdateService] EAS OTA 更新检查失败:', error);
      return {
        isAvailable: false,
        isDownloaded: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * 检查自建 JS Bundle OTA 更新
   */
  private async checkJSBundleOTAUpdate(): Promise<JSBundleUpdateInfo> {
    try {
      return await jsBundleUpdateService.checkForUpdate();
    } catch (error) {
      console.error('[UnifiedUpdateService] JS Bundle OTA 更新检查失败:', error);
      return {
        hasUpdate: false,
        latestVersion: '',
        latestJsVersionCode: 0, // ✅ 使用 latestJsVersionCode
        downloadUrl: null,
        filePath: null,
        fileSize: 0,
        releaseDate: null,
      };
    }
  }

  /**
   * 检查 APK 更新
   */
  private async checkAPKUpdate(): Promise<APKUpdateInfo> {
    try {
      return await appUpdateService.checkForUpdate();
    } catch (error) {
      console.error('[UnifiedUpdateService] APK 更新检查失败:', error);
      throw error;
    }
  }

  /**
   * 应用 EAS OTA 更新
   * 下载并重启应用以应用更新
   */
  async applyEASOTAUpdate(): Promise<void> {
    try {
      // 先检查是否有可用更新
      const otaInfo = await this.checkEASOTAUpdate();
      
      if (!otaInfo.isAvailable) {
        throw new Error('没有可用的 EAS OTA 更新');
      }

      // 如果更新已下载，直接重启
      if (otaInfo.isDownloaded) {
        await updateService.reloadAsync();
        return;
      }

      // 否则先下载再重启
      // updateService.checkForUpdate() 会自动下载
      await updateService.checkForUpdate();
      await updateService.reloadAsync();
    } catch (error) {
      console.error('[UnifiedUpdateService] 应用 EAS OTA 更新失败:', error);
      throw error;
    }
  }

  /**
   * 下载并应用自建 JS Bundle OTA 更新
   */
  async downloadAndApplyJSBundleOTA(
    onProgress?: (progress: { totalBytesWritten: number; totalBytesExpectedToWrite: number; progress: number }) => void
  ): Promise<void> {
    try {
      const updateInfo = await this.checkJSBundleOTAUpdate();
      
      if (!updateInfo.hasUpdate || !updateInfo.downloadUrl) {
        throw new Error('没有可用的 JS Bundle OTA 更新');
      }

      // 下载 Bundle
      const bundlePath = await jsBundleUpdateService.downloadBundle(
        updateInfo.downloadUrl,
        onProgress
      );

      // ✅ 应用更新，传入最新的 jsVersionCode
      await jsBundleUpdateService.applyUpdate(bundlePath, updateInfo.latestJsVersionCode);
    } catch (error) {
      console.error('[UnifiedUpdateService] 下载并应用 JS Bundle OTA 更新失败:', error);
      throw error;
    }
  }

  /**
   * 下载 APK 更新
   */
  async downloadAPKUpdate(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    try {
      const apkInfo = await this.checkAPKUpdate();
      
      if (!apkInfo.hasUpdate) {
        throw new Error('没有可用的 APK 更新');
      }

      return await appUpdateService.downloadApk(apkInfo, onProgress);
    } catch (error) {
      console.error('[UnifiedUpdateService] 下载 APK 更新失败:', error);
      throw error;
    }
  }

  /**
   * 安装 APK
   */
  async installAPK(fileUri: string): Promise<void> {
    return await appUpdateService.installApk(fileUri);
  }

  /**
   * 获取当前版本信息
   */
  getCurrentVersion(): { version: string; versionCode: number } {
    return appUpdateService.getCurrentVersion();
  }

  /**
   * 获取 EAS OTA 更新信息
   */
  getEASOTAUpdateInfo(): {
    updateId: string | null;
    createdAt: Date | null;
    runtimeVersion: string | null;
    channel: string | null;
  } {
    return updateService.getUpdateInfo();
  }

  /**
   * 检查是否支持 EAS OTA 更新
   */
  isEASOTAEnabled(): boolean {
    return updateService.isEnabled();
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    return appUpdateService.formatFileSize(bytes);
  }
}

export const unifiedUpdateService = new UnifiedUpdateService();

