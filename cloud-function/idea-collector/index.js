/**
 * 想法收集器模块云函数
 * 处理想法记录、AI智能分析等功能
 */

const cloudbase = require('@cloudbase/node-sdk');
const https = require('https');

// 初始化云开发环境
const app = cloudbase.init({
  env: process.env.TCB_ENV || 'cloud1-4gee45pq61cd6f19',
});

// 获取数据库引用
const db = app.database();

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
  try {
    const decoded = Buffer.from(apiKey, 'base64').toString('utf-8');
    const parts = decoded.split('_');
    if (parts.length >= 1) {
      return { userId: parts[0] };
    }
  } catch (e) {
    // 如果解析失败，使用默认用户ID
  }
  
  return { userId: 'anonymous' };
}

/**
 * 从请求头获取用户ID
 */
function getUserIdFromHeaders(headers) {
  try {
    const userInfo = verifyApiKey(headers);
    return userInfo.userId || 'anonymous';
  } catch (error) {
    throw error;
  }
}

/**
 * AI分析想法
 * 使用简单的规则引擎分析想法背后的真相
 * 实际项目中可以集成真实的AI服务（如OpenAI、百度文心等）
 */
async function analyzeIdea(ideaText) {
  // 这里使用简单的关键词分析和模式匹配
  // 实际项目中应该调用真实的AI API
  
  const analysis = {
    insights: [],
    emotions: [],
    themes: [],
    suggestions: [],
    truth: '',
  };

  // 情感分析关键词
  const emotionKeywords = {
    positive: ['开心', '快乐', '兴奋', '满足', '自豪', '感激', '希望', '期待'],
    negative: ['焦虑', '担心', '害怕', '沮丧', '失望', '愤怒', '压力', '疲惫'],
    neutral: ['思考', '考虑', '计划', '观察', '记录'],
  };

  // 主题关键词
  const themeKeywords = {
    work: ['工作', '项目', '任务', '同事', '老板', '会议', 'deadline'],
    life: ['生活', '家庭', '朋友', '健康', '运动', '饮食'],
    learning: ['学习', '读书', '课程', '技能', '成长', '提升'],
    relationship: ['关系', '感情', '沟通', '理解', '支持', '冲突'],
    future: ['未来', '计划', '目标', '梦想', '理想', '愿景'],
  };

  // 分析情感
  for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
    for (const keyword of keywords) {
      if (ideaText.includes(keyword)) {
        analysis.emotions.push(emotion);
        break;
      }
    }
  }

  // 分析主题
  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    for (const keyword of keywords) {
      if (ideaText.includes(keyword)) {
        analysis.themes.push(theme);
        break;
      }
    }
  }

  // 生成洞察
  if (analysis.emotions.includes('negative')) {
    analysis.insights.push('这个想法可能反映了你当前的压力或担忧');
    analysis.suggestions.push('尝试深呼吸，给自己一些时间放松');
    analysis.suggestions.push('考虑与信任的人分享你的想法');
  }

  if (analysis.emotions.includes('positive')) {
    analysis.insights.push('这是一个积极的想法，保持这种状态');
    analysis.suggestions.push('记录下这个想法，作为未来的参考');
  }

  if (analysis.themes.includes('work')) {
    analysis.insights.push('这个想法与工作相关，可能需要采取行动');
    analysis.suggestions.push('考虑制定具体的行动计划');
  }

  if (analysis.themes.includes('future')) {
    analysis.insights.push('你在思考未来，这是很好的自我规划');
    analysis.suggestions.push('将大目标分解为小步骤，逐步实现');
  }

  // 生成真相分析
  if (analysis.insights.length > 0) {
    analysis.truth = `这个想法反映了你在${analysis.themes.join('、') || '多个'}方面的思考。${analysis.insights.join(' ')}`;
  } else {
    analysis.truth = '这是一个值得记录的想法，继续观察和思考可能会带来更多洞察。';
  }

  // 如果没有检测到情感，添加默认分析
  if (analysis.emotions.length === 0) {
    analysis.emotions.push('neutral');
  }

  return analysis;
}

/**
 * CORS 响应头
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  // 兼容不同的路径格式
  let { method, path, headers, body } = event;

  console.log('想法收集器云函数入口参数:', method, path, headers, body);
  
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
  const functionName = 'idea-collector-api';
  if (path && path.startsWith(`/${functionName}`)) {
    path = path.replace(`/${functionName}`, '') || '/';
  }
  
  // 确保 path 以 / 开头
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  // 处理 body
  if (typeof body === 'string' && body) {
    try {
      body = JSON.parse(body);
    } catch (e) {
      console.log('Body 解析失败，保持原样:', e.message);
    }
  }
  
  if (Buffer.isBuffer(body)) {
    try {
      const bodyString = body.toString('utf8');
      body = JSON.parse(bodyString);
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
    if (path === '/ideas' || path.startsWith('/ideas')) {
      // 想法相关
      result = await handleIdeasRequest(method, path, body, normalizedHeaders);
    } else if (path === '/ideas/analyze' || path.startsWith('/ideas/analyze')) {
      // AI分析想法
      result = await handleAnalyzeIdea(method, path, body, normalizedHeaders);
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

// ========== 想法相关处理函数 ==========

/**
 * 处理想法相关请求
 */
async function handleIdeasRequest(method, path, body, headers) {
  const userId = getUserIdFromHeaders(headers);
  const ideasCollection = db.collection('ideas');

  switch (method) {
    case 'GET':
      return await handleGetIdeas(path, userId, ideasCollection);
    case 'POST':
      return await handleCreateIdea(body, userId, ideasCollection);
    case 'PUT':
      return await handleUpdateIdea(path, body, userId, ideasCollection);
    case 'DELETE':
      return await handleDeleteIdea(path, userId, ideasCollection);
    default:
      throw new Error('不支持的请求方法');
  }
}

