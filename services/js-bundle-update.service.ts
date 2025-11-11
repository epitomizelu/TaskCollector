/**
 * JS Bundle 更新服务（增强版）
 * 支持 .js 和 .hbc 两种格式：
 *  - .js 可直接动态执行（纯 JS OTA）
 *  - .hbc 下载后缓存，下次启动由原生或 expo-updates 加载
 * 
 * 注意：此服务仅支持手动更新，不会自动检查或下载更新
 * 用户需要在应用内手动触发检查更新操作
 */

// ✅ 从 legacy 导入 API 以兼容新版本 expo-file-system
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert } from 'react-native'; // 🆕 新增：Alert 用于提示用户
import Constants from 'expo-constants';

// ✅ 使用 ReturnType 推断下载任务的类型
type FileSystemDownloadResumable = ReturnType<typeof FileSystem.createDownloadResumable>;

export interface JSBundleUpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  latestJsVersionCode: number; // ✅ 使用独立的 jsVersionCode
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
  private currentJsVersionCode: number; // ✅ 使用独立的 jsVersionCode
  private downloadTask: FileSystemDownloadResumable | null = null;
  private readonly JS_VERSION_CODE_KEY = 'js_bundle_version_code'; // 本地存储 key

  constructor() {
    // ✅ 读取 APK 版本号（仅用于显示）
    const nativeVersion = Constants.nativeAppVersion;
    const expoConfigVersion = Constants.expoConfig?.version;
    this.currentVersion = nativeVersion || expoConfigVersion || '1.0.0';
    
    // ✅ 从本地存储读取 jsVersionCode，如果没有则默认为 0
    this.currentJsVersionCode = 0; // 初始值，会在 loadJsVersionCode 中设置
    this.loadJsVersionCode();
  }

  /**
   * 从本地存储加载 jsVersionCode
   */
  private async loadJsVersionCode(): Promise<void> {
    try {
      const infoPath = `${FileSystem.documentDirectory}${this.JS_VERSION_CODE_KEY}.json`;
      const fileInfo = await FileSystem.getInfoAsync(infoPath);
      
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(infoPath);
        const data = JSON.parse(content);
        let jsVersionCode: number;
        if (typeof data.jsVersionCode === 'number' && !isNaN(data.jsVersionCode)) {
          jsVersionCode = data.jsVersionCode;
        } else {
          jsVersionCode = parseInt(data.jsVersionCode || '0', 10);
          if (isNaN(jsVersionCode)) {
            jsVersionCode = 0;
          }
        }
        this.currentJsVersionCode = jsVersionCode;
        console.log('[JSBundleUpdateService] 从本地存储加载 jsVersionCode:', this.currentJsVersionCode);
      } else {
        console.log('[JSBundleUpdateService] 本地存储中没有 jsVersionCode，使用默认值 0');
        this.currentJsVersionCode = 0;
      }
    } catch (error) {
      console.warn('[JSBundleUpdateService] 加载 jsVersionCode 失败，使用默认值 0:', error);
      this.currentJsVersionCode = 0;
    }
  }

  /**
   * 保存 jsVersionCode 到本地存储
   */
  private async saveJsVersionCode(jsVersionCode: number): Promise<void> {
    try {
      const infoPath = `${FileSystem.documentDirectory}${this.JS_VERSION_CODE_KEY}.json`;
      const data = {
        jsVersionCode,
        updatedAt: new Date().toISOString(),
      };
      await FileSystem.writeAsStringAsync(infoPath, JSON.stringify(data, null, 2));
      this.currentJsVersionCode = jsVersionCode;
      console.log('[JSBundleUpdateService] 保存 jsVersionCode 到本地存储:', jsVersionCode);
    } catch (error) {
      console.error('[JSBundleUpdateService] 保存 jsVersionCode 失败:', error);
      throw error;
    }
  }

  /**
   * 检查更新逻辑：使用 jsVersionCode
   */
  async checkForUpdate(): Promise<JSBundleUpdateInfo> {
    try {
      // ✅ 确保已加载 jsVersionCode
      await this.loadJsVersionCode();
      
      const { API_CONFIG, getHeaders } = await import('../config/api.config');
      // ✅ 使用更新服务云函数 URL（如果配置了，否则使用主云函数 URL）
      const updateServiceUrl = API_CONFIG.UPDATE_SERVICE_URL || API_CONFIG.BASE_URL;
      const response = await fetch(
        `${updateServiceUrl}/app/check-js-bundle-update?jsVersionCode=${this.currentJsVersionCode}&platform=${Platform.OS}`,
        {
          method: 'GET',
          headers: getHeaders(),
        }
      );

      const result = await response.json();
      if (result.code !== 0) throw new Error(result.message || '检查更新失败');

      const updateInfo: JSBundleUpdateInfo = result.data;
      
      // ✅ 客户端二次校验：使用 jsVersionCode 比较
      if (
        updateInfo.hasUpdate &&
        updateInfo.latestJsVersionCode <= this.currentJsVersionCode
      ) {
        updateInfo.hasUpdate = false;
      }
      
      return updateInfo;
    } catch (err) {
      console.error('[JSBundleUpdateService] 检查更新失败:', err);
      throw err;
    }
  }

  /**
   * 🆕 修改：下载时自动识别文件类型 (.js 或 .hbc)
   */
  async downloadBundle(
    downloadUrl: string,
    onProgress?: (p: DownloadProgress) => void
  ): Promise<string> {
    if (!downloadUrl) throw new Error('下载地址为空');
    console.log('[JSBundleUpdateService] 开始下载:', downloadUrl);

    // 🆕 新增：判断文件类型
    const ext = downloadUrl.endsWith('.hbc') ? 'hbc' : 'js';

    // 🆕 修改：根据类型动态命名
    const bundleDir = `${FileSystem.documentDirectory}js-bundles/`;
    const bundlePath = `${bundleDir}index.android.${ext}`;

    const dirInfo = await FileSystem.getInfoAsync(bundleDir);
    if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(bundleDir, { intermediates: true });

    // ✅ 保留下载进度逻辑
    this.downloadTask = FileSystem.createDownloadResumable(
      downloadUrl,
      bundlePath,
      {},
      (dp) => {
        const progress =
          dp.totalBytesExpectedToWrite > 0
            ? dp.totalBytesWritten / dp.totalBytesExpectedToWrite
            : 0;
        onProgress?.({
          totalBytesWritten: dp.totalBytesWritten,
          totalBytesExpectedToWrite: dp.totalBytesExpectedToWrite,
          progress,
        });
      }
    );

    const result = await this.downloadTask.downloadAsync();
    if (!result) throw new Error('下载失败');

    console.log('[JSBundleUpdateService] 下载完成:', result.uri);
    return result.uri;
  }

  /**
   * 🆕 修改：根据文件类型决定更新方式
   *  - .js → 动态执行（立即生效）
   *  - .hbc → 保存更新信息，等待重启加载
   * 更新成功后保存新的 jsVersionCode
   */
  async applyUpdate(bundlePath: string, latestJsVersionCode: number): Promise<void> {
    const ext = bundlePath.split('.').pop()?.toLowerCase();

    if (ext === 'js') {
      // 🆕 新增：动态执行 JS bundle
      console.log('[JSBundleUpdateService] 执行新 .js Bundle:', bundlePath);
      await this.runBundle(bundlePath);
      
      // ✅ 更新成功后保存新的 jsVersionCode
      await this.saveJsVersionCode(latestJsVersionCode);
      
      Alert.alert('更新完成', '新版本已应用（无需重启）');
    } else if (ext === 'hbc') {
      // 🆕 修改：保存更新信息
      console.log('[JSBundleUpdateService] 保存 .hbc 更新信息');
      const infoPath = `${FileSystem.documentDirectory}js-bundle-update-info.json`;
      const data = {
        bundlePath,
        jsVersionCode: latestJsVersionCode,
        appliedAt: new Date().toISOString(),
      };
      await FileSystem.writeAsStringAsync(infoPath, JSON.stringify(data, null, 2));
      
      // ✅ 更新成功后保存新的 jsVersionCode
      await this.saveJsVersionCode(latestJsVersionCode);
      
      Alert.alert('更新下载完成', '下次重启后将应用新版本');
    } else {
      throw new Error('未知的 bundle 格式');
    }
  }

  /**
   * 🆕 新增：动态执行 .js bundle 文件（纯 JS OTA 关键逻辑）
   */
  async runBundle(bundlePath: string) {
    try {
      const code = await FileSystem.readAsStringAsync(bundlePath);
      // 🆕 新增：构建沙箱上下文（防止污染全局）
      const sandbox = { console, require, globalThis };
      const exec = new Function('sandbox', `
        with (sandbox) {
          ${code}
        }
      `);
      exec(sandbox);
      console.log('[JSBundleUpdateService] 动态执行完成');
    } catch (err) {
      console.error('[JSBundleUpdateService] 执行 .js bundle 失败:', err);
      Alert.alert('执行失败', String(err));
    }
  }

  /**
   * ✅ 保留：取消下载功能
   */
  async cancelDownload() {
    if (this.downloadTask) {
      await this.downloadTask.pauseAsync();
      this.downloadTask = null;
      console.log('[JSBundleUpdateService] 下载已取消');
    }
  }

  /**
   * ✅ 修改：版本号获取（返回 jsVersionCode）
   */
  getCurrentVersion() {
    return {
      version: this.currentVersion,
      jsVersionCode: this.currentJsVersionCode,
    };
  }
}

// ✅ 单例导出
export const jsBundleUpdateService = new JSBundleUpdateService();
