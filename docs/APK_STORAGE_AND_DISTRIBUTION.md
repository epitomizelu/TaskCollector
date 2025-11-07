# APK 存储和分发方案（方案二）

## 问题

使用方案二（自定义更新检查 + APK 下载安装）时，EAS Build 构建完成后，APK 应该存放到哪里供用户下载？

## EAS Build 构建后的 APK 位置

### 1. Expo Dashboard（默认位置）

**访问方式：**
1. 登录 https://expo.dev
2. 进入项目页面
3. 查看构建历史
4. 每个构建都有下载链接

**下载链接格式：**
```
https://expo.dev/artifacts/eas/xxx.apk
```

**特点：**
- ✅ 自动生成，无需额外配置
- ✅ 有访问限制（需要登录）
- ❌ 不适合直接给用户下载
- ❌ 链接可能有时效性

### 2. 通过命令行获取

```bash
# 查看构建列表
eas build:list

# 下载最新构建的 APK
eas build:download --platform android --latest

# 下载指定构建 ID 的 APK
eas build:download --platform android --id <build-id>
```

### 3. GitHub Actions Artifact

如果使用 GitHub Actions 构建，APK 会作为 Artifact 存储：

**访问方式：**
1. 进入 GitHub 仓库
2. 查看 Actions 页面
3. 找到对应的构建任务
4. 在 Artifacts 部分下载

**特点：**
- ✅ 自动存储
- ✅ 可以配置保留时间（默认 7 天）
- ❌ 不适合长期存储
- ❌ 不适合直接给用户下载

## 推荐方案：上传到云存储

### 方案 A：腾讯云 COS（推荐）

**优势：**
- ✅ 与云函数同一平台，管理方便
- ✅ 成本低（存储和流量费用）
- ✅ 支持 CDN 加速
- ✅ 可以设置公开访问

**步骤：**

1. **创建 COS 存储桶**
   - 登录腾讯云控制台
   - 进入对象存储 COS
   - 创建存储桶（如 `app-updates-1259499058`）
   - 设置地域（建议与云函数同一地域）
   - 设置访问权限为"公有读私有写"

2. **配置存储路径结构**
   ```
   app-updates/
   ├── releases/
   │   ├── v1.0.0/
   │   │   └── app-release.apk
   │   ├── v1.0.1/
   │   │   └── app-release.apk
   │   └── latest/
   │       └── app-release.apk (软链接或复制)
   └── metadata/
       └── versions.json (版本信息)
   ```

3. **上传 APK**
   ```bash
   # 安装腾讯云 CLI
   pip install coscmd
   
   # 配置
   coscmd config -a <SecretId> -s <SecretKey> -b <BucketName> -r <Region>
   
   # 上传 APK
   coscmd upload app-release.apk /releases/v1.0.1/app-release.apk
   ```

4. **获取下载链接**
   ```
   https://app-updates-1259499058.cos.ap-shanghai.myqcloud.com/releases/v1.0.1/app-release.apk
   ```

### 方案 B：GitHub Releases

**优势：**
- ✅ 免费
- ✅ 版本管理清晰
- ✅ 可以添加 Release Notes

**步骤：**

1. **创建 Release**
   ```bash
   # 使用 GitHub CLI
   gh release create v1.0.1 app-release.apk --title "版本 1.0.1" --notes "更新说明"
   ```

2. **获取下载链接**
   ```
   https://github.com/username/repo/releases/download/v1.0.1/app-release.apk
   ```

**限制：**
- ❌ 需要公开仓库（或 GitHub Pro）
- ❌ 下载速度可能较慢（国内）

### 方案 C：自建服务器

**优势：**
- ✅ 完全控制
- ✅ 可以自定义域名

**步骤：**

1. **上传到服务器**
   ```bash
   scp app-release.apk user@server:/var/www/apps/releases/v1.0.1/
   ```

2. **配置 Nginx**
   ```nginx
   server {
       listen 80;
       server_name downloads.example.com;
       
       location /apps/ {
           alias /var/www/apps/;
           add_header Content-Disposition "attachment";
           add_header Content-Type "application/vnd.android.package-archive";
       }
   }
   ```

3. **获取下载链接**
   ```
   https://downloads.example.com/apps/releases/v1.0.1/app-release.apk
   ```

## 自动化上传流程（CI/CD）

### GitHub Actions 自动上传到 COS

