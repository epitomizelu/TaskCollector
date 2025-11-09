# 我爱背书模块云函数

## 功能说明

这个云函数专门处理"我爱背书"模块的所有功能，包括：

1. **计划管理** (`/reciting/plans`)
   - 创建、查询、更新、删除背诵计划

2. **任务管理** (`/reciting/tasks`)
   - 创建、查询、更新、删除每日任务

3. **内容管理** (`/reciting/contents`)
   - 创建、查询、删除音频和文档内容

4. **音频处理** (`/reciting/audio/*`)
   - 触发音频处理任务 (`/reciting/audio/process`)
   - 查询处理状态 (`/reciting/audio/status/:contentId`)

5. **站内信** (`/messages`)
   - 获取、标记已读、删除消息

## 部署说明

### 1. 创建云函数

在腾讯云开发控制台创建新的云函数：
- 函数名称：`ilove-reciting-api`
- 运行环境：Node.js 16
- 入口文件：`index.js`

### 2. 上传代码

将 `cloud-function/ilove-reciting/` 目录下的所有文件上传到云函数。

### 3. 配置环境变量

在云函数配置中设置以下环境变量：
- `TCB_ENV`: 云开发环境ID（如：`cloud1-4gee45pq61cd6f19`）
- `API_KEY_1`: API Key 1（用于认证）
- `API_KEY_2`: API Key 2（可选，用于认证）

### 4. 配置 API 网关（可选）

如果需要通过 API 网关访问，需要：
1. 创建 API 网关服务
2. 创建 API，路径为 `/reciting/*` 和 `/messages/*`
3. 后端服务选择云函数 `ilove-reciting-api`

## 数据库集合

需要创建以下数据库集合：

1. `reciting_plans` - 背诵计划
2. `reciting_tasks` - 每日任务
3. `reciting_contents` - 音频和文档内容
4. `audio_processing_tasks` - 音频处理任务
5. `messages` - 站内信

## API 接口

### 计划相关

- `GET /reciting/plans` - 获取所有计划
- `GET /reciting/plans/:id` - 获取单个计划
- `POST /reciting/plans` - 创建计划
- `PUT /reciting/plans/:id` - 更新计划
- `DELETE /reciting/plans/:id` - 删除计划

### 任务相关

- `GET /reciting/tasks` - 获取所有任务
- `GET /reciting/tasks?date=YYYY-MM-DD` - 按日期获取任务
- `GET /reciting/tasks/:id` - 获取单个任务
- `POST /reciting/tasks` - 创建任务
- `PUT /reciting/tasks/:id` - 更新任务
- `DELETE /reciting/tasks/:id` - 删除任务

### 内容相关

- `GET /reciting/contents` - 获取所有内容
- `GET /reciting/contents?type=audio` - 按类型获取内容
- `GET /reciting/contents/:id` - 获取单个内容
- `POST /reciting/contents` - 创建内容
- `DELETE /reciting/contents/:id` - 删除内容

### 音频处理

- `POST /reciting/audio/process` - 触发音频处理任务
- `GET /reciting/audio/status/:contentId` - 查询处理状态

### 站内信

- `GET /messages` - 获取所有消息
- `GET /messages/:id` - 获取单个消息
- `PUT /messages/:id/read` - 标记消息为已读
- `PUT /messages/read-all` - 标记所有消息为已读
- `DELETE /messages/:id` - 删除消息

## 认证

所有接口都需要在请求头中添加：
```
Authorization: Bearer YOUR_API_KEY
```

## 注意事项

1. **ASR 集成**：当前使用模拟数据，需要集成真实的 ASR 服务（如腾讯云 ASR）
2. **音频拆分**：当前使用模拟数据，需要使用 ffmpeg 实际拆分音频
3. **错误处理**：所有错误都会返回标准的错误响应格式

## 开发计划

- [ ] 集成腾讯云 ASR 服务
- [ ] 实现真实的音频拆分（使用 ffmpeg）
- [ ] 添加音频下载功能
- [ ] 优化句子拆分算法
- [ ] 添加处理进度实时推送

