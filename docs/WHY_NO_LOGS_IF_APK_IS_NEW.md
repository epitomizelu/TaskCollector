# 为什么新 APK 也看不到 MainApplication 日志？

## 问题

即使确认 APK 是新版本（包含注入的代码），仍然看不到 MainApplication 的日志。

## 可能的原因

### 1. getJSBundleFile() 方法没有被调用 ⭐（最可能）

**原因：**
- Expo Updates 可能绕过了 `getJSBundleFile()` 方法
- React Native 在某些情况下可能不调用这个方法
- 应用使用了其他 bundle 加载方式

**验证方法：**
```powershell
# 查看所有日志，搜索 onCreate（这个方法应该总是被调用）
adb logcat | Select-String -Pattern "onCreate|MainApplication"
```

**如果连 onCreate 的日志都看不到：**
- 说明代码确实没有被执行
- 可能是 APK 版本问题，或者代码没有被正确注入

**解决方案：**
- 检查 Expo Updates 配置
- 确认 React Native 版本
- 查看 React Native 源码，确认 `getJSBundleFile()` 的调用时机

### 2. 日志级别过滤问题

**原因：** 
- `Log.d()` (DEBUG级别) 可能被过滤掉
- 某些设备或系统设置可能过滤了 DEBUG 级别的日志

**解决方案：**
- ✅ **已修复**：已将日志级别改为 `Log.e()` (ERROR级别)
- ERROR 级别的日志不会被过滤，确保能看到

### 3. 日志标签不匹配

**原因：**
- 日志标签可能不匹配
- 过滤条件可能不正确

**解决方案：**
```powershell
# 使用 ERROR 级别过滤（已更新）
adb logcat -s MainApplication:E

# 或使用内容过滤（更全面）
adb logcat | Select-String -Pattern "MainApplication|getJSBundleFile|检查|加载"
```

### 4. Expo Updates 启用了

**原因：**
如果 `AndroidManifest.xml` 中启用了 Expo Updates：
```xml
<meta-data android:name="expo.modules.updates.ENABLED" android:value="true"/>
```

Expo Updates 可能会：
- 优先使用自己的更新机制
- 绕过 `getJSBundleFile()` 方法
- 使用自己的 bundle 加载逻辑

**验证方法：**
```powershell
# 检查 Expo Updates 相关日志
adb logcat | Select-String -Pattern "ExpoUpdates|Updates"
```

**解决方案：**
- 如果不需要 Expo Updates，可以禁用它
- 或者检查 Expo Updates 的配置，确认是否影响 bundle 加载

## 诊断步骤

### 步骤 1: 确认代码已注入

检查 Codemagic 构建日志，应该看到：
```
✅ 成功注入 OTA Bundle Loader！
   包含 getJSBundleFile() 方法: ✅
   包含 OTA 实现 (js-bundles): ✅
   包含日志语句: ✅
```

### 步骤 2: 使用 ERROR 级别日志（已修复）

**已更新：** 所有日志现在使用 `Log.e()` (ERROR级别)，确保不会被过滤。

重新构建 APK 后，应该能看到：
```
E/MainApplication: ========================================
E/MainApplication: 🔍 getJSBundleFile() 被调用！
E/MainApplication: ========================================
E/MainApplication: 🔍 检查 Bundle 文件:
```

### 步骤 3: 查看所有日志（不过滤）

如果仍然看不到，查看所有日志：

```powershell
npm run view-all-logs
```

然后搜索：
- `MainApplication`
- `getJSBundleFile`
- `检查`
- `加载`

### 步骤 4: 检查 onCreate() 日志

即使 `getJSBundleFile()` 没有被调用，`onCreate()` 的日志应该能看到：

```powershell
adb logcat | Select-String -Pattern "onCreate|MainApplication"
```

**如果连 onCreate 的日志都看不到：**
- ❌ 说明代码确实没有被执行
- ✅ 需要检查代码注入是否成功

## 已实施的修复

### 1. 日志级别改为 ERROR

**之前：** 使用 `Log.d()` (DEBUG级别)，可能被过滤
**现在：** 使用 `Log.e()` (ERROR级别)，确保能看到

### 2. 添加明显的日志标记

在方法开始处添加明显的日志：
```kotlin
Log.e("MainApplication", "========================================")
Log.e("MainApplication", "🔍 getJSBundleFile() 被调用！")
Log.e("MainApplication", "========================================")
```

### 3. 更新日志查看脚本

- 使用 ERROR 级别过滤：`MainApplication:E`
- 提供查看所有日志的选项

## 下一步

1. **重新构建 APK**
   - 在 Codemagic 重新构建
   - 确认注入成功

2. **安装新 APK**
   ```powershell
   adb uninstall com.lcy.taskcollection
   adb install app-release.apk
   ```

3. **查看日志**
   ```powershell
   # 使用 ERROR 级别过滤
   adb logcat -s MainApplication:E
   
   # 或查看所有日志
   npm run view-all-logs
   ```

4. **如果仍然看不到日志**
   - 检查 `getJSBundleFile()` 是否被调用
   - 检查 Expo Updates 配置
   - 查看 React Native 源码，确认调用时机

## 重要提示

**如果 `getJSBundleFile()` 确实没有被调用：**

这可能是因为：
1. Expo Updates 启用了，绕过了这个方法
2. React Native 版本问题
3. 应用使用了其他 bundle 加载方式

**解决方案：**
- 检查 Expo Updates 配置
- 考虑使用其他方式加载 bundle
- 或者修改 React Native 源码（不推荐）

