# 我爱背书模块云函数迁移指南

## 概述

已将"我爱背书"模块的所有逻辑从主云函数 (`task-collection-api`) 迁移到独立的云函数 (`ilove-reciting-api`)。

## 迁移步骤

### 1. 部署新云函数

1. 在腾讯云开发控制台创建新云函数 `ilove-reciting-api`
2. 上传 `cloud-function/ilove-reciting/` 目录下的所有文件
3. 配置环境变量（与主云函数相同）

### 2. 更新前端 API 配置

如果需要使用新的独立云函数，需要更新前端配置：

**选项 A：使用独立云函数（推荐）**

在 `config/api.config.ts` 中添加新的配置：

```typescript
export const API_CONFIG = {
  // 主云函数地址
  BASE_URL: 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api',
  
  // 我爱背书模块云函数地址（新增）
  RECITING_BASE_URL: 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/ilove-reciting-api',
  
  // ... 其他配置
};
```

然后更新 `services/api.service.ts`，将"我爱背书"相关的 API 调用指向新云函数。

**选项 B：继续使用主云函数**

如果主云函数中仍然保留相关代码，则无需修改前端配置。

### 3. 从主云函数移除相关代码（可选）

如果确定使用独立云函数，可以从主云函数 (`cloud-function/index.js`) 中移除以下内容：

1. 路由处理中的"我爱背书"相关路由（约第 180-189 行）
2. 音频处理相关路由（约第 228-236 行）
3. 所有"我爱背书"相关的处理函数：
   - `handleRecitingPlans`
   - `handleRecitingTasks`
   - `handleRecitingContents`
   - `handleAudioProcess`
   - `handleAudioStatus`
   - `processAudioAsync`
   - `splitIntoSentences`
   - `splitAudio`
   - `handleMessages`
   - `createMessage`

### 4. 配置 API 网关（可选）

如果需要通过统一的 API 网关访问，可以：

1. 在 API 网关中配置路由规则
2. 将 `/reciting/*` 和 `/messages/*` 路由到新云函数
3. 其他路由继续指向主云函数

## 优势

使用独立云函数的好处：

1. **代码分离**：模块化，便于维护
2. **独立部署**：可以单独更新"我爱背书"模块，不影响其他功能
3. **资源隔离**：可以单独配置内存、超时时间等
4. **扩展性**：未来可以轻松添加更多功能

## 注意事项

1. **数据库集合**：两个云函数使用相同的数据库集合，确保环境变量 `TCB_ENV` 一致
2. **API Key**：两个云函数使用相同的 API Key 配置
3. **向后兼容**：如果主云函数中仍保留代码，两个云函数都可以处理请求（需要避免冲突）

## 回滚方案

如果需要回滚到主云函数：

1. 确保主云函数中相关代码未被删除
2. 恢复前端 API 配置，使用主云函数地址
3. 删除或停用新云函数

