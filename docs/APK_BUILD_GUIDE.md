# APK 打包和分发完整指南

## 🎯 核心答案

**所有用户安装同一个 APK，共享同一个 API Key。**

这是客户端应用的标准做法：
- ✅ 一个 APK 包含一个 API Key（编译时注入）
- ✅ 所有用户安装后使用相同的 API Key
- ✅ 云函数通过 API Key 验证请求是否来自合法的应用
- ✅ 这是正常的，也是必要的

## 📱 APK 打包流程

### 步骤 1：配置 API Key

#### 方式一：使用 EAS Secrets（推荐）

```bash
# 设置密钥（不在代码中暴露）
eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-production-api-key
```

**优点：**
- ✅ 密钥不暴露在代码中
- ✅ 不同环境可以使用不同的密钥
- ✅ 可以随时更新密钥

#### 方式二：在 eas.json 中配置

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "your-production-api-key"
      }
    }
  }
}
```

**注意：** 这种方式会暴露在代码中，不推荐用于生产环境。

### 步骤 2：打包 APK

```bash
# 使用 EAS Build 打包
eas build --platform android --profile production

# 或打包预览版
eas build --platform android --profile preview
```

**打包过程：**
1. EAS Build 读取环境变量
2. 将 `EXPO_PUBLIC_API_KEY` 的值编译到代码中
3. 生成 APK 文件
4. APK 中包含 API Key

### 步骤 3：分发 APK

**方式一：应用商店**
- 上传到 Google Play、应用宝等
- 用户从商店下载安装

**方式二：直接分发**
- 将 APK 放在网站
- 用户直接下载安装

**方式三：内部分发**
- 通过内部系统分发
- 适合企业应用或测试版本

## 🔒 工作原理

### APK 中的 API Key

```
APK 文件
  ├── 应用代码（包含 API Key）
  ├── 资源文件
  └── 配置文件
```

**重要：**
- API Key **会被编译到 APK 中**
- 所有用户安装后使用**相同的 API Key**
- 这是客户端应用的特点，无法避免

### 用户使用流程

```
用户下载 APK
    ↓
安装到设备
    ↓
打开应用
    ↓
应用自动使用编译在代码中的 API Key
    ↓
发送请求到云函数
    ↓
云函数验证 API Key
    ↓
返回数据
```

**用户无需任何配置：**
- ✅ 不需要手动输入 API Key
- ✅ 不需要配置环境变量
- ✅ 安装后即可使用

## 📋 配置示例

### 更新 `eas.json`

已更新 `eas.json`，添加环境变量配置：

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
    },
    "production": {
      "android": {
        "gradleCommand": ":app:bundleRelease"
      },
      "env": {
        "EXPO_PUBLIC_API_KEY": "${EXPO_PUBLIC_API_KEY}"
      }
    }
  }
}
```

### 使用 EAS Secrets

```bash
# 1. 创建密钥
eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-production-api-key

# 2. 打包时自动使用
eas build --platform android --profile production
```

### 直接配置（不推荐）

如果不想使用 EAS Secrets，可以直接在 `eas.json` 中配置：

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "your-production-api-key"
      }
    }
  }
}
```

**注意：** 这种方式会暴露在代码仓库中，不推荐。

## 💡 常见问题

### Q1: 每个用户需要不同的 API Key 吗？

**A:** 不需要。所有用户共享同一个 API Key。

**如果需要用户级别的认证：**
- 使用用户登录系统
- 每个用户有独立的 Token
- API Key 用于应用级认证，Token 用于用户级认证

### Q2: API Key 会在 APK 中暴露吗？

**A:** 是的，API Key 会被编译到 APK 中。这是客户端应用的特点。

**但这不是安全问题：**
- API Key 本身就是用来验证应用身份的
- 大多数客户端应用都面临同样的情况
- 关键是做好权限控制和监控

### Q3: 如何限制只有合法用户使用？

**A:** 可以通过以下方式：

1. **应用签名验证**（需要额外实现）
2. **用户登录系统**（推荐）
3. **请求频率限制**（在云函数中实现）
4. **监控异常访问**

### Q4: 不同版本的 APK 可以使用不同的 API Key 吗？

**A:** 可以。在 `eas.json` 中为不同 profile 配置：

```json
{
  "build": {
    "v1": {
      "env": { "EXPO_PUBLIC_API_KEY": "key-v1" }
    },
    "v2": {
      "env": { "EXPO_PUBLIC_API_KEY": "key-v2" }
    }
  }
}
```

## ✅ 最佳实践

### 1. 使用 EAS Secrets

```bash
# 设置密钥
eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-key

# 在 eas.json 中使用
"env": {
  "EXPO_PUBLIC_API_KEY": "${EXPO_PUBLIC_API_KEY}"
}
```

### 2. 不同环境使用不同的 API Key

- **开发环境**：开发用的 API Key
- **测试环境**：测试用的 API Key
- **生产环境**：生产用的 API Key

### 3. 监控和限制

在云函数中：
- 记录所有 API 调用
- 设置请求频率限制
- 监控异常访问

### 4. 版本管理

- 每个版本使用固定的 API Key
- 如果更换 API Key，需要发布新版本
- 旧版本会继续使用旧的 API Key

## 📚 相关文档

- [APK 分发指南](./APK_DISTRIBUTION.md)
- [环境变量配置指南](./ENV_VARIABLES_GUIDE.md)
- [API Key 客户端使用](./API_KEY_CLIENT_USAGE.md)

## 🎯 总结

### 核心要点

1. **所有用户共享同一个 API Key**
   - 这是正常的，也是必要的
   - API Key 用于验证应用身份

2. **API Key 会被编译到 APK 中**
   - 无法完全隐藏
   - 这是客户端应用的特点

3. **用户无需任何配置**
   - 安装 APK 后即可使用
   - 应用自动使用编译在代码中的 API Key

4. **安全措施**
   - 使用 EAS Secrets 管理
   - 限制 API Key 权限
   - 监控异常访问
   - 定期更换

**记住：** 客户端应用的特点决定了所有用户会共享同一个 API Key，这是正常的。关键是做好权限控制和监控。

