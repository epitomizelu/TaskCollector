# 接入腾讯云云函数指南

本指南将帮助你将任务收集应用连接到腾讯云云函数作为后端服务。

## 📋 目录

- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [使用步骤](#使用步骤)
- [API 接口说明](#api-接口说明)
- [数据同步机制](#数据同步机制)

## 🚀 快速开始

### 1. 安装依赖

项目已包含所需的依赖，无需额外安装。

### 2. 配置云函数地址

编辑 `config/api.config.ts` 文件，设置你的云函数地址：

```typescript
export const API_CONFIG = {
  BASE_URL: 'https://your-region.apigw.tencentcs.com/release/task-collection-api',
  TIMEOUT: 10000,
  VERSION: 'v1',
};
```

### 3. 部署云函数

参考 `docs/tencent-cloud-function-example.md` 中的示例代码部署云函数。

### 4. 启用云端同步（可选）

在应用中，你可以选择使用本地存储或云端存储：

```typescript
import { taskService } from './services/task.service';

// 启用云端存储
await taskService.setUseCloud(true);

// 使用本地存储（默认）
await taskService.setUseCloud(false);
```

## ⚙️ 配置说明

### API 配置 (`config/api.config.ts`)

- `BASE_URL`: 云函数的 HTTP 触发地址
- `TIMEOUT`: 请求超时时间（毫秒）
- `VERSION`: API 版本号

### 认证配置

如果需要用户认证，可以在 `services/api.service.ts` 中设置 Token：

```typescript
import { apiService } from './services/api.service';

// 设置认证 Token
apiService.setToken('your-jwt-token');
```

## 📖 使用步骤

### 1. 修改现有页面使用新的服务

将原有的 `AsyncStorage` 调用替换为 `taskService`：

**之前：**
```typescript
const tasksJson = await AsyncStorage.getItem('@taskCollection');
const tasks = JSON.parse(tasksJson);
```

**之后：**
```typescript
import { taskService } from '../services/task.service';

const tasks = await taskService.getAllTasks();
```

### 2. 创建任务

```typescript
const newTask = await taskService.createTask({
  rawText: '我完成了晨跑5公里',
  taskName: '晨跑锻炼',
  completionTime: '2025-11-02 07:30',
  quantity: { '公里': 5 },
  recordDate: '2025-11-02',
  recordMonth: '2025-11',
  recordYear: '2025',
});
```

### 3. 获取任务

```typescript
// 获取所有任务
const allTasks = await taskService.getAllTasks();

// 获取今日任务
const todayTasks = await taskService.getTasksByDate('2025-11-02');

// 获取月度任务
const monthTasks = await taskService.getTasksByMonth('2025-11');
```

### 4. 更新任务

```typescript
await taskService.updateTask(taskId, {
  taskName: '新的任务名称',
});
```

### 5. 删除任务

```typescript
// 删除单个任务
await taskService.deleteTask(taskId);

// 删除指定日期的所有任务
await taskService.deleteTasksByDate('2025-11-02');

// 删除所有任务
await taskService.deleteAllTasks();
```

## 🔄 数据同步机制

### 本地优先策略

应用默认使用**本地优先**策略：

1. **读取数据**：优先从本地 `AsyncStorage` 读取，响应速度快
2. **写入数据**：先写入本地，再异步同步到云端
3. **同步失败**：如果云端同步失败，不影响本地使用

### 云端同步策略

当启用云端存储后（`setUseCloud(true)`）：

1. **读取时**：先从云端同步最新数据到本地
2. **写入时**：同时写入本地和云端
3. **离线支持**：网络不可用时，使用本地缓存

### 手动同步

```typescript
// 手动触发同步
await taskService.manualSync();
```

## 📡 API 接口说明

### 任务接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/tasks` | 获取所有任务 |
| GET | `/tasks?date=2025-11-02` | 获取指定日期的任务 |
| GET | `/tasks?month=2025-11` | 获取指定月份的任务 |
| GET | `/tasks/:id` | 获取指定任务 |
| POST | `/tasks` | 创建任务 |
| PUT | `/tasks/:id` | 更新任务 |
| DELETE | `/tasks/:id` | 删除任务 |
| DELETE | `/tasks?date=2025-11-02` | 删除指定日期的任务 |

### 统计接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/stats/today` | 获取今日统计 |
| GET | `/stats/month?month=2025-11` | 获取月度统计 |

### 响应格式

```typescript
{
  code: number;      // 0 表示成功，其他表示错误
  message: string;   // 错误信息或成功提示
  data: T;          // 响应数据
}
```

## 🔒 安全建议

1. **用户认证**：实现 JWT Token 认证，确保用户只能访问自己的数据
2. **数据验证**：在云函数中验证所有输入数据
3. **权限控制**：使用数据库权限规则限制访问
4. **HTTPS**：确保所有 API 请求使用 HTTPS
5. **错误处理**：不要向客户端暴露敏感信息

## 🐛 故障排查

### 网络请求失败

1. 检查云函数地址是否正确
2. 检查网络连接
3. 检查 CORS 配置

### 数据不同步

1. 检查是否启用了云端存储：`taskService.getUseCloud()`
2. 查看控制台错误日志
3. 尝试手动同步：`taskService.manualSync()`

### 认证失败

1. 检查 Token 是否有效
2. 检查 Token 是否过期
3. 确认云函数中的认证逻辑正确

## 📝 示例代码

完整的云函数示例代码请查看：`docs/tencent-cloud-function-example.md`

## 🤝 支持

如有问题，请查看：
- [腾讯云云函数文档](https://cloud.tencent.com/document/product/583)
- [云开发文档](https://cloud.tencent.com/document/product/876)

