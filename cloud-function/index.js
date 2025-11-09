const cloudbase = require('@cloudbase/node-sdk');
const https = require('https');

// 初始化云开发环境
const app = cloudbase.init({
  env: process.env.TCB_ENV || 'cloud1-4gee45pq61cd6f19',
});

// 获取数据库引用
const db = app.database();

// 检查 app 对象是否支持存储相关方法
// 根据官方文档：uploadFile 是 app 对象的直接方法，不是 app.storage().uploadFile()
function checkStorageSupport() {
  const hasUploadFile = typeof app.uploadFile === 'function';
  const hasGetTempFileURL = typeof app.getTempFileURL === 'function';
  const hasDeleteFile = typeof app.deleteFile === 'function';
  
  console.log('存储方法检查:', {
    hasUploadFile,
    hasGetTempFileURL,
    hasDeleteFile,
    appMethods: Object.keys(app || {}),
  });
  
  if (!hasUploadFile) {
    throw new Error('app.uploadFile 不是函数。请检查 @cloudbase/node-sdk 版本和初始化方式');
  }
  
  return {
    uploadFile: app.uploadFile.bind(app),
    getTempFileURL: hasGetTempFileURL ? app.getTempFileURL.bind(app) : null,
    deleteFile: hasDeleteFile ? app.deleteFile.bind(app) : null,
  };
}

/**
 * 从 URL 下载文件
 */
function downloadFileFromUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`下载失败: HTTP ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      res.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      
      res.on('error', (error) => {
        reject(error);
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  // 兼容不同的路径格式
  let { method, path, headers, body } = event;

  console.log('云函数入口参数:', method, path, headers, body);
  
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
    } else if (path === '/app/check-update' || path.startsWith('/app/check-update')) {
      // 应用更新检查
      result = await handleAppCheckUpdate(method, path, body, normalizedHeaders);
    } else if (path === '/app/versions' || path.startsWith('/app/versions')) {
      // 应用版本管理（保存/获取版本信息）
      result = await handleAppVersions(method, path, body, normalizedHeaders);
    } else if (path === '/app/download-and-upload' || path.startsWith('/app/download-and-upload')) {
      // 从 EAS URL 下载 APK 并上传到云存储
      result = await handleDownloadAndUpload(method, path, body, normalizedHeaders);
    } else if (path === '/storage/upload-chunk' || path.startsWith('/storage/upload-chunk')) {
      // 分片上传
      result = await handleChunkUpload(method, path, body, normalizedHeaders);
    } else if (path === '/storage/complete-chunk' || path.startsWith('/storage/complete-chunk')) {
      // 完成分片上传（异步任务）
      result = await handleCompleteChunkUpload(method, path, body, normalizedHeaders);
    } else if (path === '/storage/merge-task-status' || path.startsWith('/storage/merge-task-status')) {
      // 查询合并任务状态
      result = await handleMergeTaskStatus(method, path, body, normalizedHeaders);
    } else if (path === '/storage/process-merge-task' || path.startsWith('/storage/process-merge-task')) {
      // 处理合并任务（内部调用）
      result = await handleProcessMergeTask(method, path, body, normalizedHeaders);
    } else if (path === '/storage/upload' || path.startsWith('/storage/upload')) {
      // 文件上传到云存储（小文件）
      result = await handleStorageUpload(method, path, body, normalizedHeaders);
    } else if (path === '/reciting/audio/process' || path.startsWith('/reciting/audio/process')) {
      // 音频处理（触发异步处理任务）
      result = await handleAudioProcess(method, path, body, normalizedHeaders);
    } else if (path === '/reciting/audio/status' || path.startsWith('/reciting/audio/status')) {
      // 查询音频处理状态
      result = await handleAudioStatus(method, path, body, normalizedHeaders);
    } else if (path === '/messages' || path.startsWith('/messages')) {
      // 站内信相关
      result = await handleMessages(method, path, body, normalizedHeaders);
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

/**
 * 应用更新检查接口
 * GET /app/check-update?currentVersion=1.0.0&versionCode=1&platform=android
 */
async function handleAppCheckUpdate(method, path, body, headers) {
  if (method !== 'GET') {
    throw new Error('只支持 GET 请求');
  }

  // 从查询参数获取当前版本信息
  const queryParams = new URLSearchParams(path.split('?')[1] || '');
  const currentVersion = queryParams.get('currentVersion') || '1.0.0';
  const currentVersionCode = parseInt(queryParams.get('versionCode') || '1', 10);
  const platform = queryParams.get('platform') || 'android';

  console.log('检查更新:', { currentVersion, currentVersionCode, platform });

  try {
    // 从数据库获取最新版本信息
    // 优先从数据库读取，如果没有则从云存储获取
    let latestVersion = null;
    
    try {
      // 尝试从数据库读取最新版本信息
      const versionsCollection = db.collection('app_versions');
      const versions = await versionsCollection
        .where({ platform: platform })
        .orderBy('versionCode', 'desc')
        .limit(1)
        .get();
      
      if (versions.data && versions.data.length > 0) {
        latestVersion = versions.data[0];
        console.log('从数据库获取版本信息:', {
          version: latestVersion.version,
          versionCode: latestVersion.versionCode,
          filePath: latestVersion.filePath,
        });
      }
    } catch (dbError) {
      console.warn('从数据库读取版本信息失败，使用默认配置:', dbError.message);
    }
    
    // 如果数据库没有，尝试从云存储获取最新的 APK 文件
    if (!latestVersion) {
      console.log('数据库中没有版本信息，使用默认配置...');
      
      // 使用默认配置（应该从最近上传的 APK 中获取）
      // 这里暂时使用硬编码，实际应该从数据库或配置服务读取
      latestVersion = {
        version: '1.0.1',
        versionCode: 2,
        platform: 'android',
        filePath: 'task_collection_apks/v1.0.1/app-release-v1.0.1.apk',
        downloadUrl: `https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/task_collection_apks/v1.0.1/app-release-v1.0.1.apk`,
        easDownloadUrl: null, // EAS 下载地址（如果已保存）
        forceUpdate: false,
        updateLog: '修复了一些 bug，优化了性能',
        fileSize: 0,
        releaseDate: new Date().toISOString(),
        useChunkedDownload: false, // 默认不使用分片下载
        uploadId: null,
        totalChunks: null,
        chunkUrls: null,
      };
    }
    
    // 确保 latestVersion 有 easDownloadUrl 字段（从数据库读取的可能没有）
    if (!latestVersion.easDownloadUrl) {
      latestVersion.easDownloadUrl = null;
    }
    
    // 判断是否需要使用分片下载
    // 如果文件较大（> 10MB）或使用了分片上传，需要分片下载
    // 检查 filePath 是否在 temp_chunks 目录中（说明使用分片上传）
    const useChunkedDownload = latestVersion.filePath && latestVersion.filePath.includes('temp_chunks');
    
    // 如果使用分片上传，需要获取分片信息
    // 这里暂时标记为需要分片下载，客户端可以调用 complete-chunk 接口获取分片 URL
    if (useChunkedDownload || (latestVersion.fileSize && latestVersion.fileSize > 10 * 1024 * 1024)) {
      latestVersion.useChunkedDownload = true;
      console.log('检测到大文件或分片上传，需要使用分片下载');
      
      // 如果提供了 uploadId 和 totalChunks，可以返回
      // 否则，客户端需要从文件路径中提取信息
      if (!latestVersion.uploadId || !latestVersion.totalChunks) {
        // 尝试从 filePath 中提取 uploadId
        // 格式：task_collection_apks/v1.0.1/app-release-v1.0.1.apk
        // 或者：temp_chunks/upload_xxx/chunk_0
        const uploadIdMatch = latestVersion.filePath.match(/upload_(\d+_[a-z0-9]+)/);
        if (uploadIdMatch) {
          latestVersion.uploadId = uploadIdMatch[0];
          console.log('从文件路径提取 uploadId:', latestVersion.uploadId);
        }
      }
    }
    
    // 对比版本号
    const hasUpdate = latestVersion.versionCode > currentVersionCode;
    
    return {
      code: 0,
      message: 'success',
      data: {
        hasUpdate: hasUpdate,
        latestVersion: latestVersion.version,
        latestVersionCode: latestVersion.versionCode,
        downloadUrl: latestVersion.downloadUrl, // 腾讯云下载地址（备用）
        easDownloadUrl: latestVersion.easDownloadUrl || null, // EAS 下载地址（优先使用）
        forceUpdate: latestVersion.forceUpdate || false,
        updateLog: latestVersion.updateLog || '应用更新',
        fileSize: latestVersion.fileSize || 0,
        releaseDate: latestVersion.releaseDate || new Date().toISOString(),
        // 分片下载相关字段
        uploadId: latestVersion.uploadId || null,
        totalChunks: latestVersion.totalChunks || null,
        chunkUrls: latestVersion.chunkUrls || null,
        filePath: latestVersion.filePath || null,
        useChunkedDownload: latestVersion.useChunkedDownload || false,
      },
    };
  } catch (error) {
    console.error('检查更新失败:', error);
    throw new Error(`检查更新失败: ${error.message}`);
  }
}

/**
 * 应用版本管理接口
 * POST /app/versions - 保存版本信息
 * GET /app/versions - 获取版本列表
 * GET /app/versions/:versionCode - 获取指定版本信息
 */
async function handleAppVersions(method, path, body, headers) {
  if (method === 'POST') {
    // 保存版本信息
    try {
      // 解析请求体
      let versionInfo;
      if (typeof body === 'string') {
        try {
          versionInfo = JSON.parse(body);
        } catch (e) {
          throw new Error('无法解析请求体 JSON');
        }
      } else {
        versionInfo = body;
      }
      
      // 验证必要字段
      if (!versionInfo.version || !versionInfo.versionCode || !versionInfo.platform) {
        throw new Error('缺少必要字段: version, versionCode, platform');
      }
      
      console.log('保存版本信息:', {
        version: versionInfo.version,
        versionCode: versionInfo.versionCode,
        platform: versionInfo.platform,
        hasEasUrl: !!versionInfo.easDownloadUrl,
        hasDownloadUrl: !!versionInfo.downloadUrl,
      });
      
      // 保存到数据库
      const versionsCollection = db.collection('app_versions');
      
      // 检查是否已存在该版本
      const existing = await versionsCollection
        .where({
          versionCode: versionInfo.versionCode,
          platform: versionInfo.platform,
        })
        .get();
      
      if (existing.data && existing.data.length > 0) {
        // 更新现有版本
        // 注意：如果已有 APK 下载地址，OTA 更新不应该覆盖它们
        const existingVersion = existing.data[0];
        const updateData = {
          version: versionInfo.version, // 始终更新版本号
          updateType: versionInfo.updateType || existingVersion.updateType || 'apk',
          updateMessage: versionInfo.updateMessage || existingVersion.updateMessage || '',
          updatedAt: new Date().toISOString(),
        };
        
        // 如果是 OTA 更新，只更新版本号和更新信息，不覆盖下载地址
        if (versionInfo.updateType === 'ota') {
          // OTA 更新：保留已有的下载地址，只更新版本号和更新信息
          if (existingVersion.easDownloadUrl) {
            updateData.easDownloadUrl = existingVersion.easDownloadUrl;
          }
          if (existingVersion.downloadUrl) {
            updateData.downloadUrl = existingVersion.downloadUrl;
          }
          if (existingVersion.filePath) {
            updateData.filePath = existingVersion.filePath;
          }
          if (existingVersion.fileSize) {
            updateData.fileSize = existingVersion.fileSize;
          }
        } else {
          // APK 构建：更新所有字段（包括下载地址）
          Object.assign(updateData, {
            easDownloadUrl: versionInfo.easDownloadUrl || existingVersion.easDownloadUrl,
            downloadUrl: versionInfo.downloadUrl || existingVersion.downloadUrl,
            filePath: versionInfo.filePath || existingVersion.filePath,
            fileSize: versionInfo.fileSize || existingVersion.fileSize,
          });
        }
        
        await versionsCollection
          .where({
            versionCode: versionInfo.versionCode,
            platform: versionInfo.platform,
          })
          .update(updateData);
        console.log('版本信息已更新');
      } else {
        // 创建新版本
        await versionsCollection.add({
          ...versionInfo,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log('版本信息已创建');
      }
      
      return {
        code: 0,
        message: '版本信息保存成功',
        data: versionInfo,
      };
    } catch (error) {
      console.error('保存版本信息失败:', error);
      throw new Error(`保存版本信息失败: ${error.message}`);
    }
  } else if (method === 'GET') {
    // 获取版本信息
    try {
      const versionsCollection = db.collection('app_versions');
      
      // 从查询参数获取 platform
      const url = new URL(`http://example.com${path}`);
      const platform = url.searchParams.get('platform') || 'android';
      const versionCode = url.searchParams.get('versionCode');
      
      if (versionCode) {
        // 获取指定版本
        const versions = await versionsCollection
          .where({
            versionCode: parseInt(versionCode, 10),
            platform: platform,
          })
          .get();
        
        if (versions.data && versions.data.length > 0) {
          return {
            code: 0,
            message: '获取成功',
            data: versions.data[0],
          };
        } else {
          return {
            code: 404,
            message: '版本不存在',
            data: null,
          };
        }
      } else {
        // 获取所有版本（按 versionCode 降序）
        const versions = await versionsCollection
          .where({ platform: platform })
          .orderBy('versionCode', 'desc')
          .get();
        
        return {
          code: 0,
          message: '获取成功',
          data: versions.data || [],
        };
      }
    } catch (error) {
      console.error('获取版本信息失败:', error);
      throw new Error(`获取版本信息失败: ${error.message}`);
    }
  } else {
    throw new Error('不支持的请求方法');
  }
}

