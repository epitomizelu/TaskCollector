# API_KEY_2 配置说明

## 什么是 API_KEY_2？

`API_KEY_2` 是一个**可选的第二个 API Key**，用于支持多个 API Key 的场景。

## 📋 使用场景

### 场景 1：多应用支持（推荐）

如果你的应用有多个版本或客户端（如 Web、移动端、桌面端），可以为每个版本配置不同的 API Key：

- **API_KEY_1**: Web 端使用的 API Key
- **API_KEY_2**: 移动端使用的 API Key

**好处：**
- 可以分别管理不同客户端的访问权限
- 如果某个客户端泄露，可以只撤销该客户端的 API Key
- 可以分别统计不同客户端的调用量

### 场景 2：多环境支持

为不同环境配置不同的 API Key：

- **API_KEY_1**: 生产环境的 API Key
- **API_KEY_2**: 测试/开发环境的 API Key

**好处：**
- 生产环境和测试环境隔离
- 测试时不会影响生产数据
- 可以分别控制不同环境的访问权限

### 场景 3：密钥轮换

在更换 API Key 时，可以同时配置新旧两个 Key：

- **API_KEY_1**: 旧的 API Key（即将废弃）
- **API_KEY_2**: 新的 API Key

**好处：**
- 可以在不中断服务的情况下更换 API Key
- 给客户端时间逐步迁移到新 Key
- 旧 Key 可以继续使用一段时间，然后移除

### 场景 4：不同权限级别

为不同权限级别配置不同的 API Key：

- **API_KEY_1**: 管理员/高级权限的 API Key
- **API_KEY_2**: 普通用户的 API Key

**好处：**
- 可以限制不同 API Key 的访问权限
- 可以分别设置不同的速率限制
- 可以分别记录不同权限的操作日志

## 🔧 如何配置

### 步骤 1：生成 API_KEY_2

生成一个新的 API Key（与 API_KEY_1 不同的值）：

**Windows PowerShell:**
```powershell
# 生成 32 位随机字符串
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Linux/Mac:**
```bash
openssl rand -hex 16
```

**Node.js:**
```javascript
const crypto = require('crypto');
const apiKey = crypto.randomBytes(32).toString('hex');
console.log('API Key:', apiKey);
```

### 步骤 2：配置云函数环境变量

1. 登录 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)
2. 进入云函数 → `task-collection-api` → "环境变量"
3. 添加或编辑环境变量：
   - **变量名：** `API_KEY_2`
   - **变量值：** 你生成的第二个 API Key
   - **描述：** 第二个 API Key（可选）

### 步骤 3：配置前端（如果需要）

如果前端需要使用 API_KEY_2，可以：

**方式 1：创建不同的环境文件**
```env
# .env.production
EXPO_PUBLIC_API_KEY=你的API_KEY_1值

# .env.development
EXPO_PUBLIC_API_KEY=你的API_KEY_2值
```

**方式 2：在代码中动态选择**
```typescript
// 根据环境选择不同的 API Key
const apiKey = __DEV__ 
  ? process.env.EXPO_PUBLIC_API_KEY_DEV || process.env.EXPO_PUBLIC_API_KEY
  : process.env.EXPO_PUBLIC_API_KEY;
```

## ✅ 验证配置

### 1. 查看云函数日志

测试时，云函数日志会显示：

```
验证 API Key: {
  validApiKeysCount: 2,  // ✅ 应该显示 2（如果配置了两个 Key）
  validApiKeysPrefix: ['xxxxxxxx...', 'yyyyyyyy...']
}
```

### 2. 测试 API_KEY_2

使用 API_KEY_2 测试 API 调用：

```bash
# 使用 curl 测试
curl -X GET "https://your-cloud-function-url/tasks" \
  -H "Authorization: Bearer YOUR_API_KEY_2" \
  -H "Content-Type: application/json"
```

## ⚠️ 注意事项

### 1. API_KEY_2 是可选的

- **不是必需的**：如果你只需要一个 API Key，只配置 `API_KEY_1` 即可
- **可以留空**：不配置 `API_KEY_2` 不会影响功能

### 2. API Key 必须不同

- **API_KEY_1** 和 **API_KEY_2** 必须是**不同的值**
- 如果两个 Key 相同，配置第二个就没有意义

### 3. 前端只需要配置一个

- 前端 `.env` 文件中的 `EXPO_PUBLIC_API_KEY` 只需要配置一个 API Key
- 通常使用 `API_KEY_1`（生产环境的 Key）
- 如果需要使用 `API_KEY_2`，可以创建不同的环境文件

### 4. 安全建议

- 不要在不同环境之间共享 API Key
- 定期更换 API Key
- 如果 API Key 泄露，立即更换并撤销旧 Key

## 📝 完整配置示例

### 云函数环境变量

```
API_KEY_1 = a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6  # 生产环境
API_KEY_2 = z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4  # 测试环境
TCB_ENV = cloud1-4gee45pq61cd6f19
```

### 前端环境变量

**.env.production:**
```env
EXPO_PUBLIC_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**.env.development:**
```env
EXPO_PUBLIC_API_KEY=z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4
```

## 🎯 推荐配置

### 对于大多数应用

**只需配置 API_KEY_1：**
- 简单、清晰
- 满足基本需求
- 易于维护

### 对于多环境应用

**配置 API_KEY_1 和 API_KEY_2：**
- `API_KEY_1`: 生产环境
- `API_KEY_2`: 测试/开发环境

### 对于多客户端应用

**配置多个 API Key：**
- `API_KEY_1`: Web 端
- `API_KEY_2`: 移动端
- （如果需要更多，可以在云函数代码中添加 `API_KEY_3`、`API_KEY_4` 等）

## 📚 相关文档

- [API Key 设置指南](./API_KEY_SETUP.md)
- [环境变量配置指南](./ENV_VARIABLES_GUIDE.md)
- [快速修复 401 错误](./QUICK_FIX_401.md)

## 总结

**API_KEY_2 是可选的第二个 API Key，用于：**
- ✅ 支持多个应用或客户端
- ✅ 支持多环境（生产、测试、开发）
- ✅ 支持密钥轮换
- ✅ 支持不同权限级别

**如果只需要一个 API Key，只配置 API_KEY_1 即可！**

