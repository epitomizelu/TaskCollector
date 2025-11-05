# 修复 JDK Image Transformation 错误

## 问题描述

在构建 Android APK 时遇到以下错误：
```
Execution failed for JdkImageTransform: D:\androidstudio\sdk\platforms\android-36\core-for-system-modules.jar
Error while executing process D:\jdk17\jdk\bin\jlink.exe
```

这是 Android SDK 36 与 Gradle 8.14.3 的已知兼容性问题。

## 解决方案

### 方案 1：使用 EAS Build（推荐，最简单）

EAS Build 在云端构建，会自动处理这些兼容性问题：

```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录
eas login

# 构建 APK
eas build --platform android --profile preview
```

### 方案 2：降级 Android SDK（如果方案 1 不可行）

在 Android Studio 中：
1. 打开 **Tools** → **SDK Manager**
2. 取消选择 Android SDK 36
3. 安装 Android SDK 35 (API Level 35)
4. 在 `android/gradle.properties` 中强制使用 SDK 35（如果 Expo 允许）

### 方案 3：更新 JDK 版本

尝试使用 JDK 21 或更新版本：

1. 下载并安装 [JDK 21](https://adoptium.net/)
2. 在 `android/gradle.properties` 中设置：
   ```properties
   org.gradle.java.home=C:\\path\\to\\jdk21
   ```

### 方案 4：临时禁用新架构（最后手段）

如果以上方案都不行，可以临时禁用新架构：

1. 编辑 `android/gradle.properties`：
   ```properties
   newArchEnabled=false
   ```

2. 重新预构建：
   ```bash
   npx expo prebuild --platform android --clean
   ```

3. 重新构建：
   ```bash
   cd android
   gradlew.bat assembleRelease
   ```

> ⚠️ **注意**：禁用新架构可能会影响某些库的功能。

## 当前已应用的修复

已尝试以下修复（在 `android/gradle.properties` 中）：
- 设置 `org.gradle.java.home` 指向 JDK 17
- 添加 `android.disableResourceValidation=true`
- 清理了 Gradle 缓存

## 下一步

如果构建仍然失败，建议：

1. **使用 EAS Build**（最简单可靠）
2. 或者等待 Android SDK 36 的兼容性更新
3. 或者联系 Expo 支持获取帮助

## 相关链接

- [EAS Build 文档](https://docs.expo.dev/build/introduction/)
- [Expo SDK 54 兼容性](https://docs.expo.dev/workflow/android-studio/)

