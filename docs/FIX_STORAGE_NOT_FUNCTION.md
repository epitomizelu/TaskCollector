# 修复 app.storage is not a function 错误

## 问题描述

在云函数中使用 `app.storage()` 时遇到错误：
```
app.storage is not a function
```

## 可能的原因

1. **@cloudbase/node-sdk 版本问题**：不同版本的 SDK 可能有不同的 API
2. **初始化问题**：云开发环境未正确初始化
3. **环境变量问题**：`TCB_ENV` 环境变量未正确配置

## 解决方案

### 1. 检查 @cloudbase/node-sdk 版本

查看 `cloud-function/package.json`：
```json
{
  "dependencies": {
    "@cloudbase/node-sdk": "^2.5.0"
  }
}
```

### 2. 检查环境变量

确保云函数的环境变量中配置了 `TCB_ENV`：
- 在腾讯云函数控制台，进入云函数配置
- 在"环境变量"中添加 `TCB_ENV`，值为你的云开发环境 ID

### 3. 使用统一的存储获取方法

已添加 `getStorage()` 辅助函数，支持多种方式获取存储实例：

```javascript
function getStorage() {
  try {
    // 方法1: 使用 app.storage()
    if (typeof app.storage === 'function') {
      return app.storage();
    }
    
    // 方法2: 尝试直接访问 storage 属性
    if (app.storage && typeof app.storage.uploadFile === 'function') {
      return app.storage;
    }
    
    // 方法3: 尝试使用 cloudbase.storage
    if (cloudbase.storage && typeof cloudbase.storage === 'function') {
      return cloudbase.storage();
    }
    
    throw new Error('无法获取存储实例：app.storage 不是函数');
  } catch (error) {
    console.error('获取存储实例失败:', error);
    console.error('app 对象:', typeof app, Object.keys(app || {}));
    console.error('cloudbase 对象:', typeof cloudbase, Object.keys(cloudbase || {}));
    throw error;
  }
}
```

### 4. 更新云函数代码

所有使用 `app.storage()` 的地方都已更新为使用 `getStorage()`：

```javascript
// 之前
const storage = app.storage();

// 现在
const storage = getStorage();
```

## 验证步骤

1. **检查云函数日志**：
   - 查看云函数执行日志
   - 确认是否有 `app.storage is not a function` 错误
   - 查看 `getStorage()` 函数的诊断信息

2. **测试上传功能**：
   ```bash
   export EXPO_PUBLIC_API_KEY=your-api-key
   node scripts/test-storage-upload-download.js test-small-file.txt
   ```

3. **检查环境变量**：
   - 确认 `TCB_ENV` 已正确配置
   - 确认云开发环境 ID 正确

## 如果问题仍然存在

### 检查 @cloudbase/node-sdk 文档

查看腾讯云开发官方文档，确认正确的 API 用法：
- [腾讯云开发 Node.js SDK 文档](https://docs.cloudbase.net/api-reference/server/node-sdk/introduction.html)

### 可能的替代方案

如果 `app.storage()` 确实不可用，可能需要：

1. **升级 @cloudbase/node-sdk**：
   ```bash
   cd cloud-function
   npm install @cloudbase/node-sdk@latest
   ```

2. **使用其他方式访问存储**：
   - 检查是否有其他 API 可以访问云存储
   - 考虑使用腾讯云 COS SDK 直接访问存储

3. **检查云函数配置**：
   - 确认云函数已正确关联云开发环境
   - 确认云存储权限已正确配置

## 相关文件

- `cloud-function/index.js` - 云函数主文件
- `cloud-function/package.json` - 依赖配置
- `scripts/test-storage-upload-download.js` - 测试脚本

## 更新日志

- 2025-01-06: 添加 `getStorage()` 辅助函数，支持多种方式获取存储实例
- 2025-01-06: 更新所有存储相关代码使用统一的获取方法

