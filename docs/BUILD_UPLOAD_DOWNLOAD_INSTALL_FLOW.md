# Build -> Upload -> Download -> Install 完整流程

本文档详细说明了从构建 APK 到上传、下载、安装的完整流程。

## 📋 流程概览

```
1. GitHub Actions 触发构建
   ↓
2. EAS Build 构建 APK
   ↓
3. 下载 APK 到本地
   ↓
4. 分片上传到腾讯云存储
   ↓
5. 获取分片 URL 列表
   ↓
6. 客户端下载分片
   ↓
7. 合并分片为完整 APK
   ↓
8. 安装 APK
```

## 🔧 1. 构建阶段 (Build)

### 1.1 GitHub Actions 工作流

**文件**: `.github/workflows/eas-build.yml`

**触发条件**:
- Push 到 `main` 分支
- 手动触发 workflow

**主要步骤**:

1. **环境准备**
   ```yaml
   - 设置 Node.js 环境
   - 安装依赖 (npm ci)
   - 配置 EAS CLI
   ```

2. **构建 APK**
   ```yaml
   - 运行 eas build --platform android --non-interactive
   - 等待构建完成
   ```

3. **提取下载链接**
   ```bash
   # 从构建输出中提取 APK 下载 URL
   APK_URL=$(eas build:list --platform android --limit 1 --json | jq -r '.[0].artifacts.buildUrl')
   ```

4. **下载 APK**
   ```bash
   # 使用 curl 或 wget 下载 APK
   curl -L -o app-release.apk "$APK_URL"
   ```

5. **获取版本信息**
   ```bash
   # 从 app.json 读取版本信息
   VERSION=$(node -p "require('./app.json').expo.version")
   BUILD_NUMBER=$(node -p "require('./app.json').expo.android.versionCode")
   ```

6. **上传 APK**
   ```bash
   # 调用上传脚本
   node scripts/upload-apk-to-tcb.js app-release.apk "$VERSION" "$BUILD_NUMBER"
   ```

### 1.2 EAS Build 配置

**文件**: `eas.json`

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

## 📤 2. 上传阶段 (Upload)

### 2.1 上传脚本

**文件**: `scripts/upload-apk-to-tcb.js`

**功能**:
- 检测文件大小，决定使用直接上传还是分片上传
- 对于大文件（> 10MB），使用分片上传
- 每个分片 2MB，Base64 编码后约 2.67MB（在云函数 6MB 限制内）

**上传流程**:

1. **检查文件大小**
   ```javascript
   const fileSize = fs.statSync(filePath).size;
   const useChunkedUpload = fileSize > 10 * 1024 * 1024; // 10MB
   ```

2. **分片上传**（大文件）
   ```javascript
   // 1. 将文件分割为 2MB 的分片
   const chunkSize = 2 * 1024 * 1024; // 2MB
   const totalChunks = Math.ceil(fileSize / chunkSize);
   
   // 2. 上传每个分片
   for (let i = 0; i < totalChunks; i++) {
     const chunk = readChunk(filePath, i * chunkSize, chunkSize);
     const chunkBase64 = chunk.toString('base64');
     
     // 调用云函数上传分片
     await uploadChunk({
       u: uploadId,
       i: i,
       t: totalChunks,
       p: filePath,
       d: chunkBase64,
       fids: chunkFileIDs, // 之前上传的分片 fileID 列表
     });
   }
   ```

3. **完成分片上传**
   ```javascript
   // 调用云函数完成分片上传
   await completeChunkUpload({
     u: uploadId,
     t: totalChunks,
     p: targetFilePath,
     fids: chunkFileIDs, // 所有分片的 fileID 列表
   });
   ```

### 2.2 云函数接口

**文件**: `cloud-function/index.js`

#### 2.2.1 上传分片接口

**路径**: `POST /storage/upload-chunk`

**请求体**:
```json
{
  "u": "upload_xxx",           // uploadId
  "i": 0,                      // chunkIndex
  "t": 56,                     // totalChunks
  "p": "task_collection_apks/v1.0.0/app-release.apk",  // filePath
  "d": "base64_encoded_chunk", // chunkData (Base64)
  "fids": ["cloud://..."]      // 之前上传的分片 fileID 列表（可选）
}
```

**处理流程**:
1. 解析请求体（支持 Base64 编码的 JSON）
2. 解码分片数据（Base64 -> Buffer）
3. 上传分片到临时路径: `temp_chunks/{uploadId}/chunk_{index}`
4. 返回分片的 `fileID`

#### 2.2.2 完成分片上传接口

**路径**: `POST /storage/complete-chunk`

**请求体**:
```json
{
  "u": "upload_xxx",    // uploadId
  "t": 56,              // totalChunks
  "p": "task_collection_apks/v1.0.0/app-release.apk",  // filePath
  "fids": ["cloud://..."]  // 所有分片的 fileID 列表（可选）
}
```

