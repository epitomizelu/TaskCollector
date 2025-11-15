const cloudbase = require('@cloudbase/node-sdk');
const https = require('https');
const path = require('path');

// 初始化云开发环境
const app = cloudbase.init({
  env: process.env.TCB_ENV || 'cloud1-4gee45pq61cd6f19',
});

// 获取数据库引用
const db = app.database();
/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  // 兼容不同的路径格式
  let { method, path, headers, body } = event;

  console.log('=============================================');
  console.log('云函数入口 - 原始 event:', JSON.stringify(event, null, 2));
  console.log('method:', method);
  console.log('path:', path);
  console.log('queryStringParameters:', event.queryStringParameters);
  console.log('=============================================');
  
  // 如果 method 未定义，尝试从其他字段获取（腾讯云函数使用 httpMethod）
  if (!method) {
    method = event.httpMethod || event.method || 'GET';
  }
  // 转换为大写（标准 HTTP 方法格式）
  method = method.toUpperCase();
  
  // 如果 event 中没有 path，尝试从其他字段获取
  if (!path) {
    path = event.pathname || event.requestContext?.path || event.path || '/';
  }
  
  // 移除函数名前缀（如果存在）
  const functionName = 'task-collection-api';
  if (path && path.startsWith(`/${functionName}`)) {
    path = path.replace(`/${functionName}`, '') || '/';
  }
  
  // 确保 path 以 / 开头
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  // 处理 body（如果是字符串，解析为 JSON）
  // 注意：即使 Content-Type 是 application/octet-stream，如果 X-Content-Format 是 json，也需要解析
  if (typeof body === 'string' && body) {
    try {
      body = JSON.parse(body);
    } catch (e) {
      // 解析失败，保持原样
      console.log('Body 解析失败，保持原样:', e.message);
    }
  }
  
  // 如果 body 是 Buffer，尝试转换为字符串并解析
  if (Buffer.isBuffer(body)) {
    try {
      const bodyString = body.toString('utf8');
      body = JSON.parse(bodyString);
      console.log('Body 从 Buffer 解析为 JSON 成功');
    } catch (e) {
      console.log('Body Buffer 解析失败，保持原样:', e.message);
    }
  }
  
  // 处理 headers（统一大小写）
  const normalizedHeaders = {};
  if (headers) {
    for (const key in headers) {
      normalizedHeaders[key.toLowerCase()] = headers[key];
    }
  }
  
  // 添加调试日志（开发时使用）
  console.log('请求详情:', {
    method,
    originalPath: event.path || event.pathname,
    normalizedPath: path,
    hasHeaders: !!headers,
    headerKeys: headers ? Object.keys(headers) : [],
    hasAuthorization: !!normalizedHeaders.authorization,
    authorizationPrefix: normalizedHeaders.authorization ? normalizedHeaders.authorization.substring(0, 20) : '无',
  });
  
  // CORS 支持
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Content-Format',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  };

  // 处理 OPTIONS 预检请求
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    // 验证 API Key（所有接口都需要验证）
    try {
      verifyApiKey(normalizedHeaders);
    } catch (authError) {
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({
          code: 401,
          message: authError.message || '未授权访问',
          data: null,
        }),
      };
    }
    
    let result;
    
    // 路由处理（使用标准化后的路径）
    if (path === '/tasks' || path.startsWith('/tasks/') || path.includes('/tasks?')) {
      // 任务收集模块
      result = await handleTasksRequest(method, path, body, normalizedHeaders);
    } else if (path === '/stats/today' || path.startsWith('/stats/')) {
      // 统计接口
      result = await handleStatsRequest(method, path, body, normalizedHeaders);
    } else if (path === '/auth/register' || path.startsWith('/auth/register')) {
      // 用户注册
      result = await handleUserRegister(method, path, body, normalizedHeaders);
    } else if (path === '/auth/login' || path.startsWith('/auth/login')) {
      // 用户登录
      result = await handleUserLogin(method, path, body, normalizedHeaders);
    } else if (path === '/auth/user-info' || path.startsWith('/auth/user-info')) {
      // 获取用户信息
      result = await handleGetUserInfo(method, path, body, normalizedHeaders);
    } else if (path === '/task-list/preset' || path.startsWith('/task-list/preset')) {
      // 任务清单模块 - 预设任务
      result = await handleTaskListPreset(method, path, body, normalizedHeaders);
    } else if (path === '/task-list/daily' || path.startsWith('/task-list/daily')) {
      // 任务清单模块 - 每日任务
      result = await handleTaskListDaily(method, path, body, normalizedHeaders);
    } else if (path === '/messages' || path.startsWith('/messages')) {
      // 站内信相关
      result = await handleMessages(method, path, body, normalizedHeaders);
    } else if (path.startsWith('/admin/init-user-id') && method === 'POST') {
      // ⚠️ 管理接口：初始化所有集合的 userId
      // 支持查询参数：?collection=tasks 只更新指定集合
      const url = new URL(path, 'http://localhost');
      const collection = url.searchParams.get('collection');
      result = await initializeUserIdForAllCollections(collection);
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

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        code: 500,
        message: error.message || '服务器错误',
        data: null,
      }),
    };
  }
};

