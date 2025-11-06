# API Key 客户端使用说明

## 🤔 问题：为什么客户端需要 API Key？

### 工作原理

```
客户端应用
    ↓
发送请求（包含 API Key）
    ↓
云函数接收请求
    ↓
验证 API Key（与云函数环境变量中的值对比）
    ↓
如果匹配 → 允许访问
如果不匹配 → 返回 401 错误
```

**关键点：**
- 客户端需要 API Key 来**证明自己的身份**
- 云函数使用 API Key 来**验证请求是否来自合法的客户端**
- 这是 API 认证的标准做法

## 📋 API Key 在客户端的使用方式

### 方式一：环境变量（推荐）

**配置文件：** `.env`（不提交到 Git）

```env
EXPO_PUBLIC_API_KEY=your-api-key-here
```

**代码中使用：**

```typescript
// config/api.config.ts
export const API_CONFIG = {
  API_KEY: process.env.EXPO_PUBLIC_API_KEY || '', // 从环境变量读取
};
```

**优点：**
- ✅ 不硬编码在代码中
- ✅ 不同环境可以使用不同的 Key
- ✅ 不会意外提交到 Git

### 方式二：从配置文件读取（不推荐）

```typescript
// config/api.config.ts
export const API_CONFIG = {
  API_KEY: 'your-api-key-here', // ❌ 硬编码，不推荐
};
```

**缺点：**
- ❌ 代码中暴露 API Key
- ❌ 会提交到 Git 仓库
- ❌ 不安全

## 🔒 安全考虑

### 现实情况

**重要：** 在客户端应用中，API Key **无法完全隐藏**，因为：

1. **代码会被打包**：客户端应用最终会打包成 JavaScript 代码
2. **用户可以看到**：通过浏览器开发者工具可以查看网络请求
3. **这是正常现象**：大多数客户端应用都面临同样的情况

### 安全措施

虽然无法完全隐藏，但可以采取以下措施：

#### 1. 使用环境变量（不硬编码）

```typescript
// ✅ 正确：从环境变量读取
API_KEY: process.env.EXPO_PUBLIC_API_KEY || ''

// ❌ 错误：硬编码
API_KEY: 'your-api-key-here'
```

#### 2. 限制 API Key 权限

在云函数中：
- 只允许必要的操作
- 限制请求频率
- 记录访问日志

#### 3. 使用不同的 API Key

- **开发环境**：使用开发用的 API Key
- **生产环境**：使用生产用的 API Key
- 如果泄露，可以快速更换

#### 4. 定期更换 API Key

- 定期更换 API Key
- 如果发现泄露，立即更换

#### 5. 监控和日志

- 监控 API 调用量
- 记录异常访问
- 发现异常及时处理

## 💡 实际使用流程

### 开发环境

1. **创建 `.env` 文件**（项目根目录）
   ```env
   EXPO_PUBLIC_API_KEY=your-dev-api-key
   ```

2. **代码自动读取**
   ```typescript
   // config/api.config.ts 已经配置好了
   API_KEY: process.env.EXPO_PUBLIC_API_KEY || ''
   ```

3. **自动添加到请求头**
   ```typescript
   // services/api.service.ts 会自动添加
   headers['Authorization'] = `Bearer ${API_CONFIG.API_KEY}`
   ```

4. **不需要手动设置**
   - 配置了 `.env` 后，自动生效
   - 重启开发服务器即可

### 生产环境

#### Expo 应用

**方式 1：EAS Build 环境变量**

在 `eas.json` 中配置：

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

**方式 2：构建时注入**

在构建时通过环境变量注入：

```bash
EXPO_PUBLIC_API_KEY=your-production-api-key eas build
```

#### Web 应用

**方式 1：构建时环境变量**

```bash
# 构建时设置
EXPO_PUBLIC_API_KEY=your-production-api-key npm run build
```

**方式 2：运行时配置（不推荐）**

如果是 Web 应用，也可以考虑：
- 从服务器获取 API Key（需要额外的认证）
- 使用更复杂的认证方案（OAuth、JWT 等）

## 🔍 验证 API Key 是否配置

### 方法 1：查看配置

```typescript
import { API_CONFIG } from './config/api.config';

console.log('API Key 已配置:', !!API_CONFIG.API_KEY);
console.log('API Key 前缀:', API_CONFIG.API_KEY ? API_CONFIG.API_KEY.substring(0, 8) + '...' : '未配置');
```

### 方法 2：查看请求头

在浏览器开发者工具的 Network 标签中：
1. 打开应用并触发 API 请求
2. 找到 API 请求
3. 查看 Request Headers：
   ```
   Authorization: Bearer your-api-key-here
   ```

### 方法 3：测试页面

访问 `/test-api` 页面：
- 会显示 API Key 是否已配置
- 会显示 API Key 的前缀和后缀（隐藏中间部分）

## ⚠️ 常见误解

### 误解 1：API Key 应该完全隐藏

**现实：** 客户端应用无法完全隐藏 API Key，这是正常的。

**解决方案：**
- 使用环境变量，不硬编码
- 限制 API Key 权限
- 监控异常访问
- 定期更换

### 误解 2：API Key 提交到 Git 没关系

**错误：** API Key 不应该提交到 Git。

**原因：**
- 代码仓库可能被公开
- 团队成员可能泄露
- 历史记录中会保留

**解决方案：**
- 使用 `.env` 文件
- 添加到 `.gitignore`
- 使用 `.env.example` 作为模板

### 误解 3：API Key 应该从服务器获取

**问题：** 如果从服务器获取，需要先认证服务器，形成循环依赖。

**适合场景：**
- 需要用户登录的应用
- 可以为不同用户分配不同的 Key
- 但需要额外的认证系统

## 📝 最佳实践

### 1. 开发环境

```env
# .env（不提交到 Git）
EXPO_PUBLIC_API_KEY=dev-api-key-1234567890
```

### 2. 生产环境

```json
// eas.json（提交到 Git，但值在构建时注入）
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "从 EAS Secrets 或环境变量读取"
      }
    }
  }
}
```

### 3. 代码中使用

```typescript
// config/api.config.ts
export const API_CONFIG = {
  API_KEY: process.env.EXPO_PUBLIC_API_KEY || '', // 从环境变量读取
};
```

### 4. 安全措施

- ✅ 使用环境变量，不硬编码
- ✅ `.env` 文件添加到 `.gitignore`
- ✅ 不同环境使用不同的 API Key
- ✅ 定期更换 API Key
- ✅ 监控 API 调用量
- ✅ 限制 API Key 权限

## 🎯 总结

### 客户端需要 API Key 的原因

1. **身份验证**：证明请求来自合法的客户端
2. **访问控制**：云函数验证请求是否允许
3. **标准做法**：大多数 API 都使用这种方式

### 客户端如何获取 API Key

1. **开发环境**：从 `.env` 文件读取
2. **生产环境**：构建时通过环境变量注入
3. **代码中**：通过 `process.env.EXPO_PUBLIC_API_KEY` 访问

### 安全建议

1. ✅ 使用环境变量，不硬编码
2. ✅ 不要提交 `.env` 到 Git
3. ✅ 不同环境使用不同的 Key
4. ✅ 定期更换 API Key
5. ✅ 监控异常访问

**记住：** 客户端应用无法完全隐藏 API Key，这是正常的。关键是使用环境变量管理，而不是硬编码在代码中。