**处理流程**:
1. 获取所有分片的临时下载 URL
2. 由于云函数 3 秒超时限制，**不进行合并**
3. 返回所有分片的下载 URL 列表

**响应**:
```json
{
  "code": 0,
  "message": "分片URL获取成功，请使用客户端下载并合并",
  "data": {
    "uploadId": "upload_xxx",
    "totalChunks": 56,
    "chunkUrls": [
      "https://.../temp_chunks/upload_xxx/chunk_0",
      "https://.../temp_chunks/upload_xxx/chunk_1",
      ...
    ],
    "targetFilePath": "task_collection_apks/v1.0.0/app-release.apk"
  }
}
```

## 📥 3. 下载阶段 (Download)

### 3.1 下载并合并脚本

**文件**: `scripts/download-and-merge-chunks.js`

**功能**:
- 获取分片 URL 列表
- 下载所有分片到本地
- 合并分片为完整 APK

**使用方式**:
```bash
node scripts/download-and-merge-chunks.js <uploadId> [totalChunks] [filePath] [outputPath]
```

**示例**:
```bash
node scripts/download-and-merge-chunks.js upload_1762556904994_oggjndlfv 56 test_files/my-file.apk ./merged-file.apk
```

**下载流程**:

1. **获取分片 URL 列表**
   ```javascript
   // 调用云函数完成分片上传接口
   const response = await completeChunkUpload({
     u: uploadId,
     t: totalChunks,
     p: filePath,
   });
   
   // 获取分片 URL 列表
   const chunkUrls = response.data.chunkUrls;
   ```

2. **下载所有分片**
   ```javascript
   // 并行下载（每批 5 个）
   const CONCURRENT_DOWNLOADS = 5;
   
   for (let i = 0; i < chunkUrls.length; i += CONCURRENT_DOWNLOADS) {
     const batch = chunkUrls.slice(i, i + CONCURRENT_DOWNLOADS);
     const downloadPromises = batch.map(url => downloadFile(url, chunkPath));
     await Promise.all(downloadPromises);
   }
   ```

3. **合并分片**
   ```javascript
   // 按顺序合并所有分片
   const writeStream = fs.createWriteStream(outputPath);
   
   for (const chunkFile of chunkFiles) {
     const chunkData = fs.readFileSync(chunkFile.path);
     writeStream.write(chunkData);
   }
   
   writeStream.end();
   ```

4. **清理临时文件**
   ```javascript
   // 删除所有临时分片文件
   for (const chunkFile of chunkFiles) {
     fs.unlinkSync(chunkFile.path);
   }
   ```

### 3.2 应用内下载（未来实现）

**文件**: `services/app-update.service.ts`

**功能**:
- 检查应用更新
- 下载最新 APK
- 安装 APK

**实现思路**:
```typescript
// 1. 检查更新
const updateInfo = await checkAppUpdate();

// 2. 如果存在更新，获取分片 URL 列表
if (updateInfo.hasUpdate) {
  const chunkUrls = await getChunkUrls(updateInfo.uploadId, updateInfo.totalChunks);
  
  // 3. 下载所有分片
  const chunkFiles = await downloadAllChunks(chunkUrls);
  
  // 4. 合并分片
  const apkPath = await mergeChunks(chunkFiles);
  
  // 5. 安装 APK
  await installApk(apkPath);
}
```

## 📱 4. 安装阶段 (Install)

### 4.1 Android 安装权限

**文件**: `app.json`

```json
{
  "expo": {
    "android": {
      "permissions": [
        "REQUEST_INSTALL_PACKAGES"
      ]
    }
  }
}
```

### 4.2 安装 APK

**文件**: `services/app-update.service.ts` (待实现)

**实现方式**:

1. **使用 React Native 的 Intent**
   ```typescript
   import { Linking } from 'react-native';
   import * as FileSystem from 'expo-file-system';
   import * as IntentLauncher from 'expo-intent-launcher';
   
   async function installApk(apkPath: string) {
     // 1. 获取 APK 文件的 URI
     const contentUri = await FileSystem.getContentUriAsync(apkPath);
     
     // 2. 启动安装 Intent
     await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
       data: contentUri,
       flags: 1,
       type: 'application/vnd.android.package-archive',
     });
   }
   ```

2. **使用 expo-file-system 和 expo-intent-launcher**
   ```typescript
   import * as FileSystem from 'expo-file-system';
   import * as IntentLauncher from 'expo-intent-launcher';
   
   async function installApk(apkPath: string) {
     try {
       // 确保文件存在
       const fileInfo = await FileSystem.getInfoAsync(apkPath);
       if (!fileInfo.exists) {
         throw new Error('APK 文件不存在');
       }
       
       // 获取文件 URI
       const contentUri = await FileSystem.getContentUriAsync(apkPath);
       
       // 启动安装 Intent
       await IntentLauncher.startActivityAsync(
         IntentLauncher.ActivityAction.VIEW,
         {
           data: contentUri,
           flags: 1,
           type: 'application/vnd.android.package-archive',
         }
       );
     } catch (error) {
       console.error('安装 APK 失败:', error);
       throw error;
     }
   }
   ```

