# 分片合并路径问题修复代码

## 问题

错误：`STORAGE_FILE_NONEXIST` - 文件不存在

## 修复代码

在云函数的 `handleCompleteChunkUpload` 函数中，找到 `getChunkUrlWithRetry` 函数，替换为以下代码：

```javascript
// 辅助函数：获取分片 URL（带重试和路径格式兼容）
async function getChunkUrlWithRetry(fileIdentifier, chunkPath, maxRetries = 3, delayMs = 1000) {
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
  
  console.log(`尝试获取分片 URL，可能的路径:`, uniquePaths);
  
  // 尝试每个路径格式
  for (const testPath of uniquePaths) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`尝试路径 "${testPath}" (尝试 ${attempt}/${maxRetries})`);
        
        const urlResult = await storage.getTempFileURL({
          fileList: [testPath],
        });
        
        console.log(`路径 "${testPath}" getTempFileURL 结果:`, {
          hasFileList: !!urlResult.fileList,
          fileListLength: urlResult.fileList?.length || 0,
          firstItem: urlResult.fileList?.[0] || null,
        });
        
        if (urlResult.fileList && urlResult.fileList.length > 0) {
          const firstItem = urlResult.fileList[0];
          
          // 详细记录返回结果
          console.log(`路径 "${testPath}" 详细结果:`, JSON.stringify(firstItem, null, 2));
          
          if (firstItem.tempFileURL) {
            console.log(`✅ 成功获取 URL，使用的路径: ${testPath}`);
            return firstItem.tempFileURL;
          } else {
            // 检查错误代码
            const errorCode = firstItem.code || firstItem.Code;
            const errorMsg = firstItem.message || firstItem.Message || firstItem.errMsg || firstItem.ErrMsg;
            
            if (errorCode === 'STORAGE_FILE_NONEXIST' || 
                errorCode === 'FILE_NOT_FOUND' ||
                errorMsg?.includes('not found') || 
                errorMsg?.includes('不存在')) {
              // 文件不存在，尝试下一个路径格式
              console.log(`路径 "${testPath}" 文件不存在 (${errorCode})，尝试下一个路径...`);
              break; // 跳出重试循环，尝试下一个路径
            } else {
              // 其他错误，等待后重试
              console.warn(`路径 "${testPath}" 获取 URL 失败:`, {
                code: errorCode,
                message: errorMsg,
              });
              if (attempt < maxRetries) {
                console.log(`等待 ${delayMs}ms 后重试...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
              }
            }
          }
        } else {
          console.warn(`路径 "${testPath}" getTempFileURL 返回空的 fileList`);
          // 尝试下一个路径
          break;
        }
      } catch (error) {
        console.error(`路径 "${testPath}" 获取 URL 异常 (尝试 ${attempt}/${maxRetries}):`, error.message);
        if (attempt < maxRetries) {
          console.log(`等待 ${delayMs}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
  }
  
  // 所有路径都失败了
  throw new Error(`无法获取分片 URL: 已尝试所有路径格式 (${uniquePaths.join(', ')})`);
}
```

## 使用方法

1. **打开云函数代码**（在腾讯云控制台）
2. **找到 `handleCompleteChunkUpload` 函数**
3. **找到 `getChunkUrlWithRetry` 函数**
4. **替换为上面的代码**
5. **保存并部署**

## 测试

部署后，重新运行测试脚本：

```bash
node scripts/test-complete-chunk.js upload_1762556904994_oggjndlfv 56
```

## 如果仍然失败

1. **检查云存储控制台**，查看实际的文件路径
2. **查看云函数日志**，找到成功使用的路径格式
3. **根据实际路径调整代码**

## 额外建议

如果文件确实存在于云存储中，但路径不匹配，可以：

1. **在云存储控制台查看实际路径**
2. **手动测试获取 URL**：
   - 在控制台找到文件
   - 点击"下载"或"获取链接"
   - 查看 URL 中的路径部分
   - 根据实际路径调整代码

