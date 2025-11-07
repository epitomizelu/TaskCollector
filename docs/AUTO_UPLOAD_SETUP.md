# 自动上传 APK 到腾讯云存储配置指南

## 快速开始

### 1. 确保 GitHub Secrets 已配置

在 GitHub 仓库 Settings → Secrets and variables → Actions 中配置：

- ✅ `EXPO_TOKEN`: Expo 账号 Token
- ✅ `EXPO_PUBLIC_API_KEY`: API Key（用于云函数认证）

### 2. 确保云函数已部署

确保 `cloud-function/index.js` 已部署到云函数，并包含 `/storage/upload` 接口。

### 3. 推送代码触发构建

推送代码到 `main` 分支，GitHub Actions 会自动：
1. 构建 APK
2. 下载 APK
3. 上传到腾讯云存储

## 工作流程

```
GitHub Actions 触发
    ↓
EAS Build 构建 APK
    ↓
下载 APK 到本地
    ↓
读取 app.json 获取版本信息
    ↓
调用上传脚本 (upload-apk-to-tcb.js)
    ↓
通过云函数 /storage/upload 上传
    ↓
云函数使用 TCB SDK 上传到存储
    ↓
返回文件 URL
    ↓
APK 可通过 URL 访问
```

## 文件路径

上传后的文件路径格式：
```
task_collection_apks/v{version}/app-release-v{version}.apk
```

例如：
```
task_collection_apks/v1.0.1/app-release-v1.0.1.apk
```

访问 URL：
```
https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/task_collection_apks/v1.0.1/app-release-v1.0.1.apk
```

## 本地测试

### 测试上传脚本

```bash
# 1. 构建 APK
eas build --platform android --profile preview

# 2. 下载 APK
eas build:download --platform android --latest --output ./app-release.apk

# 3. 设置环境变量
export EXPO_PUBLIC_API_KEY=your-api-key

# 4. 运行上传脚本
node scripts/upload-apk-to-tcb.js ./app-release.apk
```

## 验证上传

### 方法一：查看 GitHub Actions 日志

1. 进入 GitHub 仓库
2. 点击 Actions 标签
3. 找到最新的构建任务
4. 查看 "Upload APK to TCB Storage" 步骤的日志
5. 确认看到 "✅ 上传成功！" 和文件 URL

### 方法二：访问文件 URL

在浏览器中访问文件 URL，确认可以下载：
```
https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/task_collection_apks/v1.0.1/app-release-v1.0.1.apk
```

### 方法三：在腾讯云控制台查看

1. 登录腾讯云控制台
2. 进入云开发控制台
3. 进入"云存储"
4. 查看 `task_collection_apks` 文件夹
5. 确认文件已上传

## 更新版本信息

上传 APK 后，需要更新云函数中的版本信息：

**文件**: `cloud-function/index.js`

**修改**: `handleAppCheckUpdate` 函数中的 `latestVersion` 对象

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

## 故障排除

### 问题 1: 上传失败 - API Key 错误

**错误信息**: `无效的 API Key`

**解决方法**:
1. 检查 GitHub Secrets 中的 `EXPO_PUBLIC_API_KEY` 是否正确
2. 检查云函数环境变量中的 `API_KEY_1` 是否匹配
3. 确认 API Key 没有多余的空格或换行

### 问题 2: 上传失败 - 文件不存在

**错误信息**: `APK 文件不存在`

**解决方法**:
1. 检查 EAS Build 是否成功完成
2. 查看工作流日志中的 "Download APK" 步骤
3. 确认下载步骤是否成功
4. 如果下载失败，工作流会自动重试

### 问题 3: 上传失败 - 存储权限错误

**错误信息**: `上传失败: 权限不足`

**解决方法**:
1. 检查 TCB 存储权限配置
2. 确保云函数有上传权限
3. 检查存储桶是否存在
4. 确认云函数环境变量 `TCB_ENV` 配置正确

### 问题 4: 上传超时

**错误信息**: `请求超时`

**解决方法**:
1. APK 文件可能太大，需要更长的上传时间
2. 检查网络连接
3. 可以增加超时时间（脚本中已设置为 5 分钟）

### 问题 5: 文件 URL 无法访问

**问题**: 上传成功但无法访问文件

**解决方法**:
1. 检查存储桶权限是否为"公有读"
2. 检查文件路径是否正确
3. 检查域名是否正确
4. 在腾讯云控制台验证文件是否存在

## 后续优化建议

### 1. 自动更新版本信息

可以在上传成功后，自动调用云函数更新版本信息：

```javascript
// 在上传脚本中添加
async function updateVersionInfo(version, versionCode, downloadUrl, fileSize) {
  // 调用云函数 API 更新版本信息
  // 需要云函数提供更新版本信息的接口
}
```

### 2. 文件大小获取

可以从上传结果中获取文件大小，并更新到版本信息：

```javascript
const fileSize = fs.statSync(filePath).size;
// 在上传时传递 fileSize
// 在云函数中更新版本信息时使用
```

### 3. 版本信息数据库化

将版本信息存储到数据库，方便管理：

```javascript
// 在云函数中创建 app_versions 集合
// 存储版本信息
// 版本检查接口从数据库读取
```

## 总结

✅ **已完成配置**:
- 云函数文件上传接口 (`/storage/upload`)
- 上传脚本 (`scripts/upload-apk-to-tcb.js`)
- GitHub Actions 自动上传配置

✅ **工作流程**:
1. EAS Build 构建 APK
2. 自动下载 APK
3. 自动上传到 TCB 存储
4. 返回文件 URL

✅ **使用方法**:
- 推送代码到 `main` 分支自动触发
- 或手动触发 GitHub Actions
- 上传成功后，更新云函数中的版本信息

