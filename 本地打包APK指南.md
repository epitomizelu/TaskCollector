# 本地打包 APK 指南

## ⚠️ 当前问题

构建时遇到 **Android SDK 36 与 Gradle 8.14.3 的兼容性问题**，导致 JDK Image Transformation 错误。

## ✅ 解决方案

### 方案一：使用 EAS Build（强烈推荐，最简单）

EAS Build 在云端构建，自动处理所有兼容性问题，无需配置本地 Android 环境。

#### 步骤：

1. **安装 EAS CLI**：
   ```bash
   npm install -g eas-cli
   ```

2. **登录 Expo 账号**：
   ```bash
   eas login
   ```

3. **构建 APK**：
   ```bash
   eas build --platform android --profile preview
   ```

4. **下载 APK**：
   - 构建完成后，在 [Expo Dashboard](https://expo.dev) 下载
   - 或使用命令行：
     ```bash
     eas build:list
     ```

#### 优点：
- ✅ 无需配置本地 Android 环境
- ✅ 自动处理所有兼容性问题
- ✅ 构建速度快，云端资源充足
- ✅ 自动处理签名和配置

---

### 方案二：本地构建（需要解决兼容性问题）

如果必须本地构建，可以尝试以下方法：

#### 方法 A：构建 Debug 版本（最简单）

Debug 版本通常不受此问题影响：

```bash
cd android
gradlew.bat assembleDebug
```

APK 位置：`android/app/build/outputs/apk/debug/app-debug.apk`

#### 方法 B：禁用新架构（可能影响功能）

1. **编辑 `android/gradle.properties`**：
   ```properties
   newArchEnabled=false
   ```

2. **重新预构建**：
   ```bash
   npx expo prebuild --platform android --clean
   ```

3. **重新构建**：
   ```bash
   cd android
   gradlew.bat assembleRelease
   ```

⚠️ **注意**：禁用新架构可能会影响某些库的功能。

#### 方法 C：降级 Android SDK（如果可行）

1. 在 Android Studio 中打开 **Tools** → **SDK Manager**
2. 取消选择 Android SDK 36
3. 安装 Android SDK 35 (API Level 35)
4. 重新预构建项目

#### 方法 D：升级到 JDK 21（实验性）

1. 下载并安装 [JDK 21](https://adoptium.net/)
2. 在 `android/gradle.properties` 中设置：
   ```properties
   org.gradle.java.home=C:\\path\\to\\jdk21
   ```
3. 重新构建

---

## 📋 快速命令参考

### 使用构建脚本

```powershell
# 构建 Release APK
.\build-apk.ps1

# 构建 Debug APK
.\build-apk.ps1 debug
```

### 手动构建

```bash
# 预构建（如果 android 目录不存在）
npx expo prebuild --platform android

# 构建 Debug APK
cd android
gradlew.bat assembleDebug

# 构建 Release APK
cd android
gradlew.bat assembleRelease
```

### 清理构建

```bash
cd android
gradlew.bat clean
```

---

## 📍 APK 文件位置

- **Debug APK**：`android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**：`android/app/build/outputs/apk/release/app-release.apk`

---

## 🔧 环境要求

### 使用 EAS Build（方案一）
- ✅ Node.js
- ✅ npm
- ✅ Expo 账号

### 本地构建（方案二）
- ✅ JDK 17+（已安装：`D:\jdk17\jdk`）
- ✅ Android Studio
- ✅ Android SDK（已安装：`D:\androidstudio\sdk`）
- ✅ 环境变量：
  - `JAVA_HOME`（已设置：`D:\jdk17\jdk`）
  - `ANDROID_HOME`（已设置：`D:\androidstudio\sdk`）

---

## 🎯 推荐方案

**强烈建议使用 EAS Build（方案一）**，因为：
1. 最简单，无需解决兼容性问题
2. 最可靠，云端环境已配置好
3. 最快速，无需等待本地构建
4. 自动处理签名和配置

---

## 📚 相关文档

- [BUILD_ANDROID.md](./BUILD_ANDROID.md) - Android 构建指南
- [BUILD_LOCAL.md](./BUILD_LOCAL.md) - 本地构建详细指南
- [FIX_JDK_IMAGE_ERROR.md](./FIX_JDK_IMAGE_ERROR.md) - JDK 错误修复指南
- [EAS Build 文档](https://docs.expo.dev/build/introduction/)

---

## ❓ 常见问题

### Q: 为什么本地构建失败？
A: 这是 Android SDK 36 与 Gradle 8.14.3 的已知兼容性问题。建议使用 EAS Build。

### Q: Debug APK 可以正常使用吗？
A: 可以，Debug APK 通常不受此问题影响，可用于测试。

### Q: 必须使用 Release APK 吗？
A: 如果只是测试，Debug APK 也可以。如果需要发布，建议使用 EAS Build 构建 Release APK。

### Q: 如何安装 APK 到设备？
A: 使用 ADB：
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

