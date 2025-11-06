# 我爱背书模块云端存储快速开始

## 🎯 核心方案

### 文本数据
- ✅ **直接存储到数据库** - 计划、任务、内容元数据
- ✅ 使用 `reciting.service.ts` 自动同步
- ✅ 配置了 API Key 后自动生效

### 音频文件
- ✅ **方案 1：上传到云存储（推荐）** - 保存文件 URL
- ✅ **方案 2：小文件 Base64** - 直接存储到数据库（< 1MB）

### 文档文件
- ✅ **方案 1：上传到云存储（推荐）** - 保存文件 URL  
- ✅ **方案 2：文本内容直接存储** - 如果是纯文本，直接存数据库

## 📋 数据结构总结

### 1. 计划（Plan）
```typescript
{
  id: string;
  title: string;
  content: string;
  contentId: string;
  period: number;
  startDate: string;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  // ... 其他字段
}
```
**存储方式：** 直接存储到数据库

### 2. 任务（Task）
```typescript
{
  id: string;
  planId: string;
  title: string;
  description: string;
  type: 'recite' | 'review';
  date: string;
  completed: boolean;
  // ... 其他字段
}
```
**存储方式：** 直接存储到数据库

### 3. 内容（Content）
```typescript
{
  id: string;
  title: string;
  type: 'audio' | 'document';
  audioUrl?: string;        // 音频文件 URL（云存储地址）
  documentUrl?: string;      // 文档文件 URL（云存储地址）
  textContent?: string;      // 文本内容（如果是文档）
  sentenceCount: number;
  // ... 其他字段
}
```
**存储方式：**
- 元数据：存储到数据库
- 音频文件：上传到云存储，保存 URL
- 文档文件：上传到云存储，或直接存储文本内容

## 🚀 快速实现步骤

### 步骤 1：使用现有的 reciting.service.ts

已创建 `services/reciting.service.ts`，包含：
- ✅ 计划管理（创建、更新、删除）
- ✅ 任务管理（创建、更新、查询）
- ✅ 内容管理（创建、删除）
- ✅ 自动本地/云端同步

### 步骤 2：实现音频文件上传

#### 选项 A：使用腾讯云存储（推荐）

1. **安装依赖（如果需要）**
   ```bash
   npm install expo-file-system
   ```

2. **创建文件上传服务**
   参考 `docs/ILOVE_RECITING_CLOUD_STORAGE.md` 中的实现

3. **更新 `reciting.service.ts` 中的 `uploadAudioFile` 方法**

#### 选项 B：小文件 Base64（临时方案）

对于小音频文件（< 1MB），可以临时使用 Base64：

```typescript
import * as FileSystem from 'expo-file-system';

async uploadAudioFile(fileUri: string, fileName: string): Promise<string> {
  // 读取文件为 Base64
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  // 存储到数据库的 textContent 字段
  // 格式：data:audio/mpeg;base64,{base64字符串}
  return `data:audio/mpeg;base64,${base64}`;
}
```

**注意：** 这种方式只适合小文件，大文件建议使用云存储。

### 步骤 3：更新云函数

在 `docs/tencent-cloud-function-example.md` 中添加新的路由：

```javascript
// 处理我爱背书模块的请求
if (path === '/reciting/plans' || path.startsWith('/reciting/plans')) {
  result = await handleRecitingPlans(method, path, body, headers);
} else if (path === '/reciting/tasks' || path.startsWith('/reciting/tasks')) {
  result = await handleRecitingTasks(method, path, body, headers);
} else if (path === '/reciting/contents' || path.startsWith('/reciting/contents')) {
  result = await handleRecitingContents(method, path, body, headers);
}
```

### 步骤 4：创建数据库集合

在云开发控制台创建：
- `reciting_plans`
- `reciting_tasks`
- `reciting_contents`

## 💡 使用示例

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
// 如果使用云存储
const content = await recitingService.createContent(
  {
    title: '英语单词 - 第3单元',
    type: 'audio',
    sentenceCount: 20,
    status: 'not_started',
    fileSize: 1024000,
    mimeType: 'audio/mpeg',
  },
  'file:///path/to/audio.mp3' // 文件 URI
);

// content.audioUrl 会包含云存储的文件 URL
```

### 获取今日任务

```typescript
const today = new Date().toISOString().split('T')[0];
const tasks = await recitingService.getTasksByDate(today);
```

## ✅ 当前状态

### 已完成
- ✅ `reciting.service.ts` 数据服务层
- ✅ 本地存储逻辑
- ✅ 云端同步框架
- ✅ 数据结构定义

### 待实现
- ⏳ 音频文件上传到云存储
- ⏳ 文档文件上传到云存储
- ⏳ 云函数接口实现
- ⏳ 数据库集合创建

## 📚 详细文档

- [完整云端存储方案](./ILOVE_RECITING_CLOUD_STORAGE.md)
- [云端存储使用指南](./CLOUD_STORAGE_USAGE.md)
- [云函数部署指南](./CLOUD_FUNCTION_DEPLOY.md)

## 🎯 推荐方案

对于音频和文档文件：

1. **小文件（< 1MB）**：使用 Base64 直接存储到数据库（临时方案）
2. **大文件（> 1MB）**：上传到云存储，保存文件 URL（推荐方案）

这样可以：
- ✅ 快速实现功能
- ✅ 小文件不占用云存储空间
- ✅ 大文件使用云存储，性能更好
- ✅ 支持文件下载和播放

现在可以开始使用 `recitingService` 来管理数据了！