```yaml
name: EAS Build and Upload APK

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup EAS CLI
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build APK
        env:
          EXPO_PUBLIC_API_KEY: ${{ secrets.EXPO_PUBLIC_API_KEY }}
        run: |
          eas build --platform android --profile production --non-interactive

      - name: Download APK
        run: |
          eas build:download --platform android --latest --output ./app-release.apk

      - name: Install COS CLI
        run: |
          pip install coscmd

      - name: Upload to COS
        env:
          COS_SECRET_ID: ${{ secrets.COS_SECRET_ID }}
          COS_SECRET_KEY: ${{ secrets.COS_SECRET_KEY }}
          COS_BUCKET: app-updates-1259499058
          COS_REGION: ap-shanghai
        run: |
          coscmd config -a $COS_SECRET_ID -s $COS_SECRET_KEY -b $COS_BUCKET -r $COS_REGION
          VERSION=${GITHUB_REF#refs/tags/}
          coscmd upload app-release.apk /releases/$VERSION/app-release.apk
          # 同时上传到 latest 目录
          coscmd upload app-release.apk /releases/latest/app-release.apk

      - name: Update Version Info
        run: |
          # 更新云函数中的版本信息
          # 可以通过 API 调用或直接更新数据库
```

### 本地构建后自动上传

创建脚本 `scripts/upload-apk.sh`：

```bash
#!/bin/bash

# 构建 APK
eas build --platform android --profile production

# 下载 APK
eas build:download --platform android --latest --output ./app-release.apk

# 获取版本号
VERSION=$(node -p "require('./app.json').expo.version")
VERSION_CODE=$(node -p "require('./app.json').expo.android.versionCode")

# 上传到 COS
coscmd upload app-release.apk /releases/v$VERSION/app-release.apk

# 更新 latest
coscmd upload app-release.apk /releases/latest/app-release.apk

echo "APK uploaded: https://app-updates-1259499058.cos.ap-shanghai.myqcloud.com/releases/v$VERSION/app-release.apk"
```

## 版本信息管理

### 在云函数中存储版本信息

**数据库结构（MongoDB）：**

```javascript
{
  _id: ObjectId("..."),
  platform: "android",
  version: "1.0.1",
  versionCode: 2,
  downloadUrl: "https://app-updates-xxx.cos.ap-shanghai.myqcloud.com/releases/v1.0.1/app-release.apk",
  fileSize: 12345678,
  forceUpdate: false,
  updateLog: "添加任务清单模块",
  releaseDate: "2025-01-15T10:00:00Z",
  createdAt: "2025-01-15T10:00:00Z",
  updatedAt: "2025-01-15T10:00:00Z"
}
```

**云函数接口：**

```javascript
// GET /app/check-update?currentVersion=1.0.0&versionCode=1&platform=android
async function handleCheckUpdate(event) {
  const { currentVersion, versionCode, platform } = event.queryStringParameters;
  
  // 从数据库查询最新版本
  const latestVersion = await db.collection('app_versions')
    .findOne({ platform, isActive: true }, { sort: { versionCode: -1 } });
  
  if (!latestVersion) {
    return { code: 200, data: { hasUpdate: false } };
  }
  
  const hasUpdate = latestVersion.versionCode > parseInt(versionCode);
  
  return {
    code: 200,
    data: {
      hasUpdate,
      latestVersion: latestVersion.version,
      latestVersionCode: latestVersion.versionCode,
      downloadUrl: latestVersion.downloadUrl,
      forceUpdate: latestVersion.forceUpdate,
      updateLog: latestVersion.updateLog,
      fileSize: latestVersion.fileSize
    }
  };
}
```

## 安全考虑

### 1. APK 签名验证

**在云函数中验证 APK 签名：**

```javascript
// 下载 APK 并验证签名
const apkSignature = await verifyApkSignature(downloadUrl);
if (!apkSignature.isValid) {
  throw new Error('APK signature verification failed');
}
```

### 2. 文件完整性验证

**计算并存储 APK 的 MD5/SHA256：**

```bash
# 计算 MD5
md5sum app-release.apk > app-release.apk.md5

# 计算 SHA256
sha256sum app-release.apk > app-release.apk.sha256
```

**在版本信息中存储：**

```javascript
{
  downloadUrl: "...",
  md5: "abc123...",
  sha256: "def456..."
}
```

**客户端下载后验证：**

```typescript
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

const fileUri = await FileSystem.downloadAsync(downloadUrl, localPath);
const fileHash = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  await FileSystem.readAsStringAsync(fileUri.uri)
);

if (fileHash !== expectedHash) {
  throw new Error('File integrity check failed');
}
```

### 3. 访问控制

**COS 访问控制：**
- 使用签名 URL（临时有效）
- 设置 Referer 白名单
- 限制下载频率

## 总结

**推荐方案：腾讯云 COS**

**理由：**
- ✅ 与云函数同一平台
- ✅ 成本低
- ✅ 支持 CDN 加速
- ✅ 可以设置公开访问

**工作流程：**
1. EAS Build 构建 APK
2. 下载 APK 到本地
3. 上传到 COS（按版本号组织）
4. 更新云函数中的版本信息
5. 客户端通过版本检查接口获取下载链接