/**
 * 从 EAS URL 下载 APK 并上传到云存储
 * POST /app/download-and-upload
 * 请求体: { easDownloadUrl, version, versionCode, platform }
 */
async function handleDownloadAndUpload(method, path, body, headers) {
  if (method !== 'POST') {
    throw new Error('只支持 POST 请求');
  }

  try {
    // 解析请求体
    let requestData;
    if (typeof body === 'string') {
      try {
        requestData = JSON.parse(body);
      } catch (e) {
        throw new Error('无法解析请求体 JSON');
      }
    } else {
      requestData = body;
    }

    // 验证必要字段
    const { easDownloadUrl, version, versionCode, platform = 'android' } = requestData;
    if (!easDownloadUrl || !version || !versionCode) {
      throw new Error('缺少必要字段: easDownloadUrl, version, versionCode');
    }

    console.log('开始从 EAS 下载并上传 APK:', {
      easDownloadUrl,
      version,
      versionCode,
      platform,
    });

    // 步骤1: 从 EAS URL 下载 APK
    console.log('步骤 1: 从 EAS 下载 APK...');
    const apkBuffer = await downloadFileFromUrl(easDownloadUrl);
    const fileSize = apkBuffer.length;
    console.log(`下载完成，文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    // 步骤2: 构造云存储路径
    const fileName = `app-release-v${version}.apk`;
    const cloudPath = `task_collection_apks/v${version}/${fileName}`;

    // 步骤3: 上传到云存储
    console.log('步骤 2: 上传到云存储...');
    const storage = checkStorageSupport();
    
    const uploadResult = await storage.uploadFile({
      cloudPath: cloudPath,
      fileContent: apkBuffer,
    });

    console.log('上传成功:', uploadResult);

    // 步骤4: 获取文件访问 URL
    console.log('步骤 3: 获取文件访问 URL...');
    // 辅助函数：将路径转换为 cloud:// 格式的 fileID
    const envId = process.env.TCB_ENV || 'cloud1-4gee45pq61cd6f19';
    const storageDomain = '636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la';
    const cloudPrefix = `${envId}.${storageDomain}`;
    function pathToCloudFileID(path) {
      // 如果已经是 cloud:// 格式，直接返回
      if (path && path.startsWith('cloud://')) {
        return path;
      }
      // 否则转换为 cloud://环境ID.存储域名/路径 格式
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      return `cloud://${cloudPrefix}/${cleanPath}`;
    }
    
    const fileCloudID = pathToCloudFileID(cloudPath);
    const fileUrlResult = await storage.getTempFileURL({
      fileList: [fileCloudID],
    });

    const fileUrl = fileUrlResult.fileList[0]?.tempFileURL ||
      `https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/${cloudPath}`;

    console.log('文件 URL:', fileUrl);

    // 步骤5: 保存版本信息到数据库
    console.log('步骤 4: 保存版本信息到数据库...');
    const versionsCollection = db.collection('app_versions');
    
    const versionInfo = {
      version: version,
      versionCode: versionCode,
      platform: platform,
      filePath: cloudPath,
      easDownloadUrl: easDownloadUrl,
      downloadUrl: fileUrl,
      fileSize: fileSize,
      releaseDate: new Date().toISOString(),
      uploadId: null,
      totalChunks: null,
      useChunkedDownload: false,
      updatedAt: new Date().toISOString(),
    };

    // 检查是否已存在该版本
    const existing = await versionsCollection
      .where({
        versionCode: versionCode,
        platform: platform,
      })
      .get();

    if (existing.data && existing.data.length > 0) {
      // 更新现有版本
      await versionsCollection
        .where({
          versionCode: versionCode,
          platform: platform,
        })
        .update(versionInfo);
      console.log('版本信息已更新');
    } else {
      // 创建新版本
      versionInfo.createdAt = new Date().toISOString();
      await versionsCollection.add(versionInfo);
      console.log('版本信息已创建');
    }

    return {
      code: 0,
      message: '下载并上传成功',
      data: {
        filePath: cloudPath,
        fileUrl: fileUrl,
        fileSize: fileSize,
        easDownloadUrl: easDownloadUrl,
        version: version,
        versionCode: versionCode,
      },
    };
  } catch (error) {
    console.error('下载并上传失败:', error);
    throw new Error(`下载并上传失败: ${error.message}`);
  }
}

