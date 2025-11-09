/**
 * 统一更新服务
 * 同时支持 OTA 更新（只更新 JS）和 APK 更新（完整应用更新）
 * 两种更新方式互不干扰，根据更新类型自动选择
 */

import { updateService, UpdateInfo as OTAUpdateInfo } from './update.service';
import { appUpdateService, UpdateInfo as APKUpdateInfo, DownloadProgress } from './app-update.service';
import Constants from 'expo-constants';

export type UpdateType = 'ota' | 'apk' | 'both' | 'none';

export interface UnifiedUpdateInfo {
  // 更新类型
  updateType: UpdateType;
  
  // OTA 更新信息（如果可用）
  otaUpdate?: {
    isAvailable: boolean;
    isDownloaded: boolean;
    manifest?: any;
    error?: Error;
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
   * 同时检查 OTA 和 APK 更新，返回统一的结果
   */
  async checkForUpdates(): Promise<UnifiedUpdateInfo> {
    const currentVersion = appUpdateService.getCurrentVersion();
    
    try {
      // 并行检查 OTA 和 APK 更新
      const [otaResult, apkResult] = await Promise.allSettled([
        this.checkOTAUpdate(),
        this.checkAPKUpdate(),
      ]);

      const otaUpdate = otaResult.status === 'fulfilled' ? otaResult.value : undefined;
      const apkUpdate = apkResult.status === 'fulfilled' ? apkResult.value : undefined;
      
      // 确定更新类型
      const hasOTA = otaUpdate?.isAvailable || false;
      const hasAPK = apkUpdate?.hasUpdate || false;
      
      let updateType: UpdateType = 'none';
      if (hasOTA && hasAPK) {
        updateType = 'both';
      } else if (hasOTA) {
        updateType = 'ota';
      } else if (hasAPK) {
        updateType = 'apk';
      }

      return {
        updateType,
        otaUpdate,
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
   * 检查 OTA 更新
   */
  private async checkOTAUpdate(): Promise<OTAUpdateInfo> {
    try {
      // 检查是否支持 OTA 更新
      if (!updateService.isEnabled()) {
        console.log('[UnifiedUpdateService] OTA 更新未启用');
        return {
          isAvailable: false,
          isDownloaded: false,
        };
      }

      // 开发环境跳过 OTA 检查
      if (__DEV__) {
        console.log('[UnifiedUpdateService] 开发环境，跳过 OTA 更新检查');
        return {
          isAvailable: false,
          isDownloaded: false,
        };
      }

      return await updateService.checkForUpdate();
    } catch (error) {
      console.error('[UnifiedUpdateService] OTA 更新检查失败:', error);
      return {
        isAvailable: false,
        isDownloaded: false,
        error: error instanceof Error ? error : new Error(String(error)),
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
   * 应用 OTA 更新
   * 下载并重启应用以应用更新
   */
  async applyOTAUpdate(): Promise<void> {
    try {
      // 先检查是否有可用更新
      const otaInfo = await this.checkOTAUpdate();
      
      if (!otaInfo.isAvailable) {
        throw new Error('没有可用的 OTA 更新');
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
      console.error('[UnifiedUpdateService] 应用 OTA 更新失败:', error);
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
   * 获取 OTA 更新信息
   */
  getOTAUpdateInfo(): {
    updateId: string | null;
    createdAt: Date | null;
    runtimeVersion: string | null;
    channel: string | null;
  } {
    return updateService.getUpdateInfo();
  }

  /**
   * 检查是否支持 OTA 更新
   */
  isOTAEnabled(): boolean {
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

