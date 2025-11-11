# APP 端 OTA 更新触发指南

## 📋 概述

本文档说明如何在 APP 端触发 OTA 更新，包括手动触发和自动触发两种方式。

## 🎯 更新类型

APP 支持三种更新方式：

1. **EAS OTA 更新**（蓝色）
   - 使用 Expo Updates 服务
   - 自动下载和应用
   - 需要重启应用

2. **自建 JS Bundle OTA 更新**（紫色）⭐ **重点**
   - 使用自建 OTA 系统
   - 需要手动下载，下载后重启应用
   - 支持 `.js` 和 `.hbc` 格式

3. **APK 更新**（绿色）
   - 完整应用更新
   - 需要下载并安装 APK

## 🔧 触发方式

### 方式 1：手动触发（推荐用于测试）

#### 1.1 通过 UI 界面触发

**步骤：**
1. 打开应用的"检查更新"页面（`app/app-update.tsx`）
2. 点击"检查更新"按钮
3. 系统会自动检查所有类型的更新（EAS OTA、JS Bundle OTA、APK）
4. 如果有 JS Bundle OTA 更新，会显示"下载 JS Bundle 更新"按钮
5. 点击按钮下载更新
6. 下载完成后，重启应用以应用更新

**代码位置：**
- 页面：`app/app-update.tsx`
- 服务：`services/unified-update.service.ts`

#### 1.2 在代码中手动调用

```typescript
import { unifiedUpdateService } from '../services/unified-update.service';

// 检查所有类型的更新
const checkUpdates = async () => {
  try {
    const updateInfo = await unifiedUpdateService.checkForUpdates();
    
    if (updateInfo.jsBundleOtaUpdate?.hasUpdate) {
      console.log('发现 JS Bundle OTA 更新');
      console.log('最新版本:', updateInfo.jsBundleOtaUpdate.latestVersion);
      
      // 下载并应用更新
      await unifiedUpdateService.downloadAndApplyJSBundleOTA(
        (progress) => {
          console.log('下载进度:', progress.progress);
        }
      );
      
      // 注意：.js 格式会自动应用，.hbc 格式需要重启应用
    }
  } catch (error) {
    console.error('检查更新失败:', error);
  }
};

// 调用
checkUpdates();
```

### 方式 2：自动触发（推荐用于生产环境）

#### 2.1 应用启动时自动检查

在 `app/_layout.tsx` 中添加自动检查逻辑：

```typescript
import { useEffect } from 'react';
import { unifiedUpdateService } from '../services/unified-update.service';
import { Alert } from 'react-native';

export default function RootLayout() {
  useEffect(() => {
    // 应用启动后 2 秒自动检查更新（不阻塞启动）
    const timer = setTimeout(async () => {
      try {
        const updateInfo = await unifiedUpdateService.checkForUpdates();
        
        // 检查 JS Bundle OTA 更新
        if (updateInfo.jsBundleOtaUpdate?.hasUpdate) {
          const { latestVersion, latestVersionCode, fileSize } = updateInfo.jsBundleOtaUpdate;
          
          Alert.alert(
            '发现新版本',
            `发现新版本 v${latestVersion} (Build ${latestVersionCode})\n文件大小: ${formatFileSize(fileSize)}\n是否立即下载？`,
            [
              { text: '稍后', style: 'cancel' },
              {
                text: '下载',
                onPress: async () => {
                  try {
                    await unifiedUpdateService.downloadAndApplyJSBundleOTA(
                      (progress) => {
                        console.log('下载进度:', progress.progress);
                      }
                    );
                    
                    Alert.alert('下载完成', '请重启应用以应用更新');
                  } catch (error) {
                    Alert.alert('下载失败', error.message);
                  }
                },
              },
            ]
          );
        }
      } catch (error) {
        console.error('自动检查更新失败:', error);
        // 静默失败，不影响应用使用
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // ... 其他代码
}
```

#### 2.2 定期检查更新

使用定时器定期检查更新：

