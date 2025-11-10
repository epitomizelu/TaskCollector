# EAS Build 构建 APK 完整流程详解

本文档详细梳理使用 EAS Build 构建 Android APK 的完整流程，包括前置准备、配置细节、构建步骤、下载分发等各个环节。

## 📋 目录

1. [前置准备](#前置准备)
2. [配置文件详解](#配置文件详解)
3. [构建流程](#构建流程)
4. [环境变量管理](#环境变量管理)
5. [构建产物处理](#构建产物处理)
6. [常见问题排查](#常见问题排查)
7. [最佳实践](#最佳实践)

---

## 前置准备

### 1.1 安装 EAS CLI

```bash
# 全局安装 EAS CLI
npm install -g eas-cli

# 验证安装
eas --version
```

**注意事项：**
- 确保 Node.js 版本 >= 16
- 推荐使用 npm，避免使用 yarn 可能导致的版本冲突
- 如果已安装，定期更新：`npm update -g eas-cli`

### 1.2 登录 Expo 账号

```bash
# 登录 Expo 账号
eas login

# 如果已有账号，直接登录
# 如果没有账号，会自动引导注册
```

**登录方式：**
- 浏览器登录（推荐）：会自动打开浏览器进行 OAuth 认证
- 用户名密码登录：`eas login --username your-username`

**验证登录状态：**
```bash
# 查看当前登录用户
eas whoami

# 查看项目信息
eas project:info
```

### 1.3 项目初始化（首次使用）

```bash
# 配置 EAS Build（首次使用需要）
eas build:configure
```

**此命令会：**
- 检查项目配置（`app.json`、`package.json`）
- 创建或更新 `eas.json` 配置文件
- 在 Expo 平台注册项目（如果尚未注册）
- 生成项目 ID（存储在 `app.json` 的 `extra.eas.projectId`）

**项目 ID 示例：**
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "6871505d-550b-4d0e-8e87-b6537f15a5b4"
      }
    }
  }
}
```

---

## 配置文件详解

### 2.1 eas.json 配置

**文件位置：** 项目根目录 `eas.json`

**当前配置：**
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "preview": {
      "android": {
        "buildType": "apk",
        "image": "latest",
        "withoutCredentials": false
      },
      "env": {
        "EXPO_PUBLIC_API_KEY": "${EXPO_PUBLIC_API_KEY}"
      }
    },
    "production": {
      "android": {
        "gradleCommand": ":app:bundleRelease",
        "image": "latest",
        "withoutCredentials": false
      },
      "env": {
        "EXPO_PUBLIC_API_KEY": "${EXPO_PUBLIC_API_KEY}"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**配置项详解：**

#### 2.1.1 CLI 版本要求
```json
"cli": {
  "version": ">= 3.0.0"
}
```
- 指定 EAS CLI 的最低版本要求
- 确保使用兼容的 CLI 版本

#### 2.1.2 Preview Profile（预览版）
```json
"preview": {
  "android": {
    "buildType": "apk",           // 构建 APK 格式（可直接安装）
    "image": "latest",             // 使用最新的构建镜像
    "withoutCredentials": false    // 需要签名凭证（自动生成）
  }
}
```

**特点：**
- ✅ 构建 APK 格式，可直接安装到设备
- ✅ 适合测试、内部分发
- ✅ 自动处理签名（使用 EAS 管理的密钥）

#### 2.1.3 Production Profile（生产版）
```json
"production": {
  "android": {
    "gradleCommand": ":app:bundleRelease",  // 构建 AAB 格式（Google Play）
    "image": "latest",
    "withoutCredentials": false
  }
}
```

**特点：**
- ✅ 构建 AAB 格式（Android App Bundle）
- ✅ 用于 Google Play 商店发布
- ✅ 如需 APK，可修改为：`"buildType": "apk"`

**修改为 APK：**
```json
"production": {
  "android": {
    "buildType": "apk",  // 改为 APK
    // 或移除 gradleCommand
  }
}
```

### 2.2 app.json 配置

**关键配置项：**

```json
{
  "expo": {
    "name": "任务收集助手 · H5 卡片报表版",
    "slug": "task-collection",
    "version": "1.0.0",                    // 版本号（用户可见）
    "android": {
      "package": "com.lcy.taskcollection",  // 应用包名（唯一标识）
      "versionCode": 2,                     // 版本代码（递增）
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.REQUEST_INSTALL_PACKAGES"  // 安装 APK 权限
      ]
    },
    "extra": {
      "eas": {
        "projectId": "6871505d-550b-4d0e-8e87-b6537f15a5b4"
      }
    }
  }
}
```

**重要字段说明：**

| 字段 | 说明 | 注意事项 |
|------|------|----------|
| `version` | 用户可见的版本号 | 格式：`x.y.z`，如 `1.0.0` |
| `versionCode` | 内部版本代码 | 必须递增，每次构建 +1 |
| `package` | 应用包名 | 唯一标识，不能更改 |
| `projectId` | EAS 项目 ID | 由 `eas build:configure` 生成 |

---

## 构建流程

### 3.1 基本构建命令

#### 3.1.1 构建预览版 APK
```bash
eas build --platform android --profile preview
```

**执行过程：**
1. **验证配置**
   - 检查 `eas.json` 配置
   - 验证 `app.json` 配置
   - 检查环境变量

2. **上传项目文件**
   - 打包项目代码（排除 `node_modules`、`.git` 等）
   - 上传到 EAS 构建服务器
   - 显示上传进度

3. **开始构建**
   - 在云端创建构建任务
   - 分配构建资源
   - 显示构建队列位置

4. **构建过程**
   - 安装依赖（`npm ci`）
   - 运行 `expo prebuild`（生成原生代码）
   - 执行 Gradle 构建
   - 生成 APK 文件
   - 签名 APK

5. **完成**
   - 显示构建结果
   - 提供下载链接
   - 保存到 Expo Dashboard

**输出示例：**
```
✔ Build finished
✔ Build ID: abc123def456
✔ Artifact: https://expo.dev/artifacts/eas/abc123def456.apk
```

#### 3.1.2 构建生产版
```bash
eas build --platform android --profile production
```

**与预览版的区别：**
- 默认构建 AAB 格式（用于 Google Play）
- 使用生产环境配置
- 可能需要额外的签名配置

#### 3.1.3 本地构建（高级）
```bash
eas build --platform android --profile preview --local
```

**本地构建要求：**
- ✅ 安装 Android SDK
- ✅ 配置 `ANDROID_HOME` 环境变量
- ✅ 安装 JDK 17+
- ✅ 配置 Gradle

**优点：**
- 不占用 EAS 构建配额
- 构建速度可能更快（取决于本地机器）

**缺点：**
- 需要配置完整的 Android 开发环境
- 需要手动管理签名密钥

### 3.2 构建选项

#### 3.2.1 非交互模式
```bash
eas build --platform android --profile preview --non-interactive
```

**适用场景：**
- CI/CD 自动化构建
- 脚本批量构建
- 无需人工确认的场景

#### 3.2.2 指定消息
```bash
eas build --platform android --profile preview --message "修复登录问题"
```

**作用：**
- 在构建历史中记录构建原因
- 便于追踪和管理构建版本

#### 3.2.3 清除缓存
```bash
eas build --platform android --profile preview --clear-cache
```

**适用场景：**
- 依赖安装异常
- 构建缓存损坏
- 需要完全重新构建

### 3.3 构建状态查询

#### 3.3.1 查看构建列表
```bash
# 查看最近的构建
eas build:list

# 查看特定平台的构建
eas build:list --platform android

# 查看特定 profile 的构建
eas build:list --profile preview

# 限制显示数量
eas build:list --limit 10
```

**输出示例：**
```
┌─────────────┬──────────────┬─────────────┬──────────────┬────────────┐
│ Build ID    │ Platform     │ Profile     │ Status       │ Created    │
├─────────────┼──────────────┼─────────────┼──────────────┼────────────┤
│ abc123...   │ android      │ preview     │ finished     │ 2 hours ago│
│ def456...   │ android      │ production  │ in-progress  │ 1 hour ago │
└─────────────┴──────────────┴─────────────┴──────────────┴────────────┘
```

#### 3.3.2 查看构建详情
```bash
# 查看特定构建的详细信息
eas build:view <build-id>

# 或使用简短的构建 ID
eas build:view abc123
```

**显示信息：**
- 构建状态
- 构建日志链接
- 下载链接
- 构建配置
- 环境变量（隐藏敏感信息）

#### 3.3.3 查看构建日志
```bash
# 实时查看构建日志
eas build:view <build-id> --logs

# 或访问 Expo Dashboard
# https://expo.dev/accounts/[account]/projects/[project]/builds/[build-id]
```

### 3.4 构建流程时序图

```
开发者
  │
  ├─> 1. 执行构建命令
  │   eas build --platform android --profile preview
  │
  ├─> 2. EAS CLI 验证配置
  │   ├─ 检查 eas.json
  │   ├─ 检查 app.json
  │   └─ 验证环境变量
  │
  ├─> 3. 上传项目文件
  │   ├─ 打包代码（排除 node_modules）
  │   ├─ 上传到 EAS 服务器
  │   └─ 显示上传进度
  │
  ├─> 4. 创建构建任务
  │   ├─ 分配构建资源
  │   ├─ 显示队列位置
  │   └─ 返回构建 ID
  │
  ├─> 5. 等待构建完成
  │   ├─ 可以继续其他工作
  │   ├─ 或使用 eas build:view 查看进度
  │   └─ 构建完成后会收到通知
  │
  └─> 6. 获取构建产物
      ├─ 下载链接（Expo Dashboard）
      ├─ 命令行下载
      └─ 或通过 API 获取
```

---

## 环境变量管理

### 4.1 环境变量配置方式

#### 4.1.1 使用 EAS Secrets（推荐）

**创建 Secret：**
```bash
# 创建项目级别的 Secret
eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-api-key

# 创建账户级别的 Secret（所有项目共享）
eas secret:create --scope account --name EXPO_PUBLIC_API_KEY --value your-api-key
```

**查看 Secrets：**
```bash
# 查看项目级别的 Secrets
eas secret:list --scope project

# 查看账户级别的 Secrets
eas secret:list --scope account
```

**删除 Secret：**
```bash
eas secret:delete --scope project --name EXPO_PUBLIC_API_KEY
```

**在 eas.json 中使用：**
```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "${EXPO_PUBLIC_API_KEY}"
      }
    }
  }
}
```

**优点：**
- ✅ 密钥不暴露在代码仓库中
- ✅ 不同环境可以使用不同的密钥
- ✅ 可以随时更新，无需修改代码
- ✅ 支持加密存储

#### 4.1.2 直接在 eas.json 中配置（不推荐）

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**缺点：**
- ❌ 密钥暴露在代码仓库中
- ❌ 需要修改代码才能更新
- ❌ 不适合生产环境

#### 4.1.3 使用 .env 文件（本地开发）

**创建 `.env.local`：**
```env
EXPO_PUBLIC_API_KEY=your-api-key
```

**注意：**
- `.env` 文件不应提交到 Git
- 需要在 `.gitignore` 中添加 `.env*`
- EAS Build 不会自动读取 `.env` 文件

### 4.2 环境变量作用域

#### 4.2.1 EXPO_PUBLIC_ 前缀

**规则：**
- 以 `EXPO_PUBLIC_` 开头的环境变量会被编译到客户端代码中
- 可以在 JavaScript 代码中通过 `process.env.EXPO_PUBLIC_API_KEY` 访问
- **会被包含在 APK 中**，用户可以通过反编译查看

**示例：**
```typescript
// 代码中使用
const apiKey = process.env.EXPO_PUBLIC_API_KEY;
```

#### 4.2.2 普通环境变量

**规则：**
- 不以 `EXPO_PUBLIC_` 开头的变量只在构建时可用
- 不会编译到客户端代码中
- 用于构建脚本、配置等

**示例：**
```json
{
  "build": {
    "preview": {
      "env": {
        "BUILD_NUMBER": "123",  // 仅构建时可用
        "EXPO_PUBLIC_API_KEY": "xxx"  // 编译到客户端
      }
    }
  }
}
```

### 4.3 不同 Profile 使用不同环境变量

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "${EXPO_PUBLIC_API_KEY_PREVIEW}"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "${EXPO_PUBLIC_API_KEY_PRODUCTION}"
      }
    }
  }
}
```

