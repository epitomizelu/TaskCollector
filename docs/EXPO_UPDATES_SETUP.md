# Expo Updates OTA 更新配置指南

## 已完成配置

### 1. 安装依赖

```bash
npx expo install expo-updates
```

### 2. 配置 app.json

已添加以下配置：

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

**配置说明：**
- `enabled: true` - 启用 OTA 更新
- `checkAutomatically: "ON_LOAD"` - 应用启动时自动检查更新
- `fallbackToCacheTimeout: 0` - 如果更新失败，立即回退到缓存版本
- `url` - Expo Updates 服务地址（使用项目 ID）
- `runtimeVersion.policy: "appVersion"` - 使用 `app.json` 中的 `version` 作为运行时版本

### 3. 配置 eas.json

已添加以下配置：

```json
{
  "build": {
    "preview": {
      "android": {
        "channel": "preview"
      }
    },
    "production": {
      "android": {
        "channel": "production"
      }
    }
  },
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

**配置说明：**
- `channel` - 更新通道，用于区分预览版和生产版
- 预览版和生产版使用不同的通道，互不影响

### 4. 创建更新服务

已创建 `services/update.service.ts`，提供以下功能：
- `checkForUpdate()` - 检查是否有可用更新
- `reloadAsync()` - 应用更新（重启应用）
- `getUpdateInfo()` - 获取当前更新信息
- `isEnabled()` - 检查是否支持更新

### 5. 集成到应用

已在 `app/_layout.tsx` 中集成更新检查：
- 应用启动后 2 秒自动检查更新
- 静默检查，不阻塞应用启动
- 自动下载并应用更新

## 使用方法

### 发布更新

**开发完成后，发布更新到生产环境：**

```bash
# 1. 提交代码到 Git
git add .
git commit -m "添加新功能"
git push

# 2. 发布更新到生产环境
eas update --branch production --message "添加新功能"

# 或发布到预览环境
eas update --branch preview --message "添加新功能"
```

**用户端：**
- 应用启动时自动检查更新
- 如果有新版本，自动下载并应用
- 用户无需任何操作

### 查看更新历史

```bash
# 查看更新列表
eas update:list

# 查看特定通道的更新
eas update:list --branch production
```

### 回滚更新

如果新版本有问题，可以回滚：

```bash
# 回滚到上一个版本
eas update:rollback --branch production
```

## 版本管理

### runtimeVersion 策略

当前使用 `appVersion` 策略，意味着：
- 如果只修改 JS 代码，`app.json` 中的 `version` 不变，可以直接发布更新
- 如果修改了原生代码或 `app.json` 配置，需要更新 `version` 并重新打包 APK

### 更新版本号

如果需要更新版本号：

```json
{
  "expo": {
    "version": "1.0.1",  // 更新版本号
    "android": {
      "versionCode": 2   // 更新版本代码
    }
  }
}
```

然后：
1. 重新打包 APK（因为版本号变了）
2. 之后可以继续使用 OTA 更新（只要版本号不变）

## 注意事项

### 1. 开发环境

- 开发环境（`npm start`）不会检查更新
- 只有打包后的 APK 才会检查更新

### 2. 原生代码修改

如果修改了以下内容，需要重新打包 APK：
- 原生代码
- `app.json` 配置（权限、插件等）
- Expo SDK 版本
- `runtimeVersion` 改变

### 3. 更新限制

**EAS Update 免费版限制：**
- 每月 10,000 次更新请求
- 存储限制 1 GB
- 适合中小型应用

### 4. 更新检查频率

当前配置：
- 应用启动时检查（`ON_LOAD`）
- 更新服务中设置了 5 分钟防抖，避免频繁检查

### 5. 强制更新

如果需要强制更新，可以在更新服务中添加逻辑：

```typescript
const update = await updateService.checkForUpdate();
if (update.isAvailable && update.manifest?.extra?.forceUpdate) {
  // 显示强制更新提示
  await updateService.reloadAsync();
}
```

## 测试更新

### 1. 本地测试

```bash
# 发布测试更新
eas update --branch preview --message "测试更新"

# 在设备上安装预览版 APK
# 应用启动时会自动检查并应用更新
```

### 2. 验证更新

- 查看应用日志，确认更新检查成功
- 修改代码后发布更新，验证是否生效
- 测试回滚功能

## 故障排除

### 更新不生效

1. **检查配置**
   - 确认 `app.json` 中 `updates.enabled` 为 `true`
   - 确认 `eas.json` 中配置了正确的 `channel`

2. **检查版本**
   - 确认 `runtimeVersion` 匹配
   - 确认 APK 的版本与更新通道匹配

3. **查看日志**
   - 查看应用日志中的更新检查信息
   - 查看 EAS Update 控制台

### 更新失败

1. **网络问题**
   - 检查网络连接
   - 确认可以访问 Expo Updates 服务

2. **版本不匹配**
   - 确认 `runtimeVersion` 匹配
   - 确认更新通道匹配

3. **回退到缓存**
   - 如果更新失败，会自动回退到缓存版本
   - 可以手动回滚：`eas update:rollback`

## 总结

✅ **已完成：**
- 安装 expo-updates
- 配置 app.json
- 配置 eas.json
- 创建更新服务
- 集成到应用

✅ **使用方法：**
- 开发完成后运行 `eas update --branch production`
- 用户自动更新，无需重新安装

✅ **优势：**
- 不需要重新打包 APK（只修改 JS 代码时）
- 用户无需重新安装
- 更新速度快
- 支持回滚

