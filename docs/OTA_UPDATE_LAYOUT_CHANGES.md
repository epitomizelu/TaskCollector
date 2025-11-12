# OTA 更新与布局变更说明

## ❓ 问题：布局改了，OTA 更新后可以看到新布局吗？

## 📋 答案

**简短回答：** 可以，但**需要重启应用**才能看到新布局。

## 🔍 详细说明

### 当前实现方式

根据代码实现，OTA 更新支持两种文件格式：

#### 1. `.js` 文件格式

**当前实现：**
```typescript
// services/js-bundle-update.service.ts
async runBundle(bundlePath: string) {
  const code = await FileSystem.readAsStringAsync(bundlePath);
  const sandbox = { console, require, globalThis };
  const exec = new Function('sandbox', `
    with (sandbox) {
      ${code}
    }
  `);
  exec(sandbox);
}
```

**限制：**
- ⚠️ **动态执行 JS 代码无法替换已加载的 React 组件**
- ⚠️ **React Native 的组件注册发生在应用启动时**
- ⚠️ **布局和路由在应用初始化时已确定**
- ⚠️ **动态执行无法重新注册组件或更新路由**

**结果：** 虽然代码会执行，但**不会看到新的布局**，需要重启应用。

#### 2. `.hbc` 文件格式（Hermes Bytecode）

**当前实现：**
- 下载后保存更新信息
- 提示："下次重启后将应用新版本"
- 需要重启应用才能加载新的 bundle

**结果：** 明确需要重启应用。

## ✅ 正确的更新流程

### 方式 1：使用 EAS OTA 更新（推荐）

**EAS OTA 更新会自动重启应用：**

```typescript
// 应用 EAS OTA 更新
await unifiedUpdateService.applyEASOTAUpdate();
// 会自动调用 reloadAsync() 重启应用
```

**优势：**
- ✅ 自动重启应用
- ✅ 新布局立即生效
- ✅ 无缝更新体验

### 方式 2：自建 JS Bundle OTA + 手动重启

**当前实现需要手动重启：**

```typescript
// 下载并应用 JS Bundle OTA
await unifiedUpdateService.downloadAndApplyJSBundleOTA();

// 对于 .js 文件：提示"更新完成，新版本已应用（无需重启）"
// ⚠️ 但实际上需要重启才能看到新布局

// 对于 .hbc 文件：提示"下次重启后将应用新版本"
```

**改进建议：** 下载完成后，提示用户重启应用。

## 🔧 改进方案

### 方案 1：下载完成后自动重启（推荐）

修改 `services/js-bundle-update.service.ts`：

```typescript
async applyUpdate(bundlePath: string, latestJsVersionCode: number): Promise<void> {
  const ext = bundlePath.split('.').pop()?.toLowerCase();

  if (ext === 'js') {
    // 保存新的 jsVersionCode
    await this.saveJsVersionCode(latestJsVersionCode);
    
    // ⚠️ 移除动态执行，改为提示重启
    Alert.alert(
      '更新下载完成',
      '新版本已下载，需要重启应用以应用更新。',
      [
        { text: '稍后', style: 'cancel' },
        {
          text: '立即重启',
          onPress: () => {
            // 重启应用
            if (Platform.OS === 'android') {
              // 使用 expo-updates 重启
              Updates.reloadAsync();
            }
          },
        },
      ]
    );
  } else if (ext === 'hbc') {
    // ... 现有逻辑
  }
}
```

### 方案 2：使用 EAS OTA 更新（最佳实践）

**EAS OTA 更新是 Expo 官方推荐的方案：**

1. **自动重启**：更新后自动重启应用
2. **无缝体验**：用户无感知更新
3. **布局支持**：完全支持布局和组件更新

**配置：**
```json
// app.json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0
    }
  }
}
```

## 📊 对比表

| 更新方式 | 布局更新 | 是否需要重启 | 自动重启 | 推荐度 |
|---------|---------|------------|---------|--------|
| EAS OTA | ✅ 支持 | ✅ 自动重启 | ✅ 是 | ⭐⭐⭐⭐⭐ |
| JS Bundle (.js) | ⚠️ 需重启 | ❌ 需手动 | ❌ 否 | ⭐⭐ |
| JS Bundle (.hbc) | ✅ 支持 | ✅ 需手动 | ❌ 否 | ⭐⭐⭐ |

## 🎯 最佳实践

### 1. 布局更新使用 EAS OTA

```typescript
// 检查 EAS OTA 更新
const updateInfo = await unifiedUpdateService.checkForUpdates();

if (updateInfo.easOtaUpdate?.isAvailable) {
  // 应用更新（会自动重启）
  await unifiedUpdateService.applyEASOTAUpdate();
}
```

### 2. JS Bundle OTA 用于逻辑更新

**适用场景：**
- ✅ 修复 Bug
- ✅ 更新业务逻辑
- ✅ 更新数据接口
- ⚠️ **布局更新建议使用 EAS OTA**

### 3. 提示用户重启

如果使用 JS Bundle OTA 更新布局：

```typescript
await unifiedUpdateService.downloadAndApplyJSBundleOTA();

// 提示用户重启
Alert.alert(
  '更新完成',
  '新版本已下载，需要重启应用以查看新布局。',
  [
    { text: '稍后', style: 'cancel' },
    {
      text: '立即重启',
      onPress: async () => {
        await Updates.reloadAsync();
      },
    },
  ]
);
```

## ⚠️ 重要提示

1. **布局更新必须重启应用**
   - React Native 组件在应用启动时注册
   - 动态执行无法替换已加载的组件
   - 路由和导航在初始化时确定

2. **EAS OTA 是布局更新的最佳选择**
   - 自动重启应用
   - 无缝更新体验
   - 完全支持布局和组件更新

3. **JS Bundle OTA 适合逻辑更新**
   - 修复 Bug
   - 更新业务逻辑
   - 更新数据接口

## 🔄 更新流程建议

### 场景 1：仅更新布局

```
1. 修改布局代码
2. 使用 EAS OTA 发布更新
3. 用户检查更新
4. 自动下载并重启
5. ✅ 新布局立即生效
```

### 场景 2：更新逻辑 + 布局

```
1. 修改代码（逻辑 + 布局）
2. 使用 EAS OTA 发布更新（推荐）
   或
   使用 JS Bundle OTA + 提示重启
3. 用户检查更新
4. 下载更新
5. 重启应用（EAS 自动，JS Bundle 手动）
6. ✅ 新布局和逻辑生效
```

## 📚 相关文档

- [EAS OTA 更新配置](./EXPO_UPDATES_SETUP.md)
- [JS Bundle OTA 操作指南](./JS_BUNDLE_OTA_OPERATION_GUIDE.md)
- [APP 端触发指南](./APP_OTA_UPDATE_TRIGGER.md)

## 🎉 总结

**布局更新需要重启应用才能生效。**

**推荐方案：**
- ✅ **布局更新**：使用 **EAS OTA 更新**（自动重启）
- ✅ **逻辑更新**：可以使用 **JS Bundle OTA**（需手动重启）

**当前 JS Bundle OTA 的限制：**
- ⚠️ 动态执行 `.js` 文件无法替换已加载的组件
- ⚠️ 需要重启应用才能看到新布局
- ✅ 建议改进：下载完成后提示用户重启