/**
 * 分片上传接口
 * POST /storage/upload-chunk - 上传一个分片
 * POST /storage/complete-chunk - 完成分片上传并合并
 */
async function handleChunkUpload(method, path, body, headers) {
  if (method !== 'POST') {
    throw new Error('只支持 POST 请求');
  }

  // 检查 Content-Type 和 X-Content-Format
  const contentType = headers?.['content-type'] || headers?.['Content-Type'] || '';
  const contentFormat = headers?.['x-content-format'] || headers?.['X-Content-Format'] || '';
  
  console.log('handleChunkUpload Content-Type:', contentType);
  console.log('handleChunkUpload X-Content-Format:', contentFormat);
  console.log('handleChunkUpload body 初始类型:', typeof body);
  
  // 如果 Content-Type 是 application/octet-stream 且 X-Content-Format 是 json，需要解析 body
  // 注意：使用 application/octet-stream 时，body 可能是 Base64 编码的字符串
  if (contentType.includes('application/octet-stream') && contentFormat === 'json') {
    if (typeof body === 'string' && body) {
      // 尝试直接解析 JSON
      try {
        body = JSON.parse(body);
        console.log('handleChunkUpload: Body 从字符串直接解析为 JSON 成功');
      } catch (e) {
        // 如果直接解析失败，可能是 Base64 编码的字符串
        // 检查是否是 Base64 格式（Base64 字符只包含 A-Z, a-z, 0-9, +, /, =）
        // 注意：body 可能很长（3.7MB），只检查前100个字符
        const firstChars = body.substring(0, Math.min(100, body.length)).trim();
        const base64Pattern = /^[A-Za-z0-9+/=]+$/;
        
        if (base64Pattern.test(firstChars)) {
          try {
            // 尝试 Base64 解码
            // 注意：body 可能很大，需要处理内存
            const decoded = Buffer.from(body, 'base64').toString('utf8');
            body = JSON.parse(decoded);
            console.log('handleChunkUpload: Body 从 Base64 解码后解析为 JSON 成功');
            console.log('handleChunkUpload: 解码后的 body 键:', Object.keys(body || {}));
          } catch (e2) {
            console.log('handleChunkUpload: Body Base64 解码后解析失败:', e2.message);
            console.log('handleChunkUpload: Body 长度:', body.length);
            console.log('handleChunkUpload: Body 前500个字符:', body.substring(0, 500));
          }
        } else {
          console.log('handleChunkUpload: Body 字符串解析失败，不是 Base64 格式');
          console.log('handleChunkUpload: Body 前100个字符:', firstChars);
        }
      }
    }
    
    // 如果 body 是 Buffer，尝试转换为字符串并解析
    if (Buffer.isBuffer(body)) {
      try {
        // 先尝试直接转换为 UTF-8 字符串
        const bodyString = body.toString('utf8');
        body = JSON.parse(bodyString);
        console.log('handleChunkUpload: Body 从 Buffer (UTF-8) 解析为 JSON 成功');
      } catch (e) {
        // 如果失败，尝试 Base64 解码
        try {
          const base64String = body.toString('base64');
          const decoded = Buffer.from(base64String, 'base64').toString('utf8');
          body = JSON.parse(decoded);
          console.log('handleChunkUpload: Body 从 Buffer (Base64) 解析为 JSON 成功');
        } catch (e2) {
          console.log('handleChunkUpload: Body Buffer 解析失败:', e2.message);
        }
      }
    }
  } else if (typeof body === 'string' && body) {
    // 如果不是 application/octet-stream，直接尝试解析 JSON
    try {
      body = JSON.parse(body);
      console.log('handleChunkUpload: Body 从字符串解析为 JSON 成功');
    } catch (e) {
      console.log('handleChunkUpload: Body 字符串解析失败:', e.message);
    }
  }
  
  // 调试：输出 body 的最终类型和内容
  console.log('handleChunkUpload body 最终类型:', typeof body);
  console.log('handleChunkUpload body 是否为对象:', typeof body === 'object' && body !== null);
  if (typeof body === 'object' && body !== null && !Buffer.isBuffer(body)) {
    console.log('handleChunkUpload body 键:', Object.keys(body));
  } else if (typeof body === 'string') {
    console.log('handleChunkUpload body 字符串长度:', body.length);
    console.log('handleChunkUpload body 字符串前500字符:', body.substring(0, 500));
  }

  // 支持完整字段名和缩短字段名（为了减少请求体大小）
  const uploadId = body?.uploadId || body?.u;
  const chunkIndex = body?.chunkIndex !== undefined ? body.chunkIndex : body?.i;
  const totalChunks = body?.totalChunks || body?.t;
  const filePath = body?.filePath || body?.p;
  const chunkData = body?.chunkData || body?.d;
  const fileName = body?.fileName || body?.n;

  if (!uploadId || chunkIndex === undefined || !filePath || !chunkData) {
    console.error('缺少参数详情:', {
      uploadId: !!uploadId,
      chunkIndex: chunkIndex !== undefined,
      filePath: !!filePath,
      chunkData: !!chunkData,
      bodyType: typeof body,
      bodyKeys: body && typeof body === 'object' ? Object.keys(body) : 'N/A',
    });
    throw new Error('缺少必要参数: uploadId(u), chunkIndex(i), filePath(p), chunkData(d)');
  }

  try {
    // 检查存储支持
    const storage = checkStorageSupport();
    
    // 解码分片数据（Base64）
    const chunkBuffer = Buffer.from(chunkData, 'base64');
    
    // 临时存储分片（使用 uploadId 作为标识）
    // 注意：这里使用临时路径存储分片，实际应该使用数据库或缓存
    const chunkPath = `temp_chunks/${uploadId}/chunk_${chunkIndex}`;
    
    // 上传分片到临时位置
    // 根据官方文档：uploadFile 是 app 对象的直接方法
    console.log(`开始上传分片 ${chunkIndex + 1}/${totalChunks}，路径: ${chunkPath}，大小: ${(chunkBuffer.length / 1024).toFixed(2)} KB`);
    
    const uploadResult = await storage.uploadFile({
      cloudPath: chunkPath,
      fileContent: chunkBuffer,
    });
    
    console.log(`分片 ${chunkIndex + 1}/${totalChunks} uploadFile 返回结果:`, JSON.stringify(uploadResult, null, 2));
    
    // 验证上传结果
    if (!uploadResult) {
      throw new Error('上传结果为空');
    }
    
    // fileID 可能是 uploadResult.fileID 或 uploadResult.FileID（注意大小写）
    const fileID = uploadResult?.fileID || uploadResult?.FileID || chunkPath;
    
    console.log(`分片 ${chunkIndex + 1}/${totalChunks} 上传成功:`);
    console.log(`  完整路径 (chunkPath): ${chunkPath}`);
    console.log(`  完整 fileID: ${fileID}`);
    console.log(`  uploadResult 键:`, Object.keys(uploadResult || {}));
    console.log(`  uploadResult 完整内容:`, JSON.stringify(uploadResult, null, 2));
    
    return {
      code: 0,
      message: '分片上传成功',
      data: {
        chunkIndex: chunkIndex,
        chunkPath: chunkPath,
        fileID: fileID, // 返回 fileID 以便后续使用
      },
    };
  } catch (error) {
    console.error('分片上传失败:', error);
    // 如果是存储实例错误，包含诊断信息
    const errorMessage = error.message || '未知错误';
    if (errorMessage.includes('无法获取存储实例') || errorMessage.includes('app.storage')) {
      throw error; // 保留原始错误信息（包含诊断信息）
    }
    throw new Error(`分片上传失败: ${errorMessage}`);
  }
}

