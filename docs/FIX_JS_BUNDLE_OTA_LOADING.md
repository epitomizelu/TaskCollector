# 修复 JS Bundle OTA 更新加载问题

## ❌ 问题

重新构建上传了 JS Bundle，APP 端下载并重启后，UI 没有更新。

## 🔍 根本原因

在 Expo managed workflow 中，应用启动时**默认加载的是打包在 APK 中的 bundle**，而不是下载到本地的 bundle。

**当前流程：**
```
下载 Bundle → 保存到本地 → 重启应用 → ❌ 仍然加载 APK 中的 bundle → UI 未更新
```

## ✅ 解决方案：使用 EAS OTA 更新

你已经配置了 EAS Updates（`app.json` 中已有配置），建议使用 EAS OTA 更新。

### 步骤 1：发布 EAS OTA 更新

```bash
# 安装 EAS CLI（如果还没有）
npm install -g eas-cli

# 登录
eas login

# 发布更新
eas update --branch production --message "更新布局"
```

### 步骤 2：APP 端自动更新

应用启动时会自动：
1. 检查 EAS OTA 更新
2. 下载新的 bundle
3. 加载新的 bundle
4. ✅ UI 立即更新

### 步骤 3：手动触发更新（可选）

```typescript
// 在"检查更新"页面
await unifiedUpdateService.applyEASOTAUpdate();
// ✅ 会自动下载并加载新的 bundle
```

## 🔄 迁移建议

### 从自建方案迁移到 EAS OTA

1. **保留自建方案作为备用**
   - 可以同时使用两种方案
   - EAS OTA 用于布局和代码更新
   - 自建方案用于特殊场景

2. **优先使用 EAS OTA**
   - 布局更新：使用 EAS OTA
   - 代码更新：使用 EAS OTA
   - 快速修复：使用 EAS OTA

3. **自建方案的使用场景**
   - 特殊需求（如自定义更新逻辑）
   - 备用方案（EAS OTA 不可用时）

## 📝 快速修复步骤

### 立即修复（使用 EAS OTA）

1. **发布 EAS OTA 更新**
   ```bash
   eas update --branch production --message "修复布局更新问题"
   ```

2. **APP 端检查更新**
   - 打开"检查更新"页面
   - 点击"应用 EAS OTA 更新"
   - ✅ 新 UI 立即生效

### 验证更新

```typescript
// 检查 EAS OTA 更新
const updateInfo = await unifiedUpdateService.checkForUpdates();
if (updateInfo.easOtaUpdate?.isAvailable) {
  // 应用更新
  await unifiedUpdateService.applyEASOTAUpdate();
}
```

## ⚠️ 重要说明

### 为什么自建方案无法加载 Bundle？

1. **Expo managed workflow 限制**
   - React Native 引擎在应用启动时加载 APK 中的 bundle
   - 无法通过 JavaScript 代码修改 bundle 加载路径
   - 需要修改原生代码（Android/iOS）

2. **需要 Eject 到 Bare Workflow**
   - 失去 Expo managed workflow 的优势
   - 需要维护原生代码
   - 增加维护成本

### EAS OTA 的优势

- ✅ 真正的 OTA 更新
- ✅ 自动加载新的 bundle
- ✅ 无需修改原生代码
- ✅ 官方支持，稳定可靠
- ✅ 你已经配置好了

## 🎯 推荐方案

**立即使用 EAS OTA 更新：**

```bash
# 1. 发布更新
eas update --branch production --message "更新布局"

# 2. APP 端会自动检查并更新
# 或者在"检查更新"页面手动触发
```

**长期方案：**
- 主要使用 EAS OTA 更新
- 保留自建方案作为备用

## 📚 相关文档

- [EAS Updates 文档](https://docs.expo.dev/eas-updates/introduction/)
- [问题说明文档](./JS_BUNDLE_OTA_LOADING_ISSUE.md)

## 🎉 总结

**问题：** 自建 JS Bundle OTA 无法加载下载的 bundle，UI 不会更新。

**解决方案：** 使用 **EAS OTA 更新**，这是 Expo 官方推荐的方案，可以真正实现 OTA 更新。

**你已经配置好了 EAS Updates，直接使用即可！** 🚀