/**
 * 获取想法列表
 */
async function handleGetIdeas(path, userId, collection) {
  const url = new URL(path, 'http://localhost');
  const ideaId = path.split('/').pop();
  
  // 如果路径包含ID，获取单个想法
  if (ideaId && ideaId !== 'ideas' && !path.includes('?')) {
    // 使用 where 查询，通过 ideaId 字段查找（而不是文档 _id）
    const query = collection.where({
      ideaId: ideaId,
      userId: userId,
    });
    
    const result = await query.get();
    
    if (result.data && result.data.length > 0) {
      return {
        code: 200,
        message: '获取成功',
        data: result.data[0],
      };
    } else {
      return {
        code: 404,
        message: '想法不存在',
        data: null,
      };
    }
  }
  
  // 获取想法列表
  let query = collection.where({
    userId: userId,
  });
  
  // 支持按日期筛选
  const date = url.searchParams.get('date');
  if (date) {
    query = query.where({
      recordDate: date,
    });
  }
  
  // 支持按月份筛选
  const month = url.searchParams.get('month');
  if (month) {
    query = query.where({
      recordMonth: month,
    });
  }
  
  // 按创建时间倒序排列
  query = query.orderBy('createdAt', 'desc');
  
  const result = await query.get();
  
  return {
    code: 200,
    message: '获取成功',
    data: result.data || [],
  };
}

/**
 * 创建想法
 */
async function handleCreateIdea(body, userId, collection) {
  if (!body || !body.content) {
    return {
      code: 400,
      message: '想法内容不能为空',
      data: null,
    };
  }

  const now = new Date();
  const recordDate = now.toISOString().split('T')[0];
  const recordMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const recordYear = String(now.getFullYear());

  const ideaData = {
    ideaId: `idea_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: userId,
    content: body.content,
    tags: body.tags || [],
    recordDate: body.recordDate || recordDate,
    recordMonth: body.recordMonth || recordMonth,
    recordYear: body.recordYear || recordYear,
    analysis: body.analysis || null, // AI分析结果
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  // 如果提供了分析结果，直接使用；否则触发AI分析
  if (!ideaData.analysis && body.autoAnalyze !== false) {
    try {
      ideaData.analysis = await analyzeIdea(body.content);
    } catch (error) {
      console.error('AI分析失败:', error);
      // 分析失败不影响保存
    }
  }

  await collection.add(ideaData);

  return {
    code: 200,
    message: '创建成功',
    data: ideaData,
  };
}

/**
 * 更新想法
 */
async function handleUpdateIdea(path, body, userId, collection) {
  const ideaId = path.split('/').pop();
  
  if (!ideaId || ideaId === 'ideas') {
    return {
      code: 400,
      message: '想法ID不能为空',
      data: null,
    };
  }

  // 使用 where 查询，通过 ideaId 字段查找（而不是文档 _id）
  const query = collection.where({
    ideaId: ideaId,
    userId: userId,
  });
  
  const result = await query.get();
  
  if (!result.data || result.data.length === 0) {
    return {
      code: 404,
      message: '想法不存在',
      data: null,
    };
  }

  const existingIdea = result.data[0];
  const docId = existingIdea._id || existingIdea.id;

  const updates = {
    ...body,
    updatedAt: new Date().toISOString(),
  };

  // 如果更新了内容，重新进行AI分析
  if (body.content && body.content !== existingIdea.content && body.autoAnalyze !== false) {
    try {
      updates.analysis = await analyzeIdea(body.content);
    } catch (error) {
      console.error('AI分析失败:', error);
    }
  }

  await collection.doc(docId).update(updates);

  const updatedIdea = await collection.doc(docId).get();

  return {
    code: 200,
    message: '更新成功',
    data: updatedIdea.data && updatedIdea.data.length > 0 ? updatedIdea.data[0] : null,
  };
}

/**
 * 删除想法
 */
async function handleDeleteIdea(path, userId, collection) {
  const ideaId = path.split('/').pop();
  
  if (!ideaId || ideaId === 'ideas') {
    return {
      code: 400,
      message: '想法ID不能为空',
      data: null,
    };
  }

  // 使用 where 查询，通过 ideaId 字段查找（而不是文档 _id）
  const query = collection.where({
    ideaId: ideaId,
    userId: userId,
  });
  
  const result = await query.get();
  
  if (!result.data || result.data.length === 0) {
    return {
      code: 404,
      message: '想法不存在',
      data: null,
    };
  }

  // 删除找到的文档（可能有多个，但通常只有一个）
  for (const doc of result.data) {
    // 获取文档的实际 _id 来删除
    const docId = doc._id || doc.id;
    if (docId) {
      await collection.doc(docId).remove();
    }
  }

  return {
    code: 200,
    message: '删除成功',
    data: null,
  };
}

/**
 * 处理AI分析请求
 */
async function handleAnalyzeIdea(method, path, body, headers) {
  if (method !== 'POST') {
    return {
      code: 405,
      message: '只支持POST方法',
      data: null,
    };
  }

  if (!body || !body.content) {
    return {
      code: 400,
      message: '想法内容不能为空',
      data: null,
    };
  }

  try {
    const analysis = await analyzeIdea(body.content);
    return {
      code: 200,
      message: '分析成功',
      data: analysis,
    };
  } catch (error) {
    console.error('AI分析失败:', error);
    return {
      code: 500,
      message: 'AI分析失败: ' + error.message,
      data: null,
    };
  }
}

