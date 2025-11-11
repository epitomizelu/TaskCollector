# Codemagic OTA 更新方案总结

## 📋 方案概述

基于 Codemagic CI/CD 的完整 OTA 更新方案，实现从构建到发布的自动化流程。

## 🏗️ 架构流程

```
代码提交 → Codemagic 构建 → 自动构建 JS Bundle → 上传到云存储 → 保存版本信息 → APP 检测更新 → 下载应用
```

## 🔧 核心组件

### 1. Codemagic 配置 (`codemagic.yaml`)

**三个 Workflow：**

- **`android-preview`** - 构建 APK + 自动 OTA 更新
- **`android-production`** - 构建 AAB + 自动 OTA 更新  
- **`ota-update-only`** - 仅 OTA 更新（1-2分钟，快速发布）

**关键步骤：**
```yaml
- name: Build and Upload JS Bundle (OTA Update)
  script: |
    npm run build-js-bundle    # 构建 JS Bundle
    npm run upload-js-bundle    # 上传到云存储
```

### 2. 构建脚本

- **`scripts/build-js-bundle.js`** - 使用 `expo export` 生成 JS Bundle
- **`scripts/upload-js-bundle.js`** - 分片上传到腾讯云存储，保存版本信息

### 3. 云函数/数据库

- **云函数接口：** `/app/check-js-bundle-update` - 检查更新
- **数据库集合：** `js_bundle_versions` - 存储版本信息
- **云存储路径：** `js_bundles/v{version}/{filename}`

### 4. APP 端服务

- **`services/unified-update.service.ts`** - 统一更新服务
- **`services/js-bundle-update.service.ts`** - JS Bundle 更新服务
- **`screens/app-update/index.tsx`** - 更新界面

## 🚀 完整流程

### 步骤 1：配置 Codemagic

1. 在 Codemagic 控制台设置环境变量：
   - `EXPO_PUBLIC_API_KEY` - API 密钥（Secure）

2. 提交代码到 Git，触发构建

### 步骤 2：自动构建和上传

**触发方式：**
- 构建 APK/AAB 时：自动执行 OTA 更新
- 仅更新 JS：使用 `ota-update-only` workflow

**执行流程：**
```
1. 安装依赖 (npm ci)
2. 设置 Expo (npx expo install --fix)
3. 构建 APK/AAB (可选)
4. 构建 JS Bundle (npx expo export)
5. 上传 JS Bundle 到云存储
6. 保存版本信息到数据库
```

### 步骤 3：APP 端检测更新

**检测方式：**
- **手动触发：** 打开"检查更新"页面，点击"检查更新"
- **自动触发：** 应用启动时自动检查（可选）

**检测流程：**
```
1. 调用云函数检查更新
2. 比较版本号 (versionCode)
3. 如果有更新，显示下载按钮
4. 用户点击下载
5. 下载完成后重启应用
```

## 📊 方案优势

✅ **完全自动化** - 构建时自动上传，无需手动操作  
✅ **快速发布** - `ota-update-only` workflow 仅需 1-2 分钟  
✅ **版本管理** - 自动保存版本信息，支持版本比较  
✅ **灵活配置** - 支持多种触发方式和更新策略  
✅ **错误处理** - 完善的错误处理和重试机制  

## 🎯 使用场景

| 场景 | 使用 Workflow | 时间 |
|------|--------------|------|
| 发布新版本（含原生代码） | `android-preview` / `android-production` | ~10-15 分钟 |
| 仅更新 JS 代码 | `ota-update-only` | ~1-2 分钟 |
| 紧急修复 Bug | `ota-update-only` | ~1-2 分钟 |

## 📝 关键配置

### Codemagic 环境变量
```yaml
EXPO_PUBLIC_API_KEY: "your-api-key"  # 必需
```

### 版本号管理
```json
// app.json
{
  "expo": {
    "version": "1.0.0",           // 版本号（递增）
    "android": {
      "versionCode": 1              // 版本代码（严格递增）
    }
  }
}
```

### APP 端触发
```typescript
// 检查更新
const updateInfo = await unifiedUpdateService.checkForUpdates();

// 下载并应用
if (updateInfo.jsBundleOtaUpdate?.hasUpdate) {
  await unifiedUpdateService.downloadAndApplyJSBundleOTA();
}
```

## 🔍 工作流程示例

### 场景：修复一个 JS Bug

1. **修复代码** → 提交到 Git
2. **触发构建** → 选择 `ota-update-only` workflow
3. **自动执行** → Codemagic 自动构建和上传（1-2分钟）
4. **用户更新** → APP 检测到更新，提示用户下载
5. **应用更新** → 用户下载后重启应用，Bug 修复完成

### 场景：发布新版本

1. **更新版本号** → 修改 `app.json` 中的版本号
2. **提交代码** → 提交到 Git
3. **触发构建** → 选择 `android-production` workflow
4. **自动执行** → 构建 AAB + 上传 OTA 更新包（10-15分钟）
5. **发布到商店** → 上传 AAB 到 Google Play
6. **用户更新** → 用户可通过 OTA 或商店更新

## ⚠️ 注意事项

1. **版本号必须递增** - `versionCode` 必须严格递增
2. **环境变量配置** - 确保 Codemagic 中配置了 `EXPO_PUBLIC_API_KEY`
3. **数据库集合** - 确保创建了 `js_bundle_versions` 集合
4. **网络要求** - APP 端需要网络连接才能检查更新
5. **文件格式** - 支持 `.js`（自动应用）和 `.hbc`（需重启）

## 📚 相关文档

- [Codemagic OTA 更新配置指南](./CODEMAGIC_OTA_UPDATE.md) - 详细配置说明
- [APP 端触发指南](./APP_OTA_UPDATE_TRIGGER.md) - APP 端使用方法
- [JS Bundle OTA 设置指南](./JS_BUNDLE_OTA_SETUP.md) - 准备工作

## 🎉 总结

这是一个**端到端的自动化 OTA 更新方案**：

1. **CI/CD 自动化** - Codemagic 构建时自动上传
2. **版本管理** - 云函数和数据库管理版本信息
3. **客户端检测** - APP 自动或手动检测更新
4. **快速发布** - 支持快速发布 JS 代码更新

**核心价值：** 实现从代码提交到用户更新的全自动化流程，大幅提升发布效率！🚀