/**
 * API Key 验证配置
 * 在云函数环境变量中设置有效的 API Key
 */
const VALID_API_KEYS = [
  process.env.API_KEY_1,  // 环境变量中的 API Key
  process.env.API_KEY_2,  // 可以配置多个 API Key
  // 也可以从数据库或配置服务中读取
].filter(key => key); // 过滤掉空值

/**
 * 验证 API Key 并获取用户信息
 * 使用 Bearer Token 方式：Authorization: Bearer YOUR_API_KEY
 */
function verifyApiKey(headers) {
  // 添加调试日志
  console.log('验证 API Key:', {
    hasHeaders: !!headers,
    headerKeys: headers ? Object.keys(headers) : [],
    validApiKeysCount: VALID_API_KEYS.length,
    validApiKeysPrefix: VALID_API_KEYS.map(k => k ? k.substring(0, 8) + '...' : '空'),
  });
  
  // headers 已经是标准化后的（小写键名）
  const authHeader = headers.authorization || headers['authorization'];
  
  if (!authHeader) {
    console.log('缺少 Authorization 头');
    throw new Error('缺少授权信息，请在请求头中添加: Authorization: Bearer YOUR_API_KEY');
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    console.log('Authorization 格式错误:', authHeader.substring(0, 20));
    throw new Error('授权格式错误，应为: Authorization: Bearer YOUR_API_KEY');
  }
  
  const apiKey = authHeader.substring(7).trim(); // 移除 "Bearer " 前缀并去除空格
  
  console.log('提取的 API Key:', {
    length: apiKey.length,
    prefix: apiKey.substring(0, 8) + '...',
    suffix: '...' + apiKey.substring(apiKey.length - 4),
  });
  
  // 验证 API Key 是否有效
  if (VALID_API_KEYS.length === 0) {
    console.error('警告: 未配置有效的 API Key，请检查环境变量 API_KEY_1 和 API_KEY_2');
    throw new Error('服务器未配置 API Key');
  }
  
  if (!VALID_API_KEYS.includes(apiKey)) {
    console.log('API Key 验证失败:', {
      receivedPrefix: apiKey.substring(0, 8) + '...',
      validKeysPrefix: VALID_API_KEYS.map(k => k ? k.substring(0, 8) + '...' : '空'),
    });
    throw new Error('无效的 API Key');
  }
  
  console.log('API Key 验证成功');
  
  // 可以根据 API Key 映射到用户 ID（如果需要）
  // 这里简单返回一个基于 API Key 的用户标识
  return {
    userId: `user_${apiKey.substring(0, 8)}`, // 使用 API Key 前8位作为用户标识
    apiKey: apiKey,
  };
}

/**
 * 从请求头获取用户 ID
 * 优先级：1. X-User-Id 请求头（客户端传入的用户ID）
 *         2. 从 Token 中解析用户ID
 *         3. 使用 API Key 验证（向后兼容）
 */
