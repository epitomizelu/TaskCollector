# OTA 更新使用指南

## 概述

项目现在同时支持两种更新方式：
1. **OTA 更新**：只更新 JavaScript 代码，无需重新安装 APK
2. **APK 更新**：完整应用更新，需要下载并安装新的 APK

两种更新方式互不干扰，可以同时使用。

## 配置说明

### 1. app.json 配置

已配置 OTA 更新：

```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/6871505d-550b-4d0e-8e87-b6537f15a5b4"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

### 2. eas.json 配置

已配置更新通道：

```json
{
  "update": {
    "preview": {
      "channel": "preview"
    },
    "production": {
      "channel": "production"
    }
  }
}
```

## 使用方法

### 发布 OTA 更新

**只修改了 JavaScript/TypeScript 代码时：**

```bash
# 1. 提交代码到 Git
git add .
git commit -m "feat: 添加新功能"
git push

# 2. 发布 OTA 更新到生产环境
eas update --branch production --message "添加新功能"

# 或发布到预览环境
eas update --branch preview --message "测试新功能"
```

**注意事项：**
- 只更新 JS 代码，不修改 `app.json` 中的 `version`
- 用户无需重新安装 APK，应用会自动更新
- 更新后应用会自动重启

### 发布 APK 更新

**需要修改原生代码、权限、插件或版本号时：**

```bash
# 1. 修改 app.json 中的 version 和 versionCode
# 2. 提交代码
git add .
git commit -m "feat: 更新版本到 1.0.1"
git push

# 3. 构建新的 APK（通过 GitHub Actions 或手动）
# 4. 上传 APK 到云存储
# 5. 更新数据库中的版本信息
```

## 更新检查逻辑

应用启动时会自动检查两种类型的更新：

1. **OTA 更新检查**：
   - 应用启动后 2 秒自动检查（在 `app/_layout.tsx` 中）
   - 静默检查，不阻塞应用启动
   - 自动下载并应用更新

2. **APK 更新检查**：
   - 用户手动点击"检查更新"按钮时检查
   - 显示更新信息，用户可以选择是否下载

## 更新页面功能

在"检查更新"页面，用户可以：

1. **查看当前版本信息**
2. **检查更新**：同时检查 OTA 和 APK 更新
3. **应用 OTA 更新**：如果有 OTA 更新，可以一键应用
4. **下载 APK 更新**：如果有 APK 更新，可以下载并安装

## 更新类型判断

系统会根据检查结果自动判断更新类型：

- **只有 OTA 更新**：显示 OTA 更新卡片
- **只有 APK 更新**：显示 APK 更新卡片
- **两种都有**：同时显示两个更新卡片
- **都没有**：显示"已是最新版本"

## 使用场景

### 场景 1：只修改 JS 代码（推荐使用 OTA）

**示例：**
- 添加新模块
- 修改 UI 界面
- 修复 bug
- 优化功能

**操作：**
```bash
# 修改代码后
eas update --branch production --message "修复 bug"
```

### 场景 2：需要修改原生代码（必须使用 APK）

**示例：**
- 添加新的原生模块
- 修改权限配置
- 添加新的插件
- 更新 Expo SDK 版本
- 修改版本号

**操作：**
```bash
# 修改 app.json 中的 version 和 versionCode
# 构建新的 APK
# 上传并更新版本信息
```

## 注意事项

### OTA 更新限制

1. **不能修改原生代码**：只能更新 JavaScript 代码
2. **不能修改配置**：不能修改 `app.json` 中的原生相关配置
3. **版本号不变**：不能修改 `version`，否则需要重新打包
4. **需要网络**：需要网络连接才能检查和应用更新

### APK 更新限制

1. **需要重新安装**：用户需要下载并安装新的 APK
2. **文件较大**：APK 文件通常几十 MB
3. **需要权限**：需要安装权限

## 最佳实践

1. **优先使用 OTA 更新**：
   - 如果只修改了 JS 代码，优先使用 OTA 更新
   - 更新速度快，用户体验好

2. **合理使用 APK 更新**：
   - 只有在需要修改原生代码时才使用 APK 更新
   - 定期发布 APK 更新以包含最新的原生依赖

3. **版本管理**：
   - OTA 更新不改变版本号
   - APK 更新需要递增版本号

4. **测试流程**：
   - 先在预览环境测试 OTA 更新
   - 确认无误后再发布到生产环境

## 故障排除

### OTA 更新不生效

1. **检查配置**：
   - 确认 `app.json` 中 `updates.enabled` 为 `true`
   - 确认 `eas.json` 中配置了正确的 `channel`

2. **检查版本**：
   - 确认 `runtimeVersion` 匹配
   - 确认 APK 的版本与更新通道匹配

3. **查看日志**：
   - 查看应用日志中的更新检查信息
   - 查看 EAS Update 控制台

### APK 更新失败

1. **检查网络**：
   - 确认可以访问云存储
   - 确认下载 URL 有效

2. **检查权限**：
   - 确认应用有安装权限
   - 确认文件下载成功

## 总结

✅ **OTA 更新**：适合只修改 JS 代码的场景，更新快速，用户体验好
✅ **APK 更新**：适合需要修改原生代码的场景，功能完整
✅ **两种方式并存**：互不干扰，根据需求选择使用

