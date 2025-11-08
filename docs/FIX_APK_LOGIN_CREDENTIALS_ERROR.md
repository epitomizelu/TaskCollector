# 修复 APK 登录 "Credentials are invalid" 错误

## 问题描述

APK 登录时出现错误：
```
Credentials are invalid. For more information, please refer to https://docs.cloudbase.net/error-code/service
```

但网页端登录正常。

## 问题原因

APK 中的 `EXPO_PUBLIC_API_KEY` 环境变量没有正确编译到应用中，导致：
1. API 请求时没有发送正确的 `Authorization: Bearer <API_KEY>` 头
2. 云函数验证 API Key 失败
3. 返回 "Credentials are invalid" 错误

## 解决方案

### 方案 1：使用 EAS Secrets（推荐）

1. **在 EAS 中配置 Secret**：
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-api-key-value
   ```

2. **修改 `eas.json`**：
   ```json
   {
     "build": {
       "preview": {
         "android": {
           "buildType": "apk"
         },
         "env": {
           "EXPO_PUBLIC_API_KEY": "${EXPO_PUBLIC_API_KEY}"
         }
       }
     }
   }
   ```

3. **重新构建 APK**：
   ```bash
   eas build --platform android --profile preview
   ```

### 方案 2：在 GitHub Actions 中传递环境变量

如果使用 GitHub Actions 构建，确保环境变量正确传递：

1. **在 GitHub Secrets 中配置**：
   - 进入仓库 Settings → Secrets and variables → Actions
   - 添加 Secret：`EXPO_PUBLIC_API_KEY` = `你的API Key值`

2. **在 GitHub Actions 工作流中使用**：
   ```yaml
   - name: Run EAS Build
     env:
       EXPO_PUBLIC_API_KEY: ${{ secrets.EXPO_PUBLIC_API_KEY }}
     run: eas build --platform android --profile preview
   ```

3. **确保 `eas.json` 配置正确**：
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

### 方案 3：验证环境变量是否正确编译

在代码中添加调试日志，检查 API Key 是否正确读取：

```typescript
// config/api.config.ts
export const API_CONFIG = {
  API_KEY: process.env.EXPO_PUBLIC_API_KEY || '',
};

// 添加调试日志（仅在开发环境）
if (__DEV__) {
  console.log('API Key 配置:', {
    hasApiKey: !!API_CONFIG.API_KEY,
    apiKeyLength: API_CONFIG.API_KEY.length,
    apiKeyPrefix: API_CONFIG.API_KEY.substring(0, 8) + '...',
  });
}
```

## 验证步骤

1. **检查 APK 中的环境变量**：
   - 在登录页面添加调试日志
   - 查看控制台输出，确认 `API_KEY` 是否存在

2. **检查网络请求**：
   - 使用抓包工具（如 Charles、Fiddler）查看请求头
   - 确认 `Authorization: Bearer <API_KEY>` 头是否存在

3. **检查云函数日志**：
   - 在腾讯云控制台查看云函数日志
   - 查看 API Key 验证相关的日志

## 常见问题

### Q1: 为什么网页端正常，APK 不正常？

**A:** 网页端可能从 `.env` 文件读取环境变量，而 APK 需要在构建时编译环境变量。

### Q2: 如何确认环境变量是否正确编译？

**A:** 
1. 在代码中添加 `console.log(process.env.EXPO_PUBLIC_API_KEY)`
2. 构建 APK 后，查看日志输出
3. 如果输出 `undefined` 或空字符串，说明环境变量未正确编译

### Q3: EAS Secrets 和 GitHub Secrets 有什么区别？

**A:**
- **EAS Secrets**：由 EAS 管理，在 `eas build` 时自动注入
- **GitHub Secrets**：由 GitHub 管理，在 GitHub Actions 工作流中使用

如果使用 GitHub Actions 构建，需要确保环境变量正确传递到 EAS Build。

## 相关文件

- `eas.json` - EAS Build 配置
- `.github/workflows/eas-build.yml` - GitHub Actions 工作流
- `config/api.config.ts` - API 配置
- `services/api.service.ts` - API 服务层

