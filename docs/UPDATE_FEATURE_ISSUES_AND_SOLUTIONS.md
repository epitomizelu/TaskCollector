# 更新功能开发遇到的坑和解决方案

## 📋 问题清单

### 1. EAS Build 配置错误

**问题**：
```
eas.json is not valid. - "update" is not allowed
```

**原因**：`eas.json` 中使用了不支持的 `update` 和 `channel` 字段

**解决方案**：
- 删除 `eas.json` 中的 `update` 块
- 删除 `build.preview.android` 和 `build.production.android` 中的 `channel` 字段

---

### 2. EAS Build 下载命令参数错误

**问题**：
```
Unexpected arguments: --latest, --output, ./app-release.apk
```

**原因**：`eas build:download` 命令不支持这些参数

**解决方案**：
- 从 `eas build` 输出中提取下载 URL
- 使用 `curl` 或 `wget` 直接下载 APK

```bash
DOWNLOAD_URL=$(echo "$BUILD_OUTPUT" | grep -oE 'https://expo.dev/artifacts/eas/[a-zA-Z0-9]+\.apk' | head -1)
curl -L -o ./app-release.apk "$DOWNLOAD_URL"
```

---

### 3. 上传时请求体大小超限

**问题**：
```
EXCEED_MAX_PAYLOAD_SIZE
请求体大小超过限制。云函数请求体最大限制：文本类型请求体 100KB，其他类型请求体 6MB
```

**原因**：
- APK 文件 111MB，Base64 编码后约 148MB
- 即使分片上传，单个分片 Base64 编码后也超过限制

**解决方案**：
- 将分片大小从 5MB → 4MB → 3MB → **2MB**（最终方案）
- 缩短 JSON 字段名（`uploadId` → `u`，`chunkIndex` → `i` 等）
- 使用 `application/octet-stream` + `X-Content-Format: json` 避免被识别为文本类型

**最终配置**：
- 分片大小：2MB（二进制）
- Base64 编码后：约 2.67MB
- 加上 JSON 字段：约 2.7MB（在 6MB 限制内）

---

### 4. 云函数存储 API 调用错误

**问题**：
```
app.storage is not a function
```

**原因**：`@cloudbase/node-sdk` v3.0.0+ 的 API 变更

**解决方案**：
- 使用 `app.uploadFile()` 而不是 `app.storage().uploadFile()`
- 使用 `app.getTempFileURL()` 而不是 `app.storage().getTempFileURL()`
- 使用 `app.deleteFile()` 而不是 `app.storage().deleteFile()`
- 更新 `cloud-function/package.json` 到 `@cloudbase/node-sdk: ^3.0.0`

---

### 5. 分片合并时文件路径错误

**问题**：
```
无法获取分片 0 的下载 URL (Error code: STORAGE_FILE_NONEXIST)
```

**原因**：`getTempFileURL` 需要使用 `cloud://` 格式的 `fileID`，而不是普通路径

**解决方案**：
- 使用 `cloud://<envId>.<storageDomain>/<path>` 格式
- 例如：`cloud://cloud1-4gee45pq61cd6f19.636c-cloud1-4gee45pq61cd6f19-1259499058/temp_chunks/upload_xxx/chunk_0`
- 创建 `pathToCloudFileID` 辅助函数统一转换

---

### 6. 云函数 3 秒超时限制

**问题**：
```
FUNCTION_TIME_LIMIT_EXCEEDED
Invoking task timed out after 3 seconds
```

**原因**：云函数最多执行 3 秒，无法在函数内完成下载和合并 56 个分片

**解决方案**：
- **方案1（当前使用）**：返回分片 URL 列表，客户端下载并合并
- **方案2（已实现但未使用）**：创建异步任务，后台处理合并

**当前实现**：
```javascript
// 云函数返回分片 URL 列表
return {
  code: 0,
  data: {
    chunkUrls: [url1, url2, ...], // 所有分片的下载 URL
    targetFilePath: filePath,
  }
};

// 客户端下载并合并
const chunkFiles = await downloadAllChunks(chunkUrls);
const apkUri = await mergeChunks(chunkFiles);
```

---

### 7. 优先从 EAS 下载的实现

**需求**：优先从 EAS Build 下载，失败则从腾讯云下载

**解决方案**：
1. **GitHub Actions**：将 EAS 下载地址传递给上传脚本
   ```yaml
   EAS_DOWNLOAD_URL: ${{ steps.build.outputs.download_url }}
   ```

2. **上传脚本**：保存 EAS 下载地址到数据库
   ```javascript
   await saveVersionInfo(version, versionCode, cloudPath, uploadResult, easDownloadUrl);
   ```

3. **云函数**：返回 EAS 下载地址和腾讯云下载地址
   ```javascript
   {
     easDownloadUrl: 'https://expo.dev/artifacts/...', // 优先使用
     downloadUrl: 'https://...tcb.qcloud.la/...',     // 备用
   }
   ```

4. **客户端**：优先从 EAS 下载，失败则切换
   ```typescript
   if (updateInfo.easDownloadUrl) {
     try {
       return await downloadApkDirect(updateInfo.easDownloadUrl, onProgress);
     } catch (easError) {
       // 失败则从腾讯云下载
     }
   }
   return await downloadApkDirect(updateInfo.downloadUrl, onProgress);
   ```

---

## 🎯 关键经验总结

### 1. 云函数限制
- **请求体大小**：文本类型 100KB，其他类型 6MB
- **执行时间**：最多 3 秒
- **解决方案**：大文件分片上传，耗时操作客户端处理

### 2. TCB SDK API 变更
- **v3.0.0+**：直接使用 `app.uploadFile()` 等方法
- **不要使用**：`app.storage().uploadFile()`（已废弃）

### 3. 文件路径格式
- **getTempFileURL**：必须使用 `cloud://` 格式
- **格式**：`cloud://<envId>.<storageDomain>/<path>`
- **示例**：`cloud://cloud1-xxx.636c-cloud1-xxx-1259499058/path/to/file`

### 4. 分片大小选择
- **2MB** 是最佳选择（Base64 编码后约 2.67MB）
- **3MB** 可能超限（Base64 编码后约 4MB）
- **建议**：始终测试 Base64 编码后的实际大小

### 5. 错误处理策略
- **上传失败**：自动重试（最多 3 次）
- **下载失败**：自动切换下载源（EAS → 腾讯云）
- **合并失败**：自动清理临时文件

---

## 📝 最佳实践

1. **分片上传**：文件 > 10MB 时使用分片上传
2. **分片大小**：2MB（确保在云函数限制内）
3. **字段命名**：使用短字段名减少 JSON 大小
4. **错误重试**：每个分片最多重试 3 次
5. **下载策略**：优先从 EAS 下载，失败则从腾讯云下载
6. **路径格式**：统一使用 `cloud://` 格式
7. **超时处理**：耗时操作在客户端完成，云函数只返回必要信息

---

## 🔧 相关文件

- **上传脚本**：`scripts/upload-apk-to-tcb.js`
- **下载脚本**：`scripts/download-and-merge-chunks.js`
- **云函数**：`cloud-function/index.js`
- **更新服务**：`services/app-update.service.ts`
- **GitHub Actions**：`.github/workflows/eas-build.yml`

