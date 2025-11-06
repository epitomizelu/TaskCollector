# APK 打包和分发指南

## 🤔 问题：打包成 APK 后，其他人怎么使用？

### 核心答案

**所有用户使用同一个 APK，共享同一个 API Key。**

这是客户端应用的标准做法：
- ✅ 一个 APK 包含一个 API Key
- ✅ 所有用户安装后使用相同的 API Key
- ✅ 云函数通过 API Key 验证请求是否来自合法的应用
- ✅ 这是正常的，也是必要的

## 📋 APK 打包流程

### 1. 开发阶段

```bash
# 本地开发
EXPO_PUBLIC_API_KEY=your-api-key npm start
```

### 2. 打包阶段

```bash
# 使用 EAS Build 打包
eas build --platform android

# 或者本地打包
eas build --platform android --local
```

**打包时：**
- 环境变量会被编译到 APK 中
- `process.env.EXPO_PUBLIC_API_KEY` 的值会被替换为实际值
- 最终 APK 中包含这个 API Key

### 3. 分发阶段

```bash
# APK 文件可以：
- 上传到应用商店（Google Play、应用宝等）
- 直接分发给用户
- 放在网站供下载
```

**所有用户：**
- 安装同一个 APK
- 使用相同的 API Key
- 可以正常调用云函数

## 🔒 安全考虑

### 现实情况

**重要：** APK 中的 API Key **可以被提取**，但这是正常的：

1. **APK 可以反编译**：有经验的开发者可以提取 API Key
2. **这是正常现象**：大多数客户端应用都面临同样的情况
3. **不是安全问题**：API Key 本身就是用来验证应用身份的

### 安全措施

虽然无法完全隐藏，但可以采取以下措施：

#### 1. 限制 API Key 权限

在云函数中：
- 只允许必要的操作
- 限制请求频率
- 添加请求数量限制

```javascript
// 云函数中可以添加：
// - 请求频率限制（如每分钟最多 100 次）
// - IP 白名单（如果可能）
// - 操作权限限制
```

#### 2. 监控和日志

```javascript
// 记录所有 API 调用
console.log('API 调用:', {
  userId,
  method,
  path,
  timestamp: new Date().toISOString(),
});
```

#### 3. 使用不同的 API Key

- **开发版 APK**：使用开发 API Key
- **测试版 APK**：使用测试 API Key
- **正式版 APK**：使用生产 API Key

#### 4. 定期更换

如果发现异常：
- 立即更换 API Key
- 发布新版本 APK
- 旧版本会失效

#### 5. 添加应用签名验证（高级）

可以考虑：
- 验证应用包名
- 验证应用签名
- 但这需要额外的实现

## 🚀 APK 打包配置

### 方式一：EAS Build（推荐）

#### 1. 配置 `eas.json`

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

#### 2. 使用 EAS Secrets（更安全）

```bash
# 设置密钥（不在代码中暴露）
eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-production-api-key
```

在 `eas.json` 中会自动使用：

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "${EXPO_PUBLIC_API_KEY}"
      }
    }
  }
}
```

#### 3. 打包

```bash
# 生产环境打包
eas build --platform android --profile production

# 预览版打包
eas build --platform android --profile preview
```

### 方式二：本地打包

```bash
# 设置环境变量
export EXPO_PUBLIC_API_KEY=your-production-api-key

