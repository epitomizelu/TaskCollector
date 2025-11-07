# 手动更新功能实现说明（方案二）

## 已完成的工作

### 1. 云函数版本检查接口

**文件：** `cloud-function/index.js`

**接口路径：** `GET /app/check-update`

**参数：**
- `currentVersion`: 当前版本号（如 "1.0.0"）
- `versionCode`: 当前版本代码（如 1）
- `platform`: 平台（"android"）

**返回数据：**
```json
{
  "code": 0,
  "data": {
    "hasUpdate": true,
    "latestVersion": "1.0.1",
    "latestVersionCode": 2,
    "downloadUrl": "https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/task_collection_apks/v1.0.1/app-release.apk",
    "forceUpdate": false,
    "updateLog": "修复了一些 bug，优化了性能",
    "fileSize": 0,
    "releaseDate": "2025-01-15T10:00:00Z"
  }
}
```

**云存储配置：**
- 域名：`636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la`
- 文件夹：`task_collection_apks`
- APK 路径格式：`/task_collection_apks/v{version}/app-release.apk`

### 2. 客户端更新服务

**文件：** `services/app-update.service.ts`

**功能：**
- `checkForUpdate()` - 手动检查更新
- `downloadApk()` - 下载 APK（支持进度回调）
- `pauseDownload()` - 暂停下载
- `resumeDownload()` - 恢复下载
- `installApk()` - 安装 APK
- `formatFileSize()` - 格式化文件大小

### 3. 更新界面组件

**文件：** `screens/app-update/index.tsx`

**功能：**
- 显示当前版本信息
- 手动检查更新按钮
- 显示更新信息（版本号、更新日志、文件大小）
- 下载进度显示
- 下载和安装按钮

### 4. 权限配置

**文件：** `app.json`

已添加权限：
- `android.permission.REQUEST_INSTALL_PACKAGES` - Android 8.0+ 安装权限

### 5. 入口配置

**模块首页：** `app/module-home.tsx`
- 在右上角添加了"检查更新"按钮
- 点击后跳转到更新页面

**路由配置：** `app/_layout.tsx`
- 添加了 `app-update` 路由

## 使用方法

### 用户端

1. **进入模块首页**
2. **点击右上角的"检查更新"按钮**（旋转箭头图标）
3. **在更新页面点击"检查更新"按钮**
4. **如果有新版本，点击"立即更新"**
5. **等待下载完成**
6. **点击"安装"按钮安装 APK**

### 开发者端

#### 1. 上传 APK 到云存储

**路径结构：**
```
task_collection_apks/
├── v1.0.0/
│   └── app-release.apk
├── v1.0.1/
│   └── app-release.apk
└── latest/
    └── app-release.apk (可选，指向最新版本)
```

**上传方式：**
- 使用腾讯云控制台上传
- 或使用 COS CLI 上传

#### 2. 更新云函数中的版本信息

**文件：** `cloud-function/index.js`

**修改位置：** `handleAppCheckUpdate` 函数中的 `latestVersion` 对象

```javascript
const latestVersion = {
  version: '1.0.1',  // 更新版本号
  versionCode: 2,     // 更新版本代码
  platform: 'android',
  downloadUrl: `https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/task_collection_apks/v1.0.1/app-release.apk`,
  forceUpdate: false, // 是否强制更新
  updateLog: '修复了一些 bug，优化了性能', // 更新日志
  fileSize: 0, // 文件大小（字节），可以从云存储获取
  releaseDate: new Date().toISOString(),
};
```

**建议：** 后续可以将版本信息存储到数据库，方便管理。

## 工作流程

```
用户点击"检查更新"
    ↓
调用云函数 /app/check-update
    ↓
对比版本号（versionCode）
    ↓
如果有更新，显示更新信息
    ↓
用户点击"立即更新"
    ↓
下载 APK 到应用私有目录
    ↓
显示下载进度
    ↓
下载完成，提示安装
    ↓
调用系统安装器
    ↓
用户确认安装
    ↓
安装完成
```

## 注意事项

### 1. 版本号管理

- 使用 `versionCode` 进行版本对比（数字，更可靠）
- 每次发布新版本，需要更新 `app.json` 中的 `version` 和 `versionCode`
- 云函数中的版本信息需要同步更新

### 2. 云存储配置

- 确保云存储桶设置为"公有读"
- APK 文件路径需要与云函数中的 `downloadUrl` 一致
- 建议使用版本号作为文件夹名称，便于管理

### 3. 权限处理

- Android 8.0+ 需要 `REQUEST_INSTALL_PACKAGES` 权限
- 首次安装时，系统会弹出权限请求
- 如果用户拒绝，需要引导用户到设置中开启

### 4. 错误处理

- 网络错误：显示友好提示，支持重试
- 下载失败：显示错误信息，支持重新下载
- 安装失败：提示用户手动安装

### 5. 文件存储

- Android 10+ 使用应用私有目录（无需额外权限）
- Android 10 以下可以使用外部存储（需要权限）

## 后续优化建议

1. **版本信息数据库化**
   - 将版本信息存储到 MongoDB
   - 支持多版本管理
   - 支持强制更新配置

2. **文件完整性验证**
   - 计算 APK 的 MD5/SHA256
   - 下载后验证文件完整性

3. **下载优化**
   - 支持断点续传
   - 支持后台下载
   - 显示下载速度

4. **用户体验优化**
   - 支持静默下载（后台）
   - 下载完成后自动提示安装
   - 显示更新日志详情

5. **统计分析**
   - 记录更新检查次数
   - 记录下载成功率
   - 记录安装成功率

## 测试步骤

1. **测试检查更新**
   - 修改云函数中的版本号
   - 点击"检查更新"，验证是否显示新版本

2. **测试下载**
   - 点击"立即更新"
   - 验证下载进度显示
   - 验证下载完成提示

3. **测试安装**
   - 下载完成后点击"安装"
   - 验证系统安装器是否启动
   - 验证安装是否成功

4. **测试错误处理**
   - 断开网络，测试网络错误
   - 修改下载链接为无效链接，测试下载失败
   - 拒绝安装权限，测试安装失败

## 总结

✅ **已完成：**
- 云函数版本检查接口
- 客户端更新服务
- 更新界面组件
- 权限配置
- 入口配置

✅ **特点：**
- 手动检查更新（不自动）
- 支持下载进度显示
- 支持暂停和恢复下载
- 支持安装 APK
- 完整的错误处理

✅ **使用：**
- 用户在模块首页点击"检查更新"按钮
- 手动触发更新检查
- 手动下载和安装

