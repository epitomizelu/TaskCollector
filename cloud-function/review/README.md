# 复盘模块云函数

## 概述

复盘模块的独立云函数，处理日复盘、周复盘、月复盘、年复盘等功能。

## 部署步骤

1. 在腾讯云开发控制台创建新云函数 `review-api`
2. 上传 `cloud-function/review/` 目录下的所有文件
3. 配置环境变量（与主云函数相同）：
   - `TCB_ENV`: 云开发环境ID（默认: cloud1-4gee45pq61cd6f19）
   - `API_KEY_1`: API Key 1（必须配置，与前端使用的API Key一致）
   - `API_KEY_2`: API Key 2（可选）

## 重要提示

### API Key 配置

**如果遇到 401 Unauthorized 错误，请检查：**

1. **云函数环境变量配置**
   - 登录腾讯云开发控制台
   - 进入云函数 `review-api` 的配置页面
   - 在"环境变量"中添加：
     - `API_KEY_1`: 你的API Key（与前端配置的 `EXPO_PUBLIC_API_KEY` 一致）
     - `API_KEY_2`: 可选的第二个API Key

2. **前端API Key配置**
   - 确保 `.env` 文件或 `app.json` 中配置了 `EXPO_PUBLIC_API_KEY`
   - API Key 必须与云函数环境变量中的 `API_KEY_1` 或 `API_KEY_2` 一致

3. **验证方法**
   - 查看云函数日志，会输出详细的验证信息
   - 检查请求头中是否包含 `Authorization: Bearer YOUR_API_KEY`
   - 确认API Key的前8位和后4位是否匹配

### 开发模式

如果未配置API Key环境变量，云函数会在开发模式下允许访问（仅用于测试，生产环境请务必配置）。

## API 接口

### 获取复盘列表

```
GET /reviews?type=daily&date=2024-01-01
```

查询参数：
- `type`: 复盘类型 (daily/weekly/monthly/yearly)
- `date`: 日期字符串

### 获取单个复盘

```
GET /reviews/{reviewId}
```

### 创建复盘

```
POST /reviews
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "reviewId": "review_xxx",
  "type": "daily",
  "date": "2024-01-01",
  "content": {
    "achievements": ["完成项目A"],
    "reflections": ["今天很充实"],
    "improvements": ["明天要早起"],
    "gratitude": ["感谢同事帮助"],
    "goals": ["完成项目B"],
    "notes": "备注内容"
  },
  "rating": 8,
  "tags": ["工作", "学习"]
}
```

### 更新复盘

```
PUT /reviews/{reviewId}
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "content": {
    "achievements": ["完成项目A", "完成项目B"]
  },
  "rating": 9
}
```

### 删除复盘

```
DELETE /reviews/{reviewId}
Authorization: Bearer YOUR_API_KEY
```

## 数据库集合

- 集合名称: `reviews`
- 文档结构:
  - `reviewId`: 复盘ID（唯一标识）
  - `userId`: 用户ID
  - `type`: 复盘类型 (daily/weekly/monthly/yearly)
  - `date`: 日期字符串
  - `content`: 复盘内容对象
  - `rating`: 评分 (1-10)
  - `tags`: 标签数组
  - `createdAt`: 创建时间
  - `updatedAt`: 更新时间

