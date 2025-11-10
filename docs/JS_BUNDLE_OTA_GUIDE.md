# JS Bundle OTA 更新系统使用指南

## 📋 概述

这是一个简易版的 OTA（Over-The-Air）更新系统，用于本地构建 JS Bundle 并上传到腾讯云存储，客户端可以检测更新并下载新的 Bundle。

**重要：** 此系统独立于 EAS Updates，不会影响现有的 EAS 构建和更新流程。

## 🏗️ 系统架构

### 工作流程

1. **本地构建 JS Bundle**
   - 使用 Metro bundler 构建生产环境的 JS bundle
   - 输出文件：`js-bundles/index.android.bundle`

2. **上传到腾讯云存储**
   - 将 bundle 文件上传到腾讯云存储
   - 存储路径：`js_bundles/v{version}/index.android.bundle`

3. **保存版本信息到数据库**
   - 版本信息保存到 `js_bundle_versions` 集合
   - 包含版本号、下载地址、文件大小等信息

4. **客户端检测更新**
   - 应用启动时或手动检查更新
   - 对比版本号，如果有新版本则下载

5. **下载并应用更新**
   - 下载新的 bundle 到本地
   - 应用更新（需要重启应用）

## 🚀 使用方法

### 1. 构建 JS Bundle

```bash
npm run build-js-bundle
```

或者直接运行脚本：

```bash
node scripts/build-js-bundle.js
```

**输出：**
- Bundle 文件：`js-bundles/index.android.bundle`
- 资源文件：`js-bundles/assets/`

### 2. 上传 JS Bundle

```bash
npm run upload-js-bundle
```

或者直接运行脚本：

```bash
node scripts/upload-js-bundle.js
```

**前置条件：**
- 需要先构建 bundle（运行 `build-js-bundle`）
- 需要设置环境变量 `EXPO_PUBLIC_API_KEY` 或 `API_KEY`

**功能：**
- 上传 bundle 到腾讯云存储
- 自动保存版本信息到数据库

### 3. 一键构建并上传

```bash
npm run build-and-upload-js-bundle
```

这个命令会依次执行：
1. 构建 JS Bundle
2. 上传到腾讯云存储
3. 保存版本信息

## 📦 环境变量配置

在运行上传脚本之前，需要设置 API Key：

```bash
# Windows PowerShell
$env:EXPO_PUBLIC_API_KEY="your-api-key-here"

# Windows CMD
set EXPO_PUBLIC_API_KEY=your-api-key-here

# Linux/Mac
export EXPO_PUBLIC_API_KEY=your-api-key-here
```

或者创建 `.env` 文件（如果项目支持）：

```env
EXPO_PUBLIC_API_KEY=your-api-key-here
```

## 🔧 云函数接口

### 1. 保存版本信息

**接口：** `POST /app/js-bundle-versions`

**请求体：**
```json
{
  "version": "1.0.0",
  "versionCode": 1,
  "platform": "android",
  "bundleType": "js",
  "downloadUrl": "https://...",
  "filePath": "js_bundles/v1.0.0/index.android.bundle",
  "fileSize": 1234567,
  "releaseDate": "2024-01-01T00:00:00.000Z"
}
```

### 2. 检查更新

**接口：** `GET /app/check-js-bundle-update?currentVersion=1.0.0&versionCode=1&platform=android`

**响应：**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "hasUpdate": true,
    "latestVersion": "1.0.1",
    "latestVersionCode": 2,
    "downloadUrl": "https://...",
    "filePath": "js_bundles/v1.0.1/index.android.bundle",
    "fileSize": 1234567,
    "releaseDate": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. 获取版本列表

**接口：** `GET /app/js-bundle-versions?platform=android`

**响应：**
```json
{
  "code": 0,
  "message": "获取成功",
  "data": [
    {
      "version": "1.0.1",
      "versionCode": 2,
      "platform": "android",
      "downloadUrl": "https://...",
      "fileSize": 1234567,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## 📱 客户端使用

### 1. 检查更新

```typescript
import { jsBundleUpdateService } from '../services/js-bundle-update.service';

// 检查更新
const updateInfo = await jsBundleUpdateService.checkForUpdate();

if (updateInfo.hasUpdate) {
  console.log('发现新版本:', updateInfo.latestVersion);
  console.log('下载地址:', updateInfo.downloadUrl);
}
```

### 2. 下载 Bundle

```typescript
if (updateInfo.hasUpdate && updateInfo.downloadUrl) {
  const bundlePath = await jsBundleUpdateService.downloadBundle(
    updateInfo.downloadUrl,
    (progress) => {
      console.log('下载进度:', `${(progress.progress * 100).toFixed(1)}%`);
    }
  );
  
  console.log('Bundle 下载完成:', bundlePath);
}
```

### 3. 应用更新

```typescript
// 应用更新（保存更新信息，需要重启应用）
await jsBundleUpdateService.applyUpdate(bundlePath);

