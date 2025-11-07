# 自动上传 APK 到腾讯云存储配置指南

## 概述

配置 GitHub Actions 在 EAS Build 构建完成后，自动下载 APK 并上传到腾讯云开发（TCB）存储。

## 云存储信息

- **域名**: `636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la`
- **文件夹**: `task_collection_apks`
- **路径格式**: `task_collection_apks/v{version}/app-release-v{version}.apk`

## 已完成的配置

### 1. 云函数文件上传接口

**文件**: `cloud-function/index.js`

已添加 `/storage/upload` 接口，支持通过云函数上传文件到 TCB 存储。

**接口说明**:
- **路径**: `POST /storage/upload`
- **请求体**:
  ```json
  {
    "fileName": "app-release.apk",
    "filePath": "task_collection_apks/v1.0.1/app-release-v1.0.1.apk",
    "fileContent": "base64编码的文件内容",
    "contentType": "application/vnd.android.package-archive"
  }
  ```
- **返回**:
  ```json
  {
    "code": 0,
    "message": "上传成功",
    "data": {
      "fileId": "cloud://...",
      "filePath": "task_collection_apks/v1.0.1/app-release-v1.0.1.apk",
      "fileUrl": "https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/task_collection_apks/v1.0.1/app-release-v1.0.1.apk"
    }
  }
  ```

### 2. 上传脚本

**文件**: `scripts/upload-apk-to-tcb.js`

Node.js 脚本，用于上传 APK 到 TCB 存储。

**使用方法**:
```bash
node scripts/upload-apk-to-tcb.js ./app-release.apk
```

**环境变量**:
- `EXPO_PUBLIC_API_KEY` 或 `API_KEY`: API Key（用于云函数认证）
- `API_BASE_URL`: 云函数地址（可选，默认使用配置的地址）

### 3. GitHub Actions 工作流

**文件**: `.github/workflows/eas-build.yml`

已添加以下步骤：
1. **下载 APK**: 从 EAS Build 下载构建的 APK
2. **获取版本信息**: 从 `app.json` 读取版本号和版本代码
3. **上传到 TCB 存储**: 调用上传脚本上传 APK
4. **上传 Artifact**: 同时上传到 GitHub Artifacts（作为备份）

## 工作流程

```
EAS Build 构建完成
    ↓
下载 APK 到本地
    ↓
读取 app.json 获取版本信息
    ↓
调用上传脚本
    ↓
脚本通过云函数上传到 TCB 存储
    ↓
云函数使用 TCB SDK 上传文件
    ↓
返回文件 URL
    ↓
APK 可通过 URL 访问
```

## 配置步骤

### 1. 确保 GitHub Secrets 已配置

在 GitHub 仓库的 Settings → Secrets and variables → Actions 中配置：

- `EXPO_TOKEN`: Expo 账号 Token
- `EXPO_PUBLIC_API_KEY`: API Key（用于云函数认证）

### 2. 确保云函数已部署

确保云函数中包含 `/storage/upload` 接口：

1. 将 `cloud-function/index.js` 部署到云函数
2. 确保云函数环境变量已配置：
   - `TCB_ENV`: 云开发环境 ID
   - `API_KEY_1`: API Key

### 3. 确保 TCB 存储权限

在腾讯云开发控制台：

1. 进入"云存储"
2. 确保存储桶已创建
3. 配置权限为"公有读"（如果需要公开访问）

### 4. 测试上传

**本地测试**:

```bash
# 1. 构建 APK（或使用已有的 APK）
eas build --platform android --profile preview

# 2. 下载 APK
eas build:download --platform android --latest --output ./app-release.apk

# 3. 上传到 TCB 存储
export EXPO_PUBLIC_API_KEY=your-api-key
node scripts/upload-apk-to-tcb.js ./app-release.apk
```

**GitHub Actions 测试**:

1. 推送代码到 `main` 分支
2. 或手动触发工作流（Actions → EAS Build Android Preview → Run workflow）
3. 查看工作流日志，确认上传成功

## 文件路径结构

上传后的文件路径：

```
task_collection_apks/
├── v1.0.0/
│   └── app-release-v1.0.0.apk
├── v1.0.1/
│   └── app-release-v1.0.1.apk
└── v1.0.2/
    └── app-release-v1.0.2.apk
```

**访问 URL**:
```
https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/task_collection_apks/v1.0.1/app-release-v1.0.1.apk
```

## 更新云函数版本信息

上传 APK 后，需要更新云函数中的版本信息：

**文件**: `cloud-function/index.js`

**修改位置**: `handleAppCheckUpdate` 函数

```javascript
const latestVersion = {
  version: '1.0.1',  // 更新为最新版本
  versionCode: 2,     // 更新为最新版本代码
  platform: 'android',
  downloadUrl: `https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/task_collection_apks/v1.0.1/app-release-v1.0.1.apk`,
  forceUpdate: false,
  updateLog: '修复了一些 bug，优化了性能',
  fileSize: 0, // 可以从上传结果获取
  releaseDate: new Date().toISOString(),
};
```

**建议**: 后续可以将版本信息存储到数据库，通过 API 自动更新。

## 自动化更新版本信息（可选）

可以在上传脚本中添加自动更新版本信息的逻辑：

```javascript
// 上传成功后，调用云函数更新版本信息
async function updateVersionInfo(version, versionCode, downloadUrl, fileSize) {
  // 调用云函数 API 更新版本信息
  // 需要云函数提供更新版本信息的接口
}
```

## 故障排除

### 1. 上传失败：API Key 错误

**错误**: `无效的 API Key`

**解决**:
- 检查 GitHub Secrets 中的 `EXPO_PUBLIC_API_KEY` 是否正确
- 检查云函数环境变量中的 `API_KEY_1` 是否匹配

### 2. 上传失败：文件不存在

**错误**: `APK 文件不存在`

**解决**:
- 检查 EAS Build 是否成功
- 检查下载步骤是否成功
- 查看工作流日志中的错误信息

### 3. 上传失败：存储权限错误

**错误**: `上传失败: 权限不足`

**解决**:
- 检查 TCB 存储权限配置
- 确保云函数有上传权限
- 检查存储桶是否存在

### 4. 文件 URL 无法访问

**问题**: 上传成功但无法访问文件

**解决**:
- 检查存储桶权限是否为"公有读"
- 检查文件路径是否正确
- 检查域名是否正确

## 验证上传

### 方法一：查看工作流日志

在 GitHub Actions 中查看工作流日志：
- 找到 "Upload APK to TCB Storage" 步骤
- 查看输出中的文件 URL
- 确认上传成功

### 方法二：访问文件 URL

使用浏览器访问文件 URL，确认可以下载：
```
https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/task_collection_apks/v1.0.1/app-release-v1.0.1.apk
```

### 方法三：在应用内测试

1. 更新云函数中的版本信息
2. 在应用内点击"检查更新"
3. 验证是否能检测到新版本
4. 验证下载链接是否正确

## 总结

✅ **已完成**:
- 云函数文件上传接口
- 上传脚本
- GitHub Actions 自动上传配置

✅ **工作流程**:
1. EAS Build 构建 APK
2. 自动下载 APK
3. 自动上传到 TCB 存储
4. 返回文件 URL

✅ **后续步骤**:
- 手动更新云函数中的版本信息（或实现自动更新）
- 测试上传流程
- 验证文件可访问性

