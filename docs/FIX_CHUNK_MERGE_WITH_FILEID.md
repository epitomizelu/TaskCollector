# 使用 fileID 修复分片合并问题

## 问题分析

从你提供的信息：
- **fileID 格式**：`cloud://cloud1-4gee45pq61cd6f19.636c-cloud1-4gee45pq61cd6f19-1259499058/temp_chunks/upload_1762518629713_0jp3hws5l/chunk_0`
- **临时链接**：`https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/temp_chunks/upload_1762518629713_0jp3hws5l/chunk_0`

**问题原因**：
1. 上传分片时，云存储返回了完整的 `fileID`（`cloud://...` 格式）
2. 合并时，我们使用的是相对路径（`temp_chunks/...`）
3. `getTempFileURL` 需要使用 `fileID` 或正确的路径格式

## 解决方案

### 步骤 1：修改云函数 - 上传分片时返回 fileID

在 `handleChunkUpload` 函数中，确保返回 `fileID`：

```javascript
// 上传分片到临时位置
const uploadResult = await storage.uploadFile({
  cloudPath: chunkPath,
  fileContent: chunkBuffer,
});

// 获取 fileID（可能是 uploadResult.fileID 或 uploadResult.FileID）
const fileID = uploadResult?.fileID || uploadResult?.FileID || chunkPath;

console.log(`分片 ${chunkIndex + 1}/${totalChunks} 上传成功:`, {
  chunkPath,
  fileID,
  uploadResultKeys: Object.keys(uploadResult || {}),
});

return {
  code: 0,
  message: '分片上传成功',
  data: {
    chunkIndex: chunkIndex,
    chunkPath: chunkPath,
    fileID: fileID, // ✅ 返回 fileID
  },
};
```

### 步骤 2：修改云函数 - 合并时使用 fileID

在 `handleCompleteChunkUpload` 函数中，修改 `getChunkUrlWithRetry` 函数：

```javascript
// 辅助函数：获取分片 URL（优先使用 fileID）
async function getChunkUrlWithRetry(fileIdentifier, chunkPath, maxRetries = 3, delayMs = 1000) {
  // 如果 fileIdentifier 是完整的 fileID（cloud:// 开头），直接使用
  if (fileIdentifier && fileIdentifier.startsWith('cloud://')) {
    console.log(`使用 fileID 获取 URL: ${fileIdentifier}`);
    try {
      const urlResult = await storage.getTempFileURL({
        fileList: [fileIdentifier],
      });
      
      if (urlResult.fileList && urlResult.fileList.length > 0) {
        const firstItem = urlResult.fileList[0];
        if (firstItem.tempFileURL) {
          console.log(`✅ 使用 fileID 成功获取 URL`);
          return firstItem.tempFileURL;
        }
      }
    } catch (error) {
      console.error(`使用 fileID 获取 URL 失败:`, error.message);
      // 如果 fileID 失败，继续尝试路径方式
    }
  }
  
  // 如果 fileID 不存在或失败，尝试路径方式
  // 生成所有可能的路径格式
  const basePath = chunkPath;
  const possiblePaths = [
    basePath,                                    // 原始路径: temp_chunks/...
    `/${basePath}`,                              // 带前导斜杠: /temp_chunks/...
    basePath.replace(/\\/g, '/'),                // 统一使用正斜杠
    `/${basePath.replace(/\\/g, '/')}`,          // 带前导斜杠且统一格式
  ];
  
  // 去重
  const uniquePaths = [...new Set(possiblePaths)];
  
  console.log(`尝试路径方式获取 URL，可能的路径:`, uniquePaths);
  
  // 尝试每个路径格式
  for (const testPath of uniquePaths) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`尝试路径 "${testPath}" (尝试 ${attempt}/${maxRetries})`);
        
        const urlResult = await storage.getTempFileURL({
          fileList: [testPath],
        });
        
        if (urlResult.fileList && urlResult.fileList.length > 0) {
          const firstItem = urlResult.fileList[0];
          
          if (firstItem.tempFileURL) {
            console.log(`✅ 成功获取 URL，使用的路径: ${testPath}`);
            return firstItem.tempFileURL;
          } else if (firstItem.code === 'STORAGE_FILE_NONEXIST') {
            // 文件不存在，尝试下一个路径格式
            console.log(`路径 "${testPath}" 文件不存在，尝试下一个路径...`);
            break; // 跳出重试循环，尝试下一个路径
          }
        }
      } catch (error) {
        console.error(`路径 "${testPath}" 获取 URL 异常:`, error.message);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
  }
  
  throw new Error(`无法获取分片 URL: fileID 和所有路径格式都失败`);
}
```

### 步骤 3：修改合并逻辑 - 使用 fileID 列表

在 `handleCompleteChunkUpload` 函数的主循环中：

```javascript
for (let i = 0; i < totalChunks; i++) {
  const chunkPath = `temp_chunks/${uploadId}/chunk_${i}`;
  
  // 优先使用 fileID，如果没有则使用路径
  let fileIdentifier = chunkPath;
  if (chunkFileIDs && chunkFileIDs.length > i && chunkFileIDs[i]) {
    fileIdentifier = chunkFileIDs[i];
    console.log(`分片 ${i} 使用 fileID: ${fileIdentifier}`);
  } else {
    console.log(`分片 ${i} 使用路径: ${fileIdentifier}`);
  }
  
  // 获取分片的临时下载 URL，然后下载
  try {
    if (!storage.getTempFileURL) {
      throw new Error('getTempFileURL 方法不可用');
    }
    
    // 使用重试机制获取 URL（优先使用 fileID）
    const chunkUrl = await getChunkUrlWithRetry(fileIdentifier, chunkPath, 3, 1000);
    console.log(`分片 ${i} 下载 URL 获取成功: ${chunkUrl.substring(0, 100)}...`);
    
    // 使用 https 下载分片
    const chunkBuffer = await downloadFileFromUrl(chunkUrl);
    chunks.push(chunkBuffer);
    console.log(`已读取分片 ${i + 1}/${totalChunks}，大小: ${(chunkBuffer.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error(`读取分片 ${i} 失败:`, error);
    console.error(`错误堆栈:`, error.stack);
    throw new Error(`读取分片 ${i} 失败: ${error.message}`);
  }
}
```

## 测试步骤

1. **重新部署云函数**（应用上述修改）
2. **重新运行测试脚本**：
   ```bash
   node scripts/test-storage-upload-download.js test-app-release.apk
   ```
3. **检查日志**，确认：
   - 上传分片时返回了 `fileID`
   - 合并时使用了 `fileID` 获取 URL
   - 成功获取了分片 URL

## 注意事项

1. **fileID 格式**：`cloud://环境ID.存储域名/文件路径`
2. **路径格式**：相对路径 `temp_chunks/...` 或绝对路径 `/temp_chunks/...`
3. **优先级**：fileID > 路径（因为 fileID 是唯一标识）

## 如果仍然失败

1. **检查上传分片时返回的 fileID 格式**
2. **查看云函数日志**，确认 fileID 是否正确传递
3. **测试直接使用 fileID 获取 URL**：
   ```javascript
   const urlResult = await storage.getTempFileURL({
     fileList: ['cloud://cloud1-4gee45pq61cd6f19.636c-cloud1-4gee45pq61cd6f19-1259499058/temp_chunks/upload_1762518629713_0jp3hws5l/chunk_0'],
   });
   ```

