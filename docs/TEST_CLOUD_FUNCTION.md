# 云函数测试指南

本指南提供多种方法测试云函数是否能正常调用。

## 🚀 快速测试方法

### 方法一：使用测试页面（推荐）

1. **启动应用**
   ```bash
   npm start
   ```

2. **访问测试页面**
   - 在浏览器中打开：`http://localhost:8081/test-api`
   - 或使用 Expo Go 扫描二维码后，在应用中导航到 `/test-api`

3. **点击"开始测试"按钮**
   - 系统会自动测试所有接口
   - 查看测试结果，确认是否成功

### 方法二：使用命令行测试脚本

1. **设置环境变量**
   ```bash
   # Windows PowerShell
   $env:EXPO_PUBLIC_API_KEY="your-api-key-here"
   
   # 或创建 .env 文件
   ```

2. **运行测试脚本**
   ```bash
   node scripts/test-cloud-function.js
   ```

3. **查看测试结果**
   - 所有测试都会显示通过或失败
   - 如果失败，会显示错误信息

### 方法三：使用浏览器控制台

1. **打开浏览器开发者工具**（F12）

2. **在控制台中运行**：
   ```javascript
   // 测试 API Key 配置
   console.log('API Key:', process.env.EXPO_PUBLIC_API_KEY);
   
   // 测试获取任务
   fetch('https://your-cloud-function-url/tasks', {
     method: 'GET',
     headers: {
       'Authorization': 'Bearer YOUR_API_KEY',
       'Content-Type': 'application/json'
     }
   })
   .then(res => res.json())
   .then(data => console.log('✅ 成功:', data))
   .catch(error => console.error('❌ 失败:', error));
   ```

### 方法四：使用 curl（命令行）

```bash
# 测试获取所有任务
curl -X GET "https://your-cloud-function-url/tasks" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"

# 测试创建任务
curl -X POST "https://your-cloud-function-url/tasks" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "rawText": "测试任务",
    "taskName": "测试",
    "completionTime": "2025-01-01T00:00:00.000Z",
    "quantity": {"个": 1},
    "recordDate": "2025-01-01",
    "recordMonth": "1",
    "recordYear": "2025"
  }'

# 测试获取今日统计
curl -X GET "https://your-cloud-function-url/stats/today" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### 方法五：使用 Postman 或类似工具

1. **创建新请求**
   - Method: GET
   - URL: `https://your-cloud-function-url/tasks`

2. **添加请求头**
   - Key: `Authorization`
   - Value: `Bearer YOUR_API_KEY`

3. **发送请求**
   - 查看响应状态码和内容

## 📋 测试清单

### 基础连接测试

- [ ] 云函数地址是否正确
- [ ] 网络连接是否正常
- [ ] API Key 是否配置

### API Key 验证测试

- [ ] 请求头是否包含 `Authorization: Bearer YOUR_API_KEY`
- [ ] API Key 是否正确
- [ ] 云函数环境变量是否配置

### 接口功能测试

- [ ] GET /tasks - 获取所有任务
- [ ] POST /tasks - 创建任务
- [ ] GET /stats/today - 获取今日统计

## 🔍 常见错误及解决方法

### 错误 1: 401 未授权

**原因：**
- API Key 未设置
- API Key 不正确
- 请求头格式错误

**解决方法：**
```
1. 检查 API Key 是否配置
2. 确认请求头格式：Authorization: Bearer YOUR_API_KEY
3. 确认云函数环境变量中配置了相同的 API Key
```

### 错误 2: 404 接口不存在

**原因：**
- 云函数地址错误
- 路径不正确

**解决方法：**
```
1. 检查 BASE_URL 配置
2. 确认云函数已部署
3. 检查 HTTP 触发器是否启用
```

### 错误 3: 500 服务器错误

**原因：**
- 云函数代码错误
- 数据库连接失败
- 环境变量未配置

**解决方法：**
```
1. 查看云函数日志
2. 检查数据库配置
3. 确认环境变量已设置
```

### 错误 4: CORS 错误

**原因：**
- 云函数未配置 CORS
- 请求来源被阻止

**解决方法：**
```
1. 检查云函数代码中的 CORS 配置
2. 确认允许的源地址
```

## 📊 测试结果示例

### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": [...]
}
```

### 失败响应

```json
{
  "code": 401,
  "message": "无效的 API Key",
  "data": null
}
```

## 🛠️ 调试技巧

### 1. 查看网络请求

在浏览器开发者工具的 Network 标签中：
- 查看请求 URL
- 查看请求头
- 查看响应内容
- 查看状态码

### 2. 查看云函数日志

在腾讯云控制台：
1. 进入云函数详情
2. 查看"日志"标签
3. 查看执行日志和错误信息

### 3. 使用测试页面

访问 `/test-api` 页面，可以：
- 查看当前配置
- 一键测试所有接口
- 查看详细的测试结果

## 📝 测试脚本说明

### Node.js 测试脚本

位置：`scripts/test-cloud-function.js`

**使用方法：**
```bash
# 设置环境变量
export EXPO_PUBLIC_API_KEY=your-api-key

# 运行测试
node scripts/test-cloud-function.js
```

**测试内容：**
- 获取所有任务
- 创建任务
- 获取今日统计

## 🔗 相关文档

- [API Key 配置指南](./API_KEY_SETUP.md)
- [环境变量配置指南](./ENV_VARIABLES_GUIDE.md)
- [云函数示例代码](./tencent-cloud-function-example.md)

