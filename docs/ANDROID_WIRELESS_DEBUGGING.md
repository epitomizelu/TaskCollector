# Android 无线调试指南

## 📱 前置条件

1. **Android 设备**：Android 11 (API 30) 或更高版本
2. **电脑和手机在同一 Wi-Fi 网络**
3. **已安装 ADB**（Android Debug Bridge）

## 🚀 启用无线调试

### 方法 1：通过开发者选项（推荐，Android 11+）

#### 步骤 1：启用开发者选项

1. 打开 **设置** → **关于手机**
2. 连续点击 **版本号** 7 次
3. 返回设置，找到 **开发者选项**

#### 步骤 2：启用无线调试

1. 进入 **开发者选项**
2. 找到 **无线调试**（Wireless debugging）
3. 开启 **无线调试** 开关
4. 首次使用会弹出提示，点击 **允许**

#### 步骤 3：配对设备

1. 在 **无线调试** 页面，点击 **配对设备配对码**
2. 记下显示的 **IP 地址和端口**（例如：`192.168.1.100:12345`）
3. 在电脑上运行：

```bash
adb pair <IP地址>:<端口>
```

例如：
```bash
adb pair 192.168.1.100:12345
```

4. 输入手机上显示的 **配对码**（6 位数字）
5. 配对成功后，手机会显示 **IP 地址和端口**（例如：`192.168.1.100:45678`）

#### 步骤 4：连接设备

```bash
adb connect <IP地址>:<端口>
```

例如：
```bash
adb connect 192.168.1.100:45678
```

### 方法 2：通过 USB 连接后切换到无线（Android 10 及以下）

如果设备不支持无线调试，可以先通过 USB 连接，然后切换到无线：

```bash
# 1. 通过 USB 连接设备
adb devices

# 2. 获取设备的 IP 地址
adb shell ip addr show wlan0
# 或者
adb shell ifconfig wlan0

# 3. 启用 TCP/IP 连接（使用设备 IP 和端口 5555）
adb tcpip 5555

# 4. 断开 USB 连接

# 5. 通过 Wi-Fi 连接
adb connect <设备IP>:5555
```

例如：
```bash
adb connect 192.168.1.100:5555
```

## 🔍 验证连接

```bash
# 查看已连接的设备
adb devices
```

应该看到类似输出：
```
List of devices attached
192.168.1.100:45678    device
```

## 📋 常用调试命令

### 查看日志

```bash
# 查看所有日志
adb logcat

# 只查看应用相关日志（替换为你的包名）
adb logcat | grep "com.lcy.taskcollection"

# 查看 React Native 日志
adb logcat | grep "ReactNativeJS"

# 查看 Expo 日志
adb logcat | grep "Expo"

# 查看 API Key 相关日志
adb logcat | grep "API_CONFIG\|API_KEY\|EXPO_PUBLIC"
```

### 过滤日志级别

```bash
# 只显示错误和警告
adb logcat *:E *:W

# 只显示错误
adb logcat *:E

# 显示所有级别
adb logcat *:V
```

### 清除日志

```bash
adb logcat -c
```

### 保存日志到文件

```bash
# 保存所有日志
adb logcat > logcat.txt

# 保存并过滤
adb logcat | grep "API_CONFIG\|API_KEY" > api_key_log.txt
```

## 🐛 调试登录问题

### 查看登录相关日志

```bash
# 查看登录流程日志
adb logcat | grep -E "登录|login|UserService|ApiService|API_CONFIG"

# 查看 API Key 配置日志
adb logcat | grep "API_CONFIG\|API_KEY\|EXPO_PUBLIC"

# 查看网络请求日志
adb logcat | grep -E "HTTP|fetch|request|response"
```

### 实时监控日志

```bash
# 实时查看并过滤日志
adb logcat -c && adb logcat | grep -E "登录|API|错误|Error"
```

## 📱 安装和运行应用

### 安装 APK

```bash
# 安装 APK
adb install app-release.apk

# 覆盖安装（如果已安装）
adb install -r app-release.apk
```

### 启动应用

```bash
# 启动应用（替换为你的包名和主 Activity）
adb shell am start -n com.lcy.taskcollection/.MainActivity

# 或者使用包名
adb shell monkey -p com.lcy.taskcollection -c android.intent.category.LAUNCHER 1
```

### 查看应用信息

```bash
# 查看已安装的应用
adb shell pm list packages | grep taskcollection

# 查看应用版本
adb shell dumpsys package com.lcy.taskcollection | grep versionName
```

## 🔧 故障排查

### 问题 1：无法连接设备

**解决方法：**
1. 确认手机和电脑在同一 Wi-Fi 网络
2. 检查防火墙设置，确保端口未被阻止
3. 尝试重新配对设备
4. 检查 IP 地址是否正确

### 问题 2：连接后立即断开

**解决方法：**
1. 确保手机屏幕保持解锁状态
2. 检查 Wi-Fi 连接是否稳定
3. 尝试重新配对

### 问题 3：adb 命令找不到

**解决方法：**
1. 安装 Android SDK Platform Tools
2. 将 ADB 添加到系统 PATH
3. 或使用完整路径运行 ADB

### 问题 4：无线调试选项找不到

**解决方法：**
1. 确认 Android 版本 >= 11
2. 确认已启用开发者选项
3. 某些厂商可能隐藏此选项，尝试使用 USB 连接后切换

## 💡 实用技巧

### 1. 创建快捷脚本

创建 `debug.sh` 文件：

```bash
#!/bin/bash
# 清除日志并开始监控
adb logcat -c
adb logcat | grep -E "登录|API|错误|Error|API_CONFIG|API_KEY"
```

运行：
```bash
chmod +x debug.sh
./debug.sh
```

### 2. 使用别名简化命令

在 `~/.bashrc` 或 `~/.zshrc` 中添加：

```bash
alias adbl='adb logcat'
alias adbc='adb logcat -c'
alias adba='adb logcat | grep -E "登录|API|错误|Error"'
```

### 3. 使用 logcat 颜色输出

安装 `coloredlogcat`：
```bash
pip install coloredlogcat
adb logcat | coloredlogcat
```

## 📚 相关资源

- [Android 官方文档 - 无线调试](https://developer.android.com/studio/command-line/adb#wireless)
- [ADB 命令参考](https://developer.android.com/studio/command-line/adb)
- [React Native 调试指南](https://reactnative.dev/docs/debugging)

## 🎯 针对本项目的调试命令

### 查看登录相关日志

```bash
# 清除日志
adb logcat -c

# 实时查看登录和 API Key 相关日志
adb logcat | grep -E "登录|login|UserService|ApiService|API_CONFIG|API_KEY|EXPO_PUBLIC|Credentials"
```

### 查看完整的应用日志

```bash
# 查看所有应用日志
adb logcat | grep "com.lcy.taskcollection"

# 或者查看所有日志（可能很多）
adb logcat
```

### 保存日志到文件

```bash
# 保存登录相关日志
adb logcat | grep -E "登录|login|API|错误" > login_debug.log
```

