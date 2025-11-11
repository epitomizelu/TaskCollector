# Codemagic OTA 更新配置指南

## 📋 概述

本项目已配置 Codemagic 自动实现 OTA（Over-The-Air）更新。每次构建 APK/AAB 时，会自动构建并上传 JS Bundle 到腾讯云存储，实现应用的热更新功能。

## 🎯 功能特性

1. **自动 OTA 更新**：构建 APK/AAB 时自动构建和上传 JS Bundle
2. **独立 OTA 更新**：提供独立的 workflow，仅更新 JS Bundle（不构建 APK/AAB）
3. **版本管理**：自动保存版本信息到数据库，客户端可检测更新

## 🔧 配置说明

### 1. 环境变量配置

在 Codemagic 控制台中配置以下环境变量：

**必需的环境变量：**
- `EXPO_PUBLIC_API_KEY`：用于调用云函数 API 的密钥

**配置步骤：**
1. 登录 [Codemagic 控制台](https://codemagic.io/)
2. 进入项目 **Settings > Environment variables**
3. 添加变量：
   - **变量名：** `EXPO_PUBLIC_API_KEY`
   - **变量值：** 你的实际 API Key
   - **勾选 "Secure" 选项**（推荐，加密存储）
4. 保存

### 2. Workflow 说明

项目包含三个 workflow：

#### 2.1 `android-preview` - Android Preview Build (APK)
- **功能：** 构建 Android APK + 自动上传 OTA 更新包
- **用途：** 预览版本构建
- **输出：** APK 文件
- **OTA：** ✅ 自动构建和上传 JS Bundle

#### 2.2 `android-production` - Android Production Build (AAB)
- **功能：** 构建 Android AAB + 自动上传 OTA 更新包
- **用途：** 生产版本构建（Google Play 发布）
- **输出：** AAB 文件
- **OTA：** ✅ 自动构建和上传 JS Bundle

#### 2.3 `ota-update-only` - OTA Update Only (JS Bundle) 🆕
- **功能：** 仅构建和上传 JS Bundle（不构建 APK/AAB）
- **用途：** 快速发布 JS 代码更新，无需重新构建原生应用
- **输出：** 无（仅上传到云存储）
- **OTA：** ✅ 仅构建和上传 JS Bundle
- **优势：** 构建时间短（约 1-2 分钟），适合频繁的 JS 代码更新

## 🚀 使用方法

### 方法 1：构建 APK/AAB 时自动 OTA 更新

1. **触发构建：**
   - 在 Codemagic 控制台选择 `android-preview` 或 `android-production` workflow
   - 点击 "Start new build"
   - 选择分支（通常是 `main` 或 `master`）

2. **构建流程：**
   - ✅ 安装依赖
   - ✅ 设置 Expo
   - ✅ Prebuild（如果需要）
   - ✅ 构建 Android APK/AAB
   - ✅ **自动构建 JS Bundle**
   - ✅ **自动上传 JS Bundle 到云存储**
   - ✅ 保存版本信息到数据库

3. **完成：**
   - APK/AAB 文件会作为构建产物下载
   - JS Bundle 已上传到云存储，客户端可检测更新

### 方法 2：仅更新 JS Bundle（快速更新）

1. **触发构建：**
   - 在 Codemagic 控制台选择 `ota-update-only` workflow
   - 点击 "Start new build"
   - 选择分支

2. **构建流程：**
   - ✅ 安装依赖
   - ✅ 设置 Expo
   - ✅ **构建 JS Bundle**
   - ✅ **上传 JS Bundle 到云存储**
   - ✅ 保存版本信息到数据库

3. **完成：**
   - JS Bundle 已上传，客户端可检测更新
   - 无需下载 APK/AAB（因为未构建）

## 📝 工作流程详解

### OTA 更新步骤

1. **构建 JS Bundle**
   ```bash
   npm run build-js-bundle
   ```
   - 使用 `expo export` 命令生成 JS Bundle
   - 输出到 `js-bundles/` 目录
   - 关闭 Hermes，生成 `.js` 文件（非 `.hbc`）

2. **上传 JS Bundle**
   ```bash
   npm run upload-js-bundle
   ```
   - 上传到腾讯云存储：`js_bundles/v{version}/{filename}`
   - 使用分片上传（支持大文件）
   - 保存版本信息到数据库

3. **版本记录**
   - 版本信息保存到 `js_bundle_versions` 集合
   - 包含：版本号、版本代码、下载地址、文件大小等

### 客户端检测更新

客户端应用会自动检测更新：
- 调用云函数接口：`GET /app/check-js-bundle-update`
- 比较当前版本和最新版本
- 如果有更新，提示用户下载

## ⚙️ 配置选项

### 修改上传方式

如果需要修改上传方式（直接上传 vs 分片上传），可以在 Codemagic 环境变量中设置：

```yaml
UPLOAD_METHOD: direct  # 或 'chunk'
```

- `direct`：直接上传（默认，使用 TCB Node.js SDK）
- `chunk`：分片上传（适合超大文件）

### 修改构建配置

如果需要修改 JS Bundle 构建配置，编辑 `scripts/build-js-bundle.js`：

```javascript
// 修改输出目录
const OUTPUT_DIR = path.join(__dirname, '..', 'js-bundles');

// 修改构建命令
const bundleCommand = [
  'npx expo export',
  '--platform android',
  `--output-dir "${OUTPUT_DIR}"`,
  '--no-minify',
  '--dev'
].join(' ');
```

## 🔍 故障排查

### 问题 1：OTA 更新步骤失败

**可能原因：**
- `EXPO_PUBLIC_API_KEY` 环境变量未配置
- 云函数接口异常
- 网络连接问题

**解决方案：**
1. 检查 Codemagic 环境变量配置
2. 查看构建日志中的错误信息
3. 验证云函数是否正常运行

### 问题 2：上传失败

**可能原因：**
- 文件过大（超过云函数限制）
- 云存储权限问题
- API Key 不正确

**解决方案：**
1. 检查文件大小（分片上传支持大文件）
2. 验证云存储配置
3. 检查 API Key 是否正确

### 问题 3：客户端无法检测更新

**可能原因：**
- 版本信息未保存到数据库
- 版本号未递增
- 客户端版本检查逻辑问题

**解决方案：**
1. 检查数据库 `js_bundle_versions` 集合
2. 确认 `app.json` 中的版本号已递增
3. 查看客户端日志

## 📊 构建时间对比

| Workflow | 构建时间 | 说明 |
|----------|---------|------|
| `android-preview` | ~10-15 分钟 | 包含 APK 构建 + OTA 更新 |
| `android-production` | ~10-15 分钟 | 包含 AAB 构建 + OTA 更新 |
| `ota-update-only` | ~1-2 分钟 | 仅 OTA 更新，快速发布 |

## 💡 最佳实践

1. **版本管理**
   - 每次更新前，确保 `app.json` 中的版本号递增
   - 版本代码（versionCode）必须严格递增

2. **更新策略**
   - 小改动（仅 JS 代码）：使用 `ota-update-only` workflow
   - 大改动（原生代码变更）：使用 `android-preview` 或 `android-production` workflow

3. **测试流程**
   - 先在预览环境测试 OTA 更新
   - 确认更新正常后再发布到生产环境

4. **监控**
   - 定期检查数据库中的版本记录
   - 监控客户端更新成功率

## 📚 相关文档

- [JS Bundle OTA 设置指南](./JS_BUNDLE_OTA_SETUP.md)
- [JS Bundle OTA 使用指南](./JS_BUNDLE_OTA_GUIDE.md)
- [Codemagic 官方文档](https://docs.codemagic.io/)

## 🎉 总结

通过 Codemagic 实现 OTA 更新，你可以：

✅ **自动化流程**：构建 APK/AAB 时自动上传 OTA 更新包  
✅ **快速更新**：使用 `ota-update-only` workflow 快速发布 JS 代码更新  
✅ **版本管理**：自动保存版本信息，客户端可检测更新  
✅ **灵活配置**：支持多种上传方式和构建配置  

现在你可以在 Codemagic 中触发构建，OTA 更新会自动完成！🚀

