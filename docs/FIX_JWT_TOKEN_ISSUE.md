# 🔧 修复：JWT Token 被错误用作 API Key

## 问题描述

从云函数日志发现：
- 前端发送的是 JWT Token（`eyJhbGciOiJSU...`），而不是简单的 API Key
- 云函数期望的是简单的 API Key 字符串（从环境变量读取）

## 问题原因

在 `services/auth.service.ts` 中，代码错误地将用户的 JWT Token 设置为了 API Key：
```typescript
apiService.setToken(token); // ❌ 错误：将 JWT Token 用作 API Key
```

这导致：
1. 用户登录后，JWT Token 被设置为 `apiService` 的 token
2. 所有 API 请求都使用 JWT Token 而不是 API Key
3. 云函数无法识别 JWT Token，因为期望的是简单的 API Key 字符串

## ✅ 已修复

### 修复 1：移除 auth.service 中的错误设置

已从 `services/auth.service.ts` 中移除了以下代码：
- `apiService.setToken(token);` - 初始化时
- `apiService.setToken(token);` - 登录时
- `apiService.clearToken();` - 登出时

### 修复 2：确保 API Key 优先使用环境变量

已更新 `config/api.config.ts` 中的 `getHeaders` 函数：
```typescript
// 优先使用环境变量中的 API_KEY（用于云函数认证）
// 只有在没有配置 API_KEY 时，才使用传入的 token（用于向后兼容）
const apiKey = API_CONFIG.API_KEY || token;
```

## 📋 下一步操作

### 步骤 1：配置云函数环境变量

1. 登录 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)
2. 进入云函数 → `task-collection-api`
3. 点击"环境变量"标签
4. 添加环境变量：
   - **变量名：** `API_KEY_1`
   - **变量值：** 你的实际 API Key（例如：`a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`）
   - **变量名：** `TCB_ENV`
   - **变量值：** 你的云开发环境 ID

### 步骤 2：配置前端环境变量

在项目根目录创建或编辑 `.env` 文件：

```env
EXPO_PUBLIC_API_KEY=你的API Key值（与云函数中的API_KEY_1完全一致）
```

**重要：**
- 必须是简单的字符串（不是 JWT Token）
- 建议 32-64 位随机字符串
- 与云函数环境变量中的 `API_KEY_1` 完全一致

### 步骤 3：重启开发服务器

```bash
# 停止当前服务器（Ctrl+C）
npm start
```

### 步骤 4：清除旧的 Token（如果存在）

如果之前有 JWT Token 被设置，可能需要清除：

1. 清除浏览器缓存和本地存储
2. 或者在代码中手动清除（如果应用正在运行）

## 🔍 验证修复

### 1. 检查前端配置

在浏览器控制台运行：
```javascript
console.log('API Key:', process.env.EXPO_PUBLIC_API_KEY);
```

应该显示你配置的 API Key（简单的字符串），而不是 JWT Token。

### 2. 测试 API 调用

访问 `/test-api` 页面，点击"开始测试"。

### 3. 查看云函数日志

应该看到：
```
提取的 API Key: {
  length: 32,  // ✅ 应该是简单的字符串长度（32-64），不是 728（JWT Token 长度）
  prefix: 'a1b2c3d4...',
}
验证 API Key: {
  validApiKeysCount: 1,  // ✅ 应该是 1 或更多
}
API Key 验证成功
```

## 📝 关键区别

### API Key（用于云函数认证）
- **格式：** 简单的随机字符串
- **长度：** 32-64 字符
- **示例：** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
- **用途：** 验证应用是否有权限调用云函数
- **存储：** 环境变量（`.env` 和云函数环境变量）

### JWT Token（用于用户认证）
- **格式：** JWT Token（以 `eyJ` 开头）
- **长度：** 通常 200-1000+ 字符
- **示例：** `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...`
- **用途：** 验证用户的登录状态和身份
- **存储：** AsyncStorage（用户登录后）

## ✅ 检查清单

修复后，确认以下各项：

- [ ] 已从 `auth.service.ts` 移除 `apiService.setToken(token)`
- [ ] 已更新 `config/api.config.ts` 优先使用环境变量
- [ ] 云函数环境变量 `API_KEY_1` 已配置
- [ ] 前端 `.env` 文件中的 `EXPO_PUBLIC_API_KEY` 已配置
- [ ] API Key 是简单的字符串（不是 JWT Token）
- [ ] 已重启开发服务器
- [ ] 测试接口可以正常调用

## 🐛 如果仍然有问题

### Q1: 仍然看到 JWT Token 被发送

**原因：** 可能之前设置的 token 还在内存中。

**解决：**
1. 完全重启应用（清除所有状态）
2. 清除浏览器缓存
3. 检查是否有其他地方调用了 `apiService.setToken()`

### Q2: API Key 仍然是 undefined

**原因：** `.env` 文件未读取或未重启服务器。

**解决：**
1. 确认 `.env` 文件在项目根目录
2. 确认变量名是 `EXPO_PUBLIC_API_KEY`
3. 重启开发服务器
4. 在浏览器控制台检查：`console.log(process.env.EXPO_PUBLIC_API_KEY)`

完成以上步骤后，问题应该可以解决！

