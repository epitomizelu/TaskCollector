# JS Bundle OTA 更新加载问题说明

## ❌ 问题描述

**现象：** 重新构建上传了 JS Bundle，APP 端下载并重启后，UI 没有更新。

**原因：** 在 Expo 中，应用启动时默认加载的是**打包在 APK 中的 bundle**，而不是下载到本地的 bundle。

## 🔍 根本原因

### Expo 应用启动流程

1. **应用启动** → React Native 引擎初始化
2. **加载 Bundle** → 从 APK 资源中加载打包的 bundle
3. **执行代码** → 运行 bundle 中的 JavaScript 代码
4. **渲染 UI** → 显示应用界面

**关键问题：**
- ❌ 下载的 bundle 文件保存在 `documentDirectory`，但没有被加载
- ❌ React Native 引擎不知道要加载下载的 bundle
- ❌ 需要修改原生代码才能加载自定义 bundle

### 当前实现的问题

```typescript
// 当前实现：只是下载并保存了 bundle
await jsBundleUpdateService.downloadBundle(downloadUrl);
await jsBundleUpdateService.applyUpdate(bundlePath, jsVersionCode);
// ⚠️ 但应用重启后，仍然加载的是 APK 中的 bundle
```

## ✅ 解决方案

### 方案 1：使用 EAS OTA 更新（强烈推荐）⭐

**EAS OTA 更新是 Expo 官方推荐的方案，可以真正实现 OTA 更新：**

```typescript
// 使用 EAS OTA 更新
await unifiedUpdateService.applyEASOTAUpdate();
// ✅ 会自动下载并加载新的 bundle
// ✅ 重启后新 UI 立即生效
```

**优势：**
- ✅ 真正的 OTA 更新
- ✅ 自动加载新的 bundle
- ✅ 无需修改原生代码
- ✅ 官方支持，稳定可靠

**配置：**
```json
// app.json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD"
    }
  }
}
```

### 方案 2：Eject 到 Bare Workflow + 修改原生代码

**如果必须使用自建 JS Bundle OTA，需要：**

1. **Eject 到 Bare Workflow**
   ```bash
   npx expo eject
   ```

2. **修改 Android 原生代码**
   - 修改 `MainApplication.java` 或 `MainActivity.java`
   - 在应用启动时检查是否有下载的 bundle
   - 如果有，加载下载的 bundle 而不是 APK 中的 bundle

3. **修改 iOS 原生代码**
   - 修改 `AppDelegate.m` 或 `AppDelegate.swift`
   - 类似地，加载下载的 bundle

**⚠️ 注意：** 这会失去 Expo managed workflow 的优势，需要维护原生代码。

### 方案 3：使用 Metro Bundler 开发服务器（仅开发环境）

**在开发环境中，可以使用开发服务器加载 bundle：**

```typescript
// 开发环境：连接到 Metro Bundler
// 生产环境：无法使用此方案
```

**限制：** 仅适用于开发环境，生产环境无法使用。

## 🔧 临时解决方案（不完美）

### 检查下载的 Bundle 是否存在

可以在应用启动时检查是否有下载的 bundle，并提示用户：

```typescript
// app/_layout.tsx
useEffect(() => {
  const checkDownloadedBundle = async () => {
    try {
      const infoPath = `${FileSystem.documentDirectory}js-bundle-update-info.json`;
      const fileInfo = await FileSystem.getInfoAsync(infoPath);
      
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(infoPath);
        const data = JSON.parse(content);
        
        Alert.alert(
          '检测到已下载的更新',
          '已下载新版本，但需要重新安装 APK 才能应用更新。\n\n建议使用 EAS OTA 更新以获得更好的体验。',
          [{ text: '确定' }]
        );
      }
    } catch (error) {
      console.error('检查下载的 bundle 失败:', error);
    }
  };
  
  setTimeout(checkDownloadedBundle, 2000);
}, []);
```

**⚠️ 注意：** 这只是提示，无法真正加载 bundle。

## 📊 方案对比

| 方案 | 是否支持 OTA | 需要原生代码 | 难度 | 推荐度 |
|------|------------|------------|------|--------|
| EAS OTA 更新 | ✅ 是 | ❌ 否 | ⭐ 简单 | ⭐⭐⭐⭐⭐ |
| Eject + 原生代码 | ✅ 是 | ✅ 是 | ⭐⭐⭐⭐⭐ 困难 | ⭐⭐ |
| 自建方案（当前） | ❌ 否 | ✅ 是 | ⭐⭐⭐⭐ 很困难 | ⭐ |

## 🎯 推荐方案

### 立即解决方案

**使用 EAS OTA 更新：**

1. **配置 EAS Updates**
   ```bash
   npx expo install expo-updates
   ```

2. **发布更新**
   ```bash
   eas update --branch production --message "更新布局"
   ```

3. **APP 端自动更新**
   - 应用启动时自动检查更新
   - 自动下载并应用
   - 新 UI 立即生效

### 长期方案

**如果必须使用自建方案：**

1. **Eject 到 Bare Workflow**
2. **修改原生代码加载自定义 bundle**
3. **维护原生代码**

**⚠️ 警告：** 这会增加维护成本，建议使用 EAS OTA。

## 🔍 调试建议

### 1. 检查下载的 Bundle 是否存在

```typescript
const bundlePath = `${FileSystem.documentDirectory}js-bundles/index.android.js`;
const fileInfo = await FileSystem.getInfoAsync(bundlePath);
console.log('Bundle 是否存在:', fileInfo.exists);
console.log('Bundle 路径:', bundlePath);
```

### 2. 检查 jsVersionCode 是否正确更新

```typescript
const versionCodePath = `${FileSystem.documentDirectory}js_bundle_version_code.json`;
const content = await FileSystem.readAsStringAsync(versionCodePath);
const data = JSON.parse(content);
console.log('当前 jsVersionCode:', data.jsVersionCode);
```

### 3. 检查云函数返回的版本信息

```typescript
const updateInfo = await jsBundleUpdateService.checkForUpdate();
console.log('更新信息:', updateInfo);
```

## 📚 相关文档

- [EAS Updates 官方文档](https://docs.expo.dev/eas-updates/introduction/)
- [Expo Updates API](https://docs.expo.dev/versions/latest/sdk/updates/)
- [React Native Bundle 加载机制](https://reactnative.dev/docs/communication-android)

## 🎉 总结

**核心问题：** 在 Expo managed workflow 中，无法直接加载自定义 bundle，需要原生代码支持。

**最佳解决方案：** 使用 **EAS OTA 更新**，这是 Expo 官方推荐的方案，可以真正实现 OTA 更新。

**当前自建方案的限制：** 只能下载 bundle，但无法加载，因此 UI 不会更新。建议迁移到 EAS OTA 更新。

