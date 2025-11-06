# 云函数用户认证接口实现

## 📋 需要添加的接口

在云函数中添加以下路由处理：

```javascript
// 在路由处理部分添加
} else if (path === '/auth/register' || path.startsWith('/auth/register')) {
  // 用户注册
  result = await handleUserRegister(method, path, body, normalizedHeaders);
} else if (path === '/auth/login' || path.startsWith('/auth/login')) {
  // 用户登录
  result = await handleUserLogin(method, path, body, normalizedHeaders);
} else if (path === '/auth/user-info' || path.startsWith('/auth/user-info')) {
  // 获取用户信息
  result = await handleGetUserInfo(method, path, body, normalizedHeaders);
```

## 🔧 实现函数

### 1. 用户注册

```javascript
/**
 * 处理用户注册
 */
async function handleUserRegister(method, path, body, headers) {
  if (method !== 'POST') {
    throw new Error('不支持的请求方法');
  }

  const { phone, nickname, ...extraFields } = body;

  // 验证必填字段
  if (!phone || !nickname) {
    throw new Error('手机号和昵称不能为空');
  }

  // 验证手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error('手机号格式不正确');
  }

  // 验证昵称长度
  if (nickname.length < 2 || nickname.length > 20) {
    throw new Error('昵称长度应在2-20个字符之间');
  }

  const usersCollection = db.collection('users');

  // 检查手机号是否已注册
  const existingUser = await usersCollection.where({
    phone: phone,
  }).get();

  if (existingUser.data.length > 0) {
    throw new Error('该手机号已注册，请直接登录');
  }

  // 生成用户ID
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 创建用户数据（具有扩展性）
  const userData = {
    userId: userId,
    phone: phone,
    nickname: nickname,
    membershipType: 'free', // 默认免费用户
    membershipStatus: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...extraFields, // 包含所有扩展字段
  };

  // 保存到数据库
  const result = await usersCollection.add(userData);

  // 生成简单的 Token（实际应该使用 JWT）
  const token = generateSimpleToken(userId);

  return {
    code: 0,
    message: '注册成功',
    data: {
      token: token,
      userInfo: { ...userData, _id: result.id },
      expiresIn: 30 * 24 * 60 * 60, // 30天
    },
  };
}
```

### 2. 用户登录

```javascript
/**
 * 处理用户登录
 */
async function handleUserLogin(method, path, body, headers) {
  if (method !== 'POST') {
    throw new Error('不支持的请求方法');
  }

  const { phone } = body;

  if (!phone) {
    throw new Error('手机号不能为空');
  }

  // 验证手机号格式
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error('手机号格式不正确');
  }

  const usersCollection = db.collection('users');

  // 查找用户
  const userResult = await usersCollection.where({
    phone: phone,
  }).get();

  if (userResult.data.length === 0) {
    throw new Error('该手机号未注册，请先注册');
  }

  const userData = userResult.data[0];

  // 生成 Token
  const token = generateSimpleToken(userData.userId);

  // 更新最后登录时间
  await usersCollection.where({
    userId: userData.userId,
  }).update({
    updatedAt: new Date().toISOString(),
  });

  return {
    code: 0,
    message: '登录成功',
    data: {
      token: token,
      userInfo: userData,
      expiresIn: 30 * 24 * 60 * 60, // 30天
    },
  };
}
```

### 3. 获取用户信息

```javascript
/**
 * 处理获取用户信息
 */
async function handleGetUserInfo(method, path, body, headers) {
  if (method !== 'GET') {
    throw new Error('不支持的请求方法');
  }

  // 从 Token 中获取用户ID
  const userId = getUserIdFromToken(headers);

  const usersCollection = db.collection('users');

  // 查找用户
  const userResult = await usersCollection.where({
    userId: userId,
  }).get();

  if (userResult.data.length === 0) {
    throw new Error('用户不存在');
  }

  return {
    code: 0,
    message: 'success',
    data: userResult.data[0],
  };
}
```

### 4. Token 工具函数

```javascript
/**
 * 生成简单的 Token（实际应该使用 JWT）
 */
function generateSimpleToken(userId) {
  // 简单的 Token 生成（实际应该使用 JWT）
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return Buffer.from(`${userId}_${timestamp}_${random}`).toString('base64');
}

/**
 * 从 Token 中获取用户ID
 */
function getUserIdFromToken(headers) {
  const authHeader = headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('未授权访问');
  }

  const token = authHeader.substring(7);
  
  try {
    // 简单的 Token 解析（实际应该使用 JWT）
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split('_');
    if (parts.length >= 1) {
      return parts[0]; // 返回 userId
    }
    throw new Error('无效的 Token');
  } catch (error) {
    throw new Error('无效的 Token');
  }
}
```

## 📝 创建数据库集合

在云开发控制台创建 `users` 集合，用于存储用户信息。

## ✅ 功能特点

1. **无密码登录**：只需手机号即可登录
2. **无短信验证**：不需要验证码
3. **扩展性**：用户信息表支持任意扩展字段
4. **数据同步**：登录时自动同步云端数据到本地（并集）

## 🔒 安全建议

1. **生产环境建议使用 JWT**：当前实现使用简单的 Base64 Token，生产环境应使用 JWT
2. **添加请求频率限制**：防止暴力注册/登录
3. **添加 IP 白名单**（可选）：限制访问来源

## 📚 相关文档

- [用户服务实现](../services/user.service.ts)
- [登录页面实现](../screens/p-login-phone/index.tsx)
- [云函数示例代码](./tencent-cloud-function-example.md)

