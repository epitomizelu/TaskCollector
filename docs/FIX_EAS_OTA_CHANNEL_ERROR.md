# 修复 EAS OTA 更新 Channel 错误

## ❌ 错误信息

```
EAS OTA更新状态：Call to function 'ExpoUpdates.checkForUpdateAsync' has been rejected 
→ Caused by: Failed to check for update
```

**详细错误日志：**
```
"channel-name": Required. The headers "expo-runtime-version", "expo-channel-name", 
and "expo-platform" are required.
```

## 🔍 问题原因

EAS Updates 服务器需要以下必需参数：
1. `expo-runtime-version` - 运行时版本
2. `expo-channel-name` - 更新通道名称
3. `expo-platform` - 平台（android/ios）

**根本原因：**
- APK 在构建时没有指定 `channel`
- 运行时无法获取 channel 信息，导致请求被拒绝

## ✅ 解决方案

### 步骤 1：在 eas.json 中添加 channel 配置

在 `build` 配置中为每个构建配置添加 `channel`：

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk",
        "channel": "preview"  // ✅ 添加这行
      }
    },
    "production": {
      "android": {
        "gradleCommand": ":app:bundleRelease",
        "channel": "production"  // ✅ 添加这行
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

### 步骤 2：重新构建 APK

**重要：** 必须重新构建 APK，因为 channel 信息是在构建时嵌入到 APK 中的。

```bash
# 构建预览版
eas build --platform android --profile preview

# 或构建生产版
eas build --platform android --profile production
```

### 步骤 3：验证修复

1. 安装新构建的 APK
2. 打开"检查更新"页面
3. 点击"检查更新"按钮
4. 应该不再出现 channel 错误

## 📋 配置说明

### build.channel vs update.channel

- **`build.channel`**：构建时指定，嵌入到 APK 中，用于运行时检查更新
- **`update.channel`**：发布更新时指定，用于将更新发布到特定通道

两者必须匹配：
- 如果 APK 使用 `channel: "production"` 构建
- 那么更新也必须发布到 `production` 通道

### 通道命名规则

- 使用小写字母、数字、连字符
- 推荐使用：`production`、`preview`、`staging`、`development`
- 避免使用特殊字符和空格

## 🔧 其他可能的问题

### 问题 1：runtimeVersion 不匹配

**错误：** `runtime-version mismatch`

**解决：** 确保：
1. `app.json` 中 `runtimeVersion.policy` 配置正确
2. 发布更新时使用的 runtimeVersion 与 APK 构建时的一致

### 问题 2：网络连接问题

**错误：** `Failed to download remote update`

**解决：**
1. 检查网络连接
2. 确认可以访问 `https://u.expo.dev`
3. 检查防火墙设置

### 问题 3：项目 ID 不匹配

**错误：** `Invalid project ID`

**解决：** 确认 `app.json` 中的 `extra.eas.projectId` 正确

## 📝 完整配置示例

### app.json
```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "url": "https://u.expo.dev/YOUR_PROJECT_ID"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_PROJECT_ID"
      }
    }
  }
}
```

### eas.json
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

## ✅ 验证清单

- [ ] `eas.json` 中 `build` 配置包含 `channel`
- [ ] `eas.json` 中 `update` 配置包含 `channel`
- [ ] `build.channel` 和 `update.channel` 匹配
- [ ] 已重新构建 APK（使用新的 channel 配置）
- [ ] 已安装新构建的 APK
- [ ] 更新检查不再报错

## 🎯 总结

**关键点：**
1. ✅ 必须在 `build` 配置中添加 `channel`
2. ✅ 必须重新构建 APK
3. ✅ `build.channel` 和 `update.channel` 必须匹配

**修复后：**
- EAS OTA 更新检查应该正常工作
- 不再出现 "channel-name: Required" 错误
- 可以正常检查和下载更新