/**
 * 完成分片上传并合并
 */
async function handleCompleteChunkUpload(method, path, body, headers) {
  if (method !== 'POST') {
    throw new Error('只支持 POST 请求');
  }

  // 检查 Content-Type 和 X-Content-Format
  const contentType = headers?.['content-type'] || headers?.['Content-Type'] || '';
  const contentFormat = headers?.['x-content-format'] || headers?.['X-Content-Format'] || '';
  
  console.log('handleCompleteChunkUpload Content-Type:', contentType);
  console.log('handleCompleteChunkUpload X-Content-Format:', contentFormat);
  console.log('handleCompleteChunkUpload body 初始类型:', typeof body);
  
  // 如果 Content-Type 是 application/octet-stream 且 X-Content-Format 是 json，需要解析 body
  // 注意：使用 application/octet-stream 时，body 可能是 Base64 编码的字符串
  if (contentType.includes('application/octet-stream') && contentFormat === 'json') {
    if (typeof body === 'string' && body) {
      // 尝试直接解析 JSON
      try {
        body = JSON.parse(body);
        console.log('handleCompleteChunkUpload: Body 从字符串直接解析为 JSON 成功');
      } catch (e) {
        // 如果直接解析失败，可能是 Base64 编码的字符串
        const firstChars = body.substring(0, Math.min(100, body.length)).trim();
        const base64Pattern = /^[A-Za-z0-9+/=]+$/;
        
        if (base64Pattern.test(firstChars)) {
          try {
            // 尝试 Base64 解码
            const decoded = Buffer.from(body, 'base64').toString('utf8');
            body = JSON.parse(decoded);
            console.log('handleCompleteChunkUpload: Body 从 Base64 解码后解析为 JSON 成功');
            console.log('handleCompleteChunkUpload: 解码后的 body 键:', Object.keys(body || {}));
          } catch (e2) {
            console.log('handleCompleteChunkUpload: Body Base64 解码后解析失败:', e2.message);
            console.log('handleCompleteChunkUpload: Body 长度:', body.length);
            console.log('handleCompleteChunkUpload: Body 前500个字符:', body.substring(0, 500));
          }
        } else {
          console.log('handleCompleteChunkUpload: Body 字符串解析失败，不是 Base64 格式');
          console.log('handleCompleteChunkUpload: Body 前100个字符:', firstChars);
        }
      }
    }
    
    // 如果 body 是 Buffer，尝试转换为字符串并解析
    if (Buffer.isBuffer(body)) {
      try {
        const bodyString = body.toString('utf8');
        body = JSON.parse(bodyString);
        console.log('handleCompleteChunkUpload: Body 从 Buffer (UTF-8) 解析为 JSON 成功');
      } catch (e) {
        try {
          const base64String = body.toString('base64');
          const decoded = Buffer.from(base64String, 'base64').toString('utf8');
          body = JSON.parse(decoded);
          console.log('handleCompleteChunkUpload: Body 从 Buffer (Base64) 解析为 JSON 成功');
        } catch (e2) {
          console.log('handleCompleteChunkUpload: Body Buffer 解析失败:', e2.message);
        }
      }
    }
  } else if (typeof body === 'string' && body) {
    // 如果不是 application/octet-stream，直接尝试解析 JSON
    try {
      body = JSON.parse(body);
      console.log('handleCompleteChunkUpload: Body 从字符串解析为 JSON 成功');
    } catch (e) {
      console.log('handleCompleteChunkUpload: Body 字符串解析失败:', e.message);
    }
  }
  
  // 调试：输出 body 的最终类型和内容
  console.log('handleCompleteChunkUpload body 最终类型:', typeof body);
  if (typeof body === 'object' && body !== null && !Buffer.isBuffer(body)) {
    console.log('handleCompleteChunkUpload body 键:', Object.keys(body));
  } else if (typeof body === 'string') {
    console.log('handleCompleteChunkUpload body 字符串长度:', body.length);
    console.log('handleCompleteChunkUpload body 字符串前500字符:', body.substring(0, 500));
  }

  // 支持完整字段名和缩短字段名（为了减少请求体大小）
  const uploadId = body?.uploadId || body?.u;
  const totalChunks = body?.totalChunks || body?.t;
  const filePath = body?.filePath || body?.p;
  const fileName = body?.fileName || body?.n;
  // 可选：如果客户端传递了所有分片的 fileID 列表，使用它们
  const chunkFileIDs = body?.chunkFileIDs || body?.fids || null;

  console.log(`\n========== 开始合并分片 ==========`);
  console.log(`完整 uploadId: ${uploadId}`);
  console.log(`完整 totalChunks: ${totalChunks}`);
  console.log(`完整 filePath: ${filePath}`);
  console.log(`完整 fileName: ${fileName || 'N/A'}`);
  console.log(`chunkFileIDs 是否存在: ${!!chunkFileIDs}`);
  if (chunkFileIDs && Array.isArray(chunkFileIDs)) {
    console.log(`chunkFileIDs 数组长度: ${chunkFileIDs.length}`);
    console.log(`chunkFileIDs 前3个:`, chunkFileIDs.slice(0, 3).map(id => id ? id.substring(0, 100) + '...' : 'null'));
    if (chunkFileIDs.length > 0) {
      console.log(`第一个 fileID: ${chunkFileIDs[0]}`);
      console.log(`最后一个 fileID: ${chunkFileIDs[chunkFileIDs.length - 1]}`);
    }
  } else if (chunkFileIDs) {
    console.log(`chunkFileIDs 类型: ${typeof chunkFileIDs}`);
    console.log(`chunkFileIDs 内容:`, chunkFileIDs);
  }
  console.log(`body 完整内容:`, JSON.stringify(body, null, 2));
  console.log(`====================================\n`);

  if (!uploadId || !totalChunks || !filePath) {
    console.error('缺少参数详情:', {
      uploadId: !!uploadId,
      totalChunks: !!totalChunks,
      filePath: !!filePath,
      bodyType: typeof body,
      bodyKeys: body && typeof body === 'object' ? Object.keys(body) : 'N/A',
    });
    throw new Error('缺少必要参数: uploadId(u), totalChunks(t), filePath(p)');
  }

  try {
    // 检查存储支持
    const storage = checkStorageSupport();
    
    // 获取环境ID和存储域名（从环境变量或初始化配置中获取）
    const envId = process.env.TCB_ENV || 'cloud1-4gee45pq61cd6f19';
    // 存储域名格式：环境ID.存储域名
    // 根据示例：cloud://cloud1-4gee45pq61cd6f19.636c-cloud1-4gee45pq61cd6f19-1259499058/路径
    const storageDomain = '636c-cloud1-4gee45pq61cd6f19-1259499058';
    const cloudPrefix = `${envId}.${storageDomain}`;
    
    console.log(`环境配置: envId=${envId}, storageDomain=${storageDomain}, cloudPrefix=${cloudPrefix}`);
    
    // 辅助函数：将路径转换为 cloud:// 格式的 fileID
    // 格式：cloud://环境ID.存储域名/路径
    function pathToCloudFileID(path) {
      // 如果已经是 cloud:// 格式，直接返回
      if (path && path.startsWith('cloud://')) {
        return path;
      }
      // 否则转换为 cloud://环境ID.存储域名/路径 格式
      // 注意：路径不应该以 / 开头
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      return `cloud://${cloudPrefix}/${cleanPath}`;
    }
    
    // 辅助函数：获取分片 URL（带重试，优先使用 fileID）
    async function getChunkUrlWithRetry(fileIdentifier, chunkPath, maxRetries = 3, delayMs = 1000) {
      // 如果 fileIdentifier 是完整的 fileID（cloud:// 开头），直接使用
      // 否则，将路径转换为 cloud:// 格式
      const isFileID = fileIdentifier && typeof fileIdentifier === 'string' && fileIdentifier.startsWith('cloud://');
      const cloudFileID = isFileID ? fileIdentifier : pathToCloudFileID(chunkPath);
      
      console.log(`\n========== 获取分片 URL ==========`);
      console.log(`原始 fileIdentifier: ${fileIdentifier || 'N/A'}`);
      console.log(`原始 chunkPath: ${chunkPath}`);
      console.log(`是否为 fileID 格式: ${isFileID}`);
      console.log(`最终使用的 cloud:// fileID: ${cloudFileID}`);
      console.log(`====================================\n`);
      
      // 统一使用 cloud:// 格式获取 URL
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`使用 cloud:// fileID 获取 URL (尝试 ${attempt}/${maxRetries})`);
          console.log(`传递给 getTempFileURL 的完整 fileID: ${cloudFileID}`);
          
          // 根据官方文档，Node.js SDK 使用 fileList 格式
          // fileList 可以是字符串数组，也可以是对象数组（包含 fileID 和 maxAge）
          // 格式1: fileList: ["cloud://..."]
          // 格式2: fileList: [{fileID: "cloud://...", maxAge: 120}]
          console.log(`调用 getTempFileURL，参数:`, JSON.stringify({
            fileList: [cloudFileID],
          }, null, 2));
          
          const urlResult = await storage.getTempFileURL({
            fileList: [cloudFileID],
          });
          
          console.log(`getTempFileURL 返回结果类型:`, typeof urlResult);
          console.log(`getTempFileURL 返回结果键:`, urlResult ? Object.keys(urlResult) : 'null');
          console.log(`getTempFileURL 完整返回结果:`, JSON.stringify(urlResult, null, 2));
          
          // 处理返回结果
          // 返回结果可能是：
          // 1. { fileList: [{ fileID: "...", tempFileURL: "...", code: "...", message: "..." }] }
          // 2. { fileList: [...] } 或直接是数组
          let firstItem = null;
          if (urlResult && urlResult.fileList && Array.isArray(urlResult.fileList) && urlResult.fileList.length > 0) {
            firstItem = urlResult.fileList[0];
          } else if (Array.isArray(urlResult) && urlResult.length > 0) {
            firstItem = urlResult[0];
          } else if (urlResult && urlResult.tempFileURL) {
            // 如果直接返回了 tempFileURL
            firstItem = urlResult;
          }
          
          if (firstItem) {
            console.log(`处理后的 firstItem:`, JSON.stringify(firstItem, null, 2));
            
            if (firstItem.tempFileURL) {
              console.log(`✅ 成功获取 URL: ${firstItem.tempFileURL.substring(0, 100)}...`);
              return firstItem.tempFileURL;
            } else {
              const errorCode = firstItem.code || firstItem.Code;
              const errorMsg = firstItem.message || firstItem.Message || firstItem.errMsg || firstItem.ErrMsg;
              console.warn(`获取 URL 失败 (尝试 ${attempt}/${maxRetries}):`, {
                code: errorCode,
                message: errorMsg,
                fileID: firstItem.fileID || firstItem.fileid || cloudFileID,
              });
              
              // 如果是文件不存在的错误，等待后重试
              if (errorCode === 'STORAGE_FILE_NONEXIST' || 
                  errorCode === 'FILE_NOT_FOUND' ||
                  errorCode === -1 ||
                  errorMsg?.includes('not found') || 
                  errorMsg?.includes('不存在') ||
                  errorMsg?.includes('文件不存在')) {
                if (attempt < maxRetries) {
                  console.log(`文件不存在，等待 ${delayMs}ms 后重试...`);
                  await new Promise(resolve => setTimeout(resolve, delayMs));
                  continue;
                }
              } else if (errorCode || errorMsg) {
                // 其他错误，也重试
                if (attempt < maxRetries) {
                  console.log(`检测到错误，等待 ${delayMs}ms 后重试...`);
                  await new Promise(resolve => setTimeout(resolve, delayMs));
                  continue;
                }
              }
            }
          } else {
            console.warn(`getTempFileURL 返回结果无法解析 (尝试 ${attempt}/${maxRetries})`);
            console.warn(`返回结果:`, urlResult);
          }
          
          // 如果还有重试机会，等待后重试
          if (attempt < maxRetries) {
            console.log(`获取 URL 失败，等待 ${delayMs}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          console.error(`获取 URL 异常 (尝试 ${attempt}/${maxRetries}):`, error.message);
          if (attempt < maxRetries) {
            console.log(`等待 ${delayMs}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          } else {
            throw error;
          }
        }
      }
      
      throw new Error(`无法获取分片 URL: 已重试 ${maxRetries} 次`);
    }
    
    // 开始合并所有分片
    // 注意：云函数有3秒超时限制，需要优化合并逻辑
    console.log(`\n开始合并 ${totalChunks} 个分片...\n`);
    console.log(`⚠️  注意：云函数有3秒超时限制，需要快速处理`);
    
    // 优化：减少重试次数和等待时间，提高处理速度
    const maxRetries = 1; // 减少重试次数（从3次改为1次）
    const delayMs = 100; // 减少等待时间（从1000ms改为100ms）
    
    // 优化：并行获取所有分片的 URL（减少总时间）
    console.log(`步骤 1: 批量获取所有分片的 URL...`);
    const chunkUrlPromises = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = `temp_chunks/${uploadId}/chunk_${i}`;
      const fileIdentifier = (chunkFileIDs && chunkFileIDs.length > i && chunkFileIDs[i]) ? chunkFileIDs[i] : null;
      
      // 转换为 cloud:// 格式
      const cloudFileID = fileIdentifier ? fileIdentifier : pathToCloudFileID(chunkPath);
      
      console.log(`分片 ${i + 1}/${totalChunks}: ${cloudFileID.substring(0, 80)}...`);
      
      // 并行获取 URL（不等待）
      chunkUrlPromises.push(
        storage.getTempFileURL({
          fileList: [cloudFileID],
        }).then(result => {
          if (result && result.fileList && result.fileList.length > 0 && result.fileList[0].tempFileURL) {
            return { index: i, url: result.fileList[0].tempFileURL, success: true };
          } else {
            const errorCode = result?.fileList?.[0]?.code;
            const errorMsg = result?.fileList?.[0]?.message;
            throw new Error(`获取 URL 失败: ${errorCode || 'N/A'}, ${errorMsg || 'N/A'}`);
          }
        }).catch(error => {
          return { index: i, url: null, success: false, error: error.message };
        })
      );
    }
    
    // 等待所有 URL 获取完成
    console.log(`等待所有 URL 获取完成...`);
    const chunkUrlResults = await Promise.all(chunkUrlPromises);
    
    // 检查是否有失败的
    const failedChunks = chunkUrlResults.filter(r => !r.success);
    if (failedChunks.length > 0) {
      console.error(`有 ${failedChunks.length} 个分片获取 URL 失败:`, failedChunks);
      throw new Error(`获取分片 URL 失败: ${failedChunks.map(f => `分片${f.index}: ${f.error}`).join(', ')}`);
    }
    
    // 按索引排序
    chunkUrlResults.sort((a, b) => a.index - b.index);
    
    // 由于云函数有3秒超时限制，无法在函数内完成下载和合并
    // 方案：返回所有分片的下载URL，让客户端自行下载并合并
    
    console.log(`⚠️  由于云函数3秒超时限制，返回分片URL列表供客户端合并`);
    
    // 提取所有分片的下载URL（已经在上面的步骤中获取）
    const chunkUrls = chunkUrlResults
      .sort((a, b) => a.index - b.index)
      .map(result => result.url);
    
    console.log(`✅ 成功获取 ${chunkUrls.length} 个分片的URL`);
    console.log(`   第一个URL: ${chunkUrls[0]?.substring(0, 80)}...`);
    console.log(`   最后一个URL: ${chunkUrls[chunkUrls.length - 1]?.substring(0, 80)}...`);
    
    // 返回分片URL列表，让客户端下载并合并
    return {
      code: 0,
      message: '分片URL获取成功，请使用客户端下载并合并',
      data: {
        uploadId: uploadId,
        totalChunks: totalChunks,
        chunkUrls: chunkUrls, // 所有分片的下载URL列表（按顺序）
        targetFilePath: filePath,
        // 提示信息
        instructions: '客户端需要：1) 下载所有分片 2) 按顺序合并 3) 保存为最终文件',
      },
    };
    
    /* 方案2：如果在云函数中合并（需要更多时间，可能超时）
    // 步骤 2: 批量下载所有分片（并行下载，但限制并发数）
    console.log(`步骤 2: 下载所有分片...`);
    const CONCURRENT_DOWNLOADS = 10; // 增加并发数，减少总时间
    const chunks = [];
    
    for (let i = 0; i < chunkUrlResults.length; i += CONCURRENT_DOWNLOADS) {
      const batch = chunkUrlResults.slice(i, i + CONCURRENT_DOWNLOADS);
      console.log(`下载批次 ${Math.floor(i / CONCURRENT_DOWNLOADS) + 1}: 分片 ${i + 1}-${Math.min(i + CONCURRENT_DOWNLOADS, chunkUrlResults.length)}`);
      
      const batchPromises = batch.map(result => 
        downloadFileFromUrl(result.url).then(buffer => ({
          index: result.index,
          buffer: buffer,
        }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      
      // 按索引排序并添加到 chunks 数组
      batchResults.sort((a, b) => a.index - b.index);
      for (const result of batchResults) {
        chunks.push(result.buffer);
        console.log(`已下载分片 ${result.index + 1}/${totalChunks}，大小: ${(result.buffer.length / 1024).toFixed(2)} KB`);
      }
    }
    
    // 步骤 3: 合并所有分片
    console.log(`步骤 3: 合并所有分片...`);
    const fullFileBuffer = Buffer.concat(chunks);
    console.log(`合并完成，总大小: ${(fullFileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // 上传完整文件
    // 根据官方文档：uploadFile 是 app 对象的直接方法
    const uploadResult = await storage.uploadFile({
      cloudPath: filePath,
      fileContent: fullFileBuffer,
    });
    */
    
    /* 原有的合并逻辑（已注释，因为3秒超时限制）
    // 清理临时分片
    try {
      if (storage.deleteFile) {
        for (let i = 0; i < totalChunks; i++) {
          const chunkPath = `temp_chunks/${uploadId}/chunk_${i}`;
          // 删除文件也需要使用 cloud:// 格式
          const chunkCloudFileID = pathToCloudFileID(chunkPath);
          console.log(`清理分片 ${i}: ${chunkCloudFileID}`);
          await storage.deleteFile({
            fileList: [chunkCloudFileID],
          });
        }
        console.log('临时分片已清理');
      } else {
        console.warn('deleteFile 方法不可用，跳过清理临时分片');
      }
    } catch (cleanupError) {
      console.warn('清理临时分片失败:', cleanupError);
    }
    
    // 获取文件访问 URL
    if (!storage.getTempFileURL) {
      throw new Error('getTempFileURL 方法不可用');
    }
    
    // 获取最终文件的 URL 也需要使用 cloud:// 格式
    const finalFileCloudID = pathToCloudFileID(filePath);
    console.log(`获取最终文件的 URL，使用 cloud:// fileID: ${finalFileCloudID}`);
    const fileUrlResult = await storage.getTempFileURL({
      fileList: [finalFileCloudID],
    });

    const fileUrl = fileUrlResult.fileList[0]?.tempFileURL || 
      `https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/${filePath}`;

    console.log('分片上传完成:', { filePath, fileUrl, fileSize: fullFileBuffer.length });

    return {
      code: 0,
      message: '上传成功',
      data: {
        fileId: uploadResult.fileID,
        filePath: filePath,
        fileUrl: fileUrl,
        fileSize: fullFileBuffer.length,
      },
    };
    */
  } catch (error) {
    console.error('完成分片上传失败:', error);
    // 如果是存储实例错误，包含诊断信息
    const errorMessage = error.message || '未知错误';
    if (errorMessage.includes('无法获取存储实例') || errorMessage.includes('app.storage')) {
      throw error; // 保留原始错误信息（包含诊断信息）
    }
    throw new Error(`完成分片上传失败: ${errorMessage}`);
  }
}