function getUserIdFromHeaders(headers) {
  // ✅ 优先从请求头获取用户ID（客户端已登录时传入）
  const userIdFromHeader = headers['x-user-id'] || headers['X-User-Id'];
  if (userIdFromHeader && userIdFromHeader.trim() !== '') {
    console.log('从请求头获取用户ID:', userIdFromHeader);
    return userIdFromHeader;
  }
  
  // ✅ 尝试从 Token 中解析用户ID（登录后的 JWT Token）
  try {
    const authHeader = headers.authorization || headers.Authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // 尝试解析 Token（如果是 JWT 或自定义格式）
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const parts = decoded.split('_');
        if (parts.length >= 1 && parts[0] && parts[0].startsWith('user_')) {
          console.log('从 Token 解析用户ID:', parts[0]);
          return parts[0];
        }
      } catch (e) {
        // Token 解析失败，继续尝试其他方式
        console.log('Token 解析失败，尝试其他方式:', e.message);
      }
    }
  } catch (error) {
    console.log('从 Token 获取用户ID失败:', error.message);
  }
  
  // ✅ 最后尝试使用 API Key 验证（向后兼容，但不推荐用于用户数据查询）
  try {
    const userInfo = verifyApiKey(headers);
    console.log('使用 API Key 验证获取用户ID:', userInfo.userId);
    return userInfo.userId;
  } catch (error) {
    // 如果所有方式都失败，抛出错误
    throw new Error('无法获取用户ID，请确保已登录或提供有效的认证信息');
  }
}

// ========== 任务收集模块处理函数 ==========

/**
 * 处理任务相关请求
 */
async function handleTasksRequest(method, path, body, headers) {
  const userId = getUserIdFromHeaders(headers); // 从 Token 获取用户 ID
  const tasksCollection = db.collection('tasks');

  switch (method) {
    case 'GET':
      return await handleGetTasks(path, userId, tasksCollection);
    case 'POST':
      return await handleCreateTask(body, userId, tasksCollection);
    case 'PUT':
      return await handleUpdateTask(path, body, userId, tasksCollection);
    case 'DELETE':
      return await handleDeleteTask(path, userId, tasksCollection);
    default:
      throw new Error('不支持的请求方法');
  }
}

/**
 * 获取任务列表
 */
async function handleGetTasks(path, userId, collection) {
  const url = new URL(path, 'http://localhost');
  const date = url.searchParams.get('date');
  const month = url.searchParams.get('month');
  const taskId = path.split('/').pop();

  let query = collection.where({
    userId: userId,
  });

  // 根据 ID 查询单个任务
  if (taskId && taskId !== 'tasks') {
    const task = await query.where({ taskId: taskId }).get();
    return {
      code: 0,
      message: 'success',
      data: task.data[0] || null,
    };
  }

  // 根据日期筛选
  if (date) {
    query = query.where({ recordDate: date });
  }

  // 根据月份筛选
  if (month) {
    query = query.where({ recordMonth: month });
  }

  const result = await query.orderBy('completionTime', 'desc').get();

  return {
    code: 0,
    message: 'success',
    data: result.data || [],
  };
}

/**
 * 创建任务
 */
