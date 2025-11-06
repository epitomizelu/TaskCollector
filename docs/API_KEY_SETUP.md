# API Key 认证配置指南

本指南说明如何配置和使用 API Key 进行权限验证。

## 🔐 认证方式

使用 **Bearer Token** 方式验证 API Key：

```
GET /api/resource HTTP/1.1
Host: example.com
Authorization: Bearer YOUR_API_KEY
```

## 📋 配置步骤

### 第一步：生成 API Key

生成一个强随机的 API Key（建议32位以上）：

```bash
# 使用 Node.js 生成
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 或使用在线工具生成
# https://www.uuidgenerator.net/
```

示例 API Key：`a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

### 第二步：配置云函数环境变量

1. 登录腾讯云控制台
2. 进入云开发控制台
3. 选择你的云函数：`task-collection-api`
4. 在"环境变量"中添加：
   - `API_KEY_1`: 你的 API Key（例如：`a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`）
   - `API_KEY_2`: 可选的第二个 API Key（如果需要）

### 第三步：配置前端 API Key

#### 方式一：通过环境变量（推荐）

创建 `.env` 文件（如果使用 Expo）：

```env
EXPO_PUBLIC_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

然后在代码中使用：

```typescript
import { apiService } from './services/api.service';

// API Key 会自动从环境变量读取
// 如果需要手动设置：
apiService.setToken(process.env.EXPO_PUBLIC_API_KEY || '');
```

#### 方式二：通过代码设置

```typescript
import { apiService } from './services/api.service';

// 设置 API Key
apiService.setToken('your-api-key-here');
```

#### 方式三：通过配置文件

编辑 `config/api.config.ts`：

```typescript
export const API_CONFIG = {
  BASE_URL: 'your-cloud-function-url',
  API_KEY: 'your-api-key-here', // 直接配置（不推荐用于生产环境）
};
```

## 🔍 验证配置

### 测试 API Key 是否有效

```typescript
import { apiService } from './services/api.service';

// 设置 API Key
apiService.setToken('your-api-key');

// 测试请求
try {
  const tasks = await apiService.getAllTasks();
  console.log('API Key 验证成功！', tasks);
} catch (error) {
  console.error('API Key 验证失败:', error);
}
```

### 查看请求头

在浏览器开发者工具的 Network 标签中，查看请求头：

```
Authorization: Bearer your-api-key-here
```

## ⚠️ 安全注意事项

1. **不要硬编码 API Key**
   - ❌ 不要在代码中直接写 API Key
   - ✅ 使用环境变量或配置文件（.env）
   - ✅ 将 `.env` 添加到 `.gitignore`

2. **使用强随机字符串**
   - 建议长度：32位以上
   - 使用加密安全的随机数生成器

3. **定期更换 API Key**
   - 如果 API Key 泄露，及时更换
   - 在云函数中更新环境变量

4. **不同环境使用不同 API Key**
   - 开发环境：`API_KEY_DEV`
   - 生产环境：`API_KEY_PROD`

5. **限制 API Key 权限**
   - 可以为不同 API Key 设置不同的权限级别
   - 在云函数中根据 API Key 判断用户权限

## 📝 云函数中的验证逻辑

云函数会自动验证每个请求的 API Key：

```javascript
// 验证 API Key
function verifyApiKey(headers) {
  const authHeader = headers.authorization || headers.Authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('缺少授权信息');
  }
  
  const apiKey = authHeader.substring(7);
  
  // 检查 API Key 是否在有效列表中
  if (!VALID_API_KEYS.includes(apiKey)) {
    throw new Error('无效的 API Key');
  }
  
  return true;
}
```

## 🐛 常见问题

### 问题1：401 未授权错误

**原因：**
- API Key 未设置
- API Key 格式错误
- API Key 不在云函数的有效列表中

**解决方法：**
1. 检查请求头是否包含 `Authorization: Bearer YOUR_API_KEY`
2. 确认云函数环境变量中配置了正确的 API Key
3. 确认前端设置的 API Key 与云函数配置一致

### 问题2：API Key 泄露

**解决方法：**
1. 立即在云函数中更换 API Key
2. 更新前端配置
3. 检查是否有异常访问

### 问题3：多个 API Key 管理

如果需要支持多个 API Key：

1. 在云函数环境变量中配置多个：
   - `API_KEY_1`: key1
   - `API_KEY_2`: key2
   - `API_KEY_3`: key3

2. 云函数会自动验证所有配置的 API Key

## 📚 相关文档

- [云函数示例代码](./tencent-cloud-function-example.md)
- [API 配置说明](../config/api.config.ts)
- [腾讯云函数文档](https://cloud.tencent.com/document/product/583)

