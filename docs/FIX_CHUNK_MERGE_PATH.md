# 修复分片合并路径问题

## 问题描述

合并分片时出现错误：`STORAGE_FILE_NONEXIST`，表示无法找到分片文件。

## 原因分析

从日志可以看到：
- 错误代码：`STORAGE_FILE_NONEXIST`
- 尝试的路径：`temp_chunks/upload_1762556904994_oggjndlfv/chunk_0`
- 问题：腾讯云存储可能需要不同的路径格式

## 解决方案

### 方案 1：修改路径格式（推荐）

在云函数的 `handleCompleteChunkUpload` 函数中，修改获取分片 URL 的逻辑，尝试多种路径格式：

```javascript
// 在 getChunkUrlWithRetry 函数中，尝试不同的路径格式
async function getChunkUrlWithRetry(fileIdentifier, chunkPath, maxRetries = 3, delayMs = 1000) {
  // 生成所有可能的路径格式
  const possiblePaths = [
    chunkPath,                                    // 原始路径
    `/${chunkPath}`,                              // 带前导斜杠
    chunkPath.replace(/\\/g, '/'),                // 统一使用正斜杠
    `/${chunkPath.replace(/\\/g, '/')}`,          // 带前导斜杠且统一格式
  ];
  
  // 去重
  const uniquePaths = [...new Set(possiblePaths)];
  
  for (const testPath of uniquePaths) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`尝试路径 (尝试 ${attempt}/${maxRetries}): ${testPath}`);
        
        const urlResult = await storage.getTempFileURL({
          fileList: [testPath],
        });
        
        if (urlResult.fileList && urlResult.fileList.length > 0) {
          const firstItem = urlResult.fileList[0];
          
          if (firstItem.tempFileURL) {
            console.log(`✅ 成功获取 URL，使用的路径: ${testPath}`);
            return firstItem.tempFileURL;
          } else if (firstItem.code === 'STORAGE_FILE_NONEXIST') {
            // 文件不存在，尝试下一个路径
            console.log(`路径 ${testPath} 不存在，尝试下一个...`);
            break; // 跳出重试循环，尝试下一个路径
          }
        }
      } catch (error) {
        console.error(`路径 ${testPath} 获取 URL 异常:`, error.message);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
  }
  
  throw new Error(`无法获取分片 URL: 已尝试所有路径格式`);
}
```

### 方案 2：使用上传时返回的 fileID

如果上传分片时返回了 `fileID`，应该保存这些 `fileID` 并在合并时使用：

1. **修改分片上传接口**：返回 `fileID` 并记录
2. **修改合并接口**：接收 `fileID` 列表并使用它们

```javascript
// 在上传分片时，保存 fileID
const uploadResult = await storage.uploadFile({
  cloudPath: chunkPath,
  fileContent: chunkBuffer,
});

const fileID = uploadResult?.fileID || uploadResult?.FileID;
// 返回 fileID 给客户端
return {
  code: 0,
  message: '分片上传成功',
  data: {
    chunkIndex: chunkIndex,
    fileID: fileID,  // 返回 fileID
  },
};

// 在合并时，使用 fileID 列表
// 客户端应该收集所有分片的 fileID，并在合并请求中发送
const chunkFileIDs = body?.chunkFileIDs || body?.fids || [];
if (chunkFileIDs.length > 0) {
  // 使用 fileID 获取 URL（fileID 是唯一标识，比路径更可靠）
  const urlResult = await storage.getTempFileURL({
    fileList: chunkFileIDs,
  });
}
```

### 方案 3：检查云存储中的实际路径

1. 登录腾讯云控制台
2. 进入云开发 → 云存储
3. 查找包含 `upload_1762556904994_oggjndlfv` 的文件夹
4. 检查实际的文件路径格式
5. 根据实际路径调整代码

## 临时解决方案

如果文件确实存在于云存储中，可以：

1. **在云存储控制台查看实际路径**
2. **修改代码中的路径格式**，使其与实际路径匹配
3. **或者，重新上传分片**，确保路径格式正确

## 推荐的修复步骤

1. **首先检查云存储控制台**，确认文件的实际路径
2. **修改 `getChunkUrlWithRetry` 函数**，添加路径格式兼容
3. **添加更多日志**，记录所有尝试的路径
4. **测试修复后的代码**

## 代码修改位置

文件：`cloud-function/index.js`
函数：`handleCompleteChunkUpload` → `getChunkUrlWithRetry`

## 注意事项

1. 腾讯云存储的路径格式可能因环境而异
2. 某些情况下，路径需要以 `/` 开头
3. 某些情况下，路径不能以 `/` 开头
4. 建议同时支持多种格式，以提高兼容性

