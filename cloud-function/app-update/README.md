# 应用更新服务云函数

独立的云函数，提供应用更新相关的所有功能，包括 JS Bundle OTA 更新。

## 功能

### 存储上传
- `POST /storage/init-upload` - 获取上传凭证
- `POST /storage/finish-upload` - 保存版本记录

### 分片上传
- `POST /storage/upload-chunk` - 上传一个分片
- `POST /storage/complete-chunk` - 完成分片上传并创建合并任务
- `GET /storage/merge-task-status` - 查询合并任务状态
- `POST /storage/process-merge-task` - 处理合并任务（内部调用）

### 版本管理
- `POST /app/js-bundle-versions` - 保存版本信息
- `GET /app/js-bundle-versions` - 获取版本列表
- `GET /app/check-js-bundle-update` - 检查更新

## 部署

1. 在腾讯云开发控制台创建新的云函数 `app-update`
2. 上传 `index.js` 和 `package.json`
3. 配置环境变量 `TCB_ENV`

## 数据库集合

需要以下数据库集合：
- `js_bundle_versions` - 存储版本信息
- `merge_tasks` - 存储合并任务

## 使用

更新 `config/api.config.js` 中的 `BASE_URL`，指向新的云函数：

```javascript
BASE_URL: 'https://your-cloud-function-url/app-update'
```

