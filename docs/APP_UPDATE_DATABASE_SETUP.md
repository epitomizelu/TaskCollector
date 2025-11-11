# 应用更新服务数据库集合设置

## 必需的数据库集合

应用更新服务需要以下数据库集合：

### 1. `merge_tasks` - 合并任务集合

用于存储分片上传后的合并任务信息。

**集合结构：**
```javascript
{
  taskId: String,           // 任务ID（唯一标识）
  uploadId: String,         // 上传ID（用于标识一组分片）
  totalChunks: Number,      // 总分片数
  filePath: String,         // 目标文件路径
  fileName: String,         // 文件名
  chunkUrls: Array<String>, // 分片URL列表
  status: String,           // 任务状态：pending, processing, completed, failed
  progress: Number,         // 进度（0-100）
  fileId: String,           // 文件ID（合并完成后）
  fileUrl: String,          // 文件URL（合并完成后）
  fileSize: Number,         // 文件大小（字节）
  error: String,            // 错误信息（如果失败）
  createdAt: String,        // 创建时间（ISO 8601）
  updatedAt: String,        // 更新时间（ISO 8601）
  completedAt: String       // 完成时间（ISO 8601）
}
```

**索引：**
- `taskId`（唯一索引）
- `uploadId`（普通索引）
- `status`（普通索引）

### 2. `js_bundle_versions` - JS Bundle 版本集合

用于存储 JS Bundle 的版本信息。

**集合结构：**
```javascript
{
  version: String,          // 版本号（如 "1.0.0"）
  versionCode: Number,      // 版本代码（整数，用于比较）
  platform: String,         // 平台（"android" 或 "ios"）
  bundleType: String,       // Bundle 类型（"js"）
  downloadUrl: String,      // 下载URL
  filePath: String,         // 文件路径
  fileSize: Number,         // 文件大小（字节）
  releaseDate: String,      // 发布日期（ISO 8601）
  createdAt: String,        // 创建时间（ISO 8601）
  updatedAt: String         // 更新时间（ISO 8601）
}
```

**索引：**
- `versionCode` + `platform`（复合唯一索引）
- `platform`（普通索引）
- `versionCode`（普通索引，降序）

## 创建步骤

### 在腾讯云开发控制台创建集合

1. **登录腾讯云开发控制台**
   - 访问：https://console.cloud.tencent.com/tcb
   - 选择你的环境

2. **创建 `merge_tasks` 集合**
   - 进入 **数据库** > **集合管理**
   - 点击 **新建集合**
   - 集合名称：`merge_tasks`
   - 点击 **确定**

3. **创建 `js_bundle_versions` 集合**
   - 进入 **数据库** > **集合管理**
   - 点击 **新建集合**
   - 集合名称：`js_bundle_versions`
   - 点击 **确定**

4. **创建索引（可选，但推荐）**

   **`merge_tasks` 集合索引：**
   - `taskId`（唯一索引）
   - `uploadId`（普通索引）
   - `status`（普通索引）

   **`js_bundle_versions` 集合索引：**
   - `versionCode` + `platform`（复合唯一索引）
   - `platform`（普通索引）
   - `versionCode`（普通索引，降序）

## 验证

创建完成后，可以运行上传脚本测试：

```bash
node scripts/upload-js-bundle.js
```

如果集合创建成功，上传应该能够完成，并且会在 `js_bundle_versions` 集合中创建版本记录。

## 注意事项

1. **权限设置**：确保云函数有读写这些集合的权限
2. **索引优化**：创建索引可以提高查询性能
3. **数据清理**：定期清理 `merge_tasks` 集合中已完成或失败的任务，避免数据积累