async function handleCreateTask(body, userId, collection) {
  const taskData = {
    ...body,
    userId: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = await collection.add(taskData);

  return {
    code: 0,
    message: '创建成功',
    data: { ...taskData, _id: result.id },
  };
}

/**
 * 更新任务
 */
async function handleUpdateTask(path, body, userId, collection) {
  const taskId = path.split('/').pop();
  
  if (!taskId || taskId === 'tasks') {
    throw new Error('任务 ID 不能为空');
  }

  // 排除 _id 字段，MongoDB 不允许更新 _id
  const { _id, ...updateData } = body;
  
  const finalUpdateData = {
    ...updateData,
    updatedAt: new Date().toISOString(),
  };

  await collection.where({
    taskId: taskId,
    userId: userId,
  }).update(finalUpdateData);

  const task = await collection.where({
    taskId: taskId,
    userId: userId,
  }).get();

  return {
    code: 0,
    message: '更新成功',
    data: task.data[0] || null,
  };
}

/**
 * 删除任务
 */
async function handleDeleteTask(path, userId, collection) {
  const url = new URL(path, 'http://localhost');
  const date = url.searchParams.get('date');
  const taskId = path.split('/').pop();

  if (date) {
    // 删除指定日期的所有任务
    await collection.where({
      userId: userId,
      recordDate: date,
    }).remove();
  } else if (taskId && taskId !== 'tasks') {
    // 删除单个任务
    await collection.where({
      taskId: taskId,
      userId: userId,
    }).remove();
  } else {
    // 删除所有任务
    await collection.where({
      userId: userId,
    }).remove();
  }

  return {
    code: 0,
    message: '删除成功',
    data: null,
  };
}

/**
 * 处理统计相关请求
 */
async function handleStatsRequest(method, path, body, headers) {
  if (method !== 'GET') {
    throw new Error('统计接口只支持 GET 请求');
  }

  const userId = getUserIdFromHeaders(headers);
  const tasksCollection = db.collection('tasks');

  if (path === '/stats/today') {
    return await handleTodayStats(userId, tasksCollection);
  } else if (path.startsWith('/stats/month')) {
    const url = new URL(path, 'http://localhost');
    const month = url.searchParams.get('month');
    return await handleMonthStats(month, userId, tasksCollection);
  }

  throw new Error('统计接口路径错误');
}

/**
 * 获取今日统计
 */
async function handleTodayStats(userId, collection) {
  const today = new Date().toISOString().split('T')[0];
  
  const result = await collection.where({
    userId: userId,
    recordDate: today,
  }).get();

  const tasks = result.data || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.length; // 所有任务都标记为已完成
  const completionRate = totalTasks > 0 ? '100%' : '0%';

  return {
    code: 0,
    message: 'success',
    data: {
      totalTasks,
      completedTasks,
      completionRate,
    },
  };
}

/**
 * 获取月度统计
 */
async function handleMonthStats(month, userId, collection) {
  const result = await collection.where({
    userId: userId,
    recordMonth: month,
  }).get();

  const tasks = result.data || [];
  const totalTasks = tasks.length;
  
  // 计算完成天数（去重）
  const uniqueDates = new Set(tasks.map(t => t.recordDate));
  const completedDays = uniqueDates.size;
  
  const averageTasksPerDay = completedDays > 0 
    ? (totalTasks / completedDays).toFixed(1) 
    : 0;

  return {
    code: 0,
    message: 'success',
    data: {
      totalTasks,
      completedDays,
      averageTasksPerDay: parseFloat(averageTasksPerDay),
    },
  };
}

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

// ========== 任务清单模块处理函数 ==========

/**
 * 处理任务清单 - 预设任务相关请求
 */
async function handleTaskListPreset(method, path, body, headers) {
  const userId = getUserIdFromHeaders(headers);
  const presetCollection = db.collection('task_list_preset');

  switch (method) {
    case 'GET':
      return await handleGetTaskListPresets(path, userId, presetCollection);
    case 'POST':
      return await handleCreateTaskListPreset(body, userId, presetCollection);
    case 'PUT':
      return await handleUpdateTaskListPreset(path, body, userId, presetCollection);
    case 'DELETE':
      return await handleDeleteTaskListPreset(path, userId, presetCollection);
    default:
      throw new Error('不支持的请求方法');
  }
}

/**
 * 获取预设任务列表
 */
async function handleGetTaskListPresets(path, userId, collection) {
  const presetId = path.split('/').pop();
  
  if (presetId && presetId !== 'preset') {
    // 获取单个预设任务
    const preset = await collection.where({
      id: presetId,
      userId: userId,
    }).get();
    
    return {
      code: 0,
      message: 'success',
      data: preset.data[0] || null,
    };
  }
  
  // 获取所有预设任务
  const result = await collection.where({
    userId: userId,
  }).orderBy('order', 'asc').get();
  
  return {
    code: 0,
    message: 'success',
    data: result.data || [],
  };
}

/**
 * 创建预设任务
 */
async function handleCreateTaskListPreset(body, userId, collection) {
  const presetData = {
    ...body,
    userId: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const result = await collection.add(presetData);
  
  return {
    code: 0,
    message: '创建成功',
    data: { ...presetData, _id: result.id },
  };
}

/**
 * 更新预设任务
 */
async function handleUpdateTaskListPreset(path, body, userId, collection) {
  const presetId = path.split('/').pop();
  
  if (!presetId || presetId === 'preset') {
    throw new Error('预设任务 ID 不能为空');
  }
  
  // 排除 _id 字段，MongoDB 不允许更新 _id
  const { _id, ...updateData } = body;
  
  const finalUpdateData = {
    ...updateData,
    updatedAt: new Date().toISOString(),
  };
  
  await collection.where({
    id: presetId,
    userId: userId,
  }).update(finalUpdateData);
  
  const preset = await collection.where({
    id: presetId,
    userId: userId,
  }).get();
  
  return {
    code: 0,
    message: '更新成功',
    data: preset.data[0] || null,
  };
}

/**
 * 删除预设任务
 */
async function handleDeleteTaskListPreset(path, userId, collection) {
  const presetId = path.split('/').pop();
  
  if (!presetId || presetId === 'preset') {
    throw new Error('预设任务 ID 不能为空');
  }
  
  await collection.where({
    id: presetId,
    userId: userId,
  }).remove();
  
  return {
    code: 0,
    message: '删除成功',
    data: null,
  };
}

/**
 * 处理任务清单 - 每日任务相关请求
 */
async function handleTaskListDaily(method, path, body, headers) {
  const userId = getUserIdFromHeaders(headers);
  const dailyCollection = db.collection('task_list_daily');

  switch (method) {
    case 'GET':
      return await handleGetTaskListDailyTasks(path, userId, dailyCollection);
    case 'POST':
      return await handleCreateTaskListDailyTask(body, userId, dailyCollection);
    case 'PUT':
      return await handleUpdateTaskListDailyTask(path, body, userId, dailyCollection);
    case 'DELETE':
      return await handleDeleteTaskListDailyTask(path, userId, dailyCollection);
    default:
      throw new Error('不支持的请求方法');
  }
}

/**
 * 获取每日任务列表
 */
async function handleGetTaskListDailyTasks(path, userId, collection) {
  console.log('=============================================');
  console.log('[handleGetTaskListDailyTasks] 开始处理');
  console.log('[handleGetTaskListDailyTasks] 原始 path:', path);
  console.log('[handleGetTaskListDailyTasks] userId:', userId);
  
  // ✅ 解析查询参数
  let date = null;
  if (path.includes('?')) {
    const queryString = path.split('?')[1];
    console.log('[handleGetTaskListDailyTasks] queryString:', queryString);
    const params = new URLSearchParams(queryString);
    date = params.get('date');
    console.log('[handleGetTaskListDailyTasks] 从 URLSearchParams 解析的 date:', date);
  }
  
  // ✅ 提取任务 ID（移除查询参数）
  const pathWithoutQuery = path.split('?')[0];
  const dailyTaskId = pathWithoutQuery.split('/').pop();
  
  console.log('[handleGetTaskListDailyTasks] pathWithoutQuery:', pathWithoutQuery);
  console.log('[handleGetTaskListDailyTasks] dailyTaskId:', dailyTaskId);
  console.log('[handleGetTaskListDailyTasks] date 参数:', date);
  
  // 根据 ID 查询单个任务
  if (dailyTaskId && dailyTaskId !== 'daily') {
    console.log('[handleGetTaskListDailyTasks] 进入单个任务查询分支');
    const whereCondition = {
      userId: userId,
      id: dailyTaskId,
    };
    console.log('[handleGetTaskListDailyTasks] 单个任务查询条件:', JSON.stringify(whereCondition, null, 2));
    
    const task = await collection.where(whereCondition).get();
    
    console.log('[handleGetTaskListDailyTasks] 单个任务查询结果:', task.data ? task.data.length : 0, '条');
    console.log('=============================================');
    
    return {
      code: 0,
      message: 'success',
      data: task.data[0] || null,
    };
  }
  
  // ✅ 查询列表：一次性构建所有查询条件
  console.log('[handleGetTaskListDailyTasks] 进入列表查询分支');
  const whereCondition = { userId: userId };
  if (date) {
    whereCondition.date = date;
    console.log('[handleGetTaskListDailyTasks] 按日期查询:', date);
  } else {
    console.log('[handleGetTaskListDailyTasks] 查询用户所有任务（不限日期）');
  }
  
  console.log('[handleGetTaskListDailyTasks] 列表查询条件:', JSON.stringify(whereCondition, null, 2));
  
  const result = await collection.where(whereCondition).orderBy('createdAt', 'desc').get();
  
  console.log('[handleGetTaskListDailyTasks] 查询结果数量:', result.data ? result.data.length : 0);
  if (result.data && result.data.length > 0) {
    console.log('[handleGetTaskListDailyTasks] 第一条数据示例:', JSON.stringify(result.data[0], null, 2));
  }
  console.log('=============================================');
  
  return {
    code: 0,
    message: 'success',
    data: result.data || [],
  };
}

/**
 * 创建每日任务
 */
async function handleCreateTaskListDailyTask(body, userId, collection) {
  const dailyTaskData = {
    ...body,
    userId: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const result = await collection.add(dailyTaskData);
  
  return {
    code: 0,
    message: '创建成功',
    data: { ...dailyTaskData, _id: result.id },
  };
}

/**
 * 更新每日任务
 */
async function handleUpdateTaskListDailyTask(path, body, userId, collection) {
  const dailyTaskId = path.split('/').pop();
  
  if (!dailyTaskId || dailyTaskId === 'daily') {
    throw new Error('每日任务 ID 不能为空');
  }
  
  // ✅ 先检查任务是否存在
  const existingTask = await collection.where({
    id: dailyTaskId,
    userId: userId,
  }).get();
  
  if (!existingTask.data || existingTask.data.length === 0) {
    throw new Error(`每日任务不存在: ${dailyTaskId}`);
  }
  
  // 排除 _id 字段，MongoDB 不允许更新 _id
  const { _id, ...updateData } = body;
  
  const finalUpdateData = {
    ...updateData,
    updatedAt: new Date().toISOString(),
  };
  
  await collection.where({
    id: dailyTaskId,
    userId: userId,
  }).update(finalUpdateData);
  
  // 获取更新后的任务
  const task = await collection.where({
    id: dailyTaskId,
    userId: userId,
  }).get();
  
  return {
    code: 0,
    message: '更新成功',
    data: task.data[0] || null,
  };
}

/**
 * 删除每日任务
 */
async function handleDeleteTaskListDailyTask(path, userId, collection) {
  const dailyTaskId = path.split('/').pop();
  
  if (!dailyTaskId || dailyTaskId === 'daily') {
    throw new Error('每日任务 ID 不能为空');
  }
  
  await collection.where({
    id: dailyTaskId,
    userId: userId,
  }).remove();
  
  return {
    code: 0,
    message: '删除成功',
    data: null,
  };
}


// ========== 站内信处理函数 ==========

/**
 * 处理站内信请求
 */
async function handleMessages(method, path, body, headers) {
  // ✅ 统一使用 getUserIdFromHeaders，支持从请求头或 Token 获取用户ID
  const userId = getUserIdFromHeaders(headers);
  const messagesCollection = db.collection('messages');

  if (method === 'GET') {
    // 获取所有消息
    const url = new URL(path, 'http://localhost');
    const messageId = path.split('/').pop();
    
    if (messageId && messageId !== 'messages') {
      // 获取单个消息
      const result = await messagesCollection.where({
        id: messageId,
        userId: userId,
      }).get();
      
      return {
        code: 0,
        message: 'success',
        data: result.data[0] || null,
      };
    }
    
    // 获取所有消息
    const result = await messagesCollection.where({
      userId: userId,
    }).orderBy('createdAt', 'desc').get();
    
    return {
      code: 0,
      message: 'success',
      data: result.data || [],
    };
  } else if (method === 'PUT') {
    // 标记已读
    if (path.includes('/read-all')) {
      // 标记所有为已读
      await messagesCollection.where({
        userId: userId,
        status: 'unread',
      }).update({
        status: 'read',
        readAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      return {
        code: 0,
        message: 'success',
        data: null,
      };
    } else {
      // 标记单个为已读
      const messageId = path.split('/')[2]; // /messages/:id/read
      await messagesCollection.where({
        id: messageId,
        userId: userId,
      }).update({
        status: 'read',
        readAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      return {
        code: 0,
        message: 'success',
        data: null,
      };
    }
  } else if (method === 'DELETE') {
    // 删除消息
    const messageId = path.split('/').pop();
    await messagesCollection.where({
      id: messageId,
      userId: userId,
    }).remove();
    
    return {
      code: 0,
      message: 'success',
      data: null,
    };
  } else {
    throw new Error('不支持的请求方法');
  }
}

/**
 * 创建站内信
 */
async function createMessage(userId, messageData) {
  const messagesCollection = db.collection('messages');
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const message = {
    id: messageId,
    userId: userId,
    type: messageData.type || 'notification',
    title: messageData.title,
    content: messageData.content,
    status: 'unread',
    relatedId: messageData.relatedId,
    metadata: messageData.metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await messagesCollection.add(message);
  return message;
}

/**
 * 初始化函数：将指定集合中的 userId 统一更新为指定用户
 * ⚠️ 这个函数应该只在初始化数据时使用一次
 * 
 * 使用方法：
 * POST /task-collection-api/admin/init-user-id?collection=tasks
 * 或不指定 collection 参数，自动处理所有集合
 */
async function initializeUserIdForAllCollections(collectionName) {
  const TARGET_USER_ID = 'user_1762415802540_xcfpz7v2v';
  
  // 所有需要处理的集合
  const allCollections = [
    'tasks',              // 任务收集
    'task_list_preset',   // 预设任务
    'task_list_daily',    // 每日任务
    'reciting_tasks',     // 背诵任务
    'messages',           // 消息
    'stats',              // 统计数据
  ];
  
  // 如果指定了集合名，只处理该集合
  const collectionsToProcess = collectionName ? [collectionName] : allCollections;
  
  console.log('=============================================');
  console.log('开始初始化集合的 userId');
  console.log('目标 userId:', TARGET_USER_ID);
  console.log('处理集合:', collectionsToProcess.join(', '));
  console.log('=============================================');
  
  const results = {};
  
  for (const name of collectionsToProcess) {
    try {
      console.log(`\n处理集合: ${name}`);
      const collection = db.collection(name);
      const updatedAt = new Date().toISOString();
      
      // ✅ 直接使用批量更新，不先查询（更快）
      const updateResult = await collection.where({}).update({
        userId: TARGET_USER_ID,
        updatedAt: updatedAt,
      });
      
      const updatedCount = updateResult.updated || 0;
      console.log(`  - ✅ 更新完成: ${updatedCount} 条`);
      results[name] = { updated: updatedCount };
      
    } catch (error) {
      console.error(`  - ❌ 处理失败: ${error.message}`);
      results[name] = { error: error.message };
    }
  }
  
  console.log('\n=============================================');
  console.log('初始化完成，结果汇总:');
  console.log(JSON.stringify(results, null, 2));
  console.log('=============================================');
  
  return {
    code: 0,
    message: '初始化完成',
    data: results,
  };
}

// 导出初始化函数（可选，如果需要在其他地方调用）
exports.initializeUserIdForAllCollections = initializeUserIdForAllCollections;

