# 用户认证云函数完整代码

## 📋 完整代码（可直接复制）

将以下代码添加到你的云函数中：

### 1. 在路由处理部分添加（在 `exports.main` 函数中）

找到路由处理部分，添加以下代码：

```javascript
// 路由处理（使用标准化后的路径）
if (path === '/tasks' || path.startsWith('/tasks/') || path.includes('/tasks?')) {
  // 任务收集模块
  result = await handleTasksRequest(method, path, body, normalizedHeaders);
} else if (path === '/stats/today' || path.startsWith('/stats/')) {
  // 统计接口
  result = await handleStatsRequest(method, path, body, normalizedHeaders);
} else if (path === '/reciting/plans' || path.startsWith('/reciting/plans')) {
  // 我爱背书模块 - 计划
  result = await handleRecitingPlans(method, path, body, normalizedHeaders);
} else if (path === '/reciting/tasks' || path.startsWith('/reciting/tasks')) {
  // 我爱背书模块 - 任务
  result = await handleRecitingTasks(method, path, body, normalizedHeaders);
} else if (path === '/reciting/contents' || path.startsWith('/reciting/contents')) {
  // 我爱背书模块 - 内容
  result = await handleRecitingContents(method, path, body, normalizedHeaders);
} else if (path === '/auth/register' || path.startsWith('/auth/register')) {
  // 用户注册
  result = await handleUserRegister(method, path, body, normalizedHeaders);
} else if (path === '/auth/login' || path.startsWith('/auth/login')) {
  // 用户登录
  result = await handleUserLogin(method, path, body, normalizedHeaders);
} else if (path === '/auth/user-info' || path.startsWith('/auth/user-info')) {
  // 获取用户信息
  result = await handleGetUserInfo(method, path, body, normalizedHeaders);
} else {
  return {
    statusCode: 404,
    headers: corsHeaders,
    body: JSON.stringify({
      code: 404,
      message: `接口不存在: ${path}`,
      data: null,
    }),
  };
}
```

### 2. 添加处理函数（在文件末尾，`exports.main` 函数之前）

```javascript
// ========== 用户认证处理函数 ==========

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

## 📝 完整代码块（一次性复制）

如果你想要一次性复制所有代码，这里是完整的代码块：

```javascript
// ========== 用户认证处理函数 ==========

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

## 🔧 路由添加位置

在 `exports.main` 函数的路由处理部分，找到以下代码：

```javascript
} else if (path === '/reciting/contents' || path.startsWith('/reciting/contents')) {
  // 我爱背书模块 - 内容
  result = await handleRecitingContents(method, path, body, normalizedHeaders);
} else {
```

替换为：

```javascript
} else if (path === '/reciting/contents' || path.startsWith('/reciting/contents')) {
  // 我爱背书模块 - 内容
  result = await handleRecitingContents(method, path, body, normalizedHeaders);
} else if (path === '/auth/register' || path.startsWith('/auth/register')) {
  // 用户注册
  result = await handleUserRegister(method, path, body, normalizedHeaders);
} else if (path === '/auth/login' || path.startsWith('/auth/login')) {
  // 用户登录
  result = await handleUserLogin(method, path, body, normalizedHeaders);
} else if (path === '/auth/user-info' || path.startsWith('/auth/user-info')) {
  // 获取用户信息
  result = await handleGetUserInfo(method, path, body, normalizedHeaders);
} else {
```

## ✅ 部署步骤

1. **复制处理函数代码**：将上面的完整代码块复制到云函数文件中（在 `exports.main` 之前）
2. **添加路由**：在路由处理部分添加用户认证路由
3. **创建数据库集合**：在云开发控制台创建 `users` 集合
4. **测试接口**：使用 `/test-api` 页面或直接调用 API 测试

## 📚 接口说明

### POST /auth/register - 用户注册

**请求体：**
```json
{
  "phone": "13800138000",
  "nickname": "用户昵称",
  "avatar": "头像URL（可选）",
  "email": "邮箱（可选）"
}
```

**响应：**
```json
{
  "code": 0,
  "message": "注册成功",
  "data": {
    "token": "生成的Token",
    "userInfo": { ... },
    "expiresIn": 2592000
  }
}
```

### POST /auth/login - 用户登录

**请求体：**
```json
{
  "phone": "13800138000"
}
```

**响应：**
```json
{
  "code": 0,
  "message": "登录成功",
  "data": {
    "token": "生成的Token",
    "userInfo": { ... },
    "expiresIn": 2592000
  }
}
```

### GET /auth/user-info - 获取用户信息

**请求头：**
```
Authorization: Bearer {token}
```

**响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

## ⚠️ 注意事项

1. **Token 安全性**：当前实现使用简单的 Base64 Token，生产环境建议使用 JWT
2. **数据库集合**：确保在云开发控制台创建了 `users` 集合
3. **API Key 验证**：这些接口仍然需要通过 API Key 验证（在 `verifyApiKey` 之后）

完成以上步骤后，用户认证功能就可以使用了！