## 🔄 完整流程示例

### GitHub Actions 自动化流程

```yaml
name: Build and Upload APK

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build APK
        run: |
          npx eas-cli build --platform android --non-interactive
      
      - name: Download APK
        run: |
          APK_URL=$(npx eas-cli build:list --platform android --limit 1 --json | jq -r '.[0].artifacts.buildUrl')
          curl -L -o app-release.apk "$APK_URL"
      
      - name: Get version info
        run: |
          VERSION=$(node -p "require('./app.json').expo.version")
          BUILD_NUMBER=$(node -p "require('./app.json').expo.android.versionCode")
          echo "VERSION=$VERSION" >> $GITHUB_ENV
          echo "BUILD_NUMBER=$BUILD_NUMBER" >> $GITHUB_ENV
      
      - name: Upload APK to TCB
        run: |
          node scripts/upload-apk-to-tcb.js app-release.apk "$VERSION" "$BUILD_NUMBER"
        env:
          EXPO_PUBLIC_API_KEY: ${{ secrets.EXPO_PUBLIC_API_KEY }}
```

### 客户端下载安装流程

```typescript
// 1. 检查更新
async function checkAndInstallUpdate() {
  try {
    // 检查是否有新版本
    const updateInfo = await appUpdateService.checkUpdate();
    
    if (!updateInfo.hasUpdate) {
      console.log('当前已是最新版本');
      return;
    }
    
    console.log(`发现新版本: ${updateInfo.version}`);
    console.log(`分片数量: ${updateInfo.totalChunks}`);
    
    // 2. 获取分片 URL 列表
    const chunkUrls = await appUpdateService.getChunkUrls(
      updateInfo.uploadId,
      updateInfo.totalChunks,
      updateInfo.filePath
    );
    
    // 3. 下载所有分片
    console.log('开始下载分片...');
    const chunkFiles = await appUpdateService.downloadAllChunks(chunkUrls);
    
    // 4. 合并分片
    console.log('合并分片...');
    const apkPath = await appUpdateService.mergeChunks(chunkFiles);
    
    // 5. 安装 APK
    console.log('安装 APK...');
    await appUpdateService.installApk(apkPath);
    
    console.log('更新完成！');
  } catch (error) {
    console.error('更新失败:', error);
  }
}
```

## 📝 关键文件清单

### 构建和上传
- `.github/workflows/eas-build.yml` - GitHub Actions 工作流
- `eas.json` - EAS Build 配置
- `scripts/upload-apk-to-tcb.js` - 上传脚本
- `cloud-function/index.js` - 云函数（上传分片、完成上传）

### 下载和安装
- `scripts/download-and-merge-chunks.js` - 下载并合并脚本
- `services/app-update.service.ts` - 应用更新服务（待完善）

### 配置
- `app.json` - 应用配置（包含安装权限）
- `config/api.config.ts` - API 配置

## ✅ 已完成功能

### 1. 应用内更新功能
- ✅ 实现 `app-update.service.ts` 中的下载和安装功能
- ✅ 支持普通下载和分片下载
- ✅ 添加更新进度显示
- ✅ 添加错误处理和重试机制（每个分片最多重试3次）
- ✅ 完整的更新流程（检查 -> 下载 -> 安装）

### 2. 分片下载功能
- ✅ 支持从服务器获取分片 URL 列表
- ✅ 并行下载多个分片（每批5个）
- ✅ 自动合并分片
- ✅ 自动清理临时文件
- ✅ 下载进度回调

### 3. 错误处理
- ✅ 分片下载失败自动重试（最多3次）
- ✅ 下载失败自动清理临时文件
- ✅ 详细的错误日志

## 🚀 下一步优化

1. **版本管理**
   - 在数据库中存储版本信息（`app_versions` 集合）
   - 支持版本回滚
   - 添加版本更新日志

2. **优化上传流程**
   - 添加上传进度显示
   - 支持断点续传
   - 添加上传失败重试

3. **安全性增强**
   - 添加 APK 签名验证
   - 添加文件完整性校验（MD5/SHA256）
   - 添加下载 URL 过期时间

4. **数据库集成**
   - 上传 APK 后自动更新版本信息到数据库
   - 从数据库读取最新版本信息
   - 支持版本历史记录

## 📚 相关文档

- [EAS Build 文档](https://docs.expo.dev/build/introduction/)
- [腾讯云存储文档](https://cloud.tencent.com/document/product/436)
- [React Native 文件系统文档](https://docs.expo.dev/versions/latest/sdk/filesystem/)
- [Android 安装权限文档](https://developer.android.com/reference/android/Manifest.permission#REQUEST_INSTALL_PACKAGES)

