# 我爱背书模块云端存储方案

## 📋 数据存储架构

### 数据类型

1. **计划（Plan）** - 背诵计划
2. **任务（Task）** - 每日任务
3. **内容（Content）** - 音频和文档内容

### 存储策略

#### 文本数据（计划、任务、内容元数据）
- ✅ **直接存储到数据库**（MongoDB）
- ✅ 先保存本地，再同步云端
- ✅ 支持离线使用

#### 音频文件
- ✅ **上传到云存储**（腾讯云存储）
- ✅ 保存文件 URL 到数据库
- ✅ 文件存储在云存储，元数据在数据库

#### 文档文件
- ✅ **上传到云存储**（腾讯云存储）
- ✅ 保存文件 URL 到数据库
- ✅ 如果文档是文本格式，也可以直接存储文本内容

## 🚀 实现方案

### 方案一：使用腾讯云存储（推荐）

#### 1. 安装依赖

```bash
npm install @cloudbase/storage
```

#### 2. 配置云存储

在云函数中配置存储桶：

```javascript
const cloudbase = require('@cloudbase/node-sdk');
const app = cloudbase.init({
  env: process.env.TCB_ENV,
});

// 获取存储引用
const storage = app.storage();
```

#### 3. 前端上传文件

**创建文件上传服务：**

```typescript
// services/storage.service.ts
import { API_CONFIG } from '../config/api.config';

export class StorageService {
  /**
   * 上传文件到云存储
   */
  async uploadFile(
    fileUri: string,
    fileName: string,
    folder: string = 'reciting'
  ): Promise<string> {
    // 读取文件
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: 'audio/mpeg', // 或根据文件类型设置
      name: fileName,
    } as any);

    // 上传到云函数，由云函数转发到云存储
    const response = await fetch(`${API_CONFIG.BASE_URL}/storage/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_CONFIG.API_KEY}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    const result = await response.json();
    if (result.code === 0) {
      return result.data.fileUrl; // 返回文件 URL
    }
    throw new Error(result.message || '上传失败');
  }
}
```

#### 4. 云函数处理上传

在云函数中添加文件上传接口：

```javascript
// 处理文件上传
async function handleFileUpload(body, headers) {
  const { file, fileName, folder } = body;
  
  // 上传到云存储
  const storage = app.storage();
  const filePath = `${folder}/${Date.now()}_${fileName}`;
  
  const result = await storage.uploadFile({
    cloudPath: filePath,
    fileContent: file, // Base64 或 Buffer
  });
  
  return {
    code: 0,
    message: '上传成功',
    data: {
      fileUrl: result.fileID,
      filePath: filePath,
    },
  };
}
```

### 方案二：直接存储 Base64（小文件）

对于小文件（< 1MB），可以直接存储 Base64 编码：

```typescript
// 读取文件并转换为 Base64
const base64 = await FileSystem.readAsStringAsync(fileUri, {
  encoding: FileSystem.EncodingType.Base64,
});

