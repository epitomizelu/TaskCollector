# 调试 app.storage is not a function 错误

## 问题现象

上传文件时遇到错误：
```
无法获取存储实例：app.storage 不是函数
```

## 诊断步骤

### 1. 查看云函数日志

在腾讯云函数控制台：
1. 进入云函数详情页
2. 点击"日志查询"
3. 查看最新的执行日志
4. 查找包含"存储实例诊断信息"的日志条目

诊断信息会包含：
- `appType`: app 对象的类型
- `appMethods`: app 对象的所有可用方法
- `cloudbaseType`: cloudbase 对象的类型
- `cloudbaseMethods`: cloudbase 对象的所有可用方法
- `tcbEnv`: TCB_ENV 环境变量的值
- `nodeVersion`: Node.js 版本
- `appStorageType`: app.storage 的类型
- `hasStorage`: app 对象是否包含 storage 属性

### 2. 检查诊断信息

根据诊断信息，可以判断问题原因：

#### 情况 A: `appMethods` 中不包含 `storage`

**可能原因：**
- `@cloudbase/node-sdk` 版本过低（< v3.0.0）
- 云函数未重新部署，仍在使用旧版本

**解决方案：**
1. 确认 `cloud-function/package.json` 中版本为 `^3.0.0`
2. 在云函数目录运行 `npm install`
3. **重新部署云函数**（重要！）

#### 情况 B: `tcbEnv` 为空或 `your-env-id`

**可能原因：**
- 环境变量 `TCB_ENV` 未配置

**解决方案：**
1. 在腾讯云函数控制台
2. 进入云函数配置
3. 在"环境变量"中添加 `TCB_ENV`
4. 值为你的云开发环境 ID（例如：`cloud1-4gee45pq61cd6f19-1259499058`）
5. 保存并重新部署

#### 情况 C: `nodeVersion` 显示版本 < 12.0

**可能原因：**
- 云函数的 Node.js 运行环境版本过低

**解决方案：**
1. 在腾讯云函数控制台
2. 进入云函数配置
3. 修改"运行环境"为 Node.js 12.0 或更高版本
4. 保存并重新部署

#### 情况 D: `appStorageType` 为 `undefined`

**可能原因：**
- SDK 初始化失败
- 云函数未正确关联云开发环境

**解决方案：**
1. 检查云函数是否已关联云开发环境
2. 确认云开发环境 ID 正确
3. 尝试重新关联云开发环境

## 重新部署云函数

### 方法一：通过控制台上传

1. 在云函数目录运行：
   ```bash
   cd cloud-function
   npm install
   ```

2. 打包云函数代码：
   ```bash
   # Windows
   tar -czf function.zip index.js package.json node_modules
   
   # Linux/Mac
   tar -czf function.tar.gz index.js package.json node_modules
   ```

3. 在腾讯云函数控制台：
   - 进入云函数详情
   - 点击"上传代码"
   - 选择打包好的文件
   - 点击"部署"

### 方法二：通过 CLI 部署

如果使用腾讯云 CLI：
```bash
cd cloud-function
npm install
# 使用 tcb CLI 或其他部署工具
```

## 验证修复

重新部署后，再次运行测试：

```bash
export EXPO_PUBLIC_API_KEY=your-api-key
node scripts/test-storage-upload-download.js test-small-file.txt
```

如果仍然失败，查看云函数日志中的诊断信息，根据上述情况对号入座。

## 常见问题

### Q: 为什么修改了 package.json 后还是报错？

A: **必须重新部署云函数**，修改本地文件不会自动更新云函数代码。需要：
1. 运行 `npm install` 安装新依赖
2. 重新部署云函数代码

### Q: 如何确认云函数使用的是哪个版本的 SDK？

A: 在云函数代码中添加：
```javascript
console.log('@cloudbase/node-sdk 版本:', require('@cloudbase/node-sdk/package.json').version);
```

### Q: 云函数日志在哪里查看？

A: 在腾讯云函数控制台：
1. 进入云函数详情页
2. 点击"日志查询"标签
3. 查看"执行日志"

## 相关文件

- `cloud-function/index.js` - 云函数主文件（包含诊断代码）
- `cloud-function/package.json` - 依赖配置
- `docs/FIX_STORAGE_API.md` - 修复方案文档

