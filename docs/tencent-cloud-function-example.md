# 腾讯云云函数示例代码

## 云函数目录结构

```
task-collection-function/
├── index.js              # 主入口文件
├── package.json          # 依赖配置
└── config.json           # 云函数配置
```

## package.json

```json
{
  "name": "task-collection-api",
  "version": "1.0.0",
  "description": "任务收集应用后端 API",
  "main": "index.js",
  "dependencies": {
    "@serverless/utils": "^2.0.0"
  }
}
```

## index.js - Node.js 云函数主文件

```javascript
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
  const { method, path, headers, body } = event;
  
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
    let result;
    
    // 路由处理
    if (path === '/tasks' || path.startsWith('/tasks')) {
      result = await handleTasksRequest(method, path, body, headers);
    } else if (path === '/stats/today' || path.startsWith('/stats')) {
      result = await handleStatsRequest(method, path, body, headers);
    } else {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          code: 404,
          message: '接口不存在',
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

/**
 * 从请求头获取用户 ID（需要实现 JWT 解析）
 */
function getUserIdFromHeaders(headers) {
  // TODO: 从 Authorization header 中解析 Token 获取 userId
  // 这里暂时返回一个默认值，实际应该解析 JWT Token
  const authHeader = headers.authorization || headers.Authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // 这里应该解析 JWT Token 获取 userId
    // 示例：const decoded = jwt.verify(token, secret);
    // return decoded.userId;
  }
  
  // 临时返回固定用户 ID，实际应该从 Token 中获取
  return 'default-user-id';
}
```

## 部署步骤

1. **登录腾讯云控制台**
   - 进入 [云开发控制台](https://console.cloud.tencent.com/tcb)
   - 创建环境或使用现有环境

2. **创建云函数**
   - 在云开发控制台中选择"云函数"
   - 点击"新建云函数"
   - 函数名称：`task-collection-api`
   - 运行环境：Node.js 16
   - 上传代码文件

3. **配置环境变量**
   - `TCB_ENV`: 你的云开发环境 ID

4. **设置 HTTP 触发器**
   - 在云函数详情页，点击"触发管理"
   - 添加 HTTP 触发器
   - 获取触发器的 URL，配置到 `config/api.config.ts` 中

5. **创建数据库集合**
   - 在云开发控制台中选择"数据库"
   - 创建集合：`tasks`
   - 设置权限为：仅创建者可读写

## 数据库结构

### tasks 集合

```javascript
{
  _id: "数据库自动生成",
  taskId: "task_1234567890_abc123",      // 任务唯一标识
  userId: "user_123",                    // 用户 ID
  rawText: "我完成了晨跑5公里",            // 原始文本
  taskName: "晨跑锻炼",                   // 任务名称
  completionTime: "2025-11-02 07:30",   // 完成时间
  quantity: {                             // 数量信息
    "公里": 5
  },
  recordDate: "2025-11-02",              // 记录日期
  recordMonth: "2025-11",                 // 记录月份
  recordYear: "2025",                    // 记录年份
  createdAt: "2025-11-02T07:30:00.000Z", // 创建时间
  updatedAt: "2025-11-02T07:30:00.000Z"  // 更新时间
}
```

## 认证方案（可选）

如果需要用户认证，可以：

1. **使用云开发的登录能力**
   - 集成微信登录、匿名登录等

2. **自定义 JWT Token**
   - 在云函数中验证 JWT Token
   - 从 Token 中解析 userId

3. **使用云开发的 Auth 能力**
   ```javascript
   const auth = app.auth();
   const loginState = await auth.getLoginState();
   const userId = loginState.userInfo.openId;
   ```

## 注意事项

1. **CORS 配置**：确保设置了正确的 CORS 头
2. **错误处理**：所有接口都应该有错误处理
3. **数据验证**：在云函数中验证输入数据
4. **权限控制**：确保用户只能访问自己的数据
5. **性能优化**：对于大量数据，考虑分页查询

