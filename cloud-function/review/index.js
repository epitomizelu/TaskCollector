/**
 * 复盘模块云函数
 * 处理日复盘、周复盘、月复盘、年复盘等功能
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发环境
const app = cloudbase.init({
  env: process.env.TCB_ENV || 'cloud1-4gee45pq61cd6f19',
});

// 获取数据库引用
const db = app.database();

/**
 * API Key 验证配置
 * 清理环境变量中的空白字符（换行符、空格等）
 */
const VALID_API_KEYS = [
  process.env.API_KEY_1,
  process.env.API_KEY_2,
]
  .filter(key => key)
  .map(key => key.trim().replace(/\s+/g, '')); // 清理所有空白字符

/**
 * 验证 API Key 并获取用户信息
 */
function verifyApiKey(headers) {
  // 添加调试日志
  console.log('验证 API Key:', {
    hasHeaders: !!headers,
    headerKeys: headers ? Object.keys(headers) : [],
    validApiKeysCount: VALID_API_KEYS.length,
    validApiKeysPrefix: VALID_API_KEYS.map(k => k ? k.substring(0, 8) + '...' : '空'),
  });
  
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
    prefix: apiKey.substring(0, 20) + '...',
    suffix: '...' + apiKey.substring(Math.max(0, apiKey.length - 20)),
  });
  
  // 验证 API Key 是否有效
  if (VALID_API_KEYS.length === 0) {
    console.error('警告: 未配置有效的 API Key，请检查环境变量 API_KEY_1 和 API_KEY_2');
    // 如果没有配置API Key，允许通过（开发环境）
    console.log('未配置 API Key，允许访问（开发模式）');
  } else {
    // 清理并比较API Key（去除所有空白字符）
    const cleanedApiKey = apiKey.replace(/\s+/g, '');
    const cleanedValidKeys = VALID_API_KEYS.map(k => k ? k.replace(/\s+/g, '') : '');
    
    console.log('API Key 比较:', {
      receivedLength: cleanedApiKey.length,
      receivedPrefix: cleanedApiKey.substring(0, 20) + '...',
      receivedSuffix: '...' + cleanedApiKey.substring(Math.max(0, cleanedApiKey.length - 20)),
      validKeysCount: cleanedValidKeys.length,
      validKeysLength: cleanedValidKeys.map(k => k.length),
      validKeysPrefix: cleanedValidKeys.map(k => k ? k.substring(0, 20) + '...' : '空'),
    });
    
    // 检查是否匹配（精确匹配或忽略空白字符）
    const isMatch = cleanedValidKeys.some(validKey => {
      const match = validKey === cleanedApiKey;
      if (match) {
        console.log('API Key 匹配成功');
      }
      return match;
    });
    
    if (!isMatch) {
      console.log('API Key 验证失败 - 详细比较:', {
        receivedLength: cleanedApiKey.length,
        receivedFirst50: cleanedApiKey.substring(0, 50),
        receivedLast50: cleanedApiKey.substring(Math.max(0, cleanedApiKey.length - 50)),
        validKeysCount: cleanedValidKeys.length,
        validKeysLength: cleanedValidKeys.map(k => k ? k.length : 0),
        validFirst50: cleanedValidKeys.map(k => k ? k.substring(0, 50) : '空'),
        validLast50: cleanedValidKeys.map(k => k ? k.substring(Math.max(0, k.length - 50)) : '空'),
      });
      console.log('⚠️ 重要提示:');
      console.log('  1. 前端发送的 API Key 长度:', cleanedApiKey.length);
      console.log('  2. 如果长度是 728，这可能是 JWT token，不是 API Key');
      console.log('  3. 请确保云函数环境变量 API_KEY_1 的值与前端配置的 EXPO_PUBLIC_API_KEY 完全一致');
      console.log('  4. 如果前端使用的是 JWT token，云函数环境变量也应该配置相同的 JWT token');
      throw new Error('无效的 API Key - 请检查前端配置的 EXPO_PUBLIC_API_KEY 是否与云函数环境变量 API_KEY_1 一致');
    }
  }
  
  console.log('API Key 验证成功');
  
  // 从 API Key 或 Token 中提取用户ID（简化处理）
  // 注意：如果使用的是 JWT token，这里可能无法正确解析
  try {
    const decoded = Buffer.from(cleanedApiKey, 'base64').toString('utf-8');
    const parts = decoded.split('_');
    if (parts.length >= 1) {
      console.log('从 API Key 解析用户ID成功:', parts[0]);
      return { userId: parts[0] };
    }
  } catch (e) {
    // 如果解析失败，使用默认用户ID
    console.log('API Key 解析失败，使用默认用户ID:', e.message);
    console.log('提示: 如果使用的是 JWT token，这是正常的，将使用 anonymous 作为用户ID');
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

  console.log('复盘云函数入口参数:', method, path, headers, body);
  
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
  const functionName = 'review-api';
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
    if (path === '/reviews' || path.startsWith('/reviews')) {
      // 复盘相关
      if (path === '/reviews/cleanup' || path.startsWith('/reviews/cleanup')) {
        // 清理历史数据
        result = await handleCleanupReviews(method, path, body, normalizedHeaders);
      } else {
        result = await handleReviewsRequest(method, path, body, normalizedHeaders);
      }
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

// ========== 复盘相关处理函数 ==========

/**
 * 处理复盘相关请求
 */
async function handleReviewsRequest(method, path, body, headers) {
  const userId = getUserIdFromHeaders(headers);
  const reviewsCollection = db.collection('reviews');

  switch (method) {
    case 'GET':
      return await handleGetReviews(path, userId, reviewsCollection);
    case 'POST':
      return await handleCreateReview(body, userId, reviewsCollection);
    case 'PUT':
      return await handleUpdateReview(path, body, userId, reviewsCollection);
    case 'DELETE':
      return await handleDeleteReview(path, userId, reviewsCollection);
    default:
      throw new Error('不支持的请求方法');
  }
}

/**
 * 获取复盘列表
 */
async function handleGetReviews(path, userId, collection) {
  const url = new URL(path, 'http://localhost');
  const reviewId = path.split('/').pop();
  
  // 如果路径包含ID，获取单个复盘
  if (reviewId && reviewId !== 'reviews' && !path.includes('?')) {
    const query = collection.where({
      reviewId: reviewId,
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
        message: '复盘不存在',
        data: null,
      };
    }
  }
  
  // 获取复盘列表
  let query = collection.where({
    userId: userId,
  });
  
  // 支持按类型筛选
  const type = url.searchParams.get('type');
  if (type) {
    query = query.where({
      type: type,
    });
  }
  
  // 支持按日期筛选
  const date = url.searchParams.get('date');
  if (date) {
    query = query.where({
      date: date,
    });
  }
  
  // 按更新时间倒序排列
  query = query.orderBy('updatedAt', 'desc');
  
  const result = await query.get();
  const reviews = result.data || [];
  
  // 如果没有指定日期，只返回每个日期每个类型的最新一条
  if (!date) {
    const grouped = new Map();
    reviews.forEach(review => {
      const key = `${review.type}_${review.date}`;
      if (!grouped.has(key)) {
        // 按更新时间排序，第一个就是最新的
        grouped.set(key, review);
      } else {
        // 比较更新时间，保留最新的
        const existing = grouped.get(key);
        const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        const currentTime = review.updatedAt ? new Date(review.updatedAt).getTime() : 0;
        if (currentTime > existingTime) {
          grouped.set(key, review);
        }
      }
    });
    
    return {
      code: 200,
      message: '获取成功',
      data: Array.from(grouped.values()),
    };
  }
  
  // 如果指定了日期，返回该日期的最新一条（按类型分组）
  if (date) {
    const filtered = reviews.filter(r => r.date === date);
    if (filtered.length > 0) {
      // 按类型分组，每个类型只保留最新的一条
      const grouped = new Map();
      filtered.forEach(review => {
        const key = review.type;
        if (!grouped.has(key)) {
          grouped.set(key, review);
        } else {
          const existing = grouped.get(key);
          const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          const currentTime = review.updatedAt ? new Date(review.updatedAt).getTime() : 0;
          if (currentTime > existingTime) {
            grouped.set(key, review);
          }
        }
      });
      
      // 如果指定了类型，只返回该类型的最新一条
      if (type) {
        const typeReview = grouped.get(type);
        return {
          code: 200,
          message: '获取成功',
          data: typeReview ? [typeReview] : [],
        };
      }
      
      // 如果没有指定类型，返回该日期所有类型的最新一条
      return {
        code: 200,
        message: '获取成功',
        data: Array.from(grouped.values()),
      };
    }
  }
  
  return {
    code: 200,
    message: '获取成功',
    data: reviews,
  };
}

/**
 * 创建复盘
 */
async function handleCreateReview(body, userId, collection) {
  if (!body || !body.type || !body.date) {
    return {
      code: 400,
      message: '复盘类型和日期不能为空',
      data: null,
    };
  }

  const reviewData = {
    reviewId: body.reviewId || `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: userId,
    type: body.type, // daily, weekly, monthly, yearly
    date: body.date,
    content: body.content || {},
    rating: body.rating,
    tags: body.tags || [],
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: body.updatedAt || new Date().toISOString(),
  };

  await collection.add(reviewData);

  return {
    code: 200,
    message: '创建成功',
    data: reviewData,
  };
}

/**
 * 更新复盘
 */
async function handleUpdateReview(path, body, userId, collection) {
  const reviewId = path.split('/').pop();
  
  if (!reviewId || reviewId === 'reviews') {
    return {
      code: 400,
      message: '复盘ID不能为空',
      data: null,
    };
  }

  // 使用 where 查询，通过 reviewId 字段查找
  const query = collection.where({
    reviewId: reviewId,
    userId: userId,
  });
  
  const result = await query.get();
  
  if (!result.data || result.data.length === 0) {
    return {
      code: 404,
      message: '复盘不存在',
      data: null,
    };
  }

  const existingReview = result.data[0];
  const docId = existingReview._id || existingReview.id;

  const updates = {
    ...body,
    updatedAt: new Date().toISOString(),
  };

  // 排除不允许更新的字段
  delete updates._id;
  delete updates.id;
  delete updates.reviewId;
  delete updates.userId;
  delete updates.createdAt;

  await collection.doc(docId).update(updates);

  const updatedReview = await collection.doc(docId).get();

  return {
    code: 200,
    message: '更新成功',
    data: updatedReview.data && updatedReview.data.length > 0 ? updatedReview.data[0] : null,
  };
}

/**
 * 删除复盘
 */
async function handleDeleteReview(path, userId, collection) {
  const reviewId = path.split('/').pop();
  
  if (!reviewId || reviewId === 'reviews') {
    return {
      code: 400,
      message: '复盘ID不能为空',
      data: null,
    };
  }

  // 使用 where 查询，通过 reviewId 字段查找
  const query = collection.where({
    reviewId: reviewId,
    userId: userId,
  });
  
  const result = await query.get();
  
  if (!result.data || result.data.length === 0) {
    return {
      code: 404,
      message: '复盘不存在',
      data: null,
    };
  }

  // 删除找到的文档
  for (const doc of result.data) {
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
 * 处理清理历史数据请求
 * 保留每个日期每个类型的最新一条，删除其余
 */
async function handleCleanupReviews(method, path, body, headers) {
  if (method !== 'POST') {
    return {
      code: 405,
      message: '只支持POST方法',
      data: null,
    };
  }

  const userId = getUserIdFromHeaders(headers);
  const reviewsCollection = db.collection('reviews');

  try {
    // 获取所有复盘
    const allReviews = await reviewsCollection.where({
      userId: userId,
    }).get();

    const reviews = allReviews.data || [];

    // 按日期和类型分组
    const grouped = new Map();
    reviews.forEach(review => {
      const key = `${review.type}_${review.date}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(review);
    });

    // 找出需要删除的复盘（每个组只保留最新的一条）
    const reviewsToDelete = [];
    grouped.forEach((groupReviews) => {
      // 按更新时间排序
      const sorted = groupReviews.sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });

      // 保留最新的，删除其余的
      for (let i = 1; i < sorted.length; i++) {
        reviewsToDelete.push(sorted[i]);
      }
    });

    // 删除多余的复盘
    let deletedCount = 0;
    for (const review of reviewsToDelete) {
      const docId = review._id || review.id;
      if (docId) {
        await reviewsCollection.doc(docId).remove();
        deletedCount++;
      }
    }

    return {
      code: 200,
      message: '清理成功',
      data: {
        deletedCount: deletedCount,
        keptCount: reviews.length - deletedCount,
      },
    };
  } catch (error) {
    console.error('清理历史数据失败:', error);
    return {
      code: 500,
      message: '清理失败: ' + error.message,
      data: null,
    };
  }
}

