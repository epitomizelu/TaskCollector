/**
 * 认识自己模块云函数
 * 处理老师清单、人生目标清单、价值观和原则清单
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

  console.log('认识自己云函数入口参数:', method, path, headers, body);
  
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
  const functionName = 'self-awareness-api';
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
    if (path === '/teachers' || path.startsWith('/teachers')) {
      // 老师清单
      result = await handleTeachersRequest(method, path, body, normalizedHeaders);
    } else if (path === '/goals' || path.startsWith('/goals')) {
      // 人生目标清单
      result = await handleGoalsRequest(method, path, body, normalizedHeaders);
    } else if (path === '/values' || path.startsWith('/values')) {
      // 价值观和原则清单
      result = await handleValuesRequest(method, path, body, normalizedHeaders);
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

// ========== 老师清单处理函数 ==========

/**
 * 处理老师清单相关请求
 */
async function handleTeachersRequest(method, path, body, headers) {
  const userId = getUserIdFromHeaders(headers);
  const teachersCollection = db.collection('self_awareness_teachers');

  switch (method) {
    case 'GET':
      return await handleGetTeachers(path, userId, teachersCollection);
    case 'POST':
      return await handleCreateTeacher(body, userId, teachersCollection);
    case 'PUT':
      return await handleUpdateTeacher(path, body, userId, teachersCollection);
    case 'DELETE':
      return await handleDeleteTeacher(path, userId, teachersCollection);
    default:
      throw new Error('不支持的请求方法');
  }
}

/**
 * 获取老师清单
 */
