# 调试 APK 闪退问题

## 🔍 查看应用崩溃日志的正确方法

### 方法 1：实时监控应用日志（推荐）

```powershell
# 清除日志
adb logcat -c

# 实时查看应用相关日志
adb logcat | Select-String -Pattern "taskcollection|ReactNative|Expo|AndroidRuntime|FATAL"
```

**操作步骤：**
1. 运行上面的命令
2. 在手机上打开应用
3. 观察日志输出，找到崩溃信息

### 方法 2：只查看错误和崩溃

```powershell
# 清除日志
adb logcat -c

# 启动应用
adb shell am start -n com.lcy.taskcollection/.MainActivity

# 等待几秒后，查看崩溃日志
adb logcat -d *:E | Select-String -Pattern "taskcollection|AndroidRuntime|FATAL"
```

### 方法 3：查看完整的崩溃堆栈

```powershell
# 清除日志
adb logcat -c

# 启动应用
adb shell am start -n com.lcy.taskcollection/.MainActivity

# 等待应用崩溃后，查看完整日志
adb logcat -d > crash_log.txt
notepad crash_log.txt
```

然后在文件中搜索：
- `AndroidRuntime`
- `FATAL EXCEPTION`
- `taskcollection`
- `ReactNative`

---

## 🐛 常见崩溃原因及解决方案

### 1. JavaScript Bundle 未找到

**错误信息：**
```
Unable to load script. Make sure you're either running Metro...
```

**解决方案：**
- ✅ 已修复：bundle 文件已包含在 APK 中

### 2. 环境变量缺失

**错误信息：**
```
EXPO_PUBLIC_API_KEY is not defined
```

**解决方案：**
- 检查 `.env` 文件是否存在
- 确保构建时环境变量已加载

### 3. Expo Updates 配置问题

**错误信息：**
```
Failed to fetch update
```

**临时解决方案：**
在 `app.json` 中禁用 Expo Updates：
```json
{
  "expo": {
    "updates": {
      "enabled": false
    }
  }
}
```

然后重新预构建和构建。

### 4. 原生模块初始化失败

**错误信息：**
```
ClassNotFoundException
UnsatisfiedLinkError
```

**解决方案：**
- 重新预构建项目
- 清理并重新构建

---

## 📋 完整调试流程

### 步骤 1: 清除日志并启动监控

```powershell
adb logcat -c
adb logcat | Select-String -Pattern "taskcollection|ReactNative|Expo|AndroidRuntime|FATAL|Exception"
```

### 步骤 2: 启动应用

```powershell
adb shell am start -n com.lcy.taskcollection/.MainActivity
```

### 步骤 3: 观察日志

查看日志中的错误信息，特别是：
- `FATAL EXCEPTION`
- `AndroidRuntime`
- `ReactNativeJS`
- `Expo`

### 步骤 4: 根据错误信息修复

根据日志中的具体错误，参考上面的解决方案。

---

## 🔧 快速修复尝试

### 方案 1: 禁用 Expo Updates

如果日志显示 Expo Updates 相关错误：

1. 修改 `app.json`：
   ```json
   "updates": {
     "enabled": false
   }
   ```

2. 重新预构建：
   ```powershell
   npx expo prebuild --platform android --clean
   ```

3. 重新打包 bundle：
   ```powershell
   npx expo export --platform android --output-dir temp_export
   Copy-Item temp_export\_expo\static\js\android\entry-*.hbc android\app\src\main\assets\index.android.bundle -Force
   ```

4. 重新构建：
   ```powershell
   cd android
   .\gradlew.bat assembleDebug
   ```

### 方案 2: 检查环境变量

确保 `.env` 文件存在且包含必要的变量。

---

## 💡 提示

- 日志中的系统错误（如 `android.system.suspend`）可以忽略
- 重点关注包含 `taskcollection`、`ReactNative`、`AndroidRuntime` 的日志
- 如果应用立即崩溃，日志会在应用启动时立即出现

