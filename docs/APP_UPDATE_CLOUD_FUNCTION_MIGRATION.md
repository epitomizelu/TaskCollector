# 应用更新服务云函数迁移指南

## 概述

已将应用更新相关的功能从主云函数 (`task-collection-api`) 迁移到独立的云函数 (`app-update`)。

## 迁移的功能

以下功能已迁移到 `app-update` 云函数：

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

## 部署步骤

### 1. 创建新的云函数

在腾讯云开发控制台：

1. 进入 **云函数** 页面
2. 点击 **新建云函数**
3. 函数名称：`app-update`
4. 运行环境：Node.js 16
5. 上传方式：**本地上传文件夹**
6. 上传 `cloud-function/app-update/` 目录下的所有文件：
   - `index.js`
   - `package.json`

### 2. 配置环境变量

在云函数配置中设置环境变量：

- `TCB_ENV`: 你的云开发环境ID（例如：`cloud1-4gee45pq61cd6f19`）

### 3. 更新客户端配置

更新 `config/api.config.js` 和 `config/api.config.ts`，添加新的云函数 URL：

```javascript
const API_CONFIG = {
  BASE_URL: 'https://your-cloud-function-url/app-update',
  // 或者如果使用不同的云函数：
  // UPDATE_SERVICE_URL: 'https://your-cloud-function-url/app-update',
  API_KEY: process.env.EXPO_PUBLIC_API_KEY || process.env.API_KEY || '',
};
```

### 4. 更新上传脚本

更新 `scripts/upload-js-bundle.js`，使用新的云函数 URL：

```javascript
const UPDATE_SERVICE_URL = process.env.UPDATE_SERVICE_URL || API_CONFIG.BASE_URL;

// 使用 UPDATE_SERVICE_URL 调用更新相关的接口
await postJSON(`${UPDATE_SERVICE_URL}/storage/init-upload`, { ... });
```

### 5. 更新客户端服务

更新 `services/js-bundle-update.service.ts`，使用新的云函数 URL：

```typescript
const UPDATE_SERVICE_URL = API_CONFIG.UPDATE_SERVICE_URL || API_CONFIG.BASE_URL;

const response = await fetch(
  `${UPDATE_SERVICE_URL}/app/check-js-bundle-update?currentVersion=...`,
  { ... }
);
```

## 数据库集合

确保以下数据库集合存在：

- `js_bundle_versions` - 存储版本信息
- `merge_tasks` - 存储合并任务

## 验证

部署完成后，测试以下功能：

1. **上传 JS Bundle**：
   ```bash
   node scripts/upload-js-bundle.js
   ```

2. **检查更新**：
   在应用中打开"检查更新"页面，验证是否能正常检查更新

## 回滚

如果遇到问题，可以：

1. 暂时使用主云函数（已注释的代码可以取消注释）
2. 或者保持两个云函数同时运行，逐步迁移

## 优势

独立云函数的优势：

1. **职责分离**：更新功能独立，不影响主业务
2. **独立部署**：可以单独更新和部署
3. **资源隔离**：更新服务的问题不会影响主业务
4. **易于维护**：代码更清晰，易于理解和维护

