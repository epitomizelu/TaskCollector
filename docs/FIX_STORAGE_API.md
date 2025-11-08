# 修复 app.storage is not a function 错误

## 问题描述

在云函数中使用 `app.storage()` 时遇到错误：
```
app.storage is not a function
```

## 根本原因

根据腾讯云开发官方文档，`app.storage()` 方法在 `@cloudbase/node-sdk` v3.0.0+ 中可用。如果使用的是 v2.x 版本，可能需要升级。

## 解决方案

### 1. 升级 @cloudbase/node-sdk 版本

**更新 `cloud-function/package.json`：**

```json
{
  "dependencies": {
    "@cloudbase/node-sdk": "^3.0.0"
  }
}
```

**注意：**
- v3.0.0+ 需要 Node.js v12.0 及以上版本
- 如果云函数环境使用 Node.js v10，需要使用 v2.x 版本

### 2. 检查云函数 Node.js 版本

在腾讯云函数控制台：
1. 进入云函数配置
2. 查看"运行环境"中的 Node.js 版本
3. 确保版本 >= 12.0（如果使用 v3.0.0+）

### 3. 检查环境变量配置

确保云函数的环境变量中配置了 `TCB_ENV`：
1. 在腾讯云函数控制台，进入云函数配置
2. 在"环境变量"中添加 `TCB_ENV`
3. 值为你的云开发环境 ID（例如：`cloud1-4gee45pq61cd6f19-1259499058`）

### 4. 验证初始化

根据官方文档，正确的初始化方式：

```javascript
const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发环境
const app = cloudbase.init({
  env: process.env.TCB_ENV || 'your-env-id',
});

// 获取存储实例
const storage = app.storage();
```

### 5. 重新部署云函数

修改代码和依赖后，需要重新部署：

```bash
cd cloud-function
npm install  # 安装新版本的 SDK
# 然后通过腾讯云控制台或 CLI 重新部署云函数
```

## 诊断步骤

如果问题仍然存在，`getStorage()` 函数会输出诊断信息：

1. **检查日志输出**：
   - `app` 对象的类型和可用方法
   - `cloudbase` 对象的类型和可用方法
   - `TCB_ENV` 环境变量的值
   - Node.js 版本

2. **验证初始化**：
   ```javascript
   console.log('app 对象:', typeof app);
   console.log('app 可用方法:', Object.keys(app || {}));
   console.log('app.storage 类型:', typeof app.storage);
   ```

3. **检查 SDK 版本**：
   ```bash
   cd cloud-function
   npm list @cloudbase/node-sdk
   ```

## 官方文档参考

- [Node.js SDK 介绍](https://docs.cloudbase.net/api-reference/server/node-sdk/introduction)
- [Node.js SDK 初始化](https://docs.cloudbase.net/api-reference/server/node-sdk/initialization)
- [Node.js SDK 云存储](https://docs.cloudbase.net/api-reference/server/node-sdk/storage)

## 相关文件

- `cloud-function/index.js` - 云函数主文件
- `cloud-function/package.json` - 依赖配置

## 更新日志

- 2025-01-06: 升级 `@cloudbase/node-sdk` 到 v3.0.0+
- 2025-01-06: 添加详细的诊断信息和错误提示

