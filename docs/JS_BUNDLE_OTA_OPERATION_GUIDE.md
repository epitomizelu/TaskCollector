# JS Bundle OTA 更新操作指南

## 📋 概述

自建 JS Bundle OTA 更新系统支持在不重新安装 APK 的情况下更新应用的 JavaScript 代码。更新使用独立的 `jsVersionCode` 管理，与 APK 的 `versionCode` 完全分离。

## 🔧 开发者操作步骤（上传 JS Bundle）

### 1. 构建 JS Bundle

```bash
# 构建 JS Bundle 文件
node scripts/build-js-bundle.js
```

构建完成后，会在 `js-bundles/` 目录下生成 `entry-{hash}.js` 文件。

### 2. 上传 JS Bundle 到云存储

```bash
# 上传 JS Bundle（使用分片上传）
node scripts/upload-js-bundle.js
```

**上传流程：**
1. 自动读取 `app.json` 中的版本信息（`version`）
2. 分片上传文件（每片 2MB，Base64 编码后约 2.67MB）
3. 创建合并任务，异步合并所有分片
4. 等待合并任务完成（最多等待 5 秒 + 3 次查询）
5. 调用 `/storage/finish-upload` 保存版本记录
6. **云函数自动递增 `jsVersionCode`**（查询当前最大 `jsVersionCode`，然后 +1）

**上传输出示例：**
```
找到文件: entry-d41d8cd98f00b204e9800998ecf8427e.js (10.72 MB)
开始分片上传: 10.72 MB，6 个分片
所有分片上传完成，合并文件...
合并任务完成！进度: 100%
保存版本记录...
上传完成 ✅
版本: 1.0.0
文件: entry-d41d8cd98f00b204e9800998ecf8427e.js
注意: jsVersionCode 已由云函数自动递增
```

### 3. 验证上传结果

- 检查云函数日志，确认 `jsVersionCode` 已正确递增
- 检查数据库 `js_bundle_versions` 集合，确认版本记录已保存
- 确认文件已上传到云存储路径：`js_bundles/v{version}/entry-{hash}.js`

## 📱 用户操作步骤（应用内更新）

### 1. 进入"检查更新"页面

在应用内导航到"检查更新"页面（`app-update` 路由）。

### 2. 手动检查更新

点击"检查更新"按钮，系统会：
1. 从本地存储读取当前 `jsVersionCode`（默认 0，首次使用）
2. 调用云函数 `/app/check-js-bundle-update?jsVersionCode={当前值}&platform=android`
3. 云函数查询数据库，按 `jsVersionCode` 降序获取最新版本
4. 比较：`latestJsVersionCode > currentJsVersionCode` 则返回有更新

### 3. 查看更新信息

如果有更新，页面会显示：
- **最新版本**：`v{version} (JS Build {jsVersionCode})`
- **文件大小**：更新文件的大小
- **下载按钮**："下载 JS Bundle 更新"

### 4. 下载更新

点击"下载 JS Bundle 更新"按钮：
1. 开始下载 JS Bundle 文件
2. 显示下载进度（进度条和百分比）
3. 下载到本地：`{documentDirectory}js-bundles/index.android.{ext}`

### 5. 应用更新

下载完成后，系统自动应用更新：

**对于 `.js` 文件：**
1. 动态执行 JS Bundle（使用 `Function` 构造函数在沙箱中执行）
2. 保存新的 `jsVersionCode` 到本地存储
3. 提示："更新完成，新版本已应用（无需重启）"

**对于 `.hbc` 文件：**
1. 保存更新信息到 `js-bundle-update-info.json`
2. 保存新的 `jsVersionCode` 到本地存储
3. 提示："更新下载完成，下次重启后将应用新版本"

### 6. 验证更新

- 下次检查更新时，会使用新的 `jsVersionCode` 进行比较
- 如果已是最新版本，会显示"当前已是最新版本，无需自建 JS Bundle OTA 更新"

## 🔑 关键特性

### 1. 独立的版本管理

