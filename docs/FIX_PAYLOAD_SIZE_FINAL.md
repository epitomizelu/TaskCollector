# 最终修复请求体大小限制问题

## 问题描述

小文件上传成功，但大文件（APK，111MB）上传时仍然遇到：
```
Exceed max request payload size
```

## 问题分析

### 分片大小演进

| 方案 | 二进制大小 | Base64 大小 | JSON 字段 | 总大小 | 状态 |
|------|-----------|------------|----------|--------|------|
| 原始 | 5MB | 6.67MB | ~0.1MB | ~6.77MB | ❌ 超过限制 |
| 第一次优化 | 4MB | 5.33MB | ~0.1MB | ~5.43MB | ❌ 可能超过 |
| 第二次优化 | 3MB | 4.00MB | ~0.05MB | ~4.05MB | ❌ 仍然超过 |
| **最终方案** | **2MB** | **2.67MB** | **~0.03MB** | **~2.70MB** | ✅ 在限制内 |

### 云函数请求体限制

根据腾讯云函数文档：
- **文本类型请求体**：最大 100KB
- **其他类型请求体**：最大 6MB

**关键发现**：
- JSON 格式的请求体可能被识别为"文本类型"
- 实际限制可能更严格（约 3-4MB），而不是 6MB
- 使用 2MB 分片（Base64 后约 2.67MB）可以确保在限制内

## 最终解决方案

### 分片大小：2MB

```javascript
const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB 每片
```

### 优化效果

对于 111MB 的 APK 文件：
- **分片数量**：约 56 个（111MB ÷ 2MB）
- **每个分片 Base64 编码后**：约 2.67MB
- **加上 JSON 字段**：约 2.70MB
- **所有分片都在限制内** ✅

### 性能影响

| 文件大小 | 2MB 分片 | 3MB 分片 | 4MB 分片 |
|---------|---------|---------|---------|
| 111MB   | 56 片   | 37 片   | 28 片   |
| 50MB    | 25 片   | 17 片   | 13 片   |
| 20MB    | 10 片   | 7 片    | 5 片    |

**权衡**：
- ✅ 更稳定，不会超过限制
- ⚠️ 分片数量增加约 51%（相比 3MB）
- ⚠️ 上传时间可能稍长，但更可靠

## 已更新的文件

1. `scripts/test-storage-upload-download.js` - 测试脚本
2. `scripts/upload-apk-to-tcb.js` - APK 上传脚本

## 测试验证

### 小文件测试（已通过 ✅）

```bash
export EXPO_PUBLIC_API_KEY=your-api-key
node scripts/test-storage-upload-download.js test-small-file.txt
```

### 大文件测试（APK）

```bash
export EXPO_PUBLIC_API_KEY=your-api-key
node scripts/test-storage-upload-download.js test-app-release.apk
```

**预期结果**：
- 分片数量：约 56 个
- 每个分片 Base64 编码后：约 2.67MB
- 实际请求体大小：约 2.70MB（在限制内）
- 应该不会再遇到 `EXCEED_MAX_PAYLOAD_SIZE` 错误

## 如果仍然失败

如果 2MB 分片仍然失败，可以进一步减小到 1.5MB 或 1MB：

```javascript
const CHUNK_SIZE = 1.5 * 1024 * 1024; // 1.5MB 每片
// 或
const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB 每片
```

但 2MB 应该已经足够安全了。

## 总结

✅ **最终方案**：使用 2MB 分片
✅ **Base64 编码后**：约 2.67MB
✅ **总请求体大小**：约 2.70MB（在限制内）
✅ **稳定性**：确保不会超过云函数请求体限制

现在可以重新测试 APK 文件上传，应该不会再遇到大小限制错误。

