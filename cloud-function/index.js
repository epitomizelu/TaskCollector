const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发环境
const app = cloudbase.init({
  env: process.env.TCB_ENV || 'your-env-id',
});

// 获取数据库引用
const db = app.database();

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  // 兼容不同的路径格式
  let { method, path, headers, body } = event;
  
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
  if (typeof body === 'string' && body) {
    try {
      body = JSON.parse(body);
    } catch (e) {
      // 解析失败，保持原样
      console.log('Body 解析失败，保持原样:', e.message);
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
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
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
    } else if (path === '/task-list/preset' || path.startsWith('/task-list/preset')) {
      // 任务清单模块 - 预设任务
      result = await handleTaskListPreset(method, path, body, normalizedHeaders);
    } else if (path === '/task-list/daily' || path.startsWith('/task-list/daily')) {
      // 任务清单模块 - 每日任务
      result = await handleTaskListDaily(method, path, body, normalizedHeaders);
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
 * 从请求头获取用户 ID（使用 API Key 验证）
 */
function getUserIdFromHeaders(headers) {
  try {
    const userInfo = verifyApiKey(headers);
    return userInfo.userId;
  } catch (error) {
    // 如果验证失败，抛出错误
    throw error;
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

  const updateData = {
    ...body,
    updatedAt: new Date().toISOString(),
  };

  await collection.where({
    taskId: taskId,
    userId: userId,
  }).update(updateData);

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

// ========== 我爱背书模块处理函数 ==========

/**
 * 处理我爱背书 - 计划相关请求
 */
async function handleRecitingPlans(method, path, body, headers) {
  const userId = getUserIdFromHeaders(headers);
  const plansCollection = db.collection('reciting_plans');

  switch (method) {
    case 'GET':
      return await handleGetRecitingPlans(path, userId, plansCollection);
    case 'POST':
      return await handleCreateRecitingPlan(body, userId, plansCollection);
    case 'PUT':
      return await handleUpdateRecitingPlan(path, body, userId, plansCollection);
    case 'DELETE':
      return await handleDeleteRecitingPlan(path, userId, plansCollection);
    default:
      throw new Error('不支持的请求方法');
  }
}

/**
 * 获取计划列表
 */
async function handleGetRecitingPlans(path, userId, collection) {
  const planId = path.split('/').pop();
  
  if (planId && planId !== 'plans') {
    // 获取单个计划
    const plan = await collection.where({
      id: planId,
      userId: userId,
    }).get();
    
    return {
      code: 0,
      message: 'success',
      data: plan.data[0] || null,
    };
  }
  
  // 获取所有计划
  const result = await collection.where({
    userId: userId,
  }).orderBy('createdAt', 'desc').get();
  
  return {
    code: 0,
    message: 'success',
    data: result.data || [],
  };
}

/**
 * 创建计划
 */
async function handleCreateRecitingPlan(body, userId, collection) {
  const planData = {
    ...body,
    userId: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const result = await collection.add(planData);
  
  return {
    code: 0,
    message: '创建成功',
    data: { ...planData, _id: result.id },
  };
}

/**
 * 更新计划
 */
async function handleUpdateRecitingPlan(path, body, userId, collection) {
  const planId = path.split('/').pop();
  
  if (!planId || planId === 'plans') {
    throw new Error('计划 ID 不能为空');
  }
  
  const updateData = {
    ...body,
    updatedAt: new Date().toISOString(),
  };
  
  await collection.where({
    id: planId,
    userId: userId,
  }).update(updateData);
  
  const plan = await collection.where({
    id: planId,
    userId: userId,
  }).get();
  
  return {
    code: 0,
    message: '更新成功',
    data: plan.data[0] || null,
  };
}

/**
 * 删除计划
 */
async function handleDeleteRecitingPlan(path, userId, collection) {
  const planId = path.split('/').pop();
  
  if (!planId || planId === 'plans') {
    throw new Error('计划 ID 不能为空');
  }
  
  await collection.where({
    id: planId,
    userId: userId,
  }).remove();
  
  return {
    code: 0,
    message: '删除成功',
    data: null,
  };
}

/**
 * 处理我爱背书 - 任务相关请求
 */
async function handleRecitingTasks(method, path, body, headers) {
  const userId = getUserIdFromHeaders(headers);
  const tasksCollection = db.collection('reciting_tasks');

  switch (method) {
    case 'GET':
      return await handleGetRecitingTasks(path, userId, tasksCollection);
    case 'POST':
      return await handleCreateRecitingTask(body, userId, tasksCollection);
    case 'PUT':
      return await handleUpdateRecitingTask(path, body, userId, tasksCollection);
    case 'DELETE':
      return await handleDeleteRecitingTask(path, userId, tasksCollection);
    default:
      throw new Error('不支持的请求方法');
  }
}

/**
 * 获取任务列表
 */
async function handleGetRecitingTasks(path, userId, collection) {
  const url = new URL(path, 'http://localhost');
  const date = url.searchParams.get('date');
  const taskId = path.split('/').pop();
  
  let query = collection.where({
    userId: userId,
  });
  
  // 根据 ID 查询单个任务
  if (taskId && taskId !== 'tasks') {
    const task = await query.where({ id: taskId }).get();
    return {
      code: 0,
      message: 'success',
      data: task.data[0] || null,
    };
  }
  
  // 根据日期筛选
  if (date) {
    query = query.where({ date: date });
  }
  
  const result = await query.orderBy('date', 'desc').orderBy('createdAt', 'desc').get();
  
  return {
    code: 0,
    message: 'success',
    data: result.data || [],
  };
}

/**
 * 创建任务
 */
async function handleCreateRecitingTask(body, userId, collection) {
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
async function handleUpdateRecitingTask(path, body, userId, collection) {
  const taskId = path.split('/').pop();
  
  if (!taskId || taskId === 'tasks') {
    throw new Error('任务 ID 不能为空');
  }
  
  const updateData = {
    ...body,
    updatedAt: new Date().toISOString(),
  };
  
  await collection.where({
    id: taskId,
    userId: userId,
  }).update(updateData);
  
  const task = await collection.where({
    id: taskId,
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
async function handleDeleteRecitingTask(path, userId, collection) {
  const taskId = path.split('/').pop();
  
  if (!taskId || taskId === 'tasks') {
    throw new Error('任务 ID 不能为空');
  }
  
  await collection.where({
    id: taskId,
    userId: userId,
  }).remove();
  
  return {
    code: 0,
    message: '删除成功',
    data: null,
  };
}

/**
 * 处理我爱背书 - 内容相关请求
 */
async function handleRecitingContents(method, path, body, headers) {
  const userId = getUserIdFromHeaders(headers);
  const contentsCollection = db.collection('reciting_contents');

  switch (method) {
    case 'GET':
      return await handleGetRecitingContents(path, userId, contentsCollection);
    case 'POST':
      return await handleCreateRecitingContent(body, userId, contentsCollection);
    case 'DELETE':
      return await handleDeleteRecitingContent(path, userId, contentsCollection);
    default:
      throw new Error('不支持的请求方法');
  }
}

/**
 * 获取内容列表
 */
async function handleGetRecitingContents(path, userId, collection) {
  const url = new URL(path, 'http://localhost');
  const type = url.searchParams.get('type'); // 'audio' 或 'document'
  const contentId = path.split('/').pop();
  
  let query = collection.where({
    userId: userId,
  });
  
  // 根据 ID 查询单个内容
  if (contentId && contentId !== 'contents') {
    const content = await query.where({ id: contentId }).get();
    return {
      code: 0,
      message: 'success',
      data: content.data[0] || null,
    };
  }
  
  // 根据类型筛选
  if (type) {
    query = query.where({ type: type });
  }
  
  const result = await query.orderBy('uploadDate', 'desc').get();
  
  return {
    code: 0,
    message: 'success',
    data: result.data || [],
  };
}

/**
 * 创建内容
 */
async function handleCreateRecitingContent(body, userId, collection) {
  const contentData = {
    ...body,
    userId: userId,
    uploadDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const result = await collection.add(contentData);
  
  return {
    code: 0,
    message: '创建成功',
    data: { ...contentData, _id: result.id },
  };
}

/**
 * 删除内容
 */
async function handleDeleteRecitingContent(path, userId, collection) {
  const contentId = path.split('/').pop();
  
  if (!contentId || contentId === 'contents') {
    throw new Error('内容 ID 不能为空');
  }
  
  await collection.where({
    id: contentId,
    userId: userId,
  }).remove();
  
  return {
    code: 0,
    message: '删除成功',
    data: null,
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
  
  const updateData = {
    ...body,
    updatedAt: new Date().toISOString(),
  };
  
  await collection.where({
    id: presetId,
    userId: userId,
  }).update(updateData);
  
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
  const url = new URL(path, 'http://localhost');
  const date = url.searchParams.get('date');
  const dailyTaskId = path.split('/').pop();
  
  let query = collection.where({
    userId: userId,
  });
  
  // 根据 ID 查询单个任务
  if (dailyTaskId && dailyTaskId !== 'daily') {
    const task = await query.where({ id: dailyTaskId }).get();
    return {
      code: 0,
      message: 'success',
      data: task.data[0] || null,
    };
  }
  
  // 根据日期筛选
  if (date) {
    query = query.where({ date: date });
  }
  
  const result = await query.orderBy('createdAt', 'desc').get();
  
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
  
  const updateData = {
    ...body,
    updatedAt: new Date().toISOString(),
  };
  
  await collection.where({
    id: dailyTaskId,
    userId: userId,
  }).update(updateData);
  
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