// 存储到数据库
const contentData = {
  ...content,
  audioData: `data:audio/mpeg;base64,${base64}`, // Base64 编码
};
```

**注意：** 这种方式适合小文件，大文件建议使用云存储。

### 方案三：使用第三方存储服务

可以使用其他云存储服务：
- 阿里云 OSS
- 七牛云
- AWS S3

## 📝 数据结构

### 计划（Plan）

```typescript
interface RecitingPlan {
  id: string;
  title: string;
  content: string;
  contentId: string; // 关联的内容 ID
  period: number;
  startDate: string; // ISO 格式
  completedDate?: string;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  totalDays: number;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

### 任务（Task）

```typescript
interface RecitingTask {
  id: string;
  planId: string;
  title: string;
  description: string;
  type: 'recite' | 'review';
  date: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string;
  estimatedTime?: string;
  icon?: string;
  iconColor?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

### 内容（Content）

```typescript
interface RecitingContent {
  id: string;
  title: string;
  type: 'audio' | 'document';
  audioUrl?: string; // 云存储文件 URL
  documentUrl?: string; // 云存储文件 URL
  textContent?: string; // 文本内容（如果是文档）
  sentenceCount: number;
  uploadDate: string;
  status: 'completed' | 'learning' | 'not_started';
  fileSize?: number;
  mimeType?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

## 🔧 实现步骤

### 步骤 1：更新云函数

在云函数中添加新的接口：

```javascript
// 路由处理
if (path === '/reciting/plans' || path.startsWith('/reciting/plans')) {
  result = await handleRecitingPlans(method, path, body, headers);
} else if (path === '/reciting/tasks' || path.startsWith('/reciting/tasks')) {
  result = await handleRecitingTasks(method, path, body, headers);
} else if (path === '/reciting/contents' || path.startsWith('/reciting/contents')) {
  result = await handleRecitingContents(method, path, body, headers);
} else if (path === '/storage/upload' || path.startsWith('/storage/upload')) {
  result = await handleFileUpload(method, path, body, headers);
}
```

### 步骤 2：创建数据库集合

在云开发控制台创建以下集合：
- `reciting_plans` - 存储计划
- `reciting_tasks` - 存储任务
- `reciting_contents` - 存储内容元数据

### 步骤 3：配置云存储

1. 在云开发控制台，进入"云存储"
2. 创建存储桶（如果还没有）
3. 配置权限（允许上传和下载）

### 步骤 4：实现文件上传

参考 `services/reciting.service.ts` 中的 `uploadAudioFile` 和 `uploadDocumentFile` 方法。

## 📚 使用示例

### 创建计划

```typescript
import { recitingService } from './services/reciting.service';

const plan = await recitingService.createPlan({
  title: '英语单词背诵计划',
  content: '大学英语四级词汇',
  contentId: 'content_123',
  period: 30,
  startDate: new Date().toISOString(),
  status: 'active',
  progress: 0,
  totalDays: 30,
});
```

### 上传音频内容

```typescript
import { recitingService } from './services/reciting.service';

const content = await recitingService.createContent(
  {
    title: '英语单词 - 第3单元',
    type: 'audio',
    sentenceCount: 20,
    status: 'not_started',
    fileSize: 1024000, // 1MB
    mimeType: 'audio/mpeg',
  },
  'file:///path/to/audio.mp3' // 文件 URI
);
```

### 获取任务列表

```typescript
import { recitingService } from './services/reciting.service';

const today = new Date().toISOString().split('T')[0];
const tasks = await recitingService.getTasksByDate(today);
```

## ⚠️ 注意事项

### 1. 文件大小限制

- **音频文件**：建议限制在 50MB 以内
- **文档文件**：建议限制在 10MB 以内
- 大文件需要分片上传

### 2. 文件格式

- **音频**：mp3, wav, m4a 等
- **文档**：txt, pdf, doc, docx 等

### 3. 存储成本

- 云存储有免费额度
- 超出后按量付费
- 建议定期清理不需要的文件

### 4. 数据同步

- 文件上传后，元数据会同步到数据库
- 如果上传失败，本地仍保存元数据
- 可以稍后重试上传

## 🐛 故障排查

### 问题 1：文件上传失败

**检查：**
- 网络连接
- 文件大小
- 文件格式
- 云存储权限

### 问题 2：文件 URL 无效

**检查：**
- 文件是否成功上传
- URL 是否正确
- 云存储权限配置

### 问题 3：数据不同步

**检查：**
- API Key 是否配置
- 云函数是否正常
- 查看云函数日志

## 📚 相关文档

- [云端存储使用指南](./CLOUD_STORAGE_USAGE.md)
- [腾讯云配置指南](./TENCENT_CLOUD_SETUP.md)
- [云函数部署指南](./CLOUD_FUNCTION_DEPLOY.md)

## ✅ 下一步

1. 实现文件上传功能（使用云存储）
2. 更新云函数添加新的接口
3. 创建数据库集合
4. 测试数据同步功能