async function handleGetTeachers(path, userId, collection) {
  const teacherId = path.split('/').pop();
  
  // 如果路径包含ID，获取单个老师
  if (teacherId && teacherId !== 'teachers' && !path.includes('?')) {
    const query = collection.where({
      teacherId: teacherId,
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
        message: '老师不存在',
        data: null,
      };
    }
  }
  
  // 获取老师列表
  let query = collection.where({
    userId: userId,
  });
  
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
 * 创建老师
 */
async function handleCreateTeacher(body, userId, collection) {
  if (!body || !body.name) {
    return {
      code: 400,
      message: '老师姓名不能为空',
      data: null,
    };
  }

  const now = new Date();
  const teacherData = {
    teacherId: body.teacherId || `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: userId,
    name: body.name,
    description: body.description || '',
    fields: body.fields || [], // 领域/专业
    qualities: body.qualities || [], // 品质/特点
    learnings: body.learnings || [], // 学习要点
    notes: body.notes || '', // 备注
    order: body.order || 0, // 排序
    createdAt: body.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await collection.add(teacherData);

  return {
    code: 200,
    message: '创建成功',
    data: teacherData,
  };
}

/**
 * 更新老师
 */
async function handleUpdateTeacher(path, body, userId, collection) {
  const teacherId = path.split('/').pop();
  
  if (!teacherId || teacherId === 'teachers') {
    return {
      code: 400,
      message: '老师ID不能为空',
      data: null,
    };
  }

  const query = collection.where({
    teacherId: teacherId,
    userId: userId,
  });
  
  const result = await query.get();
  
  if (!result.data || result.data.length === 0) {
    return {
      code: 404,
      message: '老师不存在',
      data: null,
    };
  }

  const existingTeacher = result.data[0];
  const docId = existingTeacher._id || existingTeacher.id;

  const updates = {
    ...body,
    updatedAt: new Date().toISOString(),
  };

  await collection.doc(docId).update(updates);

  const updatedTeacher = await collection.doc(docId).get();

  return {
    code: 200,
    message: '更新成功',
    data: updatedTeacher.data && updatedTeacher.data.length > 0 ? updatedTeacher.data[0] : null,
  };
}

/**
 * 删除老师
 */
async function handleDeleteTeacher(path, userId, collection) {
  const teacherId = path.split('/').pop();
  
  if (!teacherId || teacherId === 'teachers') {
    return {
      code: 400,
      message: '老师ID不能为空',
      data: null,
    };
  }

  const query = collection.where({
    teacherId: teacherId,
    userId: userId,
  });
  
  const result = await query.get();
  
  if (!result.data || result.data.length === 0) {
    return {
      code: 404,
      message: '老师不存在',
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

// ========== 人生目标清单处理函数 ==========

/**
 * 处理人生目标清单相关请求
 */
async function handleGoalsRequest(method, path, body, headers) {
  const userId = getUserIdFromHeaders(headers);
  const goalsCollection = db.collection('self_awareness_goals');

  switch (method) {
    case 'GET':
      return await handleGetGoals(path, userId, goalsCollection);
    case 'POST':
      return await handleCreateGoal(body, userId, goalsCollection);
    case 'PUT':
      return await handleUpdateGoal(path, body, userId, goalsCollection);
    case 'DELETE':
      return await handleDeleteGoal(path, userId, goalsCollection);
    default:
      throw new Error('不支持的请求方法');
  }
}

/**
 * 获取人生目标清单
 */
async function handleGetGoals(path, userId, collection) {
  const goalId = path.split('/').pop();
  
  // 如果路径包含ID，获取单个目标
  if (goalId && goalId !== 'goals' && !path.includes('?')) {
    const query = collection.where({
      goalId: goalId,
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
        message: '目标不存在',
        data: null,
      };
    }
  }
  
  // 获取目标列表
  let query = collection.where({
    userId: userId,
  });
  
  // 按优先级和创建时间排序
  query = query.orderBy('priority', 'asc').orderBy('createdAt', 'desc');
  
  const result = await query.get();
  
  return {
    code: 200,
    message: '获取成功',
    data: result.data || [],
  };
}

/**
 * 创建人生目标
 */
async function handleCreateGoal(body, userId, collection) {
  if (!body || !body.title) {
    return {
      code: 400,
      message: '目标标题不能为空',
      data: null,
    };
  }

  const now = new Date();
  const goalData = {
    goalId: body.goalId || `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: userId,
    title: body.title,
    description: body.description || '',
    category: body.category || 'life', // 分类：life, career, health, relationship, etc.
    priority: body.priority || 3, // 优先级：1-高, 2-中, 3-低
    deadline: body.deadline || null, // 截止日期
    status: body.status || 'pending', // 状态：pending, in_progress, completed, abandoned
    milestones: body.milestones || [], // 里程碑
    notes: body.notes || '', // 备注
    order: body.order || 0, // 排序
    createdAt: body.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await collection.add(goalData);

  return {
    code: 200,
    message: '创建成功',
    data: goalData,
  };
}

/**
 * 更新人生目标
 */
async function handleUpdateGoal(path, body, userId, collection) {
  const goalId = path.split('/').pop();
  
  if (!goalId || goalId === 'goals') {
    return {
      code: 400,
      message: '目标ID不能为空',
      data: null,
    };
  }

  const query = collection.where({
    goalId: goalId,
    userId: userId,
  });
  
  const result = await query.get();
  
  if (!result.data || result.data.length === 0) {
    return {
      code: 404,
      message: '目标不存在',
      data: null,
    };
  }

  const existingGoal = result.data[0];
  const docId = existingGoal._id || existingGoal.id;

  const updates = {
    ...body,
    updatedAt: new Date().toISOString(),
  };

  await collection.doc(docId).update(updates);

  const updatedGoal = await collection.doc(docId).get();

  return {
    code: 200,
    message: '更新成功',
    data: updatedGoal.data && updatedGoal.data.length > 0 ? updatedGoal.data[0] : null,
  };
}

/**
 * 删除人生目标
 */
async function handleDeleteGoal(path, userId, collection) {
  const goalId = path.split('/').pop();
  
  if (!goalId || goalId === 'goals') {
    return {
      code: 400,
      message: '目标ID不能为空',
      data: null,
    };
  }

  const query = collection.where({
    goalId: goalId,
    userId: userId,
  });
  
  const result = await query.get();
  
  if (!result.data || result.data.length === 0) {
    return {
      code: 404,
      message: '目标不存在',
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

// ========== 价值观和原则清单处理函数 ==========

/**
 * 处理价值观和原则清单相关请求
 */
async function handleValuesRequest(method, path, body, headers) {
  const userId = getUserIdFromHeaders(headers);
  const valuesCollection = db.collection('self_awareness_values');

  switch (method) {
    case 'GET':
      return await handleGetValues(path, userId, valuesCollection);
    case 'POST':
      return await handleCreateValue(body, userId, valuesCollection);
    case 'PUT':
      return await handleUpdateValue(path, body, userId, valuesCollection);
    case 'DELETE':
      return await handleDeleteValue(path, userId, valuesCollection);
    default:
      throw new Error('不支持的请求方法');
  }
}

/**
 * 获取价值观和原则清单
 */
async function handleGetValues(path, userId, collection) {
  const valueId = path.split('/').pop();
  
  // 如果路径包含ID，获取单个价值观
  if (valueId && valueId !== 'values' && !path.includes('?')) {
    const query = collection.where({
      valueId: valueId,
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
        message: '价值观不存在',
        data: null,
      };
    }
  }
  
  // 获取价值观列表
  let query = collection.where({
    userId: userId,
  });
  
  // 支持按类型筛选
  const url = new URL(path, 'http://localhost');
  const type = url.searchParams.get('type'); // values 或 principles
  if (type) {
    query = query.where({
      type: type,
    });
  }
  
  // 按重要性排序
  query = query.orderBy('importance', 'asc').orderBy('createdAt', 'desc');
  
  const result = await query.get();
  
  return {
    code: 200,
    message: '获取成功',
    data: result.data || [],
  };
}

/**
 * 创建价值观或原则
 */
async function handleCreateValue(body, userId, collection) {
  if (!body || !body.name) {
    return {
      code: 400,
      message: '价值观/原则名称不能为空',
      data: null,
    };
  }

  const now = new Date();
  const valueData = {
    valueId: body.valueId || `value_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: userId,
    name: body.name,
    description: body.description || '',
    type: body.type || 'value', // 类型：value-价值观, principle-原则
    importance: body.importance || 3, // 重要性：1-最重要, 2-重要, 3-一般
    examples: body.examples || [], // 实例/应用场景
    notes: body.notes || '', // 备注
    order: body.order || 0, // 排序
    createdAt: body.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  };

  await collection.add(valueData);

  return {
    code: 200,
    message: '创建成功',
    data: valueData,
  };
}

/**
 * 更新价值观或原则
 */
async function handleUpdateValue(path, body, userId, collection) {
  const valueId = path.split('/').pop();
  
  if (!valueId || valueId === 'values') {
    return {
      code: 400,
      message: '价值观ID不能为空',
      data: null,
    };
  }

  const query = collection.where({
    valueId: valueId,
    userId: userId,
  });
  
  const result = await query.get();
  
  if (!result.data || result.data.length === 0) {
    return {
      code: 404,
      message: '价值观不存在',
      data: null,
    };
  }

  const existingValue = result.data[0];
  const docId = existingValue._id || existingValue.id;

  const updates = {
    ...body,
    updatedAt: new Date().toISOString(),
  };

  await collection.doc(docId).update(updates);

  const updatedValue = await collection.doc(docId).get();

  return {
    code: 200,
    message: '更新成功',
    data: updatedValue.data && updatedValue.data.length > 0 ? updatedValue.data[0] : null,
  };
}

/**
 * 删除价值观或原则
 */
async function handleDeleteValue(path, userId, collection) {
  const valueId = path.split('/').pop();
  
  if (!valueId || valueId === 'values') {
    return {
      code: 400,
      message: '价值观ID不能为空',
      data: null,
    };
  }

  const query = collection.where({
    valueId: valueId,
    userId: userId,
  });
  
  const result = await query.get();
  
  if (!result.data || result.data.length === 0) {
    return {
      code: 404,
      message: '价值观不存在',
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