/**
 * 处理合并任务（实际的合并逻辑）
 * 这个函数会在后台执行，不受3秒超时限制
 */
async function processMergeTask(taskId) {
  console.log(`\n========== 开始处理合并任务: ${taskId} ==========`);
  
  try {
    // 从数据库获取任务信息
    const taskDoc = await db.collection('merge_tasks').doc(taskId).get();
    if (!taskDoc.data) {
      throw new Error(`任务不存在: ${taskId}`);
    }
    
    const task = taskDoc.data;
    console.log(`任务信息:`, {
      taskId: task.taskId,
      uploadId: task.uploadId,
      totalChunks: task.totalChunks,
      filePath: task.filePath,
      status: task.status,
    });
    
    // 更新任务状态为处理中
    await db.collection('merge_tasks').doc(taskId).update({
      status: 'processing',
      progress: 0,
      updatedAt: new Date().toISOString(),
    });
    
    // 检查存储支持
    const storage = checkStorageSupport();
    
    // 获取环境ID和存储域名
    const envId = process.env.TCB_ENV || 'cloud1-4gee45pq61cd6f19';
    const storageDomain = '636c-cloud1-4gee45pq61cd6f19-1259499058';
    const cloudPrefix = `${envId}.${storageDomain}`;
    
    // 辅助函数：将路径转换为 cloud:// 格式的 fileID
    function pathToCloudFileID(path) {
      if (path && path.startsWith('cloud://')) {
        return path;
      }
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      return `cloud://${cloudPrefix}/${cleanPath}`;
    }
    
    // 下载文件的辅助函数
    function downloadFileFromUrl(url) {
      return new Promise((resolve, reject) => {
        https.get(url, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`下载失败: HTTP ${res.statusCode}`));
            return;
          }
          
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }).on('error', reject);
      });
    }
    
    // 步骤1: 获取所有分片的URL
    console.log(`步骤 1: 获取所有分片的URL...`);
    const chunkUrlPromises = [];
    for (let i = 0; i < task.totalChunks; i++) {
      const chunkPath = `temp_chunks/${task.uploadId}/chunk_${i}`;
      const fileIdentifier = (task.chunkFileIDs && task.chunkFileIDs.length > i && task.chunkFileIDs[i]) 
        ? task.chunkFileIDs[i] 
        : null;
      
      const cloudFileID = fileIdentifier ? fileIdentifier : pathToCloudFileID(chunkPath);
      
      chunkUrlPromises.push(
        storage.getTempFileURL({
          fileList: [cloudFileID],
        }).then(result => {
          if (result && result.fileList && result.fileList.length > 0 && result.fileList[0].tempFileURL) {
            return { index: i, url: result.fileList[0].tempFileURL, success: true };
          } else {
            throw new Error(`获取分片 ${i} URL 失败`);
          }
        }).catch(error => {
          return { index: i, url: null, success: false, error: error.message };
        })
      );
    }
    
    const chunkUrlResults = await Promise.all(chunkUrlPromises);
    const failedChunks = chunkUrlResults.filter(r => !r.success);
    if (failedChunks.length > 0) {
      throw new Error(`获取分片URL失败: ${failedChunks.map(f => `分片${f.index}`).join(', ')}`);
    }
    
    chunkUrlResults.sort((a, b) => a.index - b.index);
    
    // 更新进度
    await db.collection('merge_tasks').doc(taskId).update({
      progress: 10,
      updatedAt: new Date().toISOString(),
    });
    
    // 步骤2: 下载所有分片
    console.log(`步骤 2: 下载所有分片...`);
    const CONCURRENT_DOWNLOADS = 10;
    const chunks = [];
    
    for (let i = 0; i < chunkUrlResults.length; i += CONCURRENT_DOWNLOADS) {
      const batch = chunkUrlResults.slice(i, i + CONCURRENT_DOWNLOADS);
      const progress = Math.floor((i / chunkUrlResults.length) * 80) + 10;
      
      const batchPromises = batch.map(result => 
        downloadFileFromUrl(result.url).then(buffer => ({
          index: result.index,
          buffer: buffer,
        }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.sort((a, b) => a.index - b.index);
      for (const result of batchResults) {
        chunks.push(result.buffer);
      }
      
      // 更新进度
      await db.collection('merge_tasks').doc(taskId).update({
        progress: progress,
        updatedAt: new Date().toISOString(),
      });
    }
    
    // 步骤3: 合并分片
    console.log(`步骤 3: 合并所有分片...`);
    const fullFileBuffer = Buffer.concat(chunks);
    console.log(`合并完成，总大小: ${(fullFileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    await db.collection('merge_tasks').doc(taskId).update({
      progress: 90,
      updatedAt: new Date().toISOString(),
    });
    
    // 步骤4: 上传完整文件
    console.log(`步骤 4: 上传完整文件...`);
    const uploadResult = await storage.uploadFile({
      cloudPath: task.filePath,
      fileContent: fullFileBuffer,
    });
    
    // 步骤5: 获取文件URL
    const finalFileCloudID = pathToCloudFileID(task.filePath);
    const fileUrlResult = await storage.getTempFileURL({
      fileList: [finalFileCloudID],
    });
    
    const fileUrl = fileUrlResult.fileList[0]?.tempFileURL || 
      `https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/${task.filePath}`;
    
    // 步骤6: 清理临时分片
    console.log(`步骤 5: 清理临时分片...`);
    try {
      if (storage.deleteFile) {
        for (let i = 0; i < task.totalChunks; i++) {
          const chunkPath = `temp_chunks/${task.uploadId}/chunk_${i}`;
          const chunkCloudFileID = pathToCloudFileID(chunkPath);
          await storage.deleteFile({
            fileList: [chunkCloudFileID],
          });
        }
        console.log('临时分片已清理');
      }
    } catch (cleanupError) {
      console.warn('清理临时分片失败:', cleanupError);
    }
    
    // 更新任务状态为完成
    await db.collection('merge_tasks').doc(taskId).update({
      status: 'completed',
      progress: 100,
      fileId: uploadResult.fileID,
      fileUrl: fileUrl,
      fileSize: fullFileBuffer.length,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    console.log(`✅ 合并任务完成: ${taskId}`);
    console.log(`   文件路径: ${task.filePath}`);
    console.log(`   文件大小: ${(fullFileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   文件URL: ${fileUrl}`);
    
  } catch (error) {
    console.error(`❌ 处理合并任务失败: ${taskId}`, error);
    // 更新任务状态为失败
    try {
      await db.collection('merge_tasks').doc(taskId).update({
        status: 'failed',
        error: error.message,
        updatedAt: new Date().toISOString(),
      });
    } catch (updateError) {
      console.error(`更新任务状态失败:`, updateError);
    }
    throw error;
  }
}

/**
 * 查询合并任务状态
 * GET /storage/merge-task-status?taskId=xxx
 */
async function handleMergeTaskStatus(method, path, body, headers) {
  if (method !== 'GET') {
    throw new Error('只支持 GET 请求');
  }
  
  try {
    // 从查询参数中获取 taskId
    const url = new URL(`http://example.com${path}`);
    const taskId = url.searchParams.get('taskId');
    
    if (!taskId) {
      throw new Error('缺少必要参数: taskId');
    }
    
    // 从数据库查询任务状态
    const taskDoc = await db.collection('merge_tasks').doc(taskId).get();
    
    if (!taskDoc.data) {
      return {
        code: 404,
        message: '任务不存在',
        data: null,
      };
    }
    
    const task = taskDoc.data;
    
    return {
      code: 0,
      message: '查询成功',
      data: {
        taskId: task.taskId,
        status: task.status, // pending, processing, completed, failed
        progress: task.progress || 0,
        uploadId: task.uploadId,
        filePath: task.filePath,
        fileId: task.fileId,
        fileUrl: task.fileUrl,
        fileSize: task.fileSize,
        error: task.error,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        completedAt: task.completedAt,
      },
    };
  } catch (error) {
    console.error('查询任务状态失败:', error);
    throw new Error(`查询任务状态失败: ${error.message}`);
  }
}

/**
 * 处理合并任务（HTTP调用触发）
 * POST /storage/process-merge-task
 */
async function handleProcessMergeTask(method, path, body, headers) {
  if (method !== 'POST') {
    throw new Error('只支持 POST 请求');
  }
  
  try {
    // 解析请求体
    let taskId;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        // 如果不是JSON，尝试Base64解码
        try {
          body = JSON.parse(Buffer.from(body, 'base64').toString());
        } catch (e2) {
          throw new Error('无法解析请求体');
        }
      }
    }
    
    taskId = body.taskId || body.t;
    
    if (!taskId) {
      throw new Error('缺少必要参数: taskId');
    }
    
    // 触发合并任务处理
    await processMergeTask(taskId);
    
    return {
      code: 0,
      message: '合并任务处理已启动',
      data: {
        taskId: taskId,
      },
    };
  } catch (error) {
    console.error('处理合并任务失败:', error);
    throw new Error(`处理合并任务失败: ${error.message}`);
  }
}

/**
 * 文件上传到云存储接口
 * POST /storage/upload
 * 支持两种方式：
 * 1. multipart/form-data（推荐，支持大文件）
 * 2. JSON with Base64（小文件，< 10MB）
 */
async function handleStorageUpload(method, path, body, headers) {
  if (method !== 'POST') {
    throw new Error('只支持 POST 请求');
  }

  try {
    // 如果 Content-Type 是 application/octet-stream，但 X-Content-Format 是 json，需要解析 body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.log('Body 解析失败，保持原样:', e.message);
      }
    }

    // 检查存储支持
    const storage = checkStorageSupport();
    
    let fileBuffer;
    let filePath;
    let fileName;
    
    // 检查 Content-Type，判断是 multipart 还是 JSON
    const contentType = headers['content-type'] || headers['Content-Type'] || '';
    
    if (contentType.includes('multipart/form-data')) {
      // multipart/form-data 方式
      // 注意：腾讯云函数可能需要特殊处理 multipart 数据
      // 这里假设 body 已经是解析后的对象，包含 file 字段
      if (typeof body === 'string') {
        // body 可能是字符串，需要解析
        try {
          body = JSON.parse(body);
        } catch (e) {
          throw new Error('无法解析请求体，请使用 multipart/form-data 或 JSON 格式');
        }
      }
      
      // 从 body 中获取文件数据
      // 如果 body.file 是 Buffer，直接使用
      // 如果是 Base64 字符串，需要解码
      if (body.file instanceof Buffer) {
        fileBuffer = body.file;
      } else if (typeof body.file === 'string') {
        // 可能是 Base64 编码
        fileBuffer = Buffer.from(body.file, 'base64');
      } else {
        throw new Error('未找到文件数据，请确保使用 multipart/form-data 上传文件');
      }
      
      filePath = body.filePath || body.cloudPath;
      fileName = body.fileName || 'file';
      
      if (!filePath) {
        throw new Error('缺少必要参数: filePath 或 cloudPath');
      }
    } else {
      // JSON 方式（Base64 编码）
      const { fileName: jsonFileName, filePath: jsonFilePath, fileContent } = body;

      if (!jsonFileName || !jsonFilePath || !fileContent) {
        throw new Error('缺少必要参数: fileName, filePath, fileContent');
      }

      fileBuffer = Buffer.from(fileContent, 'base64');
      filePath = jsonFilePath;
      fileName = jsonFileName;
      
      // 检查文件大小（JSON 方式限制为 10MB）
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileBuffer.length > maxSize) {
        throw new Error(`文件过大: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB，超过限制 ${(maxSize / 1024 / 1024).toFixed(2)} MB。请使用 multipart/form-data 方式上传`);
      }
    }
    
    const fileSize = fileBuffer.length;
    console.log(`准备上传文件: ${fileName}, 大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB, 路径: ${filePath}`);
    
    // 使用 app.uploadFile 方法上传
    // 根据官方文档：uploadFile 是 app 对象的直接方法
    const uploadResult = await storage.uploadFile({
      cloudPath: filePath,
      fileContent: fileBuffer, // 直接使用 Buffer
    });

    console.log('文件上传到存储成功:', uploadResult);

    // 获取文件访问 URL
    if (!storage.getTempFileURL) {
      throw new Error('getTempFileURL 方法不可用');
    }
    
    const fileUrlResult = await storage.getTempFileURL({
      fileList: [filePath],
    });

    const fileUrl = fileUrlResult.fileList[0]?.tempFileURL || 
      `https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/${filePath}`;

    console.log('文件上传成功:', { filePath, fileUrl, fileSize });

    return {
      code: 0,
      message: '上传成功',
      data: {
        fileId: uploadResult.fileID,
        filePath: filePath,
        fileUrl: fileUrl,
        fileSize: fileSize,
      },
    };
  } catch (error) {
    console.error('上传文件到存储失败:', error);
    throw new Error(`上传失败: ${error.message || '未知错误'}`);
  }
}

