# Android APK 本地构建详细指南

本文档提供在 Windows 环境下本地构建 Android APK 的完整步骤。

## 前置要求

### 1. 安装 Java Development Kit (JDK)

- 下载并安装 [JDK 17](https://adoptium.net/) 或更高版本
- 配置环境变量：
  ```powershell
  JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot
  ```
  添加到 PATH：
  ```
  %JAVA_HOME%\bin
  ```
- 验证安装：
  ```bash
  java -version
  ```

### 2. 安装 Android Studio

1. 下载并安装 [Android Studio](https://developer.android.com/studio)
2. 打开 Android Studio，进入 `Tools` → `SDK Manager`
3. 安装以下组件：
   - **Android SDK Platform** (API Level 33 或更高)
   - **Android SDK Build-Tools** (最新版本)
   - **Android SDK Platform-Tools**
   - **Android SDK Command-line Tools**

### 3. 配置 Android 环境变量

在 Windows 系统环境变量中设置：

1. 打开"系统属性" → "高级" → "环境变量"
2. 新建系统变量：
   ```
   ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
   ```
   > 注意：路径可能不同，在 Android Studio 的 `SDK Manager` 中查看实际路径

3. 在 PATH 中添加：
   ```
   %ANDROID_HOME%\platform-tools
   %ANDROID_HOME%\tools
   %ANDROID_HOME%\tools\bin
   ```

4. 验证配置（打开新的 PowerShell 窗口）：
   ```bash
   adb version
   ```

### 4. 安装项目依赖

```bash
npm install
```

---

## 本地构建步骤

### 步骤 1: 预构建 Android 项目

Expo 项目需要先生成本地 Android 项目文件：

```bash
npx expo prebuild --platform android
```

这会生成 `android` 文件夹，包含完整的 Android 项目结构。

> ⚠️ 注意：如果 `android` 文件夹已存在，可能需要先删除或使用 `--clean` 参数：
> ```bash
> npx expo prebuild --platform android --clean
> ```

### 步骤 2: 配置签名（可选，用于发布版本）

#### 方式 A: 使用调试签名（开发测试用）

调试版本会自动使用默认签名，无需配置。

#### 方式 B: 配置发布签名（生产版本）

1. **生成密钥库**（如果还没有）：
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **配置签名文件**：
   
   在 `android` 目录下创建 `keystore.properties` 文件：
   ```properties
   storePassword=你的密钥库密码
   keyPassword=你的密钥密码
   keyAlias=my-key-alias
   storeFile=../my-release-key.keystore
   ```

3. **修改 `android/app/build.gradle`**：
   
   在 `android` 块中添加：
   ```gradle
   signingConfigs {
       release {
           def keystorePropertiesFile = rootProject.file("keystore.properties")
           def keystoreProperties = new Properties()
           if (keystorePropertiesFile.exists()) {
               keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
               storeFile file(keystoreProperties['storeFile'])
               storePassword keystoreProperties['storePassword']
               keyAlias keystoreProperties['keyAlias']
               keyPassword keystoreProperties['keyPassword']
           }
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
           // ... 其他配置
       }
   }
   ```

### 步骤 3: 构建 APK

#### 构建调试版本（Debug APK）

```bash
cd android
gradlew.bat assembleDebug
```

APK 位置：`android/app/build/outputs/apk/debug/app-debug.apk`

#### 构建发布版本（Release APK）

```bash
cd android
gradlew.bat assembleRelease
```

APK 位置：`android/app/build/outputs/apk/release/app-release.apk`

> 如果遇到权限问题，可能需要先运行：
> ```bash
> gradlew.bat assembleRelease --warning-mode all
> ```

### 步骤 4: 安装 APK 到设备（可选）

```bash
# 连接 Android 设备或启动模拟器
adb devices

# 安装 APK
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## 完整构建脚本

创建一个 PowerShell 脚本 `build-apk.ps1` 来自动化构建过程：

```powershell
# build-apk.ps1
Write-Host "开始构建 Android APK..." -ForegroundColor Green

# 检查是否已预构建
if (-not (Test-Path "android")) {
    Write-Host "预构建 Android 项目..." -ForegroundColor Yellow
    npx expo prebuild --platform android
}

# 进入 Android 目录
Set-Location android

# 清理之前的构建
Write-Host "清理构建缓存..." -ForegroundColor Yellow
.\gradlew.bat clean

# 构建 Release APK
Write-Host "构建 Release APK..." -ForegroundColor Yellow
.\gradlew.bat assembleRelease

# 返回项目根目录
Set-Location ..

# 检查构建结果
$apkPath = "android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apkPath) {
    $apkSize = (Get-Item $apkPath).Length / 1MB
    Write-Host "`n构建成功！" -ForegroundColor Green
    Write-Host "APK 位置: $apkPath" -ForegroundColor Cyan
    Write-Host "APK 大小: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Cyan
} else {
    Write-Host "`n构建失败，请检查错误信息" -ForegroundColor Red
}
```

使用方法：
```powershell
.\build-apk.ps1
```

---

## 常见问题排查

### 1. 找不到 `gradlew.bat`

**问题**：`'gradlew.bat' 不是内部或外部命令`

**解决**：
- 确保在 `android` 目录下运行命令
- 如果 `android` 文件夹不存在，先运行 `npx expo prebuild --platform android`

### 2. Java 版本错误

**问题**：`Unsupported class file major version`

**解决**：
- 确保使用 JDK 17 或更高版本
- 检查 `JAVA_HOME` 环境变量是否正确

### 3. SDK 路径找不到

**问题**：`SDK location not found`

**解决**：
- 检查 `ANDROID_HOME` 环境变量
- 在 `android/local.properties` 中手动设置：
  ```properties
  sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
  ```

### 4. 构建内存不足

**问题**：`OutOfMemoryError`

**解决**：
在 `android/gradle.properties` 中添加：
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
```

### 5. 签名配置错误

**问题**：发布版本构建失败，提示签名相关错误

**解决**：
- 检查 `keystore.properties` 文件路径和内容
- 确保密钥库文件存在且路径正确
- 对于开发测试，可以先使用调试版本：`gradlew.bat assembleDebug`

---

## 快速命令参考

```bash
# 预构建（首次或更新后）
npx expo prebuild --platform android

# 构建调试版本
cd android && gradlew.bat assembleDebug

# 构建发布版本
cd android && gradlew.bat assembleRelease

# 清理构建
cd android && gradlew.bat clean

# 查看构建变体
cd android && gradlew.bat tasks
```

---

## 下一步

构建完成后，你可以：
- 将 APK 安装到 Android 设备进行测试
- 使用 `adb install` 命令安装
- 通过文件传输工具发送到手机安装

如果需要发布到应用商店，建议使用 AAB 格式：
```bash
cd android && gradlew.bat bundleRelease
```
AAB 文件位置：`android/app/build/outputs/bundle/release/app-release.aab`

