# 修复自动更新功能后登录失败问题

## 问题描述

在开发自动更新功能之前，APK 能正常登录。但最近几次修改后，APK 登录失败，报错 "Credentials are invalid"。

## 问题分析

### 1. 配置变更历史

- **之前能正常工作的配置**（提交 ecdc58e6）：
  ```json
  "EXPO_PUBLIC_API_KEY": "${EXPO_PUBLIC_API_KEY}"
  ```
  这是 EAS Secrets 的语法，说明之前使用的是 EAS Secrets。

- **最近的错误修改**（提交 c63ef843）：
  ```json
  "EXPO_PUBLIC_API_KEY": "EXPO_PUBLIC_API_KEY"
  ```
  这个配置是错误的，会把字符串 "EXPO_PUBLIC_API_KEY" 直接作为值。

- **当前配置**（已修复）：
  ```json
  "EXPO_PUBLIC_API_KEY": "${EXPO_PUBLIC_API_KEY}"
  ```
  已恢复为正确的 EAS Secrets 语法。

### 2. 可能的原因

1. **EAS Secrets 未配置**：如果 EAS Secrets 中没有配置 `EXPO_PUBLIC_API_KEY，构建时会失败或使用空值。

2. **需要重新构建 APK**：配置修改后，必须重新构建 APK 才能生效。

3. **调试日志只在开发环境输出**：之前的调试日志只在 `__DEV__` 模式下输出，生产环境看不到。

## 解决方案

### 步骤 1：确认 EAS Secrets 配置

```bash
# 检查 EAS Secrets
eas secret:list

# 如果没有配置，创建 Secret
eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-api-key-value
```

### 步骤 2：确认 `eas.json` 配置正确

当前配置（已修复）：
```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "${EXPO_PUBLIC_API_KEY}"
      }
    }
  }
}
```

### 步骤 3：重新构建 APK

配置修改后，必须重新构建 APK：

```bash
# 方式 1：通过 GitHub Actions 构建
# 触发 GitHub Actions 工作流

# 方式 2：本地构建
eas build --platform android --profile preview
```

### 步骤 4：验证修复

安装新构建的 APK 后：

1. **查看控制台日志**：
   - 应该能看到 `[API_CONFIG] 环境变量检查` 日志
   - 确认 `hasApiKey: true`
   - 确认 `apiKeyLength` 不为 0

2. **尝试登录**：
   - 如果仍然失败，查看登录时的详细日志
   - 检查 `API_KEY 已配置` 或 `API_KEY 未配置` 的提示

## 已修复的问题

1. ✅ **`eas.json` 配置**：已恢复为正确的 EAS Secrets 语法
2. ✅ **调试日志**：已修改为始终输出（包括生产环境），便于排查问题

## 验证清单

- [ ] EAS Secrets 已配置 `EXPO_PUBLIC_API_KEY`
- [ ] `eas.json` 使用 `${EXPO_PUBLIC_API_KEY}` 语法
- [ ] 已重新构建 APK
- [ ] 安装新 APK 后，控制台能看到 `[API_CONFIG] 环境变量检查` 日志
- [ ] 日志显示 `hasApiKey: true`
- [ ] 尝试登录，查看详细错误信息

## 如果仍然失败

如果按照上述步骤操作后仍然失败，请：

1. **查看控制台日志**：
   - 复制完整的 `[API_CONFIG] 环境变量检查` 日志
   - 复制登录时的完整错误日志

2. **检查 EAS Build 日志**：
   - 在 EAS 控制台查看构建日志
   - 确认环境变量是否正确传递

3. **对比网页端和 APK 的差异**：
   - 网页端能正常登录，说明云函数配置正确
   - APK 不能登录，说明环境变量未正确编译到 APK 中

