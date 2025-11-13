# 调试 MainApplication 日志

## 问题：看不到 getJSBundleFile() 的日志

### 可能的原因

1. **APK 是旧版本**（最常见）
   - 代码已注入，但当前运行的 APK 是旧版本
   - **解决方案**：重新构建并安装 APK

2. **getJSBundleFile() 未被调用**
   - Expo Updates 可能绕过了这个方法
   - React Native 在某些情况下可能不调用这个方法
   - **解决方案**：检查 `onCreate()` 日志，确认应用是否使用了新代码

3. **日志级别过滤问题**
   - 日志可能被过滤掉了
   - **解决方案**：使用更宽泛的过滤条件

## 调试步骤

### 步骤 1: 确认代码已注入

```bash
# 检查 MainApplication.kt 是否包含 OTA 代码
grep -n "getJSBundleFile\|js-bundles\|Log.d" android/app/src/main/java/com/lcy/taskcollection/MainApplication.kt
```

应该看到：
- `override fun getJSBundleFile()`
- `Log.d("MainApplication", ...)`
- `js-bundles`

### 步骤 2: 重新构建 APK

```bash
# 本地构建
cd android
./gradlew assembleRelease

# 或使用 Codemagic 构建
```

### 步骤 3: 安装新 APK

```bash
# 卸载旧版本
adb uninstall com.lcy.taskcollection

# 安装新版本
adb install android/app/build/outputs/apk/release/app-release.apk
```

### 步骤 4: 查看启动日志

```bash
# 清除旧日志
adb logcat -c

# 启动监听（使用标签过滤）
npm run view-startup-logs

# 或使用内容过滤（更全面）
npm run view-startup-logs -- --content

# 或直接使用 PowerShell
powershell -ExecutionPolicy Bypass -File scripts/view-app-startup-logs.ps1
```

### 步骤 5: 重启应用

在设备上：
1. 完全关闭应用（从最近任务中清除）
2. 重新打开应用
3. 查看终端输出的日志

## 预期看到的日志

### 如果代码正常工作，应该看到：

```
MainApplication: 🚀 MainApplication.onCreate() 被调用
MainApplication:   应用包名: com.lcy.taskcollection
MainApplication:   getFilesDir(): /data/user/0/com.lcy.taskcollection/files
MainApplication: ✅ MainApplication.onCreate() 完成
MainApplication: 🔍 检查 Bundle 文件:
MainApplication:    getFilesDir(): /data/user/0/com.lcy.taskcollection/files
MainApplication:    bundleDir: /data/user/0/com.lcy.taskcollection/files/js-bundles
MainApplication:   对应 JS 端路径: file:///data/user/0/com.lcy.taskcollection/files/js-bundles/
MainApplication:    jsBundle: ..., 存在: true/false, 大小: X
MainApplication:    hbcBundle: ..., 存在: true/false, 大小: X
MainApplication: ✅ 加载下载的 JS Bundle: ... (X bytes)
```

### 如果没有下载的 bundle，应该看到：

```
MainApplication: ⚠️  未找到下载的 Bundle 文件，使用默认 Bundle
MainApplication:   尝试列出 bundleDir 内容:
MainApplication:     bundleDir 不存在或不是目录
```

## 如果仍然看不到日志

### 检查 1: 确认 APK 版本

```bash
# 查看 APK 中的 MainApplication.kt（反编译）
# 或直接检查 APK 构建时间
adb shell dumpsys package com.lcy.taskcollection | grep versionCode
```

### 检查 2: 使用更宽泛的日志过滤

```powershell
# 查看所有包含 "MainApplication" 的日志
adb logcat | Select-String -Pattern "MainApplication"

# 查看所有日志（信息量很大）
adb logcat > logcat.txt
# 然后搜索 "MainApplication" 或 "getJSBundleFile"
```

### 检查 3: 确认 Expo Updates 是否影响

如果启用了 Expo Updates，它可能会优先使用自己的更新机制。检查：

```bash
# 查看 Expo Updates 相关日志
adb logcat | Select-String -Pattern "ExpoUpdates|Updates"
```

### 检查 4: 手动测试 getJSBundleFile()

如果可能，在 `onCreate()` 中手动调用 `getJSBundleFile()` 来测试：

```kotlin
override fun onCreate() {
  super.onCreate()
  // ... 其他代码 ...
  
  // 手动测试
  val bundleFile = reactNativeHost.reactInstanceManager?.currentReactContext?.let {
    // 尝试获取 bundle 文件路径
  }
  Log.d("MainApplication", "手动测试 bundle 路径: $bundleFile")
}
```

## 常见问题

### Q: 为什么 getJSBundleFile() 没有被调用？

**A:** 可能的原因：
1. React Native 在开发模式下使用 Metro Bundler，不调用这个方法
2. Expo Updates 启用了，可能使用自己的加载机制
3. 应用使用了其他 bundle 加载方式

**解决方案：**
- 确保是 Release 构建
- 检查 Expo Updates 配置
- 查看 React Native 源码，确认调用时机

### Q: 日志标签是什么？

**A:** 代码中使用的是 `Log.d("MainApplication", ...)`，所以标签是 `MainApplication`。

使用以下命令过滤：
```bash
adb logcat -s MainApplication:D
```

### Q: 如何确认代码真的被编译进去了？

**A:** 
1. 检查构建日志，确认没有编译错误
2. 反编译 APK，查看 MainApplication.class
3. 在代码中添加明显的日志（如 "TEST123"），然后搜索日志

## 下一步

如果按照以上步骤仍然看不到日志，可能需要：
1. 检查 React Native 版本和 Expo 版本兼容性
2. 查看 React Native 源码，确认 `getJSBundleFile()` 的调用时机
3. 考虑使用其他方式加载 bundle（如修改 React Native 源码）

