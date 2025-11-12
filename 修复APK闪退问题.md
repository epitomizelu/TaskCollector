# 修复 APK 闪退问题

## 🔍 第一步：查看崩溃日志（最重要）

### 方法 1：使用 ADB 查看实时日志

```powershell
# 1. 清除旧日志
adb logcat -c

# 2. 开始监控日志（在另一个终端窗口）
adb logcat *:E *:W | Select-String -Pattern "AndroidRuntime|FATAL|Exception|Error|taskcollection"

# 3. 在手机上打开应用，观察崩溃日志
```

### 方法 2：查看崩溃堆栈

```powershell
# 查看完整的崩溃信息
adb logcat *:E | Select-String -Pattern "AndroidRuntime|FATAL"
```

### 方法 3：保存日志到文件

```powershell
# 清除日志
adb logcat -c

# 启动应用
adb shell am start -n com.lcy.taskcollection/.MainActivity

# 等待应用崩溃后，保存日志
adb logcat -d > crash_log.txt

# 查看日志文件
notepad crash_log.txt
```

---

## 🐛 常见闪退原因及解决方案

### 原因 1: JavaScript Bundle 未正确打包

**症状：** 应用启动后立即崩溃，日志显示 "Unable to load script"

**解决方案：**

```powershell
# 1. 确保在构建前打包 JavaScript
cd android
.\gradlew.bat clean

# 2. 重新构建（会自动打包 JS）
.\gradlew.bat assembleDebug
```

**检查：** 确认 `android/app/src/main/assets/index.android.bundle` 文件存在

---

### 原因 2: 缺少环境变量（EXPO_PUBLIC_API_KEY）

**症状：** 应用启动后崩溃，日志显示 API 相关错误

**检查：**

```powershell
# 查看是否有 .env 文件
Test-Path .env

# 查看环境变量配置
Get-Content .env
```

**解决方案：**

1. **创建 `.env` 文件**（如果不存在）：
   ```env
   EXPO_PUBLIC_API_KEY=your_api_key_here
   ```

2. **重新构建**：
   ```powershell
   cd android
   .\gradlew.bat clean
   .\gradlew.bat assembleDebug
   ```

---

### 原因 3: Expo Updates 配置问题

**症状：** 应用尝试从 Expo Updates 服务器加载更新时崩溃

**临时解决方案：** 禁用 Expo Updates

在 `app.json` 中：

```json
{
  "expo": {
    "updates": {
      "enabled": false
    }
  }
}
```

然后重新预构建：

```powershell
npx expo prebuild --platform android --clean
cd android
.\gradlew.bat assembleDebug
```

---

### 原因 4: 新架构兼容性问题

**症状：** 某些原生模块在新架构下不兼容

**临时解决方案：** 禁用新架构

在 `android/gradle.properties` 中：

```properties
newArchEnabled=false
```

然后重新预构建：

```powershell
npx expo prebuild --platform android --clean
cd android
.\gradlew.bat assembleDebug
```

---

### 原因 5: 权限问题

**症状：** 应用请求权限时崩溃

**检查：** 查看 `AndroidManifest.xml` 中的权限配置是否正确

---

### 原因 6: 缺少必要的原生依赖

**症状：** 日志显示 "ClassNotFoundException" 或 "UnsatisfiedLinkError"

**解决方案：**

```powershell
# 清理并重新构建
cd android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
```

---

## 🔧 完整调试流程

### 步骤 1: 查看崩溃日志

```powershell
# 清除日志
adb logcat -c

# 在另一个终端窗口监控日志
adb logcat *:E *:W | Select-String -Pattern "AndroidRuntime|FATAL|Exception|Error|taskcollection|ReactNative"
```

### 步骤 2: 启动应用并观察

```powershell
# 启动应用
adb shell am start -n com.lcy.taskcollection/.MainActivity

# 观察日志输出，找到崩溃原因
```

### 步骤 3: 根据日志错误修复

根据日志中的错误信息，参考上面的解决方案进行修复。

---

## 🚀 快速修复尝试

### 方案 1: 禁用 Expo Updates（最常见）

1. 修改 `app.json`：
   ```json
   "updates": {
     "enabled": false
   }
   ```

2. 重新预构建：
   ```powershell
   npx expo prebuild --platform android --clean
   cd android
   .\gradlew.bat assembleDebug
   ```

### 方案 2: 确保环境变量正确

1. 检查 `.env` 文件是否存在
2. 确保 `EXPO_PUBLIC_API_KEY` 已设置
3. 重新构建

### 方案 3: 使用 Release 构建

```powershell
cd android
.\gradlew.bat clean
.\gradlew.bat assembleRelease
```

Release 版本通常更稳定。

---

## 📋 检查清单

在重新构建前，确认：

- [ ] `.env` 文件存在且包含必要的环境变量
- [ ] `app.json` 配置正确
- [ ] 已运行 `npm install` 安装所有依赖
- [ ] Android SDK 和 Build Tools 已正确安装
- [ ] 已查看崩溃日志，了解具体错误

---

## 💡 推荐做法

1. **先查看日志**：这是最重要的，能快速定位问题
2. **逐步排查**：从最常见的问题开始（Expo Updates、环境变量）
3. **使用 Release 构建**：Release 版本通常更稳定
4. **如果问题持续**：考虑使用 EAS Build，云端构建更可靠

---

## 🔗 相关文档

- [查看崩溃日志指南](./docs/ADB_LOGCAT_TROUBLESHOOTING.md)
- [Android 调试指南](./docs/ANDROID_WIRELESS_DEBUGGING.md)

