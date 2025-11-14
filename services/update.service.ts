/**
 * 应用更新服务
 * 使用 Expo Updates 实现 OTA 更新
 */

import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

export interface UpdateInfo {
  isAvailable: boolean;
  isDownloaded: boolean;
  manifest?: Updates.Manifest;
  error?: Error;
}

class UpdateService {
  private isChecking = false;
  private lastCheckTime: number = 0;
  private checkInterval = 5 * 60 * 1000; // 5 分钟

  /**
   * 检查是否有可用更新
   */
  async checkForUpdate(): Promise<UpdateInfo> {
    // 防止频繁检查
    const now = Date.now();
    if (this.isChecking || (now - this.lastCheckTime < this.checkInterval)) {
      return {
        isAvailable: false,
        isDownloaded: false,
      };
    }

    this.isChecking = true;
    this.lastCheckTime = now;

    try {
      // 只在生产环境检查更新（开发环境使用开发服务器）
      if (__DEV__) {
        console.log('[UpdateService] 开发环境，跳过更新检查');
        return {
          isAvailable: false,
          isDownloaded: false,
        };
      }

      console.log('[UpdateService] 开始检查更新...');
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        console.log('[UpdateService] 发现新版本，开始下载...');
        await Updates.fetchUpdateAsync();
        console.log('[UpdateService] 更新下载完成');
      } else {
        console.log('[UpdateService] 当前已是最新版本');
      }

      return {
        isAvailable: update.isAvailable,
        isDownloaded: update.isAvailable,
        manifest: update.manifest,
      };
    } catch (error) {
      console.error('[UpdateService] 检查更新失败:', error);
      
      // 提取更详细的错误信息
      let errorMessage = '检查更新失败';
      if (error instanceof Error) {
        errorMessage = error.message;
        // 检查是否是 channel 相关的错误
        if (errorMessage.includes('channel-name') || errorMessage.includes('channel')) {
          errorMessage = '更新检查失败：缺少 channel 配置。请确保 APK 是在构建时指定了 channel 的版本。';
        }
      }
      
      return {
        isAvailable: false,
        isDownloaded: false,
        error: error instanceof Error ? new Error(errorMessage) : new Error(String(error)),
      };
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 应用更新（重启应用）
   */
  async reloadAsync(): Promise<void> {
    try {
      console.log('[UpdateService] 重启应用以应用更新...');
      await Updates.reloadAsync();
    } catch (error) {
      console.error('[UpdateService] 重启应用失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前更新信息
   */
  getUpdateInfo(): {
    updateId: string | null;
    createdAt: Date | null;
    runtimeVersion: string | null;
    channel: string | null;
  } {
    return {
      updateId: Updates.updateId || null,
      createdAt: Updates.createdAt ? new Date(Updates.createdAt) : null,
      runtimeVersion: Updates.runtimeVersion || null,
      channel: Updates.channel || null,
    };
  }

  /**
   * 检查是否支持更新
   */
  isEnabled(): boolean {
    return Updates.isEnabled;
  }

  /**
   * 检查是否在开发环境
   */
  isDevelopmentBuild(): boolean {
    return Updates.isEmbeddedLaunch;
  }
}

export const updateService = new UpdateService();

