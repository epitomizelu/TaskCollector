# 环境变量配置指南

本指南详细说明如何在项目中配置和使用环境变量（特别是 API Key）。

## 📋 目录

- [Expo 项目环境变量](#expo-项目环境变量)
- [配置步骤](#配置步骤)
- [不同环境的配置](#不同环境的配置)
- [使用方法](#使用方法)
- [验证配置](#验证配置)
- [常见问题](#常见问题)

## 🚀 Expo 项目环境变量

### Expo 环境变量规则

在 Expo 项目中，环境变量需要以 `EXPO_PUBLIC_` 前缀开头才能在客户端代码中访问。

**格式：**
```
EXPO_PUBLIC_VARIABLE_NAME=value
```

## 📝 配置步骤

### 第一步：创建 `.env` 文件

在项目根目录创建 `.env` 文件：

```bash
# 在项目根目录执行
touch .env
```

### 第二步：配置 API Key

编辑 `.env` 文件，添加以下内容：

```env
# 腾讯云函数 API Key
EXPO_PUBLIC_API_KEY=your-api-key-here

# 可选：云函数地址（如果需要在环境变量中配置）
# EXPO_PUBLIC_API_BASE_URL=https://your-region.apigw.tencentcs.com/release/task-collection-api
```

**重要提示：**
- 将 `your-api-key-here` 替换为你的实际 API Key
- 不要包含引号
- 不要有空格

### 第三步：重启开发服务器

配置环境变量后，需要重启 Expo 开发服务器：

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
npm start
# 或
expo start
```

### 第四步：验证配置

在代码中验证环境变量是否正确读取：

```typescript
// 在任意文件中测试
console.log('API Key:', process.env.EXPO_PUBLIC_API_KEY);
```

## 🔄 不同环境的配置

### 开发环境

创建 `.env.development` 文件：

```env
# 开发环境 API Key
EXPO_PUBLIC_API_KEY=dev-api-key-here

# 开发环境云函数地址
EXPO_PUBLIC_API_BASE_URL=https://dev-cloud-function-url
```

### 生产环境

创建 `.env.production` 文件：

```env
# 生产环境 API Key
EXPO_PUBLIC_API_KEY=prod-api-key-here

# 生产环境云函数地址
EXPO_PUBLIC_API_BASE_URL=https://prod-cloud-function-url
```

### 使用不同环境

```bash
# 开发环境
EXPO_PUBLIC_ENV=development npm start

# 生产环境
EXPO_PUBLIC_ENV=production npm start
```

## 💻 使用方法

### 方法一：自动读取（推荐）

环境变量会自动从 `config/api.config.ts` 中读取：

```typescript
// config/api.config.ts 已经配置了自动读取
export const API_CONFIG = {
  API_KEY: process.env.EXPO_PUBLIC_API_KEY || '',
};
```

代码中会自动使用：

```typescript
import { apiService } from './services/api.service';

// 不需要手动设置，会自动使用环境变量中的 API Key
const tasks = await apiService.getAllTasks();
```

### 方法二：手动设置

如果需要动态设置或在运行时更改：

```typescript
import { apiService } from './services/api.service';

// 从环境变量读取
const apiKey = process.env.EXPO_PUBLIC_API_KEY;
if (apiKey) {
  apiService.setToken(apiKey);
}

// 或者直接设置
apiService.setToken('your-api-key-here');
```

### 方法三：在应用启动时设置

在应用入口文件中设置（如 `app/_layout.tsx`）：

```typescript
import { useEffect } from 'react';
import { apiService } from '../services/api.service';

export default function RootLayout() {
  useEffect(() => {
    // 应用启动时自动设置 API Key
    const apiKey = process.env.EXPO_PUBLIC_API_KEY;
    if (apiKey) {
      apiService.setToken(apiKey);
      console.log('API Key 已设置');
    } else {
      console.warn('未找到 API Key，请检查 .env 文件');
    }
  }, []);

  // ... 其他代码
}
```

## ✅ 验证配置

### 1. 检查环境变量是否读取

在浏览器控制台或终端中查看：

```typescript
console.log('API Key:', process.env.EXPO_PUBLIC_API_KEY);
console.log('Base URL:', process.env.EXPO_PUBLIC_API_BASE_URL);
```

### 2. 测试 API 请求

```typescript
import { apiService } from './services/api.service';

// 测试获取任务列表
try {
  const tasks = await apiService.getAllTasks();
  console.log('✅ API Key 配置成功！', tasks);
} catch (error) {
  console.error('❌ API Key 配置失败:', error);
}
```

### 3. 查看网络请求

在浏览器开发者工具的 Network 标签中，查看请求头：

```
Authorization: Bearer your-api-key-here
```

## 🔒 安全注意事项

### 1. `.gitignore` 配置

确保 `.env` 文件已添加到 `.gitignore`：

```gitignore
# 环境变量文件
.env
.env.local
.env.*.local
```

### 2. 不要提交敏感信息

- ❌ 不要将 `.env` 文件提交到 Git
- ✅ 可以提交 `.env.example` 作为模板
- ✅ 在团队中通过安全方式共享 API Key

### 3. 不同环境使用不同 Key

- 开发环境：使用开发用的 API Key
- 生产环境：使用生产用的 API Key
- 定期更换 API Key

## 📁 文件结构示例

```
project-root/
├── .env                    # 本地环境变量（不提交到Git）
├── .env.example            # 环境变量模板（提交到Git）
├── .env.development        # 开发环境变量（可选）
├── .env.production         # 生产环境变量（可选）
├── .gitignore             # 已包含 .env
├── config/
│   └── api.config.ts      # 自动读取环境变量
└── ...
```

## 🐛 常见问题

### 问题1：环境变量读取不到

**原因：**
- 变量名没有 `EXPO_PUBLIC_` 前缀
- 没有重启开发服务器
- `.env` 文件位置不对

**解决方法：**
1. 确认变量名以 `EXPO_PUBLIC_` 开头
2. 重启 Expo 开发服务器
3. 确认 `.env` 文件在项目根目录

### 问题2：环境变量值为 undefined

**原因：**
- 环境变量未设置
- 拼写错误

**解决方法：**
```typescript
// 检查环境变量
console.log(process.env);

// 确认变量名正确
console.log(process.env.EXPO_PUBLIC_API_KEY);
```

### 问题3：Web 端可以读取，移动端读取不到

**原因：**
- Expo 需要在构建时嵌入环境变量
- 原生应用中环境变量需要在构建时注入

**解决方法：**
1. 使用 `expo-constants`（如果已安装）：
```typescript
import Constants from 'expo-constants';

const apiKey = Constants.expoConfig?.extra?.apiKey || process.env.EXPO_PUBLIC_API_KEY;
```

2. 或在 `app.json` 中配置（不推荐，会暴露在代码中）：
```json
{
  "expo": {
    "extra": {
      "apiKey": "your-key"
    }
  }
}
```

3. **推荐方式**：直接使用 `process.env.EXPO_PUBLIC_API_KEY`，Expo 会自动处理

### 问题4：EAS Build 中环境变量

在 EAS Build 中，需要在 `eas.json` 中配置：

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "your-production-api-key"
      }
    },
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "your-preview-api-key"
      }
    }
  }
}
```

## 📝 完整示例

### `.env.example` 文件

```env
# 腾讯云函数 API Key
# 复制此文件为 .env 并填入实际的 API Key
EXPO_PUBLIC_API_KEY=your-api-key-here

# 可选：云函数地址
# EXPO_PUBLIC_API_BASE_URL=https://your-region.apigw.tencentcs.com/release/task-collection-api
```

### `config/api.config.ts` 使用

```typescript
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://default-url',
  API_KEY: process.env.EXPO_PUBLIC_API_KEY || '',
};
```

### 应用中使用

```typescript
import { apiService } from './services/api.service';
import { API_CONFIG } from './config/api.config';

// 自动使用配置中的 API Key
if (API_CONFIG.API_KEY) {
  apiService.setToken(API_CONFIG.API_KEY);
}
```

## 🔗 相关文档

- [Expo 环境变量文档](https://docs.expo.dev/guides/environment-variables/)
- [API Key 配置指南](./API_KEY_SETUP.md)
- [腾讯云配置指南](./TENCENT_CLOUD_SETUP.md)

