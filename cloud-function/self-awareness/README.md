# 认识自己模块云函数

## 功能说明

这个云函数处理"认识自己"模块的所有数据操作，包括：

1. **老师清单** - 记录想学习和模仿的老师
2. **人生目标清单** - 记录人生目标
3. **价值观和原则清单** - 记录个人价值观和原则

## 数据库集合

- `self_awareness_teachers` - 老师清单
- `self_awareness_goals` - 人生目标清单
- `self_awareness_values` - 价值观和原则清单

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

## 部署

1. 在腾讯云云开发控制台创建云函数
2. 函数名：`self-awareness-api`
3. 上传 `index.js` 和 `package.json`
4. 配置环境变量：`TCB_ENV`, `API_KEY_1`, `API_KEY_2`

## 认证

所有请求需要在请求头中包含 API Key：

```
Authorization: Bearer YOUR_API_KEY
```

