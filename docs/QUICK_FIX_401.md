# 🔧 快速修复 401 认证错误

## 问题症状

如果看到以下错误：
```
API Request Error: Error: HTTP error! status: 401
```

这表示 **API Key 认证失败**。

## 🚀 快速解决步骤

### 步骤 1：创建 `.env` 文件

在项目根目录创建 `.env` 文件：

**Windows PowerShell:**
```powershell
New-Item -Path .env -ItemType File
```

**或者手动创建：**
在项目根目录（`task_collection` 文件夹）创建一个名为 `.env` 的文件（注意前面有个点）

### 步骤 2：配置 API Key

编辑 `.env` 文件，添加以下内容：

```env
EXPO_PUBLIC_API_KEY=your-actual-api-key-here
```

**重要提示：**
- 将 `your-actual-api-key-here` 替换为你在腾讯云函数中配置的实际 API Key
- 不要包含引号
- 不要有空格
- 确保 API Key 与云函数环境变量中的值完全一致

### 步骤 3：重启开发服务器

**必须重启** Expo 开发服务器才能加载新的环境变量：

1. 停止当前服务器（按 `Ctrl+C`）
2. 重新启动：
   ```bash
   npm start
   # 或
   npx expo start --web
   ```

### 步骤 4：验证配置

访问测试页面 `/test-api`，查看：
- ✅ **API Key** 是否显示为已配置（会显示前8位和后4位）
- ✅ **测试结果** 是否通过

## 🔍 检查清单

如果仍然遇到 401 错误，请检查：

### 1. API Key 是否正确配置

在测试页面 `/test-api` 中查看：
- 如果显示 "⚠️ 未配置"，说明 `.env` 文件未创建或未正确读取
- 如果显示已配置，检查 API Key 值是否正确

### 2. 云函数端配置

确保云函数的环境变量中已设置：
- `API_KEY_1=your-api-key-here`
- 或者 `API_KEY_2=your-api-key-here`

### 3. 环境变量格式

确保 `.env` 文件格式正确：
```env
# ✅ 正确
EXPO_PUBLIC_API_KEY=abc123def456

# ❌ 错误（有引号）
EXPO_PUBLIC_API_KEY="abc123def456"

# ❌ 错误（有空格）
EXPO_PUBLIC_API_KEY = abc123def456

# ❌ 错误（缺少 EXPO_PUBLIC_ 前缀）
API_KEY=abc123def456
```

### 4. 文件位置

确保 `.env` 文件在项目根目录：
```
task_collection/
├── .env          ← 应该在这里
├── app/
├── config/
├── services/
└── ...
```

### 5. 重启服务器

修改 `.env` 文件后，**必须**重启开发服务器才能生效。

## 🧪 测试方法

### 方法一：使用测试页面

1. 访问 `/test-api` 页面
2. 点击"开始测试"按钮
3. 查看测试结果

### 方法二：浏览器控制台

打开浏览器开发者工具（F12），在控制台运行：

```javascript
// 检查环境变量
console.log('API Key:', process.env.EXPO_PUBLIC_API_KEY);

// 检查配置
import { API_CONFIG } from './config/api.config';
console.log('API Key 已配置:', !!API_CONFIG.API_KEY);
```

### 方法三：查看网络请求

在浏览器开发者工具的 **Network** 标签中：
1. 刷新页面并触发 API 请求
2. 找到失败的请求
3. 查看 **Request Headers**：
   ```
   Authorization: Bearer your-api-key-here
   ```
4. 确认 Authorization 头是否存在且值正确

## 📝 常见问题

### Q1: 为什么 `.env` 文件没有生效？

**A:** Expo 需要在启动时读取环境变量。修改 `.env` 后必须重启开发服务器。

### Q2: 如何确认 API Key 值是否正确？

**A:** 
1. 登录腾讯云控制台
2. 进入云函数环境变量配置
3. 查看 `API_KEY_1` 或 `API_KEY_2` 的值
4. 确保 `.env` 文件中的值与之一致

### Q3: 可以设置多个 API Key 吗？

**A:** 可以。在云函数中设置多个环境变量（如 `API_KEY_1`, `API_KEY_2`），前端使用其中一个即可。

### Q4: 开发和生产环境使用不同的 API Key？

**A:** 可以创建不同的环境文件：
- `.env.development` - 开发环境
- `.env.production` - 生产环境

然后在启动时指定环境。

## 🔗 相关文档

- [环境变量配置指南](./ENV_VARIABLES_GUIDE.md)
- [API Key 设置指南](./API_KEY_SETUP.md)
- [腾讯云配置指南](./TENCENT_CLOUD_SETUP.md)

## ✅ 成功标志

配置成功后，你应该看到：
- ✅ 测试页面显示 API Key 已配置
- ✅ 所有测试通过（绿色对勾）
- ✅ 可以正常获取任务列表
- ✅ 可以正常创建任务

如果按照以上步骤操作后仍然遇到问题，请检查：
1. 云函数是否已部署
2. 云函数地址是否正确
3. 网络连接是否正常

