# 🔧 快速修复 404 错误：接口不存在

## 问题症状

如果看到以下错误：
```
HTTP 错误 (404) - 接口不存在
```

这表示云函数无法匹配到请求的路径。

## 🔍 问题原因

腾讯云函数的 HTTP 触发器传递的 `path` 可能包含：
1. 完整的路径（包括函数名）
2. 或者只是相对路径

需要根据实际情况调整路径处理逻辑。

## 🚀 快速解决方案

### 方法一：添加路径日志调试（推荐）

在云函数代码的入口处添加日志，查看实际接收到的路径：

```javascript
exports.main = async (event, context) => {
  const { method, path, headers, body } = event;
  
  // 添加调试日志
  console.log('请求信息:', {
    method,
    path,
    pathType: typeof path,
    eventKeys: Object.keys(event),
  });
  
  // ... 其他代码
}
```

然后查看云函数日志，确认实际接收到的 `path` 值。

### 方法二：修复路径处理逻辑

根据实际路径格式，更新云函数代码：

#### 情况 1：路径包含函数名前缀

如果 `path` 是 `/task-collection-api/tasks`，需要移除前缀：

```javascript
exports.main = async (event, context) => {
  const { method, path, headers, body } = event;
  
  // 移除函数名前缀（如果存在）
  let requestPath = path;
  if (path.startsWith('/task-collection-api')) {
    requestPath = path.replace('/task-collection-api', '');
  }
  if (requestPath === '') {
    requestPath = '/';
  }
  
  // 路由处理
  if (requestPath === '/tasks' || requestPath.startsWith('/tasks')) {
    result = await handleTasksRequest(method, requestPath, body, headers);
  }
  // ... 其他路由
}
```

#### 情况 2：路径就是相对路径

如果 `path` 直接是 `/tasks`，确保路由匹配正确：

```javascript
// 路由处理
if (path === '/tasks' || path.startsWith('/tasks/') || path.includes('/tasks?')) {
  result = await handleTasksRequest(method, path, body, headers);
} else if (path === '/stats/today' || path.startsWith('/stats/')) {
  result = await handleStatsRequest(method, path, body, headers);
}
```

### 方法三：修复 handleTasksRequest 中的 GET 方法

确保 GET 请求正确调用处理函数：

```javascript
async function handleTasksRequest(method, path, body, headers) {
  const userId = getUserIdFromHeaders(headers);
  const tasksCollection = db.collection('tasks');

  switch (method) {
    case 'GET':
      return await handleGetTasks(path, userId, tasksCollection); // 确保这行存在
    case 'POST':
      return await handleCreateTask(body, userId, tasksCollection);
    // ... 其他方法
  }
}
```

## ✅ 验证修复

### 1. 查看云函数日志

在云函数控制台查看日志，确认：
- 接收到的 `path` 值
- 路由是否正确匹配

### 2. 测试不同路径

测试以下路径：
- `GET /tasks` - 获取所有任务
- `GET /tasks?date=2025-11-06` - 按日期获取
- `POST /tasks` - 创建任务
- `GET /stats/today` - 获取今日统计

## 📝 完整修复示例

更新云函数 `index.js` 的入口部分：

```javascript
exports.main = async (event, context) => {
  // 兼容不同的路径格式
  let { method, path, headers, body } = event;
  
  // 如果 event 中没有 path，尝试从其他字段获取
  if (!path) {
    path = event.pathname || event.requestContext?.path || '/';
  }
  
  // 移除函数名前缀（如果存在）
  const functionName = 'task-collection-api';
  if (path.startsWith(`/${functionName}`)) {
    path = path.replace(`/${functionName}`, '') || '/';
  }
  
  // 处理 body（如果是字符串，解析为 JSON）
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      // 解析失败，保持原样
    }
  }
  
  // 处理 headers（统一大小写）
  const normalizedHeaders = {};
  for (const key in headers) {
    normalizedHeaders[key.toLowerCase()] = headers[key];
  }
  
  // 添加调试日志
  console.log('请求详情:', {
    method,
    originalPath: event.path,
    normalizedPath: path,
    headers: Object.keys(normalizedHeaders),
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
    
    // 路由处理（使用标准化后的路径）
    if (path === '/tasks' || path.startsWith('/tasks')) {
      result = await handleTasksRequest(method, path, normalizedHeaders, body);
    } else if (path === '/stats/today' || path.startsWith('/stats')) {
      result = await handleStatsRequest(method, path, normalizedHeaders, body);
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
```

## 🔍 调试步骤

1. **添加日志**：在云函数入口添加 `console.log`，输出接收到的 `event` 对象
2. **查看日志**：在云函数控制台查看实际接收到的数据
3. **调整路径处理**：根据实际路径格式调整代码
4. **重新测试**：使用 `/test-api` 页面测试

## 📚 相关文档

- [云函数示例代码](./tencent-cloud-function-example.md)
- [云函数部署指南](./CLOUD_FUNCTION_DEPLOY.md)

## 💡 提示

如果路径问题仍然存在，可以：
1. 检查 HTTP 触发器的路径配置
2. 确认前端请求的 URL 格式
3. 查看云函数日志中的完整 `event` 对象