// 注意：在 Expo 中，实际应用更新可能需要重启应用
// 或者使用原生代码来加载新的 bundle
```

### 4. 在应用启动时检查更新

可以在 `app/_layout.tsx` 中添加更新检查：

```typescript
import { jsBundleUpdateService } from '../services/js-bundle-update.service';

useEffect(() => {
  const checkForJSBundleUpdate = async () => {
    try {
      const updateInfo = await jsBundleUpdateService.checkForUpdate();
      if (updateInfo.hasUpdate) {
        // 提示用户有更新
        // 可以显示更新对话框，让用户选择是否下载
      }
    } catch (error) {
      console.error('检查 JS Bundle 更新失败:', error);
    }
  };

  // 延迟检查，确保应用已启动
  const timer = setTimeout(checkForJSBundleUpdate, 2000);
  return () => clearTimeout(timer);
}, []);
```

## 📂 文件结构

```
项目根目录/
├── scripts/
│   ├── build-js-bundle.js          # 构建 JS Bundle 脚本
│   └── upload-js-bundle.js          # 上传 JS Bundle 脚本
├── services/
│   └── js-bundle-update.service.ts  # 客户端更新服务
├── js-bundles/                      # Bundle 输出目录（本地）
│   ├── index.android.bundle
│   └── assets/
├── cloud-function/
│   └── index.js                     # 云函数（包含版本管理接口）
└── docs/
    └── JS_BUNDLE_OTA_GUIDE.md       # 本文档
```

## 🗄️ 数据库集合

### js_bundle_versions

存储 JS Bundle 版本信息：

```javascript
{
  version: "1.0.0",              // 版本号
  versionCode: 1,                // 版本代码
  platform: "android",          // 平台
  bundleType: "js",              // Bundle 类型
  downloadUrl: "https://...",   // 下载地址
  filePath: "js_bundles/...",   // 文件路径
  fileSize: 1234567,             // 文件大小（字节）
  releaseDate: "2024-01-01...", // 发布日期
  createdAt: "2024-01-01...",   // 创建时间
  updatedAt: "2024-01-01..."    // 更新时间
}
```

## ⚠️ 注意事项

1. **独立于 EAS Updates**
   - 此系统不会影响现有的 EAS 构建和更新流程
   - EAS Updates 和 JS Bundle OTA 可以同时使用

2. **版本号管理**
   - 版本号从 `app.json` 读取
   - 确保每次更新时版本号递增

3. **Bundle 应用**
   - 在 Expo 中，直接替换 bundle 文件可能比较复杂
   - 实际应用更新可能需要重启应用或使用原生代码

4. **安全性**
   - API Key 不要提交到代码仓库
   - 使用环境变量管理敏感信息

5. **文件大小**
   - Bundle 文件通常较大（几 MB 到几十 MB）
   - 确保云存储有足够的空间
   - 考虑使用 CDN 加速下载

## 🔍 故障排查

### 1. 构建失败

**问题：** `npx react-native bundle` 命令失败

**解决方案：**
- 确保已安装所有依赖：`npm install`
- 检查 Metro 配置是否正确
- 尝试清理缓存：`npx react-native start --reset-cache`

### 2. 上传失败

**问题：** 上传到腾讯云存储失败

**解决方案：**
- 检查 API Key 是否正确设置
- 检查网络连接
- 检查云函数是否正常运行
- 查看云函数日志

### 3. 客户端检测更新失败

**问题：** 客户端无法检测到更新

**解决方案：**
- 检查版本号是否正确
- 检查数据库是否有版本记录
- 检查云函数接口是否正常
- 查看客户端日志

## 📝 示例代码

### 完整的更新流程示例

```typescript
import { jsBundleUpdateService } from '../services/js-bundle-update.service';

async function handleUpdate() {
  try {
    // 1. 检查更新
    const updateInfo = await jsBundleUpdateService.checkForUpdate();
    
    if (!updateInfo.hasUpdate) {
      console.log('当前已是最新版本');
      return;
    }
    
    console.log('发现新版本:', updateInfo.latestVersion);
    
    // 2. 下载 Bundle
    if (!updateInfo.downloadUrl) {
      throw new Error('下载地址为空');
    }
    
    const bundlePath = await jsBundleUpdateService.downloadBundle(
      updateInfo.downloadUrl,
      (progress) => {
        console.log(`下载进度: ${(progress.progress * 100).toFixed(1)}%`);
      }
    );
    
    console.log('Bundle 下载完成:', bundlePath);
    
    // 3. 应用更新
    await jsBundleUpdateService.applyUpdate(bundlePath);
    
    // 4. 提示用户重启应用
    // Alert.alert('更新完成', '请重启应用以应用更新');
    
  } catch (error) {
    console.error('更新失败:', error);
    // 显示错误提示
  }
}
```

## 🔗 相关文档

- [EAS Build 和更新流程](./EAS_BUILD_APK_FLOW.md)
- [腾讯云存储配置](./TENCENT_CLOUD_SETUP.md)
- [应用更新解决方案](./ANDROID_UPDATE_SOLUTIONS.md)

## 📞 支持

如有问题，请查看：
- 云函数日志
- 客户端日志
- 数据库记录

或联系开发团队。