- **JS Bundle 更新**：使用 `jsVersionCode`（从 1 开始，自动递增）
- **APK 更新**：使用 `versionCode`（从 `app.json` 读取）
- 两者完全独立，互不影响

### 2. 自动递增机制

- 每次上传 JS Bundle 时，云函数自动查询当前平台的最大 `jsVersionCode`
- 自动递增（+1）并保存到数据库
- 无需手动指定 `jsVersionCode`

### 3. 本地存储管理

- `jsVersionCode` 保存在：`{documentDirectory}js_bundle_version_code.json`
- 首次使用时默认为 0
- 更新成功后自动更新为最新的 `jsVersionCode`

### 4. 仅支持手动更新

- **不会自动检查更新**：应用启动时不会自动检查 JS Bundle 更新
- **不会自动下载更新**：需要用户手动点击"检查更新"和"下载更新"按钮
- **完全由用户控制**：用户可以选择是否更新

## 📊 数据库结构

### `js_bundle_versions` 集合

```javascript
{
  _id: ObjectId("..."),
  version: "1.0.0",                    // APK 版本号（用于显示）
  jsVersionCode: 1,                    // JS Bundle 版本代码（用于比较）
  platform: "android",                 // 平台
  bundleType: "js",                    // Bundle 类型
  downloadUrl: "https://...",          // 下载地址
  filePath: "js_bundles/v1.0.0/...",  // 云存储路径
  fileSize: 11238318,                  // 文件大小（字节）
  releaseDate: "2025-01-11T...",      // 发布日期
  createdAt: "2025-01-11T...",         // 创建时间
  updatedAt: "2025-01-11T..."          // 更新时间
}
```

## 🔄 完整流程示例

### 开发者端（上传）

```bash
# 1. 构建
node scripts/build-js-bundle.js

# 2. 上传（第一次）
node scripts/upload-js-bundle.js
# → jsVersionCode = 1

# 3. 修改代码后再次上传（第二次）
node scripts/upload-js-bundle.js
# → jsVersionCode = 2（自动递增）
```

### 用户端（更新）

1. **首次使用**：
   - 本地 `jsVersionCode = 0`
   - 检查更新：服务器返回 `latestJsVersionCode = 2`
   - 有更新：`2 > 0` ✅

2. **下载并应用更新**：
   - 下载 JS Bundle 文件
   - 应用更新（动态执行或保存信息）
   - 保存 `jsVersionCode = 2` 到本地存储

3. **再次检查更新**：
   - 本地 `jsVersionCode = 2`
   - 检查更新：服务器返回 `latestJsVersionCode = 2`
   - 无更新：`2 > 2` ❌

4. **开发者上传新版本后**：
   - 本地 `jsVersionCode = 2`
   - 检查更新：服务器返回 `latestJsVersionCode = 3`
   - 有更新：`3 > 2` ✅

## ⚠️ 注意事项

1. **仅支持手动更新**：不会自动检查或下载更新
2. **版本号独立**：`jsVersionCode` 与 APK 的 `versionCode` 完全分离
3. **自动递增**：上传时无需指定 `jsVersionCode`，云函数自动处理
4. **本地存储**：`jsVersionCode` 保存在本地，卸载应用后会重置为 0
5. **文件格式**：支持 `.js`（动态执行）和 `.hbc`（重启加载）两种格式

## 🐛 故障排查

### 上传失败

- 检查云函数是否正常部署
- 检查数据库集合 `js_bundle_versions` 和 `merge_tasks` 是否已创建
- 查看云函数日志，确认分片上传和合并任务是否成功

### 检查更新失败

- 检查网络连接
- 检查 API 配置（`config/api.config.ts`）
- 查看客户端日志，确认 `jsVersionCode` 是否正确读取

### 更新不生效

- 检查本地存储文件 `js_bundle_version_code.json` 是否存在
- 确认 `jsVersionCode` 是否正确保存
- 对于 `.js` 文件，检查动态执行是否成功
- 对于 `.hbc` 文件，确认是否已重启应用

