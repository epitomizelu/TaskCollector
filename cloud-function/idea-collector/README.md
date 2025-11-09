# 想法收集器云函数

## 概述

想法收集器模块的独立云函数，提供想法记录、存储和AI智能分析功能。

## 功能特性

- ✅ 想法的增删改查
- ✅ AI智能分析想法（情感、主题、洞察、建议）
- ✅ 按日期和月份筛选想法
- ✅ 用户数据隔离（基于userId）

## 部署步骤

### 1. 创建云函数

1. 登录腾讯云控制台，进入 [云开发控制台](https://console.cloud.tencent.com/tcb)
2. 在"云函数"中创建新函数，函数名：`idea-collector-api`
3. 选择 Node.js 运行环境（建议 Node.js 16+）

### 2. 上传代码

1. 将 `cloud-function/idea-collector/` 目录下的所有文件上传到云函数
2. 确保文件结构如下：
   ```
   idea-collector-api/
   ├── index.js
   └── package.json
   ```

### 3. 安装依赖

在云函数控制台执行：
```bash
npm install @cloudbase/node-sdk
```

或者直接在云函数控制台的"依赖管理"中安装 `@cloudbase/node-sdk`。

### 4. 配置环境变量

在云函数控制台的"环境变量"中配置：

- `TCB_ENV`: 你的云开发环境ID（例如：`cloud1-4gee45pq61cd6f19`）
- `API_KEY_1`: 你的 API Key（用于验证请求）
- `API_KEY_2`: 可选的第二个 API Key

### 5. 创建数据库集合

在云开发控制台的"数据库"中创建集合：`ideas`

集合结构：
```javascript
{
  ideaId: String,        // 想法ID
  userId: String,        // 用户ID
  content: String,       // 想法内容
  tags: Array,          // 标签数组
  recordDate: String,    // 记录日期 (YYYY-MM-DD)
  recordMonth: String,   // 记录月份 (YYYY-MM)
  recordYear: String,   // 记录年份 (YYYY)
  analysis: Object,      // AI分析结果
  createdAt: String,    // 创建时间 (ISO 8601)
  updatedAt: String,    // 更新时间 (ISO 8601)
}
```

### 6. 配置HTTP触发器

1. 在云函数控制台，进入"触发器"页面
2. 创建HTTP触发器
3. 记录触发器的访问地址（例如：`https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/idea-collector-api`）

### 7. 更新前端配置

编辑 `config/api.config.ts`，更新想法收集器的云函数地址：

```typescript
export const API_CONFIG = {
  // ... 其他配置
  IDEA_COLLECTOR_BASE_URL: 'https://你的云函数地址/idea-collector-api',
};
```

## API 接口

### 1. 获取想法列表

```
GET /ideas?date=2024-01-01&month=2024-01
```

### 2. 获取单个想法

```
GET /ideas/{ideaId}
```

### 3. 创建想法

```
POST /ideas
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "content": "想法内容",
  "tags": ["标签1", "标签2"],
  "autoAnalyze": true
}
```

### 4. 更新想法

```
PUT /ideas/{ideaId}
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "content": "更新后的想法内容",
  "tags": ["新标签"],
  "autoAnalyze": true
}
```

### 5. 删除想法

```
DELETE /ideas/{ideaId}
Authorization: Bearer YOUR_API_KEY
```

### 6. AI分析想法

```
POST /ideas/analyze
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "content": "要分析的想法内容"
}
```

响应示例：
```json
{
  "code": 200,
  "message": "分析成功",
  "data": {
    "insights": ["洞察1", "洞察2"],
    "emotions": ["positive", "neutral"],
    "themes": ["work", "life"],
    "suggestions": ["建议1", "建议2"],
    "truth": "这个想法反映了你在工作、生活方面的思考..."
  }
}
```

## AI分析说明

当前版本的AI分析使用简单的关键词匹配和规则引擎。实际项目中可以：

1. 集成真实的AI服务（如OpenAI、百度文心、腾讯云AI等）
2. 使用自然语言处理（NLP）技术
3. 实现更复杂的情感分析和主题提取

## 注意事项

1. 所有接口都需要在请求头中携带 `Authorization: Bearer YOUR_API_KEY`
2. 想法数据按 `userId` 隔离，确保用户只能访问自己的数据
3. AI分析功能可以扩展，当前为简化实现
4. 建议在生产环境中使用真实的AI服务进行想法分析

## 故障排查

### 问题：云函数返回 401 未授权

**解决方案：**
- 检查环境变量中的 `API_KEY_1` 和 `API_KEY_2` 是否正确配置
- 确认前端请求头中携带了正确的 API Key

### 问题：数据库操作失败

**解决方案：**
- 检查环境变量 `TCB_ENV` 是否正确
- 确认数据库集合 `ideas` 已创建
- 检查数据库权限设置

### 问题：AI分析功能不工作

**解决方案：**
- 当前为简化实现，使用关键词匹配
- 如需更强大的AI分析，请集成真实的AI服务

