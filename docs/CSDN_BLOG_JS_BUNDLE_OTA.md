# React Native 自建 JS Bundle OTA 更新系统：从零到一的完整实现与踩坑记录

## 📝 摘要

本文详细介绍如何在 React Native + Expo 项目中实现自建 JS Bundle OTA（Over-The-Air）更新系统，包括系统架构设计、核心实现原理、分片上传方案，以及开发过程中遇到的各种坑和解决方案。通过本文，你将学会如何在不重新安装 APK 的情况下，实现 JavaScript 代码的热更新。

**关键词**：React Native、Expo、OTA 更新、JS Bundle、分片上传、热更新

---

## 📑 目录

1. [背景与需求](#1-背景与需求)
2. [系统架构设计](#2-系统架构设计)
3. [核心实现原理](#3-核心实现原理)
4. [分片上传方案](#4-分片上传方案)
5. [版本管理机制](#5-版本管理机制)
6. [踩坑记录与解决方案](#6-踩坑记录与解决方案)
7. [完整代码实现](#7-完整代码实现)
8. [总结与展望](#8-总结与展望)

---

## 1. 背景与需求

### 1.1 为什么需要自建 OTA 系统？

在 React Native 开发中，我们通常使用以下更新方式：

- **EAS OTA 更新**：官方方案，但需要付费，且功能受限
- **APK 更新**：需要用户重新安装，体验差
- **自建 OTA 系统**：完全可控，支持自定义逻辑，成本低

我们的需求：
- ✅ 支持大文件上传（>10MB）
- ✅ 独立的版本管理（与 APK 版本分离）
- ✅ 仅支持手动更新（用户可控）
- ✅ 支持动态执行 JS 代码（无需重启）

### 1.2 技术栈

- **前端**：React Native + Expo
- **后端**：腾讯云开发（TCB）
- **存储**：腾讯云对象存储（COS）
- **数据库**：腾讯云数据库（MongoDB）

---

## 2. 系统架构设计

### 2.1 整体架构

```
┌─────────────────┐
│   开发者端      │
│  (上传脚本)     │
└────────┬────────┘
         │ 分片上传
         ▼
┌─────────────────┐
│   云函数        │
│ (app-update-api)│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌──────┐  ┌──────┐
│ COS  │  │ 数据库│
│存储  │  │版本管理│
└──────┘  └──────┘
         │
         │ 检查更新
         ▼
┌─────────────────┐
│   客户端 App    │
│  (手动更新)     │
└─────────────────┘
```

### 2.2 核心组件

1. **上传脚本**：构建并上传 JS Bundle 到云存储
2. **云函数**：处理分片上传、合并、版本管理
3. **客户端服务**：检查更新、下载、应用更新
4. **数据库**：存储版本信息和合并任务

---

## 3. 核心实现原理

### 3.1 版本管理机制

**关键设计**：JS Bundle 更新使用独立的 `jsVersionCode`，与 APK 的 `versionCode` 完全分离。

```javascript
// APK 版本管理
{
  version: "1.0.0",
  versionCode: 2  // 从 app.json 读取
}

// JS Bundle 版本管理
{
  version: "1.0.0",      // 显示用，与 APK 版本一致
  jsVersionCode: 1       // 独立管理，自动递增
}
```

**优势**：
- JS Bundle 可以频繁更新，不影响 APK 版本
- 版本号清晰，不会混淆
- 支持回滚到任意 JS Bundle 版本

### 3.2 自动递增机制

每次上传 JS Bundle 时，云函数自动查询当前平台的最大 `jsVersionCode`，然后 +1：

```javascript
// 查询当前最大 jsVersionCode
const existingVersions = await collection
  .where({ platform: platform })
  .orderBy('jsVersionCode', 'desc')
  .limit(1)
  .get();

let jsVersionCode = 1;
if (existingVersions.data && existingVersions.data.length > 0) {
  const maxJsVersionCode = existingVersions.data[0].jsVersionCode;
  jsVersionCode = maxJsVersionCode + 1;
}
```

### 3.3 客户端版本存储

客户端将 `jsVersionCode` 保存在本地存储中：

```typescript
// 保存路径
const infoPath = `${FileSystem.documentDirectory}js_bundle_version_code.json`;

// 保存内容
{
  jsVersionCode: 2,
  updatedAt: "2025-01-11T..."
}
```

**首次使用**：默认 `jsVersionCode = 0`，确保能检测到第一次更新。

---

## 4. 分片上传方案

### 4.1 为什么需要分片上传？

**问题**：云函数的请求体大小限制为 6MB，而我们的 JS Bundle 文件通常 >10MB。

**解决方案**：将大文件分割成多个 2MB 的分片，逐个上传，最后在云函数中合并。

### 4.2 分片大小设计

```javascript
const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB（二进制）
// Base64 编码后约 2.67MB
// 加上 JSON 字段，总大小约 2.7MB
// 确保在云函数 6MB 限制内
```

### 4.3 分片上传流程

```
1. 读取文件 → 2. 分割成多个分片 → 3. Base64 编码
    ↓
4. 逐个上传分片到云存储（临时路径）
    ↓
5. 获取所有分片的下载 URL
    ↓
6. 创建合并任务（保存到数据库）
    ↓
7. 异步处理合并任务（下载 → 合并 → 上传）
    ↓
8. 保存版本记录（自动递增 jsVersionCode）
```

### 4.4 异步合并任务

**为什么需要异步？**

合并任务需要：
- 下载多个分片（可能很慢）
- 合并分片（内存操作）
- 上传完整文件（可能很慢）

如果同步执行，云函数会超时。

**解决方案**：创建异步任务，立即返回，后台处理。

```javascript
// 创建合并任务
const taskData = {
  taskId: `merge_${Date.now()}_${randomId}`,
  uploadId: uploadId,
  totalChunks: totalChunks,
  chunkUrls: JSON.stringify(chunkUrls), // 转为 JSON 字符串
  filePath: filePath,
  status: 'pending',
  progress: 0,
  createdAt: new Date().toISOString(),
};

await db.collection('merge_tasks').doc(taskId).set(taskData);

// 异步处理（不等待完成）
processMergeTask(taskId).catch(error => {
  // 错误处理
});
```

---

## 5. 版本管理机制

### 5.1 数据库结构

**`js_bundle_versions` 集合**：

```javascript
{
  _id: ObjectId("..."),
  version: "1.0.0",                    // APK 版本号（显示用）
  jsVersionCode: 1,                     // JS Bundle 版本代码（比较用）
  platform: "android",                 // 平台
  bundleType: "js",                     // Bundle 类型
  downloadUrl: "https://...",          // 下载地址
  filePath: "js_bundles/v1.0.0/...",  // 云存储路径
  fileSize: 11238318,                   // 文件大小
  releaseDate: "2025-01-11T...",       // 发布日期
  createdAt: "2025-01-11T...",
  updatedAt: "2025-01-11T..."
}
```

### 5.2 检查更新逻辑

**客户端**：
```typescript
// 1. 从本地存储读取当前 jsVersionCode
await this.loadJsVersionCode(); // 默认 0

// 2. 调用云函数检查更新
const response = await fetch(
  `${updateServiceUrl}/app/check-js-bundle-update?jsVersionCode=${this.currentJsVersionCode}&platform=${Platform.OS}`
);

// 3. 客户端二次校验
if (updateInfo.latestJsVersionCode <= this.currentJsVersionCode) {
  updateInfo.hasUpdate = false;
}
```

**云函数**：
```javascript
// 1. 接收 jsVersionCode 参数
const currentJsVersionCode = parseInt(queryParams.get('jsVersionCode') || '0', 10);

// 2. 查询最新版本（按 jsVersionCode 降序）
const versions = await versionsCollection
  .where({ platform: platform })
  .orderBy('jsVersionCode', 'desc')
  .limit(1)
  .get();

// 3. 比较版本
const hasUpdate = latestJsVersionCode > currentJsVersionCode;
```

### 5.3 应用更新逻辑

**下载完成后**：

```typescript
async applyUpdate(bundlePath: string, latestJsVersionCode: number) {
  const ext = bundlePath.split('.').pop()?.toLowerCase();
  
  if (ext === 'js') {
    // 1. 动态执行 JS Bundle
    await this.runBundle(bundlePath);
    
    // 2. 保存新的 jsVersionCode
    await this.saveJsVersionCode(latestJsVersionCode);
    
    Alert.alert('更新完成', '新版本已应用（无需重启）');
  } else if (ext === 'hbc') {
    // 1. 保存更新信息
    await FileSystem.writeAsStringAsync(infoPath, JSON.stringify({
      bundlePath,
      jsVersionCode: latestJsVersionCode,
    }));
    
    // 2. 保存新的 jsVersionCode
    await this.saveJsVersionCode(latestJsVersionCode);
    
    Alert.alert('更新下载完成', '下次重启后将应用新版本');
  }
}
```

---

## 6. 踩坑记录与解决方案

### 🐛 坑 1：直接上传 COS 的签名问题

**问题描述**：
尝试直接使用 HTTP PUT 上传文件到 COS，遇到 `SignatureDoesNotMatch` 错误。

**错误信息**：
```
<Error>
  <Code>SignatureDoesNotMatch</Code>
  <Message>The Signature you specified is invalid.</Message>
</Error>
```

**原因分析**：
TCB 的 `getUploadMetadata` 返回的 `authorization` 签名是针对特定请求格式的，直接用于 HTTP PUT 时，headers 可能不匹配导致签名验证失败。

**解决方案**：
放弃直接上传 COS，改用云函数分片上传方案，避免签名问题。

**经验总结**：
- TCB 的临时凭证主要用于客户端 SDK，不适合直接用于 HTTP PUT
- 大文件上传应该通过云函数中转，而不是直接上传到 COS

---

### 🐛 坑 2：云函数 6MB 请求体限制

**问题描述**：
尝试通过云函数直接上传 10.72MB 的 JS Bundle 文件，遇到 `read ECONNRESET` 错误。

**错误信息**：
```
Error: read ECONNRESET
```

**原因分析**：
云函数的请求体大小限制为 6MB（JSON 格式），超过限制会导致连接重置。

**解决方案**：
实现分片上传方案：
1. 将文件分割成多个 2MB 的分片
2. 每个分片 Base64 编码后约 2.67MB
3. 逐个上传分片到云存储
4. 在云函数中异步合并所有分片

**代码实现**：
```javascript
// 分片大小
const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB

// 分割文件
const totalChunks = Math.ceil(fileContent.length / CHUNK_SIZE);
for (let i = 0; i < totalChunks; i++) {
  const start = i * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, fileContent.length);
  const chunk = fileContent.slice(start, end);
  const chunkBase64 = chunk.toString('base64');
  
  // 上传分片
  await uploadChunk(uploadId, i, chunkBase64, totalChunks);
}
```

**经验总结**：
- 云函数有请求体大小限制，大文件必须分片上传
- 分片大小要合理设计，确保 Base64 编码后仍在限制内

---

### 🐛 坑 3：数据库数组序列化问题

**问题描述**：
合并任务中保存的 `chunkUrls` 数组，从数据库读取后变成空数组。

**错误信息**：
```
任务创建失败: 保存的任务中 chunkUrls 为空
```

**原因分析**：
腾讯云数据库对数组字段的支持有限，直接保存数组可能导致序列化问题。

**解决方案**：
将数组转换为 JSON 字符串保存：

```javascript
// 保存时
const taskData = {
  chunkUrlsJson: JSON.stringify(chunkUrls), // 转为 JSON 字符串
  // ...
};

// 读取时
let chunkUrls;
if (typeof task.chunkUrlsJson === 'string') {
  chunkUrls = JSON.parse(task.chunkUrlsJson);
} else if (Array.isArray(task.chunkUrls)) {
  chunkUrls = task.chunkUrls;
} else if (typeof task.chunkUrls === 'object') {
  // 处理对象格式（数据库可能将数组存储为对象）
  const keys = Object.keys(task.chunkUrls).sort((a, b) => parseInt(a) - parseInt(b));
  chunkUrls = keys.map(key => task.chunkUrls[key]);
}
```

**经验总结**：
- 数据库对复杂数据类型支持有限，数组建议转为 JSON 字符串
- 读取时要兼容多种格式（字符串、数组、对象）

---

### 🐛 坑 4：云函数路径解析问题

**问题描述**：
云函数收到请求路径为 `/-api/storage/upload-chunk`，导致路由匹配失败。

**错误信息**：
```
未知路径: /-api/storage/upload-chunk
```

**原因分析**：
腾讯云函数的路径格式特殊，函数名前缀和路径拼接时可能出现 `/-api/` 这样的格式。

**解决方案**：
完善路径解析逻辑：

```javascript
// 移除函数名前缀
if (path.startsWith(`/${functionName}`)) {
  path = path.replace(`/${functionName}`, '') || '/';
}

// 处理 -api 后缀
if (path.startsWith('/-api/')) {
  path = path.replace('/-api/', '/');
} else if (path === '/-api') {
  path = '/';
}

// 处理包含 -api/ 的情况
if (path.includes('-api/')) {
  path = path.replace(/-api\//g, '/');
}
```

**经验总结**：
- 云函数的路径格式可能因部署方式而异，需要兼容多种格式
- 添加详细的日志输出，方便调试路径解析问题

---

### 🐛 坑 5：合并任务状态查询问题

**问题描述**：
合并任务已完成，但查询状态时返回 `status: 'pending'`。

**错误信息**：
```
等待合并任务超时（已查询 3 次）
status: pending, progress: 0
```

**原因分析**：
1. 数据库返回的数据格式不一致（可能是数组 `[{...}]` 或对象 `{...}`）
2. 查询时没有正确处理数组格式

**解决方案**：
兼容多种数据格式：

```javascript
// 处理数据库返回的数据格式
let task;
if (Array.isArray(taskDoc.data)) {
  if (taskDoc.data.length === 0) {
    return { code: 404, message: '任务不存在' };
  }
  task = taskDoc.data[0]; // 取第一个元素
} else if (taskDoc.data) {
  task = taskDoc.data; // 直接使用
} else {
  return { code: 404, message: '任务不存在' };
}
```

**经验总结**：
- 数据库查询结果格式可能不一致，需要兼容处理
- 添加数据格式验证和日志输出

---

### 🐛 坑 6：异步任务执行问题

**问题描述**：
合并任务创建后，使用 `setTimeout` 异步执行，但任务没有被处理。

**错误信息**：
```
处理合并任务失败: 任务数据无效: chunkUrls 不存在
```

**原因分析**：
TCB 云函数在返回后，`setTimeout` 中的异步任务可能不会继续执行，导致合并任务没有被处理。

**解决方案**：
改为在云函数内部同步触发，但立即返回：

```javascript
// 异步处理合并任务，不等待完成
processMergeTask(taskId).catch(error => {
  console.error('异步处理失败:', error);
  // 更新任务状态为失败
  db.collection('merge_tasks').doc(taskId).update({
    status: 'failed',
    error: error.message,
  });
});

// 立即返回
return {
  code: 0,
  message: '合并任务处理已启动（异步执行）',
  data: { taskId },
};
```

**经验总结**：
- 云函数返回后，异步任务可能不会执行
- 应该在函数内部启动异步任务，但立即返回，不等待完成

---

### 🐛 坑 7：数据库 _id 字段问题

**问题描述**：
保存合并任务时，遇到 `Cannot update _id value` 错误。

**错误信息**：
```
Cannot update _id value
```

**原因分析**：
腾讯云数据库自动生成 `_id` 字段，不能手动设置。

**解决方案**：
移除 `_id` 字段，让数据库自动生成：

```javascript
// ❌ 错误
const taskData = {
  _id: taskId,  // 不能手动设置
  taskId: taskId,
  // ...
};

// ✅ 正确
const taskData = {
  taskId: taskId,  // 使用自定义字段
  // ...
};
```

**经验总结**：
- 数据库的 `_id` 字段是自动生成的，不能手动设置
- 如果需要自定义 ID，使用其他字段名（如 `taskId`）

---

### 🐛 坑 8：临时凭证使用问题

**问题描述**：
尝试使用 TCB 的 `getUploadMetadata` 返回的临时凭证直接上传到 COS，但签名验证失败。

**错误信息**：
```
SignatureDoesNotMatch
```

**原因分析**：
TCB 的 `getUploadMetadata` 返回的凭证格式特殊，主要用于客户端 SDK，不适合直接用于 HTTP PUT。

**解决方案**：
放弃直接上传方案，统一使用分片上传通过云函数中转。

**经验总结**：
- TCB 的临时凭证主要用于客户端 SDK
- 服务端上传应该通过云函数中转，而不是直接使用临时凭证

---

### 🐛 坑 9：版本号字段混淆

**问题描述**：
初始实现中，JS Bundle 更新和 APK 更新都使用 `versionCode`，导致版本号混淆。

**问题场景**：
- APK 版本：`versionCode = 2`
- JS Bundle 版本：`versionCode = 1`
- 用户更新 JS Bundle 后，`versionCode` 变成 1，导致系统认为需要更新 APK

**解决方案**：
引入独立的 `jsVersionCode`：

```javascript
// APK 版本管理
{
  versionCode: 2  // 从 app.json 读取
}

// JS Bundle 版本管理
{
  jsVersionCode: 1  // 独立管理，自动递增
}
```

**经验总结**：
- 不同类型的更新应该使用独立的版本号字段
- 避免版本号混淆，确保更新逻辑清晰

---

## 7. 完整代码实现

### 7.1 上传脚本核心代码

```javascript
// scripts/upload-js-bundle.js

// 分片上传
async function uploadInChunks(filePath, cloudPath, fileName) {
  const fileContent = fs.readFileSync(filePath);
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB
  const totalChunks = Math.ceil(fileContent.length / CHUNK_SIZE);
  
  // 上传所有分片
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileContent.length);
    const chunk = fileContent.slice(start, end);
    const chunkBase64 = chunk.toString('base64');
    
    await uploadChunk(uploadId, i, chunkBase64, totalChunks);
  }
  
  // 完成分片上传，创建合并任务
  const result = await completeChunkUpload(uploadId, totalChunks, cloudPath, fileName);
  
  // 触发合并任务处理
  await triggerMergeTask(result.taskId);
  
  // 等待合并任务完成
  await waitForMergeTask(result.taskId);
}
```

### 7.2 云函数核心代码

```javascript
// cloud-function/app-update/index.js

// 保存版本信息（自动递增 jsVersionCode）
async function handleStorageUploadFinish(method, path, body, headers) {
  const { version, platform, downloadUrl, filePath, fileSize } = body;
  
  // 查询当前最大 jsVersionCode
  const existingVersions = await collection
    .where({ platform: platform })
    .orderBy('jsVersionCode', 'desc')
    .limit(1)
    .get();
  
  let jsVersionCode = 1;
  if (existingVersions.data && existingVersions.data.length > 0) {
    jsVersionCode = existingVersions.data[0].jsVersionCode + 1;
  }
  
  // 保存版本记录
  await collection.add({
    version,
    jsVersionCode,
    platform,
    downloadUrl,
    filePath,
    fileSize,
    releaseDate: new Date().toISOString(),
  });
}

// 检查更新
async function handleJSBundleCheckUpdate(method, path, body, headers) {
  const currentJsVersionCode = parseInt(queryParams.get('jsVersionCode') || '0', 10);
  
  // 查询最新版本
  const versions = await versionsCollection
    .where({ platform: platform })
    .orderBy('jsVersionCode', 'desc')
    .limit(1)
    .get();
  
  const latestVersion = versions.data[0];
  const latestJsVersionCode = latestVersion.jsVersionCode;
  
  // 比较版本
  const hasUpdate = latestJsVersionCode > currentJsVersionCode;
  
  return {
    code: 0,
    data: {
      hasUpdate,
      latestJsVersionCode,
      downloadUrl: latestVersion.downloadUrl,
      // ...
    },
  };
}
```

### 7.3 客户端核心代码

```typescript
// services/js-bundle-update.service.ts

class JSBundleUpdateService {
  private currentJsVersionCode: number = 0;
  
  // 从本地存储加载 jsVersionCode
  private async loadJsVersionCode(): Promise<void> {
    const infoPath = `${FileSystem.documentDirectory}js_bundle_version_code.json`;
    const fileInfo = await FileSystem.getInfoAsync(infoPath);
    
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(infoPath);
      const data = JSON.parse(content);
      this.currentJsVersionCode = data.jsVersionCode || 0;
    }
  }
  
  // 检查更新
  async checkForUpdate(): Promise<JSBundleUpdateInfo> {
    await this.loadJsVersionCode();
    
    const response = await fetch(
      `${updateServiceUrl}/app/check-js-bundle-update?jsVersionCode=${this.currentJsVersionCode}&platform=${Platform.OS}`
    );
    
    const result = await response.json();
    return result.data;
  }
  
  // 应用更新
  async applyUpdate(bundlePath: string, latestJsVersionCode: number): Promise<void> {
    const ext = bundlePath.split('.').pop()?.toLowerCase();
    
    if (ext === 'js') {
      // 动态执行
      await this.runBundle(bundlePath);
      await this.saveJsVersionCode(latestJsVersionCode);
      Alert.alert('更新完成', '新版本已应用（无需重启）');
    } else if (ext === 'hbc') {
      // 保存更新信息
      await FileSystem.writeAsStringAsync(infoPath, JSON.stringify({
        bundlePath,
        jsVersionCode: latestJsVersionCode,
      }));
      await this.saveJsVersionCode(latestJsVersionCode);
      Alert.alert('更新下载完成', '下次重启后将应用新版本');
    }
  }
}
```

---

## 8. 总结与展望

### 8.1 核心要点总结

1. **分片上传**：解决云函数 6MB 限制，支持大文件上传
2. **异步合并**：避免云函数超时，提高用户体验
3. **独立版本管理**：使用 `jsVersionCode`，与 APK 版本分离
4. **自动递增**：上传时自动递增版本号，无需手动管理
5. **本地存储**：`jsVersionCode` 保存在本地，持久化更新状态
6. **仅手动更新**：用户完全控制，不会自动检查或下载

### 8.2 性能优化建议

1. **分片大小优化**：根据网络情况动态调整分片大小
2. **并发上传**：支持多个分片并发上传，提高速度
3. **断点续传**：支持下载中断后继续下载
4. **增量更新**：支持只下载变更部分，减少流量

### 8.3 安全性考虑

1. **文件校验**：下载后校验文件 MD5，确保完整性
2. **签名验证**：对 JS Bundle 进行签名，防止篡改
3. **权限控制**：上传和下载都需要 API Key 认证
4. **版本回滚**：支持回滚到之前的版本

### 8.4 未来改进方向

1. **增量更新**：只下载变更的代码块
2. **压缩优化**：使用更高效的压缩算法
3. **CDN 加速**：使用 CDN 加速文件下载
4. **灰度发布**：支持按用户比例逐步发布更新

---

## 📚 参考资料

- [腾讯云开发文档](https://cloud.tencent.com/document/product/876)
- [Expo FileSystem 文档](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [React Native 热更新方案对比](https://reactnative.dev/docs/upgrading)

---

## 💬 写在最后

自建 OTA 更新系统虽然实现复杂，但完全可控，可以根据业务需求灵活定制。在开发过程中，我们遇到了很多坑，但通过不断调试和优化，最终实现了一个稳定可靠的更新系统。

希望本文能帮助到正在实现类似功能的开发者，避免重复踩坑。如果遇到问题，欢迎在评论区交流讨论。

**如果觉得本文有帮助，请点赞、收藏、关注！** 👍

---

**作者**：[你的名字]  
**日期**：2025-01-11  
**版权声明**：本文为原创文章，转载请注明出处。


