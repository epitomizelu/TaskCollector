# ADB Logcat 看不到日志的排查方法

## 问题：使用 `adb logcat | findstr "com.lcy.taskcollection"` 看不到日志

## 原因分析

`logcat` 默认不会直接显示包名，日志是通过标签（tag）输出的。需要：

1. **查看所有日志**，确认应用是否在运行
2. **使用正确的过滤方式**
3. **检查应用是否产生日志**

## 解决方案

### 方法 1：查看所有日志（推荐）

```bash
# 清除旧日志
adb logcat -c

# 查看所有日志（会很多，但能看到应用日志）
adb logcat
```

然后运行应用，观察日志输出。

### 方法 2：使用 React Native 标签过滤

```bash
# React Native 应用的日志通常使用这些标签
adb logcat | findstr "ReactNativeJS"

# 或者
adb logcat | findstr "ReactNative"
```

### 方法 3：使用应用进程 ID 过滤

```bash
# 1. 先找到应用的进程 ID
adb shell pidof com.lcy.taskcollection

# 2. 使用进程 ID 过滤（假设进程 ID 是 12345）
adb logcat --pid=12345
```

### 方法 4：使用包名过滤（需要先运行应用）

```bash
# 先运行应用，然后使用包名过滤
adb logcat | findstr "taskcollection"
```

### 方法 5：使用我们添加的日志标签过滤

根据代码，我们使用了这些日志标签：

```bash
# API 配置相关
adb logcat | findstr "API_CONFIG"

# API Key 相关
adb logcat | findstr "API_KEY"

# 登录相关
adb logcat | findstr "登录\|login\|UserService\|ApiService"

# 所有相关日志一起看
adb logcat | findstr "API_CONFIG\|API_KEY\|登录\|login\|UserService\|ApiService\|EXPO_PUBLIC"
```

### 方法 6：使用 logcat 的标签过滤（最准确）

```bash
# 使用 logcat 的标签过滤功能
adb logcat ReactNativeJS:* *:S

# 或者查看所有级别的日志
adb logcat *:V | findstr "API\|登录\|login"
```

## 完整调试流程

### 步骤 1：清除旧日志

```bash
adb logcat -c
```

### 步骤 2：开始监控日志

```bash
# 方式 1：查看所有日志（推荐，能看到所有信息）
adb logcat

# 方式 2：只查看 React Native 日志
adb logcat ReactNativeJS:* *:S

# 方式 3：查看错误和警告
adb logcat *:E *:W

# 方式 4：使用我们的日志标签
adb logcat | findstr "API_CONFIG\|API_KEY\|登录\|login\|UserService\|ApiService"
```

### 步骤 3：运行应用

在手机上打开应用，进行登录操作。

### 步骤 4：观察日志

应该能看到类似这样的日志：

```
I ReactNativeJS: [API_CONFIG] 环境变量检查: {...}
I ReactNativeJS: [下午12:39:07] === 开始登录流程 ===
I ReactNativeJS: [ApiService 12:39:07] 开始登录API调用，手机号: 18022759051
```

## 验证应用是否在运行

```bash
# 查看应用是否在运行
adb shell ps | findstr "taskcollection"

# 或者
adb shell pidof com.lcy.taskcollection
```

如果能看到进程，说明应用在运行。

## 验证日志系统是否正常

```bash
# 测试 logcat 是否正常
adb logcat -d | findstr "AndroidRuntime"

# 应该能看到一些系统日志
```

## 推荐的完整命令

### Windows PowerShell

```powershell
# 清除日志
adb logcat -c

# 实时查看所有相关日志
adb logcat | Select-String -Pattern "API_CONFIG|API_KEY|登录|login|UserService|ApiService|EXPO_PUBLIC|ReactNativeJS"
```

### Windows CMD

```cmd
# 清除日志
adb logcat -c

# 实时查看所有相关日志
adb logcat | findstr "API_CONFIG API_KEY 登录 login UserService ApiService EXPO_PUBLIC ReactNativeJS"
```

### Linux/Mac

```bash
# 清除日志
adb logcat -c

# 实时查看所有相关日志
adb logcat | grep -E "API_CONFIG|API_KEY|登录|login|UserService|ApiService|EXPO_PUBLIC|ReactNativeJS"
```

## 如果仍然看不到日志

### 检查 1：应用是否真的在运行？

```bash
# 查看所有运行的应用
adb shell ps | findstr "taskcollection"
```

### 检查 2：日志级别是否正确？

```bash
# 查看所有级别的日志（包括 VERBOSE）
adb logcat *:V | findstr "taskcollection"
```

### 检查 3：应用是否产生日志？

在应用代码中，我们使用了 `console.log`，这些日志会被 React Native 转换为 `ReactNativeJS` 标签。

```bash
# 查看 React Native 日志
adb logcat ReactNativeJS:* *:S
```

### 检查 4：使用 logcat 的缓冲区

```bash
# 查看所有缓冲区
adb logcat -b all

# 查看主缓冲区
adb logcat -b main

# 查看系统缓冲区
adb logcat -b system
```

## 最佳实践

### 创建调试脚本

创建 `debug.bat`（Windows）：

```batch
@echo off
echo 清除日志...
adb logcat -c
echo 开始监控日志...
adb logcat | findstr "API_CONFIG API_KEY 登录 login UserService ApiService ReactNativeJS"
```

或者 `debug.sh`（Linux/Mac）：

```bash
#!/bin/bash
echo "清除日志..."
adb logcat -c
echo "开始监控日志..."
adb logcat | grep -E "API_CONFIG|API_KEY|登录|login|UserService|ApiService|ReactNativeJS"
```

## 常见问题

### Q1: 为什么 `findstr "com.lcy.taskcollection"` 找不到日志？

**A:** `logcat` 输出的是日志标签和消息，不是包名。需要使用日志标签或内容来过滤。

### Q2: 如何知道应用使用了哪些日志标签？

**A:** 
- React Native 应用通常使用 `ReactNativeJS` 标签
- 查看代码中的 `console.log` 输出
- 使用 `adb logcat` 查看所有日志，观察应用产生的标签

### Q3: 日志太多怎么办？

**A:** 
- 使用更精确的过滤条件
- 只查看错误和警告：`adb logcat *:E *:W`
- 保存到文件后搜索：`adb logcat > log.txt`

## 针对本项目的推荐命令

```bash
# 清除日志
adb logcat -c

# 查看登录和 API Key 相关日志（推荐）
adb logcat | findstr "API_CONFIG API_KEY 登录 login UserService ApiService EXPO_PUBLIC ReactNativeJS"

# 或者只查看 React Native 日志
adb logcat ReactNativeJS:* *:S
```

