# Android APK 网络请求失败修复指南

## 问题描述

在 Android 手机上安装 APK 后，点击登录时出现 "Network request failed" 错误。

## 可能的原因

1. **网络权限未配置**
2. **API Key 未正确配置到 APK**
3. **BASE_URL 配置错误**
4. **Android 网络安全策略限制**
5. **网络连接问题**

## 修复步骤

### 1. 检查网络权限配置

已添加以下权限到 `app.json`：
```json
"permissions": [
  "android.permission.INTERNET",
  "android.permission.ACCESS_NETWORK_STATE"
]
```

### 2. 检查 API Key 配置

#### 方式一：使用 EAS Secrets（推荐）

```bash
# 设置 API Key
eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-api-key
```

#### 方式二：在 eas.json 中配置

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "your-production-api-key"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "your-preview-api-key"
      }
    }
  }
}
```

### 3. 检查 BASE_URL 配置

确保 `config/api.config.ts` 中的 `BASE_URL` 配置正确：

```typescript
BASE_URL: __DEV__
  ? 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api'
  : 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api',
```

**注意：** 生产环境应该使用实际的云函数地址，不是占位符。

### 4. 重新打包 APK

```bash
# 使用 EAS Build 重新打包
eas build --platform android --profile production

# 或打包预览版
eas build --platform android --profile preview
```

### 5. 验证配置

打包后，可以通过以下方式验证：

1. **检查 API Key 是否正确编译到 APK**
   - 在登录界面查看错误提示中的 "API Key: 已配置/未配置"
   - 如果显示 "未配置"，说明打包时环境变量未正确设置

2. **检查 BASE_URL**
   - 查看错误提示中的 "服务器地址"
   - 确认地址是否正确

3. **检查网络连接**
   - 确保手机已连接到网络
   - 尝试在浏览器中访问云函数地址，确认可访问

## 调试方法

### 方法一：查看日志

在登录界面，错误提示会显示：
- 服务器地址
- API Key 配置状态
- 详细的错误信息

### 方法二：使用 adb logcat

```bash
# 连接手机后，查看日志
adb logcat | grep -i "network\|api\|error"
```

### 方法三：检查网络连接

在手机上：
1. 打开浏览器
2. 访问云函数地址（BASE_URL）
3. 确认是否可以访问

## 常见问题

### Q1: API Key 显示"未配置"

**原因：** 打包时环境变量未正确设置

**解决：**
1. 检查 `eas.json` 中的 `env` 配置
2. 确认 EAS Secrets 已正确设置
3. 重新打包 APK

### Q2: 服务器地址错误

**原因：** `BASE_URL` 配置错误或使用了占位符

**解决：**
1. 检查 `config/api.config.ts` 中的 `BASE_URL`
2. 确保生产环境使用实际的云函数地址
3. 重新打包 APK

### Q3: 网络连接正常，但请求失败

**原因：** 可能是证书问题或防火墙阻止

**解决：**
1. 检查云函数地址是否使用 HTTPS
2. 确认证书有效
3. 检查是否有代理或防火墙阻止

## 验证清单

- [ ] `app.json` 中已添加网络权限
- [ ] `eas.json` 中已配置 `EXPO_PUBLIC_API_KEY`
- [ ] `config/api.config.ts` 中的 `BASE_URL` 配置正确
- [ ] 已重新打包 APK
- [ ] 手机网络连接正常
- [ ] 可以在浏览器中访问云函数地址

## 下一步

如果问题仍然存在，请：
1. 查看完整的错误日志
2. 检查云函数是否正常运行
3. 确认 API Key 是否正确
4. 验证网络连接是否正常

