# 🔍 调试 404 错误指南

当云函数返回 404 错误时，按照以下步骤进行调试。

## 📋 调试步骤

### 步骤 1：查看云函数日志

1. 登录 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)
2. 进入云函数 → 找到 `task-collection-api`
3. 点击"日志"标签
4. 查看最新的请求日志

**查找以下信息：**
- `请求详情:` 日志中的 `originalPath` 和 `normalizedPath`
- 请求的 `method`
- 是否有错误信息

### 步骤 2：检查路径格式

根据日志中的路径信息，确认：

**情况 A：路径包含函数名**
```
originalPath: /task-collection-api/tasks
normalizedPath: /tasks
```
✅ 路径处理正确

**情况 B：路径直接是接口路径**
```
originalPath: /tasks
normalizedPath: /tasks
```
✅ 路径处理正确

**情况 C：路径为空或格式异常**
```
originalPath: undefined 或 ""
normalizedPath: /
```
❌ 需要检查 HTTP 触发器配置

### 步骤 3：更新云函数代码

如果路径格式不对，使用更新后的代码（参考 `docs/tencent-cloud-function-example.md`）：

**关键改进：**
1. ✅ 兼容多种路径格式
2. ✅ 自动移除函数名前缀
3. ✅ 添加调试日志
4. ✅ 标准化 headers 处理
5. ✅ 改进路由匹配逻辑

### 步骤 4：检查 HTTP 触发器配置

1. 在云函数控制台，点击"触发管理"
2. 查看 HTTP 触发器的配置：
   - **触发路径**：应该是 `/` 或 `/task-collection-api`
   - **请求方法**：应该包含 `GET, POST, PUT, DELETE, OPTIONS`

**如果触发路径是 `/task-collection-api`：**
- 前端请求：`https://your-url/task-collection-api/tasks`
- 云函数接收：`path = '/task-collection-api/tasks'`（需要移除前缀）

**如果触发路径是 `/`：**
- 前端请求：`https://your-url/tasks`
- 云函数接收：`path = '/tasks'`（直接使用）

### 步骤 5：检查前端请求 URL

查看 `config/api.config.ts` 中的 `BASE_URL`：

```typescript
BASE_URL: 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api'
```

**如果 BASE_URL 包含 `/task-collection-api`：**
- 完整请求 URL：`BASE_URL + '/tasks'` = `.../task-collection-api/tasks`
- 云函数会收到：`path = '/task-collection-api/tasks'`

**解决方案：**
1. **方案 A**：移除 BASE_URL 中的函数名
   ```typescript
   BASE_URL: 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com'
   ```
   前端请求：`BASE_URL + '/task-collection-api' + '/tasks'`

2. **方案 B**：保持 BASE_URL 不变，在云函数中处理路径前缀（已实现）

### 步骤 6：测试修复

更新云函数代码后：

1. **保存并部署**云函数
2. **查看日志**，确认路径处理正确
3. **测试接口**：
   - 访问 `/test-api` 页面
   - 点击"开始测试"
   - 查看是否还有 404 错误

## 🔧 常见问题

### Q1: 日志中看不到 "请求详情"

**原因：** 代码没有更新，或者日志被过滤了。

**解决：**
1. 确认已保存并部署最新代码
2. 清除日志过滤器，查看所有日志
3. 检查代码中是否有 `console.log('请求详情:', ...)`

### Q2: 路径一直是 `/`

**原因：** HTTP 触发器配置可能有问题。

**解决：**
1. 检查 HTTP 触发器的路径配置
2. 尝试重新创建 HTTP 触发器
3. 确认前端请求的完整 URL

### Q3: 路径匹配不上

**原因：** 路由匹配逻辑不够灵活。

**解决：**
使用更新后的路由匹配：
```javascript
if (path === '/tasks' || path.startsWith('/tasks/') || path.includes('/tasks?')) {
  // 匹配 /tasks, /tasks/123, /tasks?date=2025-11-06
}
```

### Q4: 仍然返回 404

**原因：** 可能还有其他问题。

**检查清单：**
- [ ] 云函数代码已更新并部署
- [ ] 路径格式正确（查看日志确认）
- [ ] HTTP 触发器配置正确
- [ ] 前端请求 URL 正确
- [ ] API Key 已配置（不是 401 错误）

## 📝 调试代码模板

在云函数入口添加以下调试代码：

```javascript
exports.main = async (event, context) => {
  // 完整输出 event 对象（仅用于调试）
  console.log('完整 Event 对象:', JSON.stringify(event, null, 2));
  
  // 输出关键信息
  console.log('Method:', event.method);
  console.log('Path:', event.path);
  console.log('Pathname:', event.pathname);
  console.log('Headers:', Object.keys(event.headers || {}));
  
  // ... 其他代码
}
```

**注意：** 调试完成后，可以移除或注释掉详细的日志输出，只保留关键信息。

## 🎯 快速修复清单

如果遇到 404 错误：

1. ✅ 更新云函数代码（使用最新版本）
2. ✅ 查看云函数日志，确认路径格式
3. ✅ 检查 HTTP 触发器配置
4. ✅ 检查前端 BASE_URL 配置
5. ✅ 测试接口调用

完成以上步骤后，404 错误应该可以解决。

## 📚 相关文档

- [快速修复 404 错误](./QUICK_FIX_404.md)
- [云函数示例代码](./tencent-cloud-function-example.md)
- [云函数部署指南](./CLOUD_FUNCTION_DEPLOY.md)

