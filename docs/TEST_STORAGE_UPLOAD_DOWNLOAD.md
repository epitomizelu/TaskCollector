# 云存储上传和下载测试指南

本文档说明如何测试云存储的上传和下载功能。

## 快速开始

### 前置要求

1. 安装 Node.js
2. 设置环境变量 `EXPO_PUBLIC_API_KEY` 或 `API_KEY`

### 运行测试

```bash
# 设置 API Key
export EXPO_PUBLIC_API_KEY=your-api-key

# 运行测试
node scripts/test-storage-upload-download.js
```

## 测试流程

测试脚本会自动执行以下步骤：

### 步骤 1: 生成测试文件

- 创建一个 2MB 的测试文件
- 使用随机数据填充
- 计算文件的 MD5 值

### 步骤 2: 上传文件到云存储

- 检测文件大小
- 如果 > 10MB，使用分片上传
- 如果 ≤ 10MB，使用直接上传
- 显示上传进度

### 步骤 3: 从云存储下载文件

- 使用上传返回的文件 URL
- 下载文件到本地
- 显示下载进度

### 步骤 4: 验证文件完整性

- 计算下载文件的 MD5 值
- 与原始文件 MD5 值对比
- 验证文件大小是否匹配

## 测试输出示例

```
🧪 开始测试云存储上传和下载功能

============================================================

📋 步骤 1: 生成测试文件
------------------------------------------------------------
📝 生成测试文件...
✅ 测试文件已生成: D:\claude\download-APP_GENERATION\task_collection\test-upload-download.bin
   大小: 2.00 MB
   MD5: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

📋 步骤 2: 上传文件到云存储
------------------------------------------------------------
📤 开始上传文件...
   文件: test-upload-download.bin
   大小: 2.00 MB
   目标路径: test_files/1234567890_test-upload-download.bin
   使用直接上传...
✅ 上传成功！
   文件 URL: https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/test_files/1234567890_test-upload-download.bin

📋 步骤 3: 从云存储下载文件
------------------------------------------------------------
📥 开始下载文件...
   下载 URL: https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/test_files/1234567890_test-upload-download.bin
   保存路径: D:\claude\download-APP_GENERATION\task_collection\test-downloaded.bin
   进度: 100.0% (2.00 MB / 2.00 MB)
✅ 下载成功！
   文件大小: 2.00 MB

📋 步骤 4: 验证文件完整性
------------------------------------------------------------
原始文件 MD5: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
下载文件 MD5: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
✅ 文件完整性验证通过！MD5 值匹配

原始文件大小: 2.00 MB
下载文件大小: 2.00 MB
✅ 文件大小验证通过！

============================================================
🎉 所有测试通过！
============================================================

测试结果:
  ✅ 文件上传: 成功
  ✅ 文件下载: 成功
  ✅ 文件完整性: 通过
  ✅ 文件大小: 匹配

上传的文件 URL: https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/test_files/1234567890_test-upload-download.bin
```

## 测试大文件（可选）

如果要测试大文件上传（分片上传），可以修改测试脚本中的 `TEST_FILE_SIZE`：

```javascript
const TEST_FILE_SIZE = 50 * 1024 * 1024; // 50MB 测试文件
```

或者使用现有的 APK 文件：

```bash
# 使用现有的 APK 文件测试
node scripts/upload-apk-to-tcb.js ./test-app-release.apk
```

## 故障排除

### 问题 1: API Key 错误

**错误**: `未配置 API_KEY`

**解决方法**:
```bash
export EXPO_PUBLIC_API_KEY=your-api-key
```

### 问题 2: 上传失败

**错误**: `上传失败: ...`

**解决方法**:
- 检查 API Key 是否正确
- 检查云函数是否已部署
- 查看云函数日志

### 问题 3: 下载失败

**错误**: `下载失败: HTTP 403`

**解决方法**:
- 检查 TCB 存储权限配置
- 确认文件 URL 是否正确
- 检查存储桶是否为"公有读"

### 问题 4: MD5 不匹配

**错误**: `文件完整性验证失败！MD5 值不匹配`

**解决方法**:
- 检查上传和下载过程是否有错误
- 确认文件在传输过程中没有被修改
- 重新运行测试

## 测试脚本功能

### 主要功能

- ✅ 自动生成测试文件
- ✅ 支持小文件直接上传
- ✅ 支持大文件分片上传
- ✅ 显示上传和下载进度
- ✅ 自动验证文件完整性（MD5）
- ✅ 自动验证文件大小
- ✅ 详细的错误信息

### 测试文件

测试完成后会保留以下文件：
- `test-upload-download.bin` - 原始测试文件
- `test-downloaded.bin` - 下载的文件

可以手动对比这两个文件，或删除它们。

## 总结

✅ **测试脚本**: `scripts/test-storage-upload-download.js`
✅ **文档**: `docs/TEST_STORAGE_UPLOAD_DOWNLOAD.md`

现在可以随时测试云存储的上传和下载功能，验证整个流程是否正常工作！

