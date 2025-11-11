# 修复 JS Bundle 上传签名错误

## 问题描述

在使用自建的简易版 OTA 系统上传 bundlejs 文件时，遇到 `SignatureDoesNotMatch` 错误。

### 错误信息

```
❌ 上传失败: 上传失败: 403
<Error>
	<Code>SignatureDoesNotMatch</Code>
	<Message>The Signature you specified is invalid.</Message>
	<FormatString>put
/js_bundles/v1.0.0/entry-d41d8cd98f00b204e9800998ecf8427e.js
host=636c-cloud1-4gee45pq61cd6f19-1259499058.cos.ap-shanghai.myqcloud.com&amp;x-cos-meta-fileid=cloud%3A%2F%2Fcloud1-4gee45pq61cd6f19.636c-cloud1-4gee45pq61cd6f19-1259499058%2Fjs_bundles%2Fv1.0.0%2Fentry-d41d8cd98f00b204e9800998ecf8427e.js
</FormatString>
</Error>
```

## 问题原因

1. **签名计算时使用的值**：腾讯云 SDK 的 `getUploadMetadata` 生成的签名包含 `x-cos-meta-fileid` header，使用原始值（未编码）：`cloud://cloud1-4gee45pq61cd6f19.636c-cloud1-4gee45pq61cd6f19-1259499058/js_bundles/v1.0.0/entry-d41d8cd98f00b204e9800998ecf8427e.js`

2. **HTTP 请求中发送的值**：Node.js 的 `https.request` 会自动对 header 值进行 URL 编码：`cloud%3A%2F%2Fcloud1-4gee45pq61cd6f19.636c-cloud1-4gee45pq61cd6f19-1259499058%2Fjs_bundles%2Fv1.0.0%2Fentry-d41d8cd98f00b204e9800998ecf8427e.js`

3. **签名验证失败**：COS 签名验证时会比较编码后的值，但签名计算时使用的是原始值，导致验证失败。

## 解决方案

### 方案 1：修改云函数，不包含 x-cos-meta-fileid（推荐）

修改云函数中的 `handleStorageUploadInit` 函数，在生成签名时不包含 `x-cos-meta-fileid` header。

**注意**：`getUploadMetadata` 是腾讯云 SDK 的方法，可能无法直接控制签名中包含的 header。如果 SDK 自动包含了 `x-cos-meta-fileid`，我们需要找到另一种方法。

### 方案 2：使用原始 socket 写入，避免自动编码

修改上传脚本，使用原始 socket 写入，避免 Node.js 自动编码 header 值。

### 方案 3：使用云函数上传（推荐）

不使用直传 COS，而是通过云函数上传，这样可以避免签名问题。

## 临时解决方案

如果无法立即修复签名问题，可以：

1. **使用云函数上传**：修改上传脚本，使用 `/storage/upload` 接口通过云函数上传，而不是直传 COS。

2. **检查腾讯云 SDK 版本**：确保使用最新版本的腾讯云 SDK，可能已经修复了这个问题。

3. **联系腾讯云技术支持**：如果问题持续存在，可以联系腾讯云技术支持，询问如何正确使用 `getUploadMetadata` 进行直传。

## 相关文件

- `scripts/upload-js-bundle.js` - 上传脚本
- `cloud-function/index.js` - 云函数代码（`handleStorageUploadInit` 函数）

## 参考文档

- [腾讯云 COS 签名规则](https://cloud.tencent.com/document/product/436/7778)
- [腾讯云 CloudBase getUploadMetadata](https://cloud.tencent.com/document/product/876/18442)

