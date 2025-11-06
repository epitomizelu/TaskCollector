# 腾讯云函数数据存储配置指南

本指南将帮助你配置腾讯云函数，实现数据云端存储功能。

## 📋 前置条件

1. 拥有腾讯云账号
2. 已开通腾讯云云开发（TCB）服务
3. 已创建云开发环境

## 🚀 快速开始

### 第一步：配置云函数地址

1. 登录腾讯云控制台，进入 [云开发控制台](https://console.cloud.tencent.com/tcb)
2. 创建或选择一个云开发环境
3. 在"云函数"中创建函数，函数名：`task-collection-api`
4. 部署云函数后，获取 HTTP 触发器的访问地址
5. 编辑项目中的 `config/api.config.ts` 文件：

```typescript
export const API_CONFIG = {
  BASE_URL: 'https://你的云函数地址', // 替换为实际的云函数地址
  TIMEOUT: 10000,
  VERSION: 'v1',
};
```

### 第二步：部署云函数代码

参考 `docs/tencent-cloud-function-example.md` 中的完整代码，创建并部署云函数。

**重要：** 必须安装 `@cloudbase/node-sdk` 依赖，否则会报错！

主要步骤：
1. 在云开发控制台创建云函数
2. 创建 `package.json` 文件，包含依赖：
   ```json
   {
     "dependencies": {
       "@cloudbase/node-sdk": "^2.5.0"
     }
   }
   ```
3. 安装依赖：`npm install @cloudbase/node-sdk`
4. 上传 `index.js` 代码（参考示例文件）
5. 配置环境变量：
   - `TCB_ENV`：你的云开发环境ID
   - `API_KEY_1`：你的 API Key（用于验证请求）
   - `API_KEY_2`：可选的第二个 API Key
6. 创建数据库集合：`tasks`

**详细部署步骤：** 参考 [云函数部署完整指南](./CLOUD_FUNCTION_DEPLOY.md)

### 第三步：启用云端存储

应用默认使用本地存储。要启用云端存储，有两种方式：

#### 方式一：通过环境变量配置（推荐）

1. 创建 `.env` 文件（参考 `.env.example`）：

```env
EXPO_PUBLIC_API_KEY=your-api-key-here
```

2. API Key 会自动从环境变量读取并添加到请求头

#### 方式二：通过代码设置

```typescript
import { apiService } from './services/api.service';

// 设置 API Key（用于 Bearer Token 认证）
apiService.setToken('your-api-key-here');
```

**注意：** API Key 需要在云函数环境变量中配置才能通过验证。

## 🔐 API Key 认证配置

使用 **Bearer Token** 方式验证 API Key：

**请求格式：**
```
GET /api/resource HTTP/1.1
Host: example.com
Authorization: Bearer YOUR_API_KEY
```

### 配置步骤

1. **生成 API Key**（建议32位以上随机字符串）

2. **在云函数环境变量中配置**：
   - `API_KEY_1`: 你的 API Key
   - `API_KEY_2`: 可选的第二个 API Key

3. **在前端配置 API Key**：

**方式一：通过环境变量（推荐）**
```env
# .env 文件
EXPO_PUBLIC_API_KEY=your-api-key-here
```

**方式二：通过代码设置**
```typescript
import { apiService } from './services/api.service';
apiService.setToken('your-api-key-here');
```

**详细配置说明请参考：** `docs/API_KEY_SETUP.md`

## 📊 数据同步机制

### 存储策略（所有操作都遵循此策略）

**核心原则：先本地，后云端，云端失败不影响本地**

1. **创建任务**：
   - ✅ 第一步：先保存到本地存储（AsyncStorage）
   - ✅ 第二步：如果启用云端存储，异步同步到云端
   - ✅ 云端同步失败不影响本地数据，已保存成功

2. **更新任务**：
   - ✅ 第一步：先更新本地存储
   - ✅ 第二步：如果启用云端存储，异步同步更新到云端
   - ✅ 云端更新失败不影响本地数据，已更新成功

3. **删除任务**：
   - ✅ 第一步：先删除本地存储
   - ✅ 第二步：如果启用云端存储，异步同步删除到云端
   - ✅ 云端删除失败不影响本地数据，已删除成功

### 优势

- ✅ **数据安全**：所有数据都先保存到本地，确保数据不丢失
- ✅ **离线支持**：即使没有网络，应用也能正常使用
- ✅ **响应快速**：本地操作立即完成，不等待云端响应
- ✅ **容错性强**：云端失败不影响本地操作
- ✅ **自动同步**：启用云端存储后，数据自动同步（后台异步）

### 读取数据策略

- ✅ **启用云端存储**：先从云端同步最新数据到本地，然后返回本地数据
- ✅ **仅本地存储**：直接从本地读取
- ✅ **云端失败**：如果云端同步失败，返回本地缓存数据

### 手动同步

```typescript
// 手动触发同步
await taskService.manualSync();
```

## 🔍 验证配置

### 1. 检查云函数是否正常

在浏览器控制台或应用中测试：

```typescript
import { apiService } from './services/api.service';

// 测试获取任务列表
try {
  const tasks = await apiService.getAllTasks();
  console.log('云函数连接成功:', tasks);
} catch (error) {
  console.error('云函数连接失败:', error);
}
```

### 2. 检查数据存储类型

```typescript
import { taskService } from './services/task.service';

// 查看当前使用的存储类型
const storageType = taskService.getStorageType();
console.log('当前存储类型:', storageType); // 'local' 或 'cloud'
```

### 3. 测试数据同步

1. 创建一条任务
2. 检查是否保存到本地
3. 如果启用了云端存储，检查是否同步到云端
4. 在另一台设备上登录，检查数据是否同步

## 📝 数据库结构

### tasks 集合字段

```typescript
{
  _id: string;                    // 数据库自动生成的ID
  taskId: string;                 // 任务唯一标识
  userId: string;                 // 用户ID（从Token中获取）
  rawText: string;                // 原始输入文本
  taskName: string;               // 解析后的任务名称
  completionTime: string;         // 完成时间（ISO格式）
  quantity: object;               // 数量信息，如 { "个": 3 }
  recordDate: string;             // 记录日期，格式：YYYY-MM-DD
  recordMonth: string;            // 记录月份，格式：YYYY-MM
  recordYear: string;             // 记录年份
  createdAt: string;              // 创建时间（ISO格式）
  updatedAt: string;              // 更新时间（ISO格式）
}
```

## ⚠️ 注意事项

1. **数据安全**
   - 确保云函数中正确验证用户身份
   - 使用数据库权限规则限制访问
   - 所有API请求使用HTTPS

2. **性能优化**
   - 大量数据时考虑分页查询
   - 使用本地缓存减少网络请求
   - 异步同步，不阻塞用户操作

3. **错误处理**
   - 网络失败时使用本地数据
   - 显示友好的错误提示
   - 记录错误日志便于排查

4. **成本控制**
   - 云函数调用次数有免费额度
   - 数据库存储有免费额度
   - 超出后按量付费

## 🐛 故障排查

### 问题1：云函数连接失败

**可能原因：**
- 云函数地址配置错误
- 网络连接问题
- CORS配置问题

**解决方法：**
1. 检查 `config/api.config.ts` 中的 `BASE_URL` 是否正确
2. 检查浏览器控制台的网络请求错误
3. 确认云函数的CORS配置正确

### 问题2：数据未同步到云端

**可能原因：**
- 未启用云端存储
- 用户未登录或Token无效
- 云函数权限配置错误

**解决方法：**
1. 检查 `taskService.getStorageType()` 返回值
2. 检查用户是否已登录
3. 检查Token是否有效
4. 查看云函数日志

### 问题3：认证失败

**可能原因：**
- Token过期或无效
- 云函数中Token验证逻辑错误

**解决方法：**
1. 重新登录获取新Token
2. 检查云函数中的Token解析逻辑
3. 查看云函数日志

## 📚 相关文档

- [腾讯云云函数文档](https://cloud.tencent.com/document/product/583)
- [云开发数据库文档](https://cloud.tencent.com/document/product/876/18441)
- [云函数示例代码](./tencent-cloud-function-example.md)
- [API使用指南](../README_TENCENT_CLOUD.md)

## 💡 示例代码

完整的使用示例：

```typescript
import { taskService } from './services/task.service';
import { apiService } from './services/api.service';

// 1. 设置认证Token（用户登录后）
apiService.setToken('user-jwt-token');

// 2. 创建任务（自动同步到云端）
const newTask = await taskService.createTask({
  rawText: '我完成了晨跑5公里',
  taskName: '晨跑锻炼',
  completionTime: new Date().toISOString(),
  quantity: { '公里': 5 },
  recordDate: '2025-11-02',
  recordMonth: '2025-11',
  recordYear: '2025',
});

// 3. 获取任务列表（自动从云端同步）
const allTasks = await taskService.getAllTasks();

// 4. 手动同步
await taskService.manualSync();
```

## 🎯 下一步

1. 部署云函数代码
2. 配置API地址
3. 测试数据同步功能
4. 根据需要调整权限和认证逻辑

