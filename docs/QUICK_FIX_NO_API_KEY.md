# 🔧 快速修复：服务器未配置 API Key

## 问题症状

错误信息：
```
服务器未配置 API Key
```

这表示云函数环境变量中没有配置 `API_KEY_1` 或 `API_KEY_2`。

## 🚀 快速解决方案

### 步骤 1：登录腾讯云控制台

1. 访问 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)
2. 登录你的账号

### 步骤 2：进入云函数管理

1. 在左侧菜单选择"云函数"
2. 点击"函数管理"
3. 找到你的云函数：`task-collection-api`
4. 点击函数名称进入详情页

### 步骤 3：配置环境变量

1. 在函数详情页，点击"环境变量"标签
2. 点击"新增环境变量"按钮
3. 添加以下环境变量：

#### 环境变量 1：API_KEY_1

- **变量名：** `API_KEY_1`
- **变量值：** 你的实际 API Key（例如：`a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`）
- **描述：** 用于验证 API 请求的密钥

**重要提示：**
- API Key 应该是一个强随机字符串（建议 32 位以上）
- 不要包含空格、引号、换行符
- 这个值需要与前端 `.env` 文件中的 `EXPO_PUBLIC_API_KEY` **完全一致**

#### 环境变量 2：TCB_ENV（如果还没有配置）

- **变量名：** `TCB_ENV`
- **变量值：** 你的云开发环境 ID（例如：`cloud1-4gee45pq61cd6f19`）
- **描述：** 云开发环境标识

**如何获取环境 ID：**
- 在云开发控制台首页可以看到环境 ID
- 格式类似：`cloud1-xxxxx` 或 `env-xxxxx`

### 步骤 4：保存并等待生效

1. 点击"保存"按钮
2. 等待几秒钟让配置生效
3. **重要：** 环境变量配置后，云函数会自动重新部署

### 步骤 5：验证配置

1. 在云函数控制台，查看"环境变量"列表
2. 确认看到：
   - ✅ `API_KEY_1` = `你的API Key值`
   - ✅ `TCB_ENV` = `你的环境ID`

**注意：** 环境变量的值会被隐藏显示（显示为 `****`），这是正常的安全措施。

### 步骤 6：测试

1. 访问前端测试页面 `/test-api`
2. 点击"开始测试"
3. 查看云函数日志，应该看到：
   ```
   验证 API Key: {
     validApiKeysCount: 1,  // ✅ 应该是 1 或更多
     validApiKeysPrefix: ['xxxxxxxx...']
   }
   ```

## 📝 生成 API Key

如果你还没有 API Key，可以使用以下方法生成：

### 方法一：使用在线工具

访问 [随机字符串生成器](https://www.random.org/strings/)：
- 长度：32-64 字符
- 字符集：数字 + 字母（大小写）
- 生成后复制保存

### 方法二：使用命令行

**Windows PowerShell:**
```powershell
# 生成 32 位随机字符串
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**Linux/Mac:**
```bash
# 生成 32 位随机字符串
openssl rand -hex 16
# 或
cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
```

### 方法三：使用 Node.js

```javascript
// 在 Node.js 中运行
const crypto = require('crypto');
const apiKey = crypto.randomBytes(32).toString('hex');
console.log('API Key:', apiKey);
```

## 🔄 同步前后端配置

配置好云函数的 API Key 后，需要同步到前端：

### 步骤 1：创建或编辑 `.env` 文件

在项目根目录创建或编辑 `.env` 文件：

```env
EXPO_PUBLIC_API_KEY=你的API Key值（与云函数中的API_KEY_1完全一致）
```

**重要：**
- 不要包含引号
- 不要有空格
- 值与云函数环境变量中的 `API_KEY_1` **完全一致**

### 步骤 2：重启开发服务器

修改 `.env` 文件后，**必须**重启开发服务器：

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
npm start
# 或
npx expo start --web
```

### 步骤 3：验证前端配置

在浏览器控制台运行：

```javascript
console.log('API Key:', process.env.EXPO_PUBLIC_API_KEY);
```

应该显示你配置的 API Key 值（可能会显示为 `undefined`，如果未重启服务器）。

## ✅ 检查清单

配置完成后，确认以下各项：

- [ ] 云函数环境变量 `API_KEY_1` 已配置
- [ ] 云函数环境变量 `TCB_ENV` 已配置
- [ ] 前端 `.env` 文件已创建
- [ ] `.env` 文件中的 `EXPO_PUBLIC_API_KEY` 与云函数中的 `API_KEY_1` 完全一致
- [ ] 已重启前端开发服务器
- [ ] 测试接口可以正常调用（不再是 401 错误）

## 🐛 常见问题

### Q1: 环境变量保存后仍然报错

**原因：** 可能需要等待几秒钟让配置生效，或者云函数需要重新部署。

**解决：**
1. 等待 10-20 秒
2. 在云函数控制台，点击"部署"按钮（如果可用）
3. 重新测试

### Q2: 不知道环境 ID 是什么

**解决：**
1. 在云开发控制台首页
2. 查看"环境 ID"或"环境名称"
3. 格式通常是：`cloud1-xxxxx` 或 `env-xxxxx`
4. 如果找不到，可以尝试在云函数代码中打印：`console.log('TCB_ENV:', process.env.TCB_ENV)`

### Q3: API Key 值太长或太短

**建议：**
- 长度：32-64 字符
- 字符：数字 + 字母（大小写）
- 避免使用特殊字符（可能在某些地方有问题）

### Q4: 环境变量值显示为 `****`

**说明：** 这是正常的安全措施，云函数会隐藏敏感值。

**验证方法：**
1. 查看云函数日志中的调试输出
2. 应该看到 `validApiKeysCount: 1` 或更多
3. 如果看到 `validApiKeysCount: 0`，说明配置未生效

## 📚 相关文档

- [API Key 设置指南](./API_KEY_SETUP.md)
- [环境变量配置指南](./ENV_VARIABLES_GUIDE.md)
- [快速修复 401 错误](./QUICK_FIX_401.md)

## 💡 安全建议

1. **不要提交 `.env` 文件到 Git**
   - 确保 `.gitignore` 中包含 `.env`

2. **定期更换 API Key**
   - 如果 API Key 泄露，立即更换

3. **不同环境使用不同的 API Key**
   - 开发环境：使用开发用的 API Key
   - 生产环境：使用生产用的 API Key

4. **使用强随机字符串**
   - 避免使用简单、可预测的字符串

完成以上步骤后，"服务器未配置 API Key" 错误应该可以解决！