**创建不同的 Secrets：**
```bash
# 预览版 API Key
eas secret:create --scope project --name EXPO_PUBLIC_API_KEY_PREVIEW --value preview-key

# 生产版 API Key
eas secret:create --scope project --name EXPO_PUBLIC_API_KEY_PRODUCTION --value production-key
```

---

## 构建产物处理

### 5.1 下载构建产物

#### 5.1.1 从 Expo Dashboard 下载

1. 访问 [Expo Dashboard](https://expo.dev)
2. 选择项目
3. 进入 "Builds" 页面
4. 找到对应的构建记录
5. 点击 "Download" 按钮

#### 5.1.2 从命令行下载

```bash
# 获取最新构建的下载链接
eas build:list --platform android --limit 1 --json

# 使用 curl 下载
curl -L -o app-release.apk "https://expo.dev/artifacts/eas/abc123.apk"

# 或使用 wget
wget -O app-release.apk "https://expo.dev/artifacts/eas/abc123.apk"
```

#### 5.1.3 使用脚本自动下载

**示例脚本：**
```bash
#!/bin/bash
# 获取最新构建的下载 URL
BUILD_INFO=$(eas build:list --platform android --limit 1 --json)
DOWNLOAD_URL=$(echo $BUILD_INFO | jq -r '.[0].artifacts.buildUrl')

# 下载 APK
curl -L -o app-release.apk "$DOWNLOAD_URL"
```

### 5.2 构建产物信息

#### 5.2.1 APK 文件信息

**文件位置：**
- 下载后保存在本地指定路径
- 文件名通常为：`app-release.apk` 或包含构建 ID

**文件大小：**
- 通常 20-50 MB（取决于应用大小）
- 包含所有资源和代码

**文件内容：**
- 应用代码（包含环境变量）
- 资源文件（图片、字体等）
- 原生库（.so 文件）
- 签名信息

#### 5.2.2 验证 APK

```bash
# 检查 APK 签名
jarsigner -verify -verbose -certs app-release.apk

# 查看 APK 信息
aapt dump badging app-release.apk

# 查看版本信息
aapt dump badging app-release.apk | grep version
```

### 5.3 上传到云存储

**项目中的上传脚本：** `scripts/upload-apk-to-tcb.js`

**使用方式：**
```bash
# 上传 APK 到腾讯云存储
node scripts/upload-apk-to-tcb.js ./app-release.apk [eas-download-url]
```

**脚本功能：**
1. 读取版本信息（从 `app.json`）
2. 检测文件大小
3. 小文件（< 10MB）：直接上传
4. 大文件（> 10MB）：分片上传（每片 2MB）
5. 保存版本信息到数据库

**分片上传流程：**
```
APK 文件 (30MB)
  │
  ├─> 分割为 15 个分片（每片 2MB）
  │
  ├─> 逐个上传分片到云存储
  │   ├─ 分片 1/15
  │   ├─ 分片 2/15
  │   └─ ...
  │
  └─> 获取所有分片的下载 URL
      └─> 客户端下载并合并
```

### 5.4 自动化构建和上传

**项目中的自动化脚本：** `scripts/build-and-upload.sh`

**完整流程：**
```bash
#!/bin/bash
# 1. 更新版本号
node scripts/update-version.js --type build

# 2. 构建 APK
eas build --platform android --profile preview --non-interactive

# 3. 获取下载 URL（需要手动输入或从构建输出提取）
read -p "请输入 EAS 下载 URL: " EAS_DOWNLOAD_URL

# 4. 下载 APK
curl -L -o ./app-release.apk "$EAS_DOWNLOAD_URL"

# 5. 上传到云存储
node scripts/upload-apk-to-tcb.js ./app-release.apk "$EAS_DOWNLOAD_URL"
```

---

## 常见问题排查

### 6.1 构建失败

#### 6.1.1 配置错误

**症状：**
```
Error: Invalid configuration in eas.json
```

**排查步骤：**
1. 检查 `eas.json` 语法是否正确（JSON 格式）
2. 验证 profile 名称是否正确
3. 检查环境变量引用是否正确

**解决方案：**
```bash
# 验证配置
eas build:configure

# 检查 JSON 语法
cat eas.json | jq .
```

#### 6.1.2 依赖安装失败

**症状：**
```
Error: npm install failed
```

**排查步骤：**
1. 检查 `package.json` 中的依赖版本
2. 查看构建日志中的具体错误
3. 检查是否有不兼容的依赖

**解决方案：**
```bash
# 本地测试依赖安装
npm ci

# 清除缓存重新构建
eas build --platform android --profile preview --clear-cache
```

#### 6.1.3 环境变量缺失

**症状：**
```
Error: Environment variable EXPO_PUBLIC_API_KEY is not set
```

**排查步骤：**
1. 检查 `eas.json` 中的环境变量配置
2. 验证 EAS Secrets 是否已创建
3. 检查 Secret 名称是否正确

**解决方案：**
```bash
# 查看 Secrets
eas secret:list --scope project

# 创建缺失的 Secret
eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-key
```

### 6.2 构建超时

**症状：**
```
Error: Build timeout
```

**可能原因：**
- 项目过大
- 依赖过多
- 网络问题

**解决方案：**
1. 优化项目大小（移除不必要的文件）
2. 使用 `.easignore` 排除文件
3. 检查网络连接
4. 联系 Expo 支持

### 6.3 签名问题

**症状：**
```
Error: Signing failed
```

**解决方案：**
- EAS Build 会自动处理签名
- 如果使用自定义签名，需要配置 `credentials.json`
- 检查 `withoutCredentials` 配置

### 6.4 版本号冲突

**症状：**
```
Error: Version code already exists
```

**解决方案：**
```bash
# 更新 versionCode（在 app.json 中）
{
  "expo": {
    "android": {
      "versionCode": 3  // 递增
    }
  }
}
```

---

## 最佳实践

### 7.1 版本管理

#### 7.1.1 版本号规范

**语义化版本：**
- `major.minor.patch`，如 `1.0.0`
- `major`：重大更新（不兼容）
- `minor`：新功能（向后兼容）
- `patch`：修复（向后兼容）

**版本代码（versionCode）：**
- 必须递增
- 每次构建 +1
- 不能回退

#### 7.1.2 自动化版本更新

**使用脚本：** `scripts/update-version.js`

```bash
# 更新 patch 版本（1.0.0 -> 1.0.1）
node scripts/update-version.js --type patch

# 更新 minor 版本（1.0.0 -> 1.1.0）
node scripts/update-version.js --type minor

# 更新 major 版本（1.0.0 -> 2.0.0）
node scripts/update-version.js --type major

# 构建时自动更新
node scripts/update-version.js --type build
```

### 7.2 构建优化

#### 7.2.1 使用 .easignore

**创建 `.easignore` 文件：**
```
node_modules/
.git/
*.log
.DS_Store
temp/
dist/
```

**作用：**
- 减少上传文件大小
- 加快构建速度
- 避免上传不必要的文件

#### 7.2.2 缓存优化

```json
{
  "build": {
    "preview": {
      "cache": {
        "disabled": false,
        "paths": [
          "node_modules",
          ".expo"
        ]
      }
    }
  }
}
```

### 7.3 安全实践

#### 7.3.1 密钥管理

**✅ 推荐：**
- 使用 EAS Secrets
- 不同环境使用不同的密钥
- 定期轮换密钥

**❌ 避免：**
- 在代码中硬编码密钥
- 在 Git 仓库中提交密钥
- 使用相同的密钥用于所有环境

#### 7.3.2 API Key 安全

**注意事项：**
- `EXPO_PUBLIC_*` 变量会被编译到 APK 中
- 用户可以通过反编译查看
- 这是客户端应用的特点，无法完全避免

**缓解措施：**
- 限制 API Key 权限
- 监控异常访问
- 设置请求频率限制
- 定期更换 API Key

### 7.4 CI/CD 集成

#### 7.4.1 GitHub Actions

**示例工作流：**
```yaml
name: Build APK

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install EAS CLI
        run: npm install -g eas-cli
      
      - name: Login to EAS
        run: eas login --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
      
      - name: Build APK
        run: eas build --platform android --profile preview --non-interactive
```

#### 7.4.2 获取 Expo Token

```bash
# 生成 Expo Token
eas token:create

# 在 GitHub Secrets 中添加
# Name: EXPO_TOKEN
# Value: [生成的 token]
```

### 7.5 构建监控

#### 7.5.1 构建通知

**配置邮件通知：**
- 在 Expo Dashboard 中配置
- 构建完成/失败时自动发送邮件

**配置 Slack 通知：**
- 在 Expo Dashboard 中配置 Webhook
- 集成到团队协作工具

#### 7.5.2 构建历史

**查看构建历史：**
```bash
# 命令行查看
eas build:list --platform android

# 或访问 Dashboard
# https://expo.dev/accounts/[account]/projects/[project]/builds
```

---

## 总结

### 快速参考

**基本构建命令：**
```bash
# 1. 安装 EAS CLI
npm install -g eas-cli

# 2. 登录
eas login

# 3. 配置（首次）
eas build:configure

# 4. 构建 APK
eas build --platform android --profile preview

# 5. 查看构建列表
eas build:list

# 6. 下载 APK
# 从 Expo Dashboard 或使用构建输出中的 URL
```

**关键配置文件：**
- `eas.json` - EAS Build 配置
- `app.json` - 应用配置（版本号、包名等）
- `.easignore` - 构建时忽略的文件

**环境变量管理：**
```bash
# 创建 Secret
eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-key

# 查看 Secrets
eas secret:list --scope project
```

### 完整流程示例

```bash
# 1. 更新版本号
node scripts/update-version.js --type build

# 2. 构建 APK
eas build --platform android --profile preview --non-interactive

# 3. 等待构建完成，获取下载 URL
# （从构建输出或 Expo Dashboard）

# 4. 下载 APK
curl -L -o app-release.apk "https://expo.dev/artifacts/eas/xxx.apk"

# 5. 上传到云存储
node scripts/upload-apk-to-tcb.js ./app-release.apk "https://expo.dev/artifacts/eas/xxx.apk"
```

---

## 相关文档

- [EAS Build 官方文档](https://docs.expo.dev/build/introduction/)
- [Android 构建配置](https://docs.expo.dev/build-reference/android-builds/)
- [环境变量管理](https://docs.expo.dev/build-reference/variables/)
- [项目构建脚本](./BUILD_ANDROID.md)
- [APK 分发指南](./APK_DISTRIBUTION.md)

