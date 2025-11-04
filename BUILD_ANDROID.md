# Android APK 构建指南

本项目已配置 EAS Build，支持构建 Android APK。有两种构建方式：

## 方式一：使用 EAS Build（推荐，云构建）

### 前置要求

1. 安装 EAS CLI：
   ```bash
   npm install -g eas-cli
   ```

2. 登录 Expo 账号：
   ```bash
   eas login
   ```

### 构建 APK 步骤

1. **配置构建环境**（首次使用需要）：
   ```bash
   eas build:configure
   ```

2. **构建 APK**（预览版本）：
   ```bash
   eas build --platform android --profile preview
   ```
   
   这将使用 `eas.json` 中配置的 `preview` profile，会自动构建 APK 格式。

3. **等待构建完成**：
   - 构建会在 Expo 的云端服务器进行
   - 构建完成后，可以在 [Expo Dashboard](https://expo.dev) 下载 APK 文件
   - 或者通过命令行下载：
     ```bash
     eas build:list
     ```

4. **构建生产版本（AAB 格式）**：
   ```bash
   eas build --platform android --profile production
   ```
   > 注意：生产版本默认构建 AAB 格式（用于 Google Play 商店），如需 APK 可修改 `eas.json`

### 本地构建 APK（无需云端）

如果你想在本地进行构建，可以使用：

```bash
eas build --platform android --profile preview --local
```

> 注意：本地构建需要安装 Android SDK 和配置环境

---

## 方式二：本地构建（需要完整 Android 开发环境）

### 前置要求

1. **安装 Android Studio**
   - 下载并安装 [Android Studio](https://developer.android.com/studio)
   - 配置 Android SDK（API Level 33+）

2. **配置环境变量**：
   ```bash
   # Windows
   ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
   
   # 添加到 PATH
   %ANDROID_HOME%\platform-tools
   %ANDROID_HOME%\tools
   ```

3. **预构建项目**：
   ```bash
   npx expo prebuild --platform android
   ```
   这会生成 `android` 文件夹。

### 构建步骤

1. **进入 Android 目录**：
   ```bash
   cd android
   ```

2. **构建 APK**：
   ```bash
   # Windows
   gradlew.bat assembleRelease
   
   # macOS/Linux
   ./gradlew assembleRelease
   ```

3. **APK 文件位置**：
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

---

## 推荐方式

**推荐使用 EAS Build**，因为：
- ✅ 无需配置本地 Android 开发环境
- ✅ 构建速度快，云端资源充足
- ✅ 自动处理签名和配置
- ✅ 支持自动下载构建产物

## 快速开始

最简单的构建命令：

```bash
# 安装 EAS CLI（如果还没安装）
npm install -g eas-cli

# 登录
eas login

# 构建 APK
eas build --platform android --profile preview
```

构建完成后，APK 文件会出现在 Expo Dashboard 或通过命令下载。

---

## 常见问题

### Q: 如何修改 APK 的构建配置？
A: 编辑 `eas.json` 文件，修改 `build.preview.android` 配置。

### Q: 需要签名吗？
A: EAS Build 会自动处理签名。如果是本地构建，需要配置签名文件。

### Q: 构建失败怎么办？
A: 检查 `app.json` 中的 Android 配置是否正确，查看构建日志找出问题。

