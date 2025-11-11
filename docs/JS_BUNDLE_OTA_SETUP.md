# JS Bundle OTA 系统准备工作

## 📋 准备工作清单

要实现自建 JS Bundle OTA 系统，需要完成以下准备工作：

### ✅ 1. 云函数（不需要新建）

**重要：** 不需要新建云函数！

代码已经集成到现有的 `task-collection-api` 云函数中。你只需要：

1. **更新云函数代码**
   - 将更新后的 `cloud-function/index.js` 部署到现有的 `task-collection-api` 云函数
   - 代码已经包含了 JS Bundle 版本管理的接口：
     - `POST /app/js-bundle-versions` - 保存版本信息
     - `GET /app/js-bundle-versions` - 获取版本列表
     - `GET /app/check-js-bundle-update` - 检查更新

2. **确认环境变量**
   - 确保云函数已配置 `TCB_ENV` 环境变量
   - 确保云函数已配置 `API_KEY_1` 和 `API_KEY_2`（用于认证）

### ✅ 2. 创建数据库集合

**需要创建：** `js_bundle_versions` 集合

#### 创建步骤：

1. **登录云开发控制台**
   - 访问 [腾讯云开发控制台](https://console.cloud.tencent.com/tcb)
   - 选择你的云开发环境

2. **进入数据库**
   - 在左侧菜单中，点击 **"数据库"**
   - 进入数据库管理页面

3. **创建集合**
   - 点击 **"新建集合"** 或 **"+"** 按钮
   - 输入集合名称：`js_bundle_versions`
   - 点击 **"确定"** 或 **"创建"**

4. **配置集合权限（可选）**
   - 点击 `js_bundle_versions` 集合
   - 进入 **"权限设置"** 标签
   - 建议选择：**仅创建者可读写** 或 **所有用户可读，仅创建者可写**

5. **创建索引（可选，提高查询性能）**
   - 在 `js_bundle_versions` 集合中，点击 **"索引"** 标签
   - 点击 **"新建索引"**
   - 配置索引：
     - **字段名：** `versionCode`
     - **排序：** `降序`
     - **唯一：** `否`
   - 再创建一个索引：
     - **字段名：** `platform`
     - **排序：** `升序`
     - **唯一：** `否`
   - 点击 **"确定"**

#### 集合结构：

`js_bundle_versions` 集合将存储以下字段：

```javascript
{
  version: "1.0.0",              // 版本号
  versionCode: 1,                // 版本代码（用于比较）
  platform: "android",           // 平台（android/ios）
  bundleType: "js",              // Bundle 类型（固定为 "js"）
  downloadUrl: "https://...",   // 下载地址（腾讯云存储 URL）
  filePath: "js_bundles/v1.0.0/index.android.bundle",  // 文件路径
  fileSize: 1234567,             // 文件大小（字节）
  releaseDate: "2024-01-01...", // 发布日期
  createdAt: "2024-01-01...",   // 创建时间
  updatedAt: "2024-01-01..."    // 更新时间
}
```

### ✅ 3. 配置环境变量（本地）

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

### ✅ 4. 验证配置

#### 验证云函数接口：

1. **测试保存版本信息接口**
   ```bash
   curl -X POST https://your-cloud-function-url/app/js-bundle-versions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-api-key" \
     -d '{
       "version": "1.0.0",
       "versionCode": 1,
       "platform": "android",
       "bundleType": "js",
       "downloadUrl": "https://test.com/bundle.bundle",
       "filePath": "js_bundles/v1.0.0/index.android.bundle",
       "fileSize": 1234567
     }'
   ```

2. **测试检查更新接口**
   ```bash
   curl "https://your-cloud-function-url/app/check-js-bundle-update?currentVersion=1.0.0&versionCode=1&platform=android" \
     -H "Authorization: Bearer your-api-key"
   ```

#### 验证数据库集合：

1. 在云开发控制台的数据库中，查看 `js_bundle_versions` 集合
2. 确认集合已创建且可以访问

## 🚀 开始使用

完成准备工作后，就可以开始使用 JS Bundle OTA 系统了：

### 1. 构建 JS Bundle

```bash
npm run build-js-bundle
```
即使保留 Hermes，也可以导出 .js：
```bash
npx expo export --platform android --output-dir js-bundles --no-minify --dev
```

### 2. 上传到腾讯云存储

```bash
npm run upload-js-bundle
```

### 3. 客户端检查更新

客户端会自动检查更新，或者在"检查更新"页面手动检查。

## 📱 UI 显示

在应用的"检查更新"页面，现在会显示三种更新类型：

1. **EAS OTA 更新**（蓝色）
   - 使用 Expo Updates 服务
   - 自动下载和应用

2. **自建 JS Bundle OTA 更新**（紫色）
   - 使用自建 OTA 系统
   - 需要手动下载，下载后重启应用

3. **APK 更新**（绿色）
   - 完整应用更新
   - 需要下载并安装 APK

三种更新方式互不干扰，可以同时存在。

## ⚠️ 注意事项

1. **不需要新建云函数**
   - 所有接口都在现有的 `task-collection-api` 云函数中
   - 只需要更新云函数代码即可

2. **数据库集合必须创建**
   - `js_bundle_versions` 集合是必需的
   - 如果不存在，保存版本信息会失败

3. **环境变量**
   - 本地运行上传脚本需要 `EXPO_PUBLIC_API_KEY`
   - 云函数需要 `TCB_ENV` 和 `API_KEY_1`

4. **版本号管理**
   - 每次更新时，确保 `app.json` 中的版本号递增
   - 版本代码（versionCode）必须严格递增

## 🔍 故障排查

### 问题 1：保存版本信息失败

**可能原因：**
- 数据库集合 `js_bundle_versions` 未创建
- API Key 不正确
- 云函数未正确部署

**解决方案：**
1. 检查数据库集合是否存在
2. 检查 API Key 是否正确
3. 查看云函数日志

### 问题 2：客户端无法检测更新

**可能原因：**
- 数据库中没有版本记录
- 版本号未递增
- 云函数接口异常

**解决方案：**
1. 检查数据库中是否有版本记录
2. 确认版本号已递增
3. 查看云函数日志

## 📞 相关文档

- [JS Bundle OTA 使用指南](./JS_BUNDLE_OTA_GUIDE.md)
- [腾讯云存储配置](./TENCENT_CLOUD_SETUP.md)
- [云函数部署指南](./CLOUD_FUNCTION_DEPLOY.md)