# 打包
eas build --platform android --local
```

### 方式三：使用 `.env.production`

创建 `.env.production` 文件：

```env
EXPO_PUBLIC_API_KEY=your-production-api-key
```

```bash
# 打包时自动读取
eas build --platform android
```

## 📱 APK 分发方式

### 方式一：应用商店

1. **Google Play Store**
   - 上传 APK 或 AAB
   - 用户从商店下载安装
   - 所有用户使用相同的 API Key

2. **国内应用商店**
   - 应用宝、华为应用市场等
   - 上传 APK
   - 用户下载安装

### 方式二：直接分发

1. **网站下载**
   - 将 APK 放在网站
   - 用户下载安装
   - 提供下载链接

2. **二维码下载**
   - 生成下载二维码
   - 用户扫码下载
   - 适合内部分发

### 方式三：内部分发

1. **企业内部**
   - 通过内部系统分发
   - 限制访问范围
   - 适合企业应用

2. **测试版本**
   - 分发给测试用户
   - 使用测试 API Key
   - 限制用户数量

## 🔍 验证 APK 中的配置

### 方法 1：安装后测试

1. 安装 APK 到设备
2. 打开应用
3. 触发 API 调用
4. 查看云函数日志，确认 API Key 正确

### 方法 2：查看构建日志

在 EAS Build 的构建日志中：
- 查看环境变量是否设置
- 确认 API Key 已注入

### 方法 3：应用内显示（开发时）

在应用内添加调试信息：

```typescript
// 只在开发环境显示
if (__DEV__) {
  console.log('API Key 配置:', {
    hasApiKey: !!API_CONFIG.API_KEY,
    prefix: API_CONFIG.API_KEY?.substring(0, 8) + '...',
  });
}
```

## 📝 最佳实践

### 1. 使用 EAS Secrets

```bash
# 设置密钥
eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-key

# 在 eas.json 中使用
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "${EXPO_PUBLIC_API_KEY}"
      }
    }
  }
}
```

**优点：**
- ✅ 密钥不暴露在代码中
- ✅ 不同环境使用不同的密钥
- ✅ 可以随时更新密钥

### 2. 不同版本使用不同的 API Key

```json
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "dev-api-key"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "preview-api-key"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "prod-api-key"
      }
    }
  }
}
```

### 3. 监控 API 使用

在云函数中：
- 记录所有 API 调用
- 监控异常访问
- 设置请求频率限制

### 4. 版本管理

- 每个版本使用固定的 API Key
- 如果更换 API Key，需要发布新版本
- 旧版本会继续使用旧的 API Key

## 💡 常见问题

### Q1: 每个用户需要不同的 API Key 吗？

**A:** 不需要。客户端应用中，所有用户共享同一个 API Key。这是标准做法。

**如果需要用户级别的认证：**
- 使用用户登录系统
- 每个用户有独立的 Token
- API Key 用于应用级认证，Token 用于用户级认证

### Q2: API Key 泄露了怎么办？

**A:** 
1. 立即更换云函数中的 API Key
2. 发布新版本 APK（包含新 API Key）
3. 旧版本会失效，用户需要更新

### Q3: 可以限制只有特定用户使用吗？

**A:** 
1. **应用级限制**：使用应用签名验证（需要额外实现）
2. **用户级限制**：使用用户登录和 Token 系统
3. **IP 限制**：在云函数中限制 IP（不适用于移动应用）

### Q4: 不同版本的 APK 可以使用不同的 API Key 吗？

**A:** 可以。在 `eas.json` 中为不同 profile 配置不同的 API Key：

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

## ✅ 总结

### APK 分发流程

```
开发 → 配置 API Key → 打包 APK → 分发 APK → 用户安装 → 使用应用
```

### 关键点

1. **所有用户共享同一个 API Key**
   - 这是正常的，也是必要的
   - API Key 用于验证应用身份

2. **API Key 会被编译到 APK 中**
   - 无法完全隐藏
   - 这是客户端应用的特点

3. **安全措施**
   - 使用环境变量管理
   - 限制 API Key 权限
   - 监控异常访问
   - 定期更换

4. **分发方式**
   - 应用商店（推荐）
   - 直接下载
   - 内部分发

### 推荐做法

1. ✅ 使用 EAS Secrets 管理 API Key
2. ✅ 不同环境使用不同的 API Key
3. ✅ 监控 API 调用量
4. ✅ 设置请求频率限制
5. ✅ 定期更新 API Key

**记住：** 客户端应用的特性决定了所有用户会共享同一个 API Key，这是正常的。关键是做好权限控制和监控。

