# 云函数路由方案：复用 vs 新建

## 🎯 推荐方案：复用现有云函数（推荐）

### 优点
- ✅ **共享配置**：使用相同的 API Key 和认证
- ✅ **统一管理**：所有接口在一个函数中，易于维护
- ✅ **节省资源**：不需要额外的云函数实例
- ✅ **代码复用**：共享认证、错误处理等逻辑

### 实现方式

在现有的 `task-collection-api` 云函数中添加新的路由：

```javascript
// 路由处理（在 exports.main 中）
if (path === '/tasks' || path.startsWith('/tasks')) {
  // 任务收集模块
  result = await handleTasksRequest(method, path, body, normalizedHeaders);
} else if (path === '/stats/today' || path.startsWith('/stats')) {
  // 统计接口
  result = await handleStatsRequest(method, path, body, normalizedHeaders);
} else if (path === '/reciting/plans' || path.startsWith('/reciting/plans')) {
  // 我爱背书 - 计划
  result = await handleRecitingPlans(method, path, body, normalizedHeaders);
} else if (path === '/reciting/tasks' || path.startsWith('/reciting/tasks')) {
  // 我爱背书 - 任务
  result = await handleRecitingTasks(method, path, body, normalizedHeaders);
} else if (path === '/reciting/contents' || path.startsWith('/reciting/contents')) {
  // 我爱背书 - 内容
  result = await handleRecitingContents(method, path, body, normalizedHeaders);
} else if (path === '/storage/upload' || path.startsWith('/storage/upload')) {
  // 文件上传
  result = await handleFileUpload(method, path, body, normalizedHeaders);
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

### 接口路径设计

```
任务收集模块：
  GET    /tasks              - 获取所有任务
  POST   /tasks              - 创建任务
  GET    /tasks/:id          - 获取单个任务
  PUT    /tasks/:id          - 更新任务
  DELETE /tasks/:id          - 删除任务
  GET    /stats/today        - 获取今日统计

我爱背书模块：
  GET    /reciting/plans              - 获取所有计划
  POST   /reciting/plans              - 创建计划
  GET    /reciting/plans/:id          - 获取单个计划
  PUT    /reciting/plans/:id          - 更新计划
  DELETE /reciting/plans/:id          - 删除计划
  
  GET    /reciting/tasks              - 获取所有任务
  POST   /reciting/tasks              - 创建任务
  GET    /reciting/tasks?date=2025-11-06  - 按日期获取任务
  
  GET    /reciting/contents           - 获取所有内容
  POST   /reciting/contents           - 创建内容（上传音频/文档）
  DELETE /reciting/contents/:id       - 删除内容

文件上传：
  POST   /storage/upload               - 上传文件到云存储
```

## 🔄 方案二：创建新云函数（可选）

### 优点
- ✅ **模块独立**：每个模块完全独立
- ✅ **独立部署**：可以单独更新某个模块
- ✅ **独立扩展**：可以根据需求独立扩展

### 缺点
- ❌ **重复配置**：需要配置多个 API Key 和环境变量
- ❌ **资源消耗**：多个云函数实例
- ❌ **维护成本**：需要维护多个云函数

### 实现方式

如果选择创建新云函数：

1. **创建新云函数**：`ilove-reciting-api`
2. **配置环境变量**：
   - `TCB_ENV` = 相同的环境 ID
   - `API_KEY_1` = 相同的 API Key（或使用不同的）
3. **配置 HTTP 触发器**：获取新的 URL
4. **更新前端配置**：在 `api.config.ts` 中添加新的 BASE_URL

```typescript
export const API_CONFIG = {
  // 任务收集模块
  BASE_URL: 'https://your-url/task-collection-api',
  
  // 我爱背书模块（新云函数）
  RECITING_BASE_URL: 'https://your-url/ilove-reciting-api',
};
```

## 🎯 推荐：复用现有云函数

### 理由

1. **代码结构支持**：现有云函数已经使用路由模式，很容易扩展
2. **配置共享**：两个模块使用相同的认证和数据库连接
3. **维护简单**：只需要在一个地方更新代码
4. **成本更低**：一个云函数实例即可

### 实现步骤

1. **更新云函数代码**：在现有云函数中添加新的路由处理函数
2. **创建新的处理函数**：
   - `handleRecitingPlans()` - 处理计划相关请求
   - `handleRecitingTasks()` - 处理任务相关请求
   - `handleRecitingContents()` - 处理内容相关请求
   - `handleFileUpload()` - 处理文件上传
3. **创建数据库集合**：
   - `reciting_plans`
   - `reciting_tasks`
   - `reciting_contents`
4. **测试新接口**：使用 `/test-api` 页面测试

## 📝 代码示例

### 在现有云函数中添加路由

```javascript
// 在路由处理部分添加
} else if (path === '/reciting/plans' || path.startsWith('/reciting/plans')) {
  result = await handleRecitingPlans(method, path, body, normalizedHeaders);
} else if (path === '/reciting/tasks' || path.startsWith('/reciting/tasks')) {
  result = await handleRecitingTasks(method, path, body, normalizedHeaders);
} else if (path === '/reciting/contents' || path.startsWith('/reciting/contents')) {
  result = await handleRecitingContents(method, path, body, normalizedHeaders);
```

### 实现处理函数

```javascript
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
```

## ✅ 总结

**推荐：复用现有云函数**

- 只需在现有云函数中添加路由和处理函数
- 不需要创建新云函数
- 不需要新的 HTTP 触发器
- 不需要新的环境变量配置
- 代码结构清晰，易于维护

**下一步：**
1. 更新云函数代码，添加新的路由
2. 实现新的处理函数
3. 创建数据库集合
4. 测试新接口

