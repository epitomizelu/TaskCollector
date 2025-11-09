/**
 * 我爱背书模块云函数
 * 处理计划、任务、内容、音频处理、站内信等相关功能
 */

const cloudbase = require('@cloudbase/node-sdk');
const https = require('https');

// 初始化云开发环境
const app = cloudbase.init({
  env: process.env.TCB_ENV || 'cloud1-4gee45pq61cd6f19',
});

// 获取数据库引用
const db = app.database();

// 检查 app 对象是否支持存储相关方法
function checkStorageSupport() {
  const hasUploadFile = typeof app.uploadFile === 'function';
  const hasGetTempFileURL = typeof app.getTempFileURL === 'function';
  const hasDeleteFile = typeof app.deleteFile === 'function';
  
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
 * API Key 验证配置
 */
const VALID_API_KEYS = [
  process.env.API_KEY_1,
  process.env.API_KEY_2,
].filter(key => key);

/**
 * 验证 API Key 并获取用户信息
 */
function verifyApiKey(headers) {
  const authHeader = headers.authorization || headers['authorization'];
  
  if (!authHeader) {
    throw new Error('缺少授权信息，请在请求头中添加: Authorization: Bearer YOUR_API_KEY');
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('授权格式错误，应为: Authorization: Bearer YOUR_API_KEY');
  }
  
  const apiKey = authHeader.substring(7).trim();
  
  // 验证 API Key
  if (VALID_API_KEYS.length > 0 && !VALID_API_KEYS.includes(apiKey)) {
    throw new Error('无效的 API Key');
  }
  
  // 从 API Key 或 Token 中提取用户ID（简化处理）
  // 实际应该从 Token 中解析用户信息
  try {
    const decoded = Buffer.from(apiKey, 'base64').toString('utf-8');
    const parts = decoded.split('_');
    if (parts.length >= 1) {
      return { userId: parts[0] };
    }
  } catch (e) {
    // 如果解析失败，使用默认用户ID
  }
  
  return { userId: 'default_user' };
}

/**
 * 从请求头中获取用户ID
 */
function getUserIdFromHeaders(headers) {
  const userInfo = verifyApiKey(headers);
  return userInfo.userId;
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
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split('_');
    if (parts.length >= 1) {
      return parts[0];
    }
    throw new Error('无效的 Token');
  } catch (error) {
    throw new Error('无效的 Token');
  }
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  // 兼容不同的路径格式
  let { method, path, headers, body } = event;

  // 如果 method 未定义，尝试从其他字段获取
  if (!method) {
    method = event.httpMethod || event.method || 'GET';
  }
  method = method.toUpperCase();
  
  // 如果 event 中没有 path，尝试从其他字段获取
  if (!path) {
    path = event.pathname || event.requestContext?.path || event.path || '/';
  }
  
  // 移除函数名前缀（如果存在）
  const functionName = 'ilove-reciting-api';
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
    }
  }
  
  // 如果 body 是 Buffer，尝试转换为字符串并解析
  if (Buffer.isBuffer(body)) {
    try {
      const bodyString = body.toString('utf8');
      body = JSON.parse(bodyString);
    } catch (e) {
      // 解析失败，保持原样
    }
  }
  
  // 处理 headers（统一大小写）
  const normalizedHeaders = {};
  if (headers) {
    for (const key in headers) {
      normalizedHeaders[key.toLowerCase()] = headers[key];
    }
  }
  
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
    // 验证 API Key
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
    
    // 路由处理
    if (path === '/reciting/plans' || path.startsWith('/reciting/plans')) {
      // 我爱背书模块 - 计划
      result = await handleRecitingPlans(method, path, body, normalizedHeaders);
    } else if (path === '/reciting/tasks' || path.startsWith('/reciting/tasks')) {
      // 我爱背书模块 - 任务
      result = await handleRecitingTasks(method, path, body, normalizedHeaders);
    } else if (path === '/reciting/contents' || path.startsWith('/reciting/contents')) {
      // 我爱背书模块 - 内容
      result = await handleRecitingContents(method, path, body, normalizedHeaders);
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

// ========== 我爱背书模块 - 计划相关 ==========

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

// ========== 我爱背书模块 - 任务相关 ==========

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

// ========== 我爱背书模块 - 内容相关 ==========

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

