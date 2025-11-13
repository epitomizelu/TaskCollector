# Codemagic 注入验证指南

## 问题说明

由于使用 Codemagic 构建 APK，**不会上传 `android/` 文件夹**，所以：
- ❌ 不能直接修改 `MainApplication.kt` 文件
- ✅ 需要在 Codemagic 构建流程中自动注入代码
- ✅ 注入脚本会在 `expo prebuild` 之后、构建之前自动运行

## Codemagic 构建流程

```
1. Install dependencies
2. Setup Expo
3. Prebuild (生成 android 文件夹) ← 这里生成 MainApplication.kt
4. Inject OTA Bundle Loader ← 这里注入代码
5. Build Android APK/AAB ← 这里构建 APK
```

## 如何验证注入是否成功

### 方法 1: 查看 Codemagic 构建日志

在 Codemagic 构建日志中，找到 **"Inject OTA Bundle Loader"** 步骤，应该看到：

```
========================================
🔧 开始注入 OTA Bundle Loader
========================================
目标文件: .../MainApplication.kt

✅ 文件存在，开始读取...
✅ 已添加必要的导入语句
🔍 检查 getJSBundleFile() 方法是否存在...
   ✅ 找到方法声明，位置: XXXX
🔍 检测到 getJSBundleFile() 方法，开始分析...
   ⚠️  检测到默认的 getJSBundleFile() 方法，将替换为 OTA 实现

💾 写入修改后的文件...
✅ 文件已写入

🔍 验证注入结果...
   包含 getJSBundleFile() 方法: ✅
   包含 OTA 实现 (js-bundles): ✅
   包含日志语句: ✅
   包含 super 调用: ✅

========================================
✅ 成功注入 OTA Bundle Loader！
========================================
文件路径: .../MainApplication.kt

注入的方法包含:
  ✅ getJSBundleFile() 方法
  ✅ OTA bundle 加载逻辑
  ✅ 详细的调试日志

下一步:
  1. 继续构建 APK/AAB
  2. 安装后查看 logcat 日志:
     adb logcat -s MainApplication:D
  3. 应该能看到 "🔍 检查 Bundle 文件" 等日志

🎉 OTA Bundle Loader 注入完成！
```

### 方法 2: 查看验证步骤的输出

在 **"Inject OTA Bundle Loader"** 步骤之后，应该看到：

```
📋 验证注入结果...
✅ 确认：MainApplication.kt 包含 OTA 实现
```

如果看到警告，说明注入可能失败：

```
⚠️  警告：MainApplication.kt 可能不包含 OTA 实现
   文件内容预览：
   override fun getJSBundleFile(): String? {
     return super.getJSBundleFile()
   }
```

### 方法 3: 查看构建后验证

在 **"Build Android APK"** 步骤之后，应该看到：

```
📋 构建后验证 MainApplication.kt...
✅ 确认：构建后 MainApplication.kt 仍包含 OTA 实现
```

## 如果注入失败

### 常见错误 1: 文件不存在

```
❌ 文件不存在: .../MainApplication.kt

可能的原因:
  1. 还没有运行 expo prebuild
  2. android 文件夹路径不正确
  3. 包名或路径配置错误

解决方案:
  1. 确保在 Codemagic 构建流程中，先运行 "expo prebuild"
  2. 检查 app.json 中的包名配置
  3. 检查注入脚本中的路径配置
```

**解决方法：**
- 检查 `codemagic.yaml` 中 "Prebuild" 步骤是否在 "Inject OTA Bundle Loader" 之前
- 确认 `app.json` 中的包名是 `com.lcy.taskcollection`

### 常见错误 2: 只包含 super 调用

```
⚠️  警告：检测到 getJSBundleFile() 方法，但只包含 super 调用
   这可能意味着注入失败或被覆盖
```

**解决方法：**
- 检查注入脚本是否正确执行
- 查看构建日志中的详细错误信息
- 确认没有其他脚本覆盖了文件

### 常见错误 3: 找不到插入位置

```
❌ 找不到插入位置标记: getUseDeveloperSupport()
   请检查 MainApplication.kt 文件结构
```

**解决方法：**
- 可能是 Expo 版本更新导致文件结构变化
- 需要更新注入脚本以适配新的文件结构

## 验证 APK 中的代码

即使注入成功，也需要验证 APK 中是否真的包含了注入的代码。

### 方法 1: 查看 logcat 日志

安装 APK 后，运行：

```bash
adb logcat -c
adb logcat -s MainApplication:D
```

然后重启应用，应该看到：

```
MainApplication: 🔍 检查 Bundle 文件:
MainApplication:    getFilesDir(): /data/user/0/com.lcy.taskcollection/files
MainApplication:    bundleDir: /data/user/0/com.lcy.taskcollection/files/js-bundles
MainApplication:   对应 JS 端路径: file:///data/user/0/com.lcy.taskcollection/files/js-bundles/
MainApplication:    jsBundle: ..., 存在: true/false, 大小: X
MainApplication:    hbcBundle: ..., 存在: true/false, 大小: X
```

### 方法 2: 反编译 APK（高级）

如果需要确认 APK 中是否包含代码，可以反编译 APK：

```bash
# 使用 jadx 反编译
jadx -d output app-release.apk

# 查看 MainApplication.kt
cat output/sources/com/lcy/taskcollection/MainApplication.kt | grep -A 50 "getJSBundleFile"
```

## 调试技巧

### 1. 在 Codemagic 构建日志中搜索关键词

在 Codemagic 构建日志中搜索：
- `成功注入 OTA Bundle Loader`
- `包含 OTA 实现`
- `MainApplication.kt 包含 OTA 实现`

### 2. 检查文件内容预览

如果注入失败，构建日志会显示文件内容预览，可以检查：
- 方法是否存在
- 是否只包含 `super.getJSBundleFile()`
- 是否包含 `js-bundles` 路径

### 3. 查看完整的构建日志

如果遇到问题，可以：
1. 下载完整的构建日志
2. 搜索 "Inject OTA Bundle Loader" 步骤
3. 查看详细的错误信息

## 总结

1. ✅ **注入脚本已配置**：在 `codemagic.yaml` 中，注入步骤在 prebuild 之后、构建之前
2. ✅ **验证步骤已添加**：构建日志会显示注入是否成功
3. ✅ **详细日志已增强**：注入脚本会输出详细的验证信息
4. ✅ **错误处理已完善**：如果注入失败，会显示详细的错误信息

**如果 Codemagic 构建日志显示注入成功，但 APK 中看不到日志，可能是：**
- APK 是旧版本（需要重新安装）
- 日志被过滤掉了（使用更宽泛的过滤条件）
- `getJSBundleFile()` 未被调用（检查 Expo Updates 配置）

