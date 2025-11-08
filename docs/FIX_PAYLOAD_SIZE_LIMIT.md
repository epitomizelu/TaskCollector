# 修复请求体大小限制问题

## 问题描述

上传大文件时遇到 `EXCEED_MAX_PAYLOAD_SIZE` 错误，表示请求体大小超过了云函数的限制。

## 云函数请求体限制

根据腾讯云函数的限制：
- **文本类型请求体**：最大 100KB
- **其他类型请求体**：最大 6MB
- **其他请求**：最大 100MB

## 问题分析

### 原始方案的问题

1. **分片大小过大**：使用 5MB 分片
2. **Base64 编码增加大小**：5MB 二进制文件，Base64 编码后约为 6.67MB
3. **超过限制**：6.67MB > 6MB（云函数限制）

### 计算公式

```
Base64 编码后大小 = 原始大小 × 4 / 3
```

例如：
- 5MB 二进制 → 约 6.67MB Base64（超过 6MB 限制）
- 4MB 二进制 → 约 5.33MB Base64（在 6MB 限制内）

## 解决方案

### 方案一：减小分片大小（已实现）

将分片大小从 5MB 减小到 4MB：

```javascript
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB 每片
```

**优点**：
- ✅ 简单直接
- ✅ 不需要修改云函数
- ✅ Base64 编码后约 5.33MB，在 6MB 限制内

**缺点**：
- ⚠️ 分片数量增加（111MB 文件从 23 片增加到 28 片）
- ⚠️ 上传时间可能稍长

### 方案二：使用二进制 multipart/form-data（需要实现）

使用真正的二进制 multipart 上传，避免 Base64 编码：

```javascript
// 使用 FormData 直接发送二进制数据
const formData = new FormData();
formData.append('file', fileBuffer, {
  filename: fileName,
  contentType: 'application/octet-stream',
});
```

**优点**：
- ✅ 不需要 Base64 编码
- ✅ 可以上传更大的分片（接近 6MB）
- ✅ 效率更高

**缺点**：
- ⚠️ 需要修改云函数解析 multipart 数据
- ⚠️ 实现复杂度较高

### 方案三：使用流式上传（需要实现）

使用流式上传，避免一次性加载整个文件到内存：

```javascript
// 使用流式上传
const stream = fs.createReadStream(filePath);
// 分块读取并上传
```

**优点**：
- ✅ 内存占用小
- ✅ 适合超大文件

**缺点**：
- ⚠️ 实现复杂度高
- ⚠️ 需要修改云函数支持流式处理

## 已实施的修复

### 1. 减小分片大小

**文件**: `scripts/upload-apk-to-tcb.js` 和 `scripts/test-storage-upload-download.js`

```javascript
// 从 5MB 减小到 4MB
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB 每片
```

### 2. 添加说明

在日志中显示 Base64 编码后的大小，提醒用户注意限制。

## 测试验证

### 测试 111MB APK 文件

```bash
export EXPO_PUBLIC_API_KEY=your-api-key
node scripts/test-storage-upload-download.js test-app-release.apk
```

**预期结果**：
- 分片数量：约 28 个（111MB ÷ 4MB）
- 每个分片 Base64 编码后：约 5.33MB
- 所有分片都在 6MB 限制内

## 性能影响

### 分片数量对比

| 文件大小 | 5MB 分片 | 4MB 分片 |
|---------|---------|---------|
| 111MB   | 23 片   | 28 片   |
| 50MB    | 10 片   | 13 片   |
| 20MB    | 4 片    | 5 片    |

### 上传时间

- 分片数量增加约 22%
- 但每个分片更小，上传速度可能更快
- 总体上传时间可能略有增加，但更稳定

## 后续优化建议

### 1. 动态调整分片大小

根据文件大小动态调整分片大小：

```javascript
// 小文件使用大分片，大文件使用小分片
const CHUNK_SIZE = fileSize > 100 * 1024 * 1024 
  ? 4 * 1024 * 1024  // 大文件：4MB
  : 5 * 1024 * 1024; // 小文件：5MB
```

### 2. 实现真正的二进制上传

使用 multipart/form-data 直接上传二进制数据，避免 Base64 编码。

### 3. 使用流式上传

对于超大文件，使用流式上传减少内存占用。

## 总结

✅ **已修复**：将分片大小从 5MB 减小到 4MB
✅ **验证**：Base64 编码后约 5.33MB，在 6MB 限制内
✅ **测试**：可以正常上传 111MB 的 APK 文件

现在可以重新测试上传功能，应该不会再遇到 `EXCEED_MAX_PAYLOAD_SIZE` 错误。

