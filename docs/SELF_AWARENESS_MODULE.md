# 认识自己模块文档

## 概述

"认识自己"模块用于记录和管理三个清单：
1. **老师清单** - 记录想学习和模仿的老师
2. **人生目标清单** - 记录人生目标
3. **价值观和原则清单** - 记录个人价值观和原则

## 架构

### 云函数

独立云函数：`cloud-function/self-awareness/`

- **函数名**: `self-awareness-api`
- **数据库集合**:
  - `self_awareness_teachers` - 老师清单
  - `self_awareness_goals` - 人生目标清单
  - `self_awareness_values` - 价值观和原则清单

### 前端服务

服务文件：`services/self-awareness.service.ts`

提供以下功能：
- 老师清单的 CRUD 操作
- 人生目标清单的 CRUD 操作
- 价值观和原则清单的 CRUD 操作
- 本地存储和云端同步

### 前端页面

页面文件：`screens/self-awareness/`

- `p-home/` - 模块主页
- `p-teachers/` - 老师清单列表
- `p-goals/` - 人生目标清单列表
- `p-values/` - 价值观和原则清单列表

### 路由

路由配置：`app/_layout.tsx`

- `/self-awareness-home` - 模块主页
- `/self-awareness-teachers` - 老师清单
- `/self-awareness-goals` - 人生目标
- `/self-awareness-values` - 价值观和原则

## API 端点

### 老师清单

- `GET /teachers` - 获取老师列表
- `GET /teachers/:id` - 获取单个老师
- `POST /teachers` - 创建老师
- `PUT /teachers/:id` - 更新老师
- `DELETE /teachers/:id` - 删除老师

### 人生目标清单

- `GET /goals` - 获取目标列表
- `GET /goals/:id` - 获取单个目标
- `POST /goals` - 创建目标
- `PUT /goals/:id` - 更新目标
- `DELETE /goals/:id` - 删除目标

### 价值观和原则清单

- `GET /values` - 获取价值观列表
- `GET /values?type=value` - 获取价值观列表（筛选类型）
- `GET /values?type=principle` - 获取原则列表（筛选类型）
- `GET /values/:id` - 获取单个价值观
- `POST /values` - 创建价值观/原则
- `PUT /values/:id` - 更新价值观/原则
- `DELETE /values/:id` - 删除价值观/原则

## 数据模型

### 老师 (Teacher)

```typescript
{
  teacherId: string;
  name: string;
  description?: string;
  fields?: string[]; // 领域/专业
  qualities?: string[]; // 品质/特点
  learnings?: string[]; // 学习要点
  notes?: string; // 备注
  order?: number; // 排序
  createdAt: string;
  updatedAt: string;
}
```

### 人生目标 (Goal)

```typescript
{
  goalId: string;
  title: string;
  description?: string;
  category?: string; // 分类：life, career, health, relationship, etc.
  priority?: number; // 优先级：1-高, 2-中, 3-低
  deadline?: string | null; // 截止日期
  status?: 'pending' | 'in_progress' | 'completed' | 'abandoned'; // 状态
  milestones?: string[]; // 里程碑
  notes?: string; // 备注
  order?: number; // 排序
  createdAt: string;
  updatedAt: string;
}
```

### 价值观和原则 (Value)

```typescript
{
  valueId: string;
  name: string;
  description?: string;
  type?: 'value' | 'principle'; // 类型：value-价值观, principle-原则
  importance?: number; // 重要性：1-最重要, 2-重要, 3-一般
  examples?: string[]; // 实例/应用场景
  notes?: string; // 备注
  order?: number; // 排序
  createdAt: string;
  updatedAt: string;
}
```

## 部署

### 云函数部署

1. 在腾讯云云开发控制台创建云函数
2. 函数名：`self-awareness-api`
3. 上传 `cloud-function/self-awareness/index.js` 和 `package.json`
4. 配置环境变量：`TCB_ENV`, `API_KEY_1`, `API_KEY_2`

### 前端配置

1. 确保 `config/api.config.ts` 中配置了 `SELF_AWARENESS_BASE_URL`
2. 确保 `app/_layout.tsx` 中添加了路由配置
3. 确保 API Key 已正确配置

## 使用说明

### 访问模块

1. 从应用首页进入"认识自己"模块
2. 在模块主页可以看到三个清单的入口
3. 点击对应的卡片进入相应的清单页面

### 管理老师清单

1. 点击"老师清单"进入列表页面
2. 点击右上角 + 添加老师
3. 填写老师信息（姓名、描述、领域、品质、学习要点等）
4. 点击列表项可以编辑或删除

### 管理人生目标

1. 点击"人生目标"进入列表页面
2. 点击右上角 + 添加目标
3. 填写目标信息（标题、描述、分类、优先级、状态、截止日期等）
4. 可以设置里程碑来跟踪目标进度
5. 点击列表项可以编辑或删除

### 管理价值观和原则

1. 点击"价值观和原则"进入列表页面
2. 可以筛选显示价值观或原则
3. 点击右上角 + 添加价值观或原则
4. 填写信息（名称、描述、类型、重要性、实例等）
5. 点击列表项可以编辑或删除

## 注意事项

1. 所有数据都会同步到云端（如果配置了 API Key）
2. 如果没有配置 API Key，数据仅保存在本地
3. 删除操作需要确认，防止误删
4. 列表支持下拉刷新

## 后续优化

- [ ] 添加搜索功能
- [ ] 添加排序功能
- [ ] 添加筛选功能（按分类、状态等）
- [ ] 添加统计功能
- [ ] 添加导出功能
- [ ] 添加分享功能

