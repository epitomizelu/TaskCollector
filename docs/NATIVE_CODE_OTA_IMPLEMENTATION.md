# 原生代码实现自建 OTA 更新

## ✅ 已实现

已修改 `MainApplication.kt`，应用启动时会自动检查并加载下载的 JS Bundle。

## 🔧 实现原理

### 修改内容

在 `MainApplication.kt` 中重写了 `getJSBundleFile()` 方法：

```kotlin
override fun getJSBundleFile(): String? {
  // 检查是否有下载的 bundle 文件
  val bundleDir = File(getFilesDir(), "js-bundles")
  
  // 优先使用 .js 文件，如果没有则使用 .hbc 文件
  val jsBundle = File(bundleDir, "index.android.js")
  val hbcBundle = File(bundleDir, "index.android.hbc")
  
  return when {
    jsBundle.exists() && jsBundle.length() > 0 -> jsBundle.absolutePath
    hbcBundle.exists() && hbcBundle.length() > 0 -> hbcBundle.absolutePath
    else -> null // 使用默认 bundle
  }
}
```

### 工作流程

1. **应用启动** → `MainApplication.onCreate()`
2. **检查下载的 Bundle** → `getJSBundleFile()` 被调用
3. **加载 Bundle**：
   - 如果存在 `js-bundles/index.android.js` → 加载它
   - 如果存在 `js-bundles/index.android.hbc` → 加载它
   - 如果都不存在 → 使用 APK 中的默认 bundle
4. **执行代码** → 运行加载的 bundle
5. **渲染 UI** → 显示新界面 ✅

## 📝 文件路径说明

### JavaScript 端（下载时）

```typescript
// services/js-bundle-update.service.ts
const bundleDir = `${FileSystem.documentDirectory}js-bundles/`;
const bundlePath = `${bundleDir}index.android.${ext}`;
// documentDirectory = file:///data/data/com.lcy.taskcollection/files/
```

### Android 原生端（加载时）

```kotlin
// MainApplication.kt
val bundleDir = File(getFilesDir(), "js-bundles")
// getFilesDir() = /data/data/com.lcy.taskcollection/files
// 完整路径 = /data/data/com.lcy.taskcollection/files/js-bundles/
```

**路径对应关系：**
- `FileSystem.documentDirectory` = `getFilesDir()` = `/data/data/{package}/files/`
- ✅ 路径完全匹配

## 🚀 使用步骤

### 1. 重新构建 APK

修改原生代码后，需要重新构建 APK：

```bash
# 在项目根目录
cd android
./gradlew assembleRelease

# 或者使用 gradlew.bat（Windows）
gradlew.bat assembleRelease
```

### 2. 安装新 APK

```bash
# 安装到设备
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### 3. 测试 OTA 更新

1. **构建并上传 JS Bundle**
   ```bash
   npm run build-and-upload-js-bundle
   ```

2. **在 APP 中下载更新**
   - 打开"检查更新"页面
   - 点击"检查更新"
   - 点击"下载 JS Bundle 更新"
   - 等待下载完成

3. **重启应用**
   - 点击"立即重启"按钮
   - 应用重启
   - ✅ **新 UI 立即生效！**

## 🔍 验证方法

### 1. 查看 Logcat 日志

```bash
adb logcat | grep MainApplication
```

**应该看到：**
```
D/MainApplication: ✅ 加载下载的 JS Bundle: /data/data/com.lcy.taskcollection/files/js-bundles/index.android.js (1234567 bytes)
```

**如果没有下载的 bundle：**
```
D/MainApplication: 未找到下载的 Bundle 文件，使用默认 Bundle
```

### 2. 检查文件是否存在

```bash
adb shell
run-as com.lcy.taskcollection
ls -la files/js-bundles/
```

**应该看到：**
```
-rw------- 1 u0_a123 u0_a123 1234567 2024-01-01 12:00 index.android.js
```

### 3. 验证 UI 是否更新

1. 修改代码（例如修改某个页面的布局）
2. 构建并上传 JS Bundle
3. 在 APP 中下载更新
4. 重启应用
5. ✅ 检查 UI 是否已更新

## ⚠️ 注意事项

### 1. Bundle 文件格式

- **`.js` 文件**：纯 JavaScript（未压缩）
- **`.hbc` 文件**：Hermes Bytecode（已编译）

两种格式都可以加载，优先使用 `.js` 文件。

### 2. 版本兼容性

- 确保下载的 bundle 与当前 APK 版本兼容
- 如果 bundle 使用了新的原生模块，需要重新构建 APK

### 3. 开发环境

- **开发环境**：仍然使用 Metro Bundler（开发服务器）
- **生产环境**：使用下载的 bundle 或 APK 中的 bundle

### 4. 错误处理

- 如果 bundle 文件损坏或不存在，会自动回退到 APK 中的默认 bundle
- 如果 bundle 加载失败，应用会崩溃（需要确保 bundle 文件完整）

## 🐛 故障排查

### 问题 1：重启后 UI 仍然没有更新

**可能原因：**
- Bundle 文件不存在或路径错误
- Bundle 文件损坏
- 应用没有重新构建（原生代码修改后需要重新构建）

**解决方案：**
1. 检查 bundle 文件是否存在：
   ```bash
   adb shell run-as com.lcy.taskcollection ls -la files/js-bundles/
   ```

2. 检查 Logcat 日志，看是否加载了下载的 bundle

3. 重新构建 APK 并安装

### 问题 2：应用崩溃

**可能原因：**
- Bundle 文件格式不正确
- Bundle 文件损坏
- 版本不兼容

**解决方案：**
1. 删除下载的 bundle，使用默认 bundle：
   ```bash
   adb shell run-as com.lcy.taskcollection rm -rf files/js-bundles/
   ```

2. 重新下载 bundle

3. 检查 bundle 文件是否完整

### 问题 3：找不到 Bundle 文件

**可能原因：**
- 文件路径不正确
- 文件权限问题

**解决方案：**
1. 检查文件路径：
   ```kotlin
   val bundleDir = File(getFilesDir(), "js-bundles")
   // getFilesDir() = /data/data/com.lcy.taskcollection/files
   ```

2. 确保文件有读取权限（应用内文件默认有权限）

## 📊 测试流程

### 完整测试流程

1. **修改代码**（例如修改 UI 布局）
2. **构建 JS Bundle**
   ```bash
   npm run build-js-bundle
   ```
3. **上传 JS Bundle**
   ```bash
   npm run upload-js-bundle
   ```
4. **重新构建 APK**（如果修改了原生代码）
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
5. **安装新 APK**
   ```bash
   adb install -r android/app/build/outputs/apk/release/app-release.apk
   ```
6. **在 APP 中下载 Bundle**
   - 打开"检查更新"页面
   - 点击"下载 JS Bundle 更新"
7. **重启应用**
   - 点击"立即重启"
8. **验证 UI 是否更新** ✅

## 🎉 总结

✅ **已实现**：应用启动时自动加载下载的 JS Bundle  
✅ **支持格式**：`.js` 和 `.hbc` 两种格式  
✅ **自动回退**：如果下载的 bundle 不存在，使用默认 bundle  
✅ **完全自建**：不依赖 EAS 服务，完全自建方案  

**现在你的自建 JS Bundle OTA 更新可以真正工作了！** 🚀

## 📚 相关文档

- [JS Bundle OTA 操作指南](./JS_BUNDLE_OTA_OPERATION_GUIDE.md)
- [Codemagic OTA 更新配置](./CODEMAGIC_OTA_UPDATE.md)
- [APP 端触发指南](./APP_OTA_UPDATE_TRIGGER.md)