// ========== 音频处理相关函数 ==========

/**
 * 处理音频处理请求（触发异步处理任务）
 * POST /reciting/audio/process
 */
async function handleAudioProcess(method, path, body, headers) {
  if (method !== 'POST') {
    throw new Error('只支持 POST 请求');
  }

  const userId = getUserIdFromToken(headers);
  const { contentId, audioUrl } = body;

  if (!contentId || !audioUrl) {
    throw new Error('缺少必要参数: contentId, audioUrl');
  }

  // 创建处理任务
  const taskId = `audio_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const tasksCollection = db.collection('audio_processing_tasks');
  
  await tasksCollection.add({
    taskId: taskId,
    contentId: contentId,
    audioUrl: audioUrl,
    userId: userId,
    status: 'pending',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 更新内容状态
  const contentsCollection = db.collection('reciting_contents');
  await contentsCollection.where({
    id: contentId,
    userId: userId,
  }).update({
    processingStatus: 'pending',
    taskId: taskId,
    updatedAt: new Date().toISOString(),
  });

  // 创建站内信通知
  await createMessage(userId, {
    type: 'audio_processing',
    title: '音频处理任务已创建',
    content: '您的音频文件已开始处理，处理完成后将通知您。',
    relatedId: contentId,
    metadata: {
      contentId: contentId,
      processingStatus: 'pending',
      progress: 0,
    },
  });

  // 异步触发处理（不等待完成）
  processAudioAsync(taskId, contentId, audioUrl, userId).catch(error => {
    console.error('音频处理失败:', error);
    // 更新任务状态为失败
    tasksCollection.where({ taskId: taskId }).update({
      status: 'failed',
      errorMessage: error.message,
      updatedAt: new Date().toISOString(),
    });
    // 发送失败通知
    createMessage(userId, {
      type: 'audio_processing',
      title: '音频处理失败',
      content: `音频处理失败: ${error.message}`,
      relatedId: contentId,
      metadata: {
        contentId: contentId,
        processingStatus: 'failed',
        errorMessage: error.message,
      },
    });
  });

  return {
    code: 0,
    message: '处理任务已创建',
    data: {
      taskId: taskId,
      contentId: contentId,
    },
  };
}

/**
 * 异步处理音频（语音识别、语义分析、音频拆分）
 */
async function processAudioAsync(taskId, contentId, audioUrl, userId) {
  const tasksCollection = db.collection('audio_processing_tasks');
  const contentsCollection = db.collection('reciting_contents');

  try {
    // 更新状态为处理中
    await tasksCollection.where({ taskId: taskId }).update({
      status: 'processing',
      progress: 10,
      updatedAt: new Date().toISOString(),
    });

    await contentsCollection.where({ id: contentId }).update({
      processingStatus: 'processing',
      updatedAt: new Date().toISOString(),
    });

    // 步骤1: 下载音频文件（这里简化，实际应该从云存储下载）
    console.log('步骤1: 下载音频文件...', audioUrl);
    // TODO: 实现音频下载逻辑

    // 步骤2: 语音识别（ASR）
    console.log('步骤2: 语音识别...');
    // TODO: 集成腾讯云ASR或其他ASR服务
    // 这里使用模拟数据
    const asrResult = {
      text: '这是模拟的识别文本。包含多个句子。第一句结束。第二句开始。第三句也完成了。',
      words: [
        { word: '这是', startTime: 0, endTime: 0.5 },
        { word: '模拟', startTime: 0.5, endTime: 1.0 },
        // ... 更多词
      ],
    };

    await tasksCollection.where({ taskId: taskId }).update({
      progress: 40,
      updatedAt: new Date().toISOString(),
    });

    // 步骤3: 语义分析和句子拆分
    console.log('步骤3: 语义分析和句子拆分...');
    const sentences = splitIntoSentences(asrResult.text, asrResult.words);

    await tasksCollection.where({ taskId: taskId }).update({
      progress: 60,
      updatedAt: new Date().toISOString(),
    });

    // 步骤4: 音频拆分（这里简化，实际需要使用ffmpeg）
    console.log('步骤4: 音频拆分...');
    // TODO: 使用ffmpeg按时间戳拆分音频
    const audioSegments = await splitAudio(audioUrl, sentences);

    await tasksCollection.where({ taskId: taskId }).update({
      progress: 90,
      updatedAt: new Date().toISOString(),
    });

    // 步骤5: 保存结果
    console.log('步骤5: 保存结果...');
    await contentsCollection.where({ id: contentId }).update({
      processingStatus: 'completed',
      textContent: asrResult.text,
      sentences: audioSegments,
      sentenceCount: audioSegments.length,
      asrProvider: 'tencent', // 或实际使用的ASR服务商
      updatedAt: new Date().toISOString(),
    });

    await tasksCollection.where({ taskId: taskId }).update({
      status: 'completed',
      progress: 100,
      updatedAt: new Date().toISOString(),
    });

    // 发送完成通知
    await createMessage(userId, {
      type: 'audio_processing',
      title: '音频处理完成',
      content: `您的音频文件已处理完成，共识别出 ${audioSegments.length} 个句子。`,
      relatedId: contentId,
      metadata: {
        contentId: contentId,
        processingStatus: 'completed',
        progress: 100,
      },
    });

    console.log('音频处理完成:', taskId);
  } catch (error) {
    console.error('音频处理错误:', error);
    throw error;
  }
}

/**
 * 将文本拆分为句子
 */
function splitIntoSentences(text, words) {
  // 简单的句子拆分：基于标点符号
  const sentenceEndings = /[。！？；]/g;
  const sentences = [];
  let currentSentence = '';
  let currentStartTime = 0;
  let sentenceIndex = 0;

  for (let i = 0; i < text.length; i++) {
    currentSentence += text[i];
    
    if (sentenceEndings.test(text[i])) {
      if (currentSentence.trim()) {
        // 估算时间（简化处理）
        const estimatedDuration = currentSentence.length * 0.1; // 假设每个字符0.1秒
        
        sentences.push({
          index: sentenceIndex++,
          text: currentSentence.trim(),
          startTime: currentStartTime,
          endTime: currentStartTime + estimatedDuration,
          audioUrl: '', // 将在音频拆分后填充
        });
        
        currentStartTime += estimatedDuration;
        currentSentence = '';
      }
    }
  }

  // 处理最后一句（如果没有结束标点）
  if (currentSentence.trim()) {
    const estimatedDuration = currentSentence.length * 0.1;
    sentences.push({
      index: sentenceIndex++,
      text: currentSentence.trim(),
      startTime: currentStartTime,
      endTime: currentStartTime + estimatedDuration,
      audioUrl: '',
    });
  }

  return sentences;
}

/**
 * 拆分音频（简化实现，实际需要使用ffmpeg）
 */
async function splitAudio(audioUrl, sentences) {
  // TODO: 使用ffmpeg按时间戳拆分音频
  // 这里返回模拟数据
  const storage = checkStorageSupport();
  const audioSegments = [];

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    // TODO: 实际应该使用ffmpeg拆分音频
    // const segmentUrl = await splitAudioSegment(audioUrl, sentence.startTime, sentence.endTime);
    
    // 模拟：生成音频片段URL（实际应该上传拆分后的音频）
    const segmentPath = `reciting/audio/segments/${Date.now()}_${i}.mp3`;
    sentence.audioUrl = `https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/${segmentPath}`;
    
    audioSegments.push(sentence);
  }

  return audioSegments;
}

/**
 * 查询音频处理状态
 * GET /reciting/audio/status/:contentId
 */
async function handleAudioStatus(method, path, body, headers) {
  if (method !== 'GET') {
    throw new Error('只支持 GET 请求');
  }

  const userId = getUserIdFromToken(headers);
  const contentId = path.split('/').pop();

  if (!contentId) {
    throw new Error('缺少 contentId');
  }

  const contentsCollection = db.collection('reciting_contents');
  const contentResult = await contentsCollection.where({
    id: contentId,
    userId: userId,
  }).get();

  if (contentResult.data.length === 0) {
    throw new Error('内容不存在');
  }

  const content = contentResult.data[0];

  return {
    code: 0,
    message: '查询成功',
    data: {
      status: content.processingStatus || 'pending',
      progress: content.progress || 0,
      sentences: content.sentences || [],
      errorMessage: content.errorMessage,
    },
  };
}

// ========== 站内信相关函数 ==========

/**
 * 处理站内信请求
 */
async function handleMessages(method, path, body, headers) {
  const userId = getUserIdFromToken(headers);
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

