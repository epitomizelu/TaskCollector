# 测试 APK 下载和上传流程

本文档说明如何测试从下载 APK 到上传到腾讯云存储的完整流程。

## 方式一：使用测试脚本（本地测试）

### 前置要求

1. 安装 Node.js
2. 安装 curl 或 wget
3. 设置环境变量 `EXPO_PUBLIC_API_KEY`

### 使用方法

#### 方法 1: 提供下载 URL

```bash
# 设置 API Key
export EXPO_PUBLIC_API_KEY=your-api-key

# 运行测试脚本，提供下载 URL
bash scripts/test-download-upload.sh https://expo.dev/artifacts/eas/xxxxx.apk
```

#### 方法 2: 自动获取最新构建

```bash
# 设置 API Key
export EXPO_PUBLIC_API_KEY=your-api-key

# 安装 eas-cli（如果还没安装）
npm install -g eas-cli

# 登录 Expo
eas login

# 运行测试脚本（会自动获取最新的构建）
bash scripts/test-download-upload.sh
```

### 测试步骤

脚本会自动执行以下步骤：

1. **检查环境变量** - 验证 API Key 是否设置
2. **获取下载 URL** - 从参数或最新构建中获取
3. **下载 APK** - 使用 curl 或 wget 下载
4. **获取版本信息** - 从 app.json 读取版本号
5. **上传到腾讯云存储** - 调用上传脚本上传 APK

### 输出示例

```
=== 测试 APK 下载和上传流程 ===

✅ API Key 已设置
📥 下载 URL: https://expo.dev/artifacts/eas/xxxxx.apk

=== 步骤 1: 下载 APK ===
开始下载...
✅ APK 下载成功
文件: ./test-app-release.apk
大小: 45M

=== 步骤 2: 获取版本信息 ===
✅ 版本信息获取成功
版本: v1.0.0
版本代码: 1

=== 步骤 3: 上传到腾讯云存储 ===
开始上传...
文件大小: 45.23 MB
✅ 上传成功！
文件 URL: https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/task_collection_apks/v1.0.0/app-release-v1.0.0.apk

=== 测试完成 ===
✅ 下载: 成功
✅ 版本信息: 成功
✅ 上传: 成功
```

## 方式二：使用 GitHub Actions（云端测试）

### 前置要求

1. GitHub 仓库已配置 Secrets：
   - `EXPO_TOKEN`: Expo 账号 Token
   - `EXPO_PUBLIC_API_KEY`: API Key

### 使用方法

1. **进入 GitHub 仓库**
2. **点击 Actions 标签**
3. **选择 "Test Download and Upload APK" 工作流**
4. **点击 "Run workflow"**
5. **可选：提供 APK 下载 URL**
   - 如果提供：使用提供的 URL
   - 如果不提供：自动从最新构建获取

### 工作流步骤

1. **Checkout code** - 检出代码
2. **Setup Node.js** - 设置 Node.js 环境
3. **Install dependencies** - 安装依赖
4. **Setup EAS CLI** - 设置 EAS CLI
5. **Get Latest Build URL** - 获取最新构建 URL（如果未提供）
6. **Download APK** - 下载 APK
7. **Get Version Info** - 获取版本信息
8. **Upload APK to TCB Storage** - 上传到腾讯云存储
9. **Upload Test Artifact** - 上传测试产物（用于调试）

### 查看结果

- 在工作流日志中查看每个步骤的输出
- 如果上传成功，会显示文件 URL
- 测试 APK 会作为 Artifact 保存 1 天（用于调试）

## 故障排除

### 问题 1: 下载失败

**错误**: `❌ 下载失败`

**解决方法**:
- 检查下载 URL 是否正确
- 检查网络连接
- 确认 URL 是否仍然有效

### 问题 2: 上传失败 - API Key 错误

**错误**: `无效的 API Key`

**解决方法**:
- 检查环境变量 `EXPO_PUBLIC_API_KEY` 是否正确
- 确认 API Key 与云函数环境变量中的值一致

### 问题 3: 上传失败 - 文件不存在

**错误**: `APK 文件不存在`

**解决方法**:
- 检查下载步骤是否成功
- 查看工作流日志中的下载步骤
- 确认文件路径正确

### 问题 4: 无法获取最新构建

**错误**: `未找到下载 URL`

**解决方法**:
- 确保已登录 EAS CLI (`eas login`)
- 确保有构建历史记录
- 手动提供下载 URL

## 验证上传

### 方法一：查看工作流日志

在 GitHub Actions 中查看工作流日志：
- 找到 "Upload APK to TCB Storage" 步骤
- 查看输出中的文件 URL
- 确认上传成功

### 方法二：访问文件 URL

使用浏览器访问文件 URL，确认可以下载：
```
https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/task_collection_apks/v1.0.0/app-release-v1.0.0.apk
```

### 方法三：在腾讯云控制台查看

1. 登录腾讯云控制台
2. 进入云开发控制台
3. 进入"云存储"
4. 查看 `task_collection_apks` 文件夹
5. 确认文件已上传

## 总结

✅ **测试脚本**: `scripts/test-download-upload.sh` - 用于本地测试
✅ **GitHub Actions**: `.github/workflows/test-download-upload.yml` - 用于云端测试
✅ **文档**: `docs/TEST_DOWNLOAD_UPLOAD.md` - 详细说明

现在可以随时测试下载和上传流程，无需触发完整的构建过程！

