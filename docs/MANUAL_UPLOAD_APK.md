# 手动上传 APK 指南

当 GitHub Actions 自动上传失败时，可以手动上传 APK 到腾讯云存储。

## 前置条件

1. 已从 EAS Build 下载 APK 文件
2. 已获取 EAS 下载 URL（可选，但推荐）
3. 已配置环境变量 `EXPO_PUBLIC_API_KEY`

## 方法一：使用上传脚本（推荐）

### 1. 设置环境变量

**Windows PowerShell:**
```powershell
$env:EXPO_PUBLIC_API_KEY="your-api-key"
$env:API_BASE_URL="https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api"
$env:EAS_DOWNLOAD_URL="https://expo.dev/artifacts/eas/xxxxx.apk"  # 可选
```

**Linux/Mac:**
```bash
export EXPO_PUBLIC_API_KEY="your-api-key"
export API_BASE_URL="https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api"
export EAS_DOWNLOAD_URL="https://expo.dev/artifacts/eas/xxxxx.apk"  # 可选
```

### 2. 运行上传脚本

```bash
# 基本用法（只上传 APK）
node scripts/upload-apk-to-tcb.js ./app-release.apk

# 带 EAS 下载 URL（推荐）
node scripts/upload-apk-to-tcb.js ./app-release.apk "https://expo.dev/artifacts/eas/xxxxx.apk"

# 或者通过环境变量传递 EAS URL
EAS_DOWNLOAD_URL="https://expo.dev/artifacts/eas/xxxxx.apk" node scripts/upload-apk-to-tcb.js ./app-release.apk
```

### 3. 使用 npm script（更简单）

在 `package.json` 中添加脚本后，可以直接运行：

```bash
npm run upload-apk ./app-release.apk
```

## 方法二：先保存版本信息，再上传

如果只想先保存版本信息（包含 EAS URL），可以：

```bash
# 只保存版本信息（不上传文件）
node scripts/save-version-info.js "https://expo.dev/artifacts/eas/xxxxx.apk" "./app-release.apk"

# 然后再上传（可选）
node scripts/upload-apk-to-tcb.js ./app-release.apk "https://expo.dev/artifacts/eas/xxxxx.apk"
```

## 完整示例

### Windows PowerShell

```powershell
# 1. 设置环境变量
$env:EXPO_PUBLIC_API_KEY="your-api-key"
$env:API_BASE_URL="https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api"

# 2. 下载 APK（如果还没有）
# 从 GitHub Actions 的 Artifacts 下载，或从 EAS 直接下载

# 3. 先保存版本信息（包含 EAS URL）
$EAS_URL="https://expo.dev/artifacts/eas/xxxxx.apk"
node scripts/save-version-info.js $EAS_URL "./app-release.apk"

# 4. 上传 APK（可选，如果上传失败也不影响，因为版本信息已保存）
node scripts/upload-apk-to-tcb.js ./app-release.apk $EAS_URL
```

### Linux/Mac

```bash
# 1. 设置环境变量
export EXPO_PUBLIC_API_KEY="your-api-key"
export API_BASE_URL="https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api"

# 2. 下载 APK（如果还没有）
# 从 GitHub Actions 的 Artifacts 下载，或从 EAS 直接下载

# 3. 先保存版本信息（包含 EAS URL）
EAS_URL="https://expo.dev/artifacts/eas/xxxxx.apk"
node scripts/save-version-info.js "$EAS_URL" "./app-release.apk"

# 4. 上传 APK（可选，如果上传失败也不影响，因为版本信息已保存）
node scripts/upload-apk-to-tcb.js ./app-release.apk "$EAS_URL"
```

## 获取 EAS 下载 URL

### 方法 1：从 GitHub Actions 日志

1. 进入 GitHub Actions 运行记录
2. 查看 "Run EAS Build with Retry" 步骤的输出
3. 找到 `✅ APK 下载地址: https://expo.dev/artifacts/eas/xxxxx.apk`

### 方法 2：从 EAS Build 网站

1. 访问 https://expo.dev
2. 登录你的账号
3. 进入项目 → Builds
4. 找到对应的构建记录
5. 复制 APK 下载链接

### 方法 3：从 GitHub Actions Artifacts

1. 进入 GitHub Actions 运行记录
2. 在页面底部找到 "Artifacts"
3. 下载 `android-app` artifact
4. 解压后找到 APK 文件

## 验证上传结果

上传成功后，可以通过以下方式验证：

1. **检查版本信息**：访问云函数 API 检查版本是否已保存
2. **测试下载**：在应用中检查更新，看是否能正常下载

## 常见问题

### Q: 上传失败怎么办？

A: 即使上传失败，如果已经保存了版本信息（包含 EAS URL），用户仍然可以从 EAS 下载 APK。上传只是提供备用下载源。

### Q: 如何知道上传是否成功？

A: 脚本会输出上传结果。成功时会显示：
- `✅ 上传成功！`
- 文件 URL
- 版本信息保存成功

### Q: 可以只保存版本信息不上传吗？

A: 可以。使用 `scripts/save-version-info.js` 只保存版本信息，不进行文件上传。

### Q: 环境变量在哪里设置？

A: 
- **临时设置**：在当前终端会话中设置（见上面的示例）
- **永久设置**：添加到系统环境变量或 `.env` 文件（如果使用 dotenv）

## 注意事项

1. **API Key 安全**：不要将 API Key 提交到代码仓库
2. **文件路径**：确保 APK 文件路径正确
3. **网络连接**：确保能访问腾讯云和 EAS 服务
4. **版本号**：确保 `app.json` 中的版本号正确

