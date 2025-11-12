# 纯 JS 项目的 OTA 更新解决方案

## ❌ 问题

在纯 JS 项目（Expo managed workflow）中：
- ❌ 无法修改原生代码（云构建不会包含）
- ❌ 无法加载下载的自定义 bundle
- ❌ 下载的 JS Bundle 无法生效

## 🔍 根本原因

在 Expo managed workflow 中：
1. 应用启动时，React Native 引擎加载的是**打包在 APK 中的 bundle**
2. 无法通过 JavaScript 代码修改 bundle 加载路径
3. 需要原生代码支持才能加载自定义 bundle

## ✅ 解决方案

### 方案 1：使用自托管的 Expo Updates（推荐）⭐

**Expo Updates 可以自托管，不需要 EAS：**

#### 1.1 配置自托管服务器

```json
// app.json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "url": "https://your-server.com/api/updates"  // 你的服务器地址
    }
  }
}
```

#### 1.2 实现更新服务器

你需要实现一个兼容 Expo Updates 协议的服务器，或者使用现有的自托管方案。

**参考：**
- [Expo Updates 自托管文档](https://docs.expo.dev/eas-updates/self-hosting/)

### 方案 2：将 JS Bundle 打包到新 APK（当前可行方案）

**虽然不能真正 OTA，但可以快速发布：**

#### 2.1 工作流程

```
1. 修改代码
2. 构建 JS Bundle
3. 上传到云存储
4. 在 Codemagic 中构建新 APK（包含新 bundle）
5. 用户下载新 APK 安装
```

#### 2.2 优势

- ✅ 不需要修改原生代码
- ✅ 可以使用云构建（Codemagic）
- ✅ 新 UI 会生效
- ⚠️ 但需要用户安装新 APK（不是真正的 OTA）

### 方案 3：使用 WebView 加载远程页面（变通方案）

**如果只是更新部分页面，可以使用 WebView：**

```typescript
// 对于某些页面，使用 WebView 加载远程 HTML
import { WebView } from 'react-native-webview';

export default function DynamicPage() {
  const [updateUrl, setUpdateUrl] = useState(null);
  
  useEffect(() => {
    // 检查是否有更新的页面 URL
    checkForPageUpdate().then(url => {
      if (url) {
        setUpdateUrl(url); // 加载远程页面
      } else {
        setUpdateUrl('local'); // 使用本地页面
      }
    });
  }, []);
  
  if (updateUrl && updateUrl !== 'local') {
    return <WebView source={{ uri: updateUrl }} />;
  }
  
  return <LocalPage />;
}
```

**限制：**
- ⚠️ 只能更新部分页面
- ⚠️ WebView 性能不如原生
- ⚠️ 无法更新整个应用

### 方案 4：接受限制，提示用户安装新 APK

**当前自建方案的实际用途：**

```typescript
// 下载完成后，提示用户
Alert.alert(
  '更新已下载',
  '新版本已准备就绪，请下载并安装新 APK 以应用更新。',
  [
    { text: '稍后', style: 'cancel' },
    {
      text: '下载 APK',
      onPress: () => {
        // 跳转到 APK 下载页面
        Linking.openURL(apkDownloadUrl);
      },
    },
  ]
);
```

**说明：**
- ✅ 可以检测更新
- ✅ 可以下载 bundle（作为预览）
- ⚠️ 但最终需要安装新 APK

## 📊 方案对比

| 方案 | 是否真正 OTA | 需要原生代码 | 难度 | 推荐度 |
|------|------------|------------|------|--------|
| 自托管 Expo Updates | ✅ 是 | ❌ 否 | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐ |
| 打包到新 APK | ❌ 否 | ❌ 否 | ⭐ 简单 | ⭐⭐⭐ |
| WebView 远程页面 | ⚠️ 部分 | ❌ 否 | ⭐⭐ 简单 | ⭐⭐ |
| 提示安装 APK | ❌ 否 | ❌ 否 | ⭐ 简单 | ⭐ |

## 🎯 推荐方案

### 对于纯 JS 项目

**最佳方案：将 JS Bundle 打包到新 APK**

1. **修改代码**
2. **在 Codemagic 中构建新 APK**（会自动包含新的 bundle）
3. **用户下载新 APK 安装**
4. ✅ 新 UI 生效

**优势：**
- ✅ 不需要修改原生代码
- ✅ 可以使用云构建
- ✅ 简单可靠
- ⚠️ 需要用户安装新 APK（不是真正的 OTA）

### 如果必须实现真正的 OTA

**需要：**
1. **Eject 到 Bare Workflow**
2. **修改原生代码**（提交到 Git）
3. **云构建会包含原生代码修改**
4. ✅ 可以实现真正的 OTA

**但会失去：**
- ❌ Expo managed workflow 的优势
- ❌ 需要维护原生代码

## 📝 当前自建方案的实际用途

### 可以做什么

1. ✅ **检测更新**：检查是否有新版本
2. ✅ **下载 Bundle**：下载新的 JS Bundle 到本地
3. ✅ **预览更新**：可以查看更新内容（如果实现）
4. ⚠️ **提示用户**：提示用户需要安装新 APK

### 不能做什么

1. ❌ **真正 OTA**：无法在不安装新 APK 的情况下更新 UI
2. ❌ **自动加载**：无法自动加载下载的 bundle
3. ❌ **无缝更新**：需要用户手动安装新 APK

## 🔧 改进建议

### 改进当前方案

```typescript
// 下载完成后，提供更好的用户体验
async applyUpdate(bundlePath: string, latestJsVersionCode: number) {
  // 保存更新信息
  await this.saveJsVersionCode(latestJsVersionCode);
  
  // 检查是否有对应的 APK 更新
  const apkUpdate = await appUpdateService.checkForUpdate();
  
  if (apkUpdate.hasUpdate) {
    Alert.alert(
      '更新已准备就绪',
      `新版本 v${apkUpdate.latestVersion} 已准备就绪。\n\nJS Bundle 已下载，请安装新 APK 以应用更新。`,
      [
        { text: '稍后', style: 'cancel' },
        {
          text: '下载 APK',
          onPress: () => {
            // 下载并安装 APK
            downloadAndInstallAPK(apkUpdate.downloadUrl);
          },
        },
      ]
    );
  } else {
    Alert.alert(
      '更新已下载',
      'JS Bundle 已下载，但需要安装新 APK 才能应用更新。\n\n新 APK 正在准备中，请稍后检查更新。'
    );
  }
}
```

## 🎉 总结

**对于纯 JS 项目：**

1. **无法实现真正的 OTA**（不修改原生代码）
2. **当前方案的实际用途**：检测更新、下载 bundle、提示用户安装新 APK
3. **推荐方案**：将 JS Bundle 打包到新 APK，使用 Codemagic 构建
4. **如果必须 OTA**：需要 eject 并修改原生代码

**建议：**
- 接受限制，使用"检测更新 + 提示安装新 APK"的方案
- 或者，考虑使用自托管的 Expo Updates（如果可行）

