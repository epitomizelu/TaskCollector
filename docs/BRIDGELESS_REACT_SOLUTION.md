# BridgelessReact (新架构) Bundle 加载解决方案

## 问题分析

从日志分析发现，应用使用了 **React Native 新架构（BridgelessReact）**：

```
ReactHost{0}.getJSBundleLoader()  ← 新架构使用的方法
ReactHost{0}.getOrCreateReactInstanceTask(): Loading JS Bundle
```

**关键发现：**
- ❌ 没有调用 `getJSBundleFile()` 方法
- ✅ 使用了 `getJSBundleLoader()` 方法
- ✅ 应用正常启动并运行

## 解决方案

### 方案 1: 保持 getJSBundleFile() 注入（当前方案）

即使在新架构中，`DefaultReactNativeHost` 的 `getJSBundleFile()` 方法**可能仍然会被调用**。

**原因：**
- BridgelessReact 可能在某些情况下回退到使用 `getJSBundleFile()`
- 或者 `ReactNativeHostWrapper` 在创建 `ReactHost` 时可能会检查 `getJSBundleFile()`

**当前实现：**
- ✅ 已注入 `getJSBundleFile()` 方法
- ✅ 使用 ERROR 级别日志确保可见
- ✅ 添加了 `onCreate()` 日志用于验证

**验证方法：**
1. 重新构建 APK
2. 运行 `npm run capture-logs`
3. 检查是否看到 `onCreate()` 日志
4. 检查是否看到 `getJSBundleFile()` 日志

### 方案 2: 如果 getJSBundleFile() 仍然不被调用

如果确认 `getJSBundleFile()` 在新架构中不会被调用，需要：

1. **创建自定义 JSBundleLoader**
2. **重写 ReactHost 的创建方式**
3. **或者修改 ReactNativeHostWrapper 的实现**

**注意：** 这需要深入了解 React Native 新架构的实现细节。

## 当前状态

### 已完成的修改

1. ✅ **注入 `getJSBundleFile()` 方法**
   - 使用 ERROR 级别日志
   - 包含详细的调试信息

2. ✅ **添加 `onCreate()` 日志**
   - 用于验证代码是否执行
   - 即使 `getJSBundleFile()` 不被调用，也能看到 `onCreate()` 日志

3. ✅ **兼容新旧架构**
   - 代码同时支持传统架构和新架构
   - 如果新架构调用 `getJSBundleFile()`，会自动生效

### 下一步验证

1. **在 Codemagic 重新构建 APK**
2. **安装新 APK**
3. **运行 `npm run capture-logs`**
4. **检查日志：**
   - 应该看到 `onCreate()` 日志（证明代码执行）
   - 如果看到 `getJSBundleFile()` 日志，说明新架构也会调用它
   - 如果看不到 `getJSBundleFile()` 日志，说明新架构确实不使用它

## 如果 getJSBundleFile() 确实不被调用

### 需要实现自定义 JSBundleLoader

在新架构中，可能需要：

```kotlin
// 创建自定义 JSBundleLoader
val customBundleLoader = JSBundleLoader.createFileLoader(
    File(getFilesDir(), "js-bundles/index.android.js").absolutePath
)

// 在创建 ReactHost 时使用
val reactHost = ReactNativeHostWrapper.createReactHost(
    applicationContext,
    reactNativeHost,
    customBundleLoader  // 传入自定义 loader
)
```

**但这需要修改 `ReactNativeHostWrapper` 的实现，可能比较复杂。**

## 推荐方案

**当前推荐：**
1. ✅ 保持 `getJSBundleFile()` 注入（已实现）
2. ✅ 添加 `onCreate()` 日志验证（已实现）
3. ✅ 重新构建并测试
4. ⏳ 根据测试结果决定是否需要实现自定义 JSBundleLoader

**如果测试后确认 `getJSBundleFile()` 不被调用：**
- 需要深入研究 React Native 新架构的源码
- 或者考虑使用 EAS OTA 更新（官方支持新架构）

## 总结

1. ✅ **代码已注入** - `getJSBundleFile()` 方法已添加到 `MainApplication.kt`
2. ✅ **日志已增强** - 使用 ERROR 级别，确保可见
3. ✅ **验证已添加** - `onCreate()` 日志用于验证代码执行
4. ⏳ **待测试** - 需要重新构建 APK 并验证

**即使在新架构中，`getJSBundleFile()` 可能仍然会被调用。** 先测试当前实现，如果确实不被调用，再考虑实现自定义 JSBundleLoader。