```typescript
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { unifiedUpdateService } from '../services/unified-update.service';

export default function RootLayout() {
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 应用启动时检查一次
    checkForUpdates();

    // 每 30 分钟检查一次更新
    checkIntervalRef.current = setInterval(() => {
      checkForUpdates();
    }, 30 * 60 * 1000); // 30 分钟

    // 应用从后台恢复时检查
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkForUpdates();
      }
    });

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      subscription.remove();
    };
  }, []);

  const checkForUpdates = async () => {
    try {
      const updateInfo = await unifiedUpdateService.checkForUpdates();
      
      if (updateInfo.jsBundleOtaUpdate?.hasUpdate) {
        // 静默下载更新（不提示用户）
        await unifiedUpdateService.downloadAndApplyJSBundleOTA();
        console.log('JS Bundle OTA 更新已下载');
      }
    } catch (error) {
      console.error('检查更新失败:', error);
    }
  };

  // ... 其他代码
}
```

#### 2.3 特定页面进入时检查

在特定页面（如设置页面）进入时检查更新：

```typescript
import { useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { unifiedUpdateService } from '../services/unified-update.service';

export default function SettingsScreen() {
  useFocusEffect(
    React.useCallback(() => {
      // 页面获得焦点时检查更新
      checkForUpdates();
    }, [])
  );

  const checkForUpdates = async () => {
    try {
      const updateInfo = await unifiedUpdateService.checkForUpdates();
      
      if (updateInfo.jsBundleOtaUpdate?.hasUpdate) {
        // 显示更新提示
        console.log('发现 JS Bundle OTA 更新');
      }
    } catch (error) {
      console.error('检查更新失败:', error);
    }
  };

  // ... 其他代码
}
```

## 📝 完整示例

### 示例 1：静默下载更新（推荐）

```typescript
import { useEffect } from 'react';
import { unifiedUpdateService } from '../services/unified-update.service';

export default function RootLayout() {
  useEffect(() => {
    // 应用启动后静默检查并下载更新
    const checkAndDownload = async () => {
      try {
        const updateInfo = await unifiedUpdateService.checkForUpdates();
        
        if (updateInfo.jsBundleOtaUpdate?.hasUpdate) {
          console.log('发现 JS Bundle OTA 更新，开始静默下载...');
          
          // 静默下载（不显示进度）
          await unifiedUpdateService.downloadAndApplyJSBundleOTA();
          
          console.log('JS Bundle OTA 更新已下载完成');
          // 注意：.js 格式会自动应用，.hbc 格式需要重启应用
        }
      } catch (error) {
        console.error('自动更新失败:', error);
        // 静默失败，不影响应用使用
      }
    };

    // 延迟 3 秒检查，确保应用已完全启动
    const timer = setTimeout(checkAndDownload, 3000);
    return () => clearTimeout(timer);
  }, []);

  // ... 其他代码
}
```

### 示例 2：带进度提示的更新

```typescript
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Modal } from 'react-native';
import { unifiedUpdateService } from '../services/unified-update.service';

export default function RootLayout() {
  const [updateProgress, setUpdateProgress] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const checkAndDownload = async () => {
      try {
        const updateInfo = await unifiedUpdateService.checkForUpdates();
        
        if (updateInfo.jsBundleOtaUpdate?.hasUpdate) {
          setIsUpdating(true);
          
          await unifiedUpdateService.downloadAndApplyJSBundleOTA(
            (progress) => {
              setUpdateProgress(progress.progress);
            }
          );
          
          setIsUpdating(false);
          setUpdateProgress(null);
        }
      } catch (error) {
        console.error('自动更新失败:', error);
        setIsUpdating(false);
        setUpdateProgress(null);
      }
    };

    const timer = setTimeout(checkAndDownload, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* 更新进度提示 */}
      {isUpdating && (
        <Modal transparent visible={isUpdating}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 10 }}>
              <ActivityIndicator size="large" />
              <Text style={{ marginTop: 10 }}>
                {updateProgress !== null 
                  ? `更新中... ${Math.round(updateProgress * 100)}%`
                  : '检查更新中...'}
              </Text>
            </View>
          </View>
        </Modal>
      )}
      
      {/* 其他内容 */}
    </>
  );
}
```

### 示例 3：用户确认后下载

