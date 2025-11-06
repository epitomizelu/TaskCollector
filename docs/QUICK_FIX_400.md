# 🔧 快速修复 400 错误：缺少依赖模块

## 问题症状

如果看到以下错误：
```
HTTP 错误 (400) - Function code exception caught
Error: Cannot find module '@cloudbase/node-sdk'
```

这表示 **云函数缺少必需的依赖包**。

## 🚀 快速解决方案

### 方法一：在线编辑安装依赖（最快）

1. **登录腾讯云控制台**
   - 进入 [云开发控制台](https://console.cloud.tencent.com/tcb)
   - 找到你的云函数：`task-collection-api`

2. **在线编辑**
   - 点击函数名称进入详情页
   - 点击"在线编辑"或"函数代码"

3. **打开终端**
   - 在编辑页面，点击"终端"标签
   - 或使用快捷键打开终端

4. **安装依赖**
   ```bash
   npm install @cloudbase/node-sdk
   ```

5. **等待安装完成**
   - 看到 `added 1 package` 表示成功

6. **保存并部署**
   - 点击"保存"
   - 点击"部署"
   - 等待部署完成

### 方法二：本地上传（推荐用于生产环境）

#### 步骤 1：创建项目目录

```bash
# 创建云函数目录
mkdir task-collection-function
cd task-collection-function
```

#### 步骤 2：创建 package.json

创建 `package.json` 文件：

```json
{
  "name": "task-collection-api",
  "version": "1.0.0",
  "description": "任务收集应用后端 API",
  "main": "index.js",
  "dependencies": {
    "@cloudbase/node-sdk": "^2.5.0"
  }
}
```

#### 步骤 3：安装依赖

```bash
npm install
```

#### 步骤 4：创建 index.js

将 `docs/tencent-cloud-function-example.md` 中的完整代码复制到 `index.js`。

#### 步骤 5：打包

**Windows PowerShell:**
```powershell
Compress-Archive -Path .\* -DestinationPath ..\task-collection-function.zip
```

**重要：** 确保压缩包内直接是文件，不要多一层目录。

#### 步骤 6：上传

1. 在云函数控制台，点击"上传代码"
2. 选择"本地上传zip包"
3. 选择刚才创建的 zip 文件
4. 点击"上传并部署"

## ✅ 验证修复

### 1. 检查日志

1. 在云函数控制台，点击函数名称
2. 进入"日志"标签
3. 查看最新日志，应该没有错误

### 2. 测试调用

访问 `/test-api` 页面，点击"开始测试"。

如果仍然报错，检查：
- [ ] 依赖是否安装成功
- [ ] package.json 是否正确
- [ ] 代码是否完整

## 📝 检查清单

- [ ] `package.json` 中包含 `@cloudbase/node-sdk`
- [ ] 已执行 `npm install`
- [ ] `node_modules` 文件夹存在
- [ ] 已保存并部署代码
- [ ] 环境变量已配置（`TCB_ENV`, `API_KEY_1`）

## 🔗 相关文档

- [完整部署指南](./CLOUD_FUNCTION_DEPLOY.md)
- [云函数示例代码](./tencent-cloud-function-example.md)

## 💡 提示

如果在线编辑的终端无法使用，可以使用本地上传方式，这样可以更好地控制依赖安装过程。

