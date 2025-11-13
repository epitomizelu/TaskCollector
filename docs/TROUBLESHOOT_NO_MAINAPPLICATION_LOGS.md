# 排查：看不到 MainApplication 日志

## 问题现象

运行 `npm run view-startup-logs` 或查看 logcat 时，看不到预期的 MainApplication 日志：
- ❌ 看不到 `🚀 MainApplication.onCreate() 被调用`
- ❌ 看不到 `🔍 检查 Bundle 文件:`
- ❌ 看不到 `✅ 加载下载的 JS Bundle:`

## 可能的原因

### 1. APK 是旧版本（最常见）⭐

**原因：** 当前安装的 APK 是旧版本，不包含注入的代码。

**检查方法：**
```powershell
npm run check-apk-version
```

**解决方案：**
1. 在 Codemagic 重新构建 APK
2. 确认构建日志中显示 "✅ 成功注入 OTA Bundle Loader"
3. 下载新构建的 APK
4. 卸载旧版本：`adb uninstall com.lcy.taskcollection`
5. 安装新版本：`adb install app-release.apk`

### 2. getJSBundleFile() 未被调用

**原因：** 
- Expo Updates 可能绕过了 `getJSBundleFile()` 方法
- React Native 在某些情况下可能不调用这个方法
- 应用使用了其他 bundle 加载方式

**检查方法：**
```powershell
# 查看所有日志，搜索 onCreate
adb logcat | Select-String -Pattern "onCreate|MainApplication"
```

**解决方案：**
- 检查 `AndroidManifest.xml` 中的 Expo Updates 配置
- 确认是否启用了 Expo Updates（可能影响 bundle 加载）
- 查看 React Native 版本，确认 `getJSBundleFile()` 的调用时机

### 3. 日志标签过滤问题

**原因：** 日志标签可能不匹配，或者日志级别设置不正确。

**检查方法：**
```powershell
# 使用更宽泛的过滤
adb logcat | Select-String -Pattern "MainApplication|onCreate|Bundle|检查|加载"
```

**解决方案：**
- 使用内容过滤而不是标签过滤
- 检查日志级别设置

## 诊断步骤

### 步骤 1: 检查 APK 版本

```powershell
npm run check-apk-version
```

**预期输出：**
```
版本代码 (versionCode): 2
版本名称 (versionName): 1.0.0
最后更新时间: 2025-11-13 19:00:00
```

**如果版本代码是旧的：**
- ❌ APK 不包含注入的代码
- ✅ 需要重新构建并安装新版本

### 步骤 2: 检查 Codemagic 构建日志

在 Codemagic 构建日志中，查找 "Inject OTA Bundle Loader" 步骤：

**应该看到：**
```
========================================
✅ 成功注入 OTA Bundle Loader！
========================================
   包含 getJSBundleFile() 方法: ✅
   包含 OTA 实现 (js-bundles): ✅
   包含日志语句: ✅
```

**如果看到警告：**
```
⚠️  警告：检测到 getJSBundleFile() 方法，但只包含 super 调用
```
说明注入失败，需要检查注入脚本。

### 步骤 3: 使用诊断脚本

```powershell
npm run diagnose-logs
```

这个脚本会：
1. 检查 APK 版本
2. 清除旧日志
3. 使用多种方式过滤日志
4. 显示所有相关的日志

### 步骤 4: 查看所有日志（不过滤）

如果仍然看不到日志，尝试查看所有日志：

```powershell
# 清除日志
adb logcat -c

# 查看所有日志（信息量很大）
adb logcat > all_logs.txt

# 然后搜索 MainApplication
Select-String -Path all_logs.txt -Pattern "MainApplication"
```

## 验证清单

在排查时，检查以下项目：

- [ ] APK 版本是否是最新的（versionCode）
- [ ] Codemagic 构建日志是否显示注入成功
- [ ] 是否卸载了旧版本并安装了新版本
- [ ] 日志过滤条件是否正确
- [ ] 应用是否完全重启（从最近任务中清除）

## 如果仍然看不到日志

### 方法 1: 检查 onCreate() 日志

即使 `getJSBundleFile()` 没有被调用，`onCreate()` 的日志应该能看到。

```powershell
adb logcat -c
adb logcat | Select-String -Pattern "onCreate|MainApplication"
```

**如果连 `onCreate()` 的日志都看不到：**
- ❌ APK 肯定是旧版本
- ✅ 需要重新构建并安装

### 方法 2: 反编译 APK 验证

如果可能，可以反编译 APK 来验证代码是否被注入：

```bash
# 使用 jadx 反编译
jadx -d output app-release.apk

# 查看 MainApplication.kt
cat output/sources/com/lcy/taskcollection/MainApplication.kt | grep -A 50 "getJSBundleFile"
```

**应该看到：**
```kotlin
override fun getJSBundleFile(): String? {
    val filesDir = this@MainApplication.getFilesDir()
    val bundleDir = File(filesDir, "js-bundles")
    Log.d("MainApplication", "🔍 检查 Bundle 文件:")
    // ...
}
```

### 方法 3: 检查 Expo Updates 配置

如果启用了 Expo Updates，可能会影响 bundle 加载：

```xml
<!-- AndroidManifest.xml -->
<meta-data android:name="expo.modules.updates.ENABLED" android:value="true"/>
```

**如果启用了 Expo Updates：**
- Expo Updates 可能会优先使用自己的更新机制
- `getJSBundleFile()` 可能不会被调用
- 需要检查 Expo Updates 的配置

## 常见问题

### Q: 为什么 Codemagic 构建日志显示注入成功，但 APK 中没有代码？

**A:** 可能的原因：
1. 构建后文件被覆盖（检查构建流程）
2. 下载的 APK 是旧版本（检查构建时间）
3. 安装时使用了错误的 APK 文件

**解决方案：**
- 检查构建日志中的文件路径
- 确认下载的 APK 文件是最新的
- 检查 APK 的构建时间戳

### Q: 为什么连 onCreate() 的日志都看不到？

**A:** 说明 APK 是旧版本，不包含任何注入的代码。

**解决方案：**
- 重新构建 APK
- 确认注入脚本在构建流程中正确执行
- 安装新构建的 APK

### Q: 如何确认注入的代码真的在 APK 中？

**A:** 
1. 检查 Codemagic 构建日志
2. 检查 APK 版本（versionCode）
3. 反编译 APK 查看代码（如果可能）
4. 查看 logcat 日志（如果代码存在，应该能看到日志）

## 下一步

如果按照以上步骤仍然看不到日志：

1. **确认 Codemagic 构建流程**
   - 检查 `codemagic.yaml` 中的注入步骤
   - 确认注入脚本在正确的位置执行

2. **检查 React Native 版本**
   - 不同版本的 React Native 可能调用 `getJSBundleFile()` 的时机不同
   - 查看 React Native 源码，确认调用时机

3. **考虑使用其他方式**
   - 如果 `getJSBundleFile()` 确实不被调用，可能需要使用其他方式加载 bundle
   - 或者修改 React Native 源码（不推荐）