```typescript
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { unifiedUpdateService } from '../services/unified-update.service';

export default function RootLayout() {
  useEffect(() => {
    const checkAndPrompt = async () => {
      try {
        const updateInfo = await unifiedUpdateService.checkForUpdates();
        
        if (updateInfo.jsBundleOtaUpdate?.hasUpdate) {
          const { latestVersion, latestVersionCode, fileSize } = updateInfo.jsBundleOtaUpdate;
          
          Alert.alert(
            '发现新版本',
            `发现新版本 v${latestVersion} (Build ${latestVersionCode})\n文件大小: ${formatFileSize(fileSize)}\n是否立即下载？`,
            [
              { text: '稍后', style: 'cancel' },
              {
                text: '下载',
                onPress: async () => {
                  try {
                    await unifiedUpdateService.downloadAndApplyJSBundleOTA(
                      (progress) => {
                        console.log('下载进度:', progress.progress);
                      }
                    );
                    
                    Alert.alert('下载完成', '请重启应用以应用更新');
                  } catch (error) {
                    Alert.alert('下载失败', error.message);
                  }
                },
              },
            ]
          );
        }
      } catch (error) {
        console.error('检查更新失败:', error);
      }
    };

    const timer = setTimeout(checkAndPrompt, 3000);
    return () => clearTimeout(timer);
  }, []);

  // ... 其他代码
}
```

## 🔍 API 参考

### `unifiedUpdateService.checkForUpdates()`

检查所有类型的更新。

**返回值：**
```typescript
{
  updateType: 'eas-ota' | 'js-bundle-ota' | 'apk' | 'both' | 'all' | 'none';
  jsBundleOtaUpdate?: {
    hasUpdate: boolean;
    latestVersion: string;
    latestVersionCode: number;
    downloadUrl: string | null;
    filePath: string | null;
    fileSize: number;
    releaseDate: string | null;
  };
  // ... 其他更新信息
}
```

### `unifiedUpdateService.downloadAndApplyJSBundleOTA(onProgress?)`

下载并应用 JS Bundle OTA 更新。

**参数：**
- `onProgress?: (progress) => void` - 下载进度回调

**返回值：** `Promise<void>`

**注意：**
- `.js` 格式会自动应用（无需重启）
- `.hbc` 格式需要重启应用才能生效

### `jsBundleUpdateService.checkForUpdate()`

仅检查 JS Bundle OTA 更新。

**返回值：**
```typescript
{
  hasUpdate: boolean;
  latestVersion: string;
  latestVersionCode: number;
  downloadUrl: string | null;
  filePath: string | null;
  fileSize: number;
  releaseDate: string | null;
}
```

## ⚠️ 注意事项

1. **开发环境限制**
   - 开发环境（`__DEV__ = true`）中，EAS OTA 更新检查受限
   - 自建 JS Bundle OTA 更新可以在开发环境测试

2. **网络要求**
   - 需要网络连接才能检查更新
   - 建议在 WiFi 环境下下载更新

3. **版本号管理**
   - 确保 `app.json` 中的版本号已递增
   - 版本代码（versionCode）必须严格递增

4. **更新优先级**
   - 如果同时有 EAS OTA 和 JS Bundle OTA 更新，建议优先使用 EAS OTA
   - JS Bundle OTA 作为备用方案

5. **错误处理**
   - 建议使用 try-catch 捕获错误
   - 更新失败不应影响应用正常使用

## 🎯 最佳实践

1. **生产环境**：使用静默下载，应用启动时自动检查并下载
2. **测试环境**：使用手动触发，方便测试和调试
3. **用户体验**：下载大文件时显示进度提示
4. **错误处理**：更新失败时静默处理，不打扰用户

## 📚 相关文档

- [Codemagic OTA 更新配置](./CODEMAGIC_OTA_UPDATE.md)
- [JS Bundle OTA 设置指南](./JS_BUNDLE_OTA_SETUP.md)
- [统一更新服务代码](../services/unified-update.service.ts)

## 🎉 总结

APP 端触发 OTA 更新的方式：

✅ **手动触发**：在"检查更新"页面点击按钮  
✅ **自动触发**：应用启动时自动检查并下载  
✅ **定期检查**：定时器定期检查更新  
✅ **页面触发**：特定页面进入时检查  

选择适合你应用场景的方式即可！🚀

