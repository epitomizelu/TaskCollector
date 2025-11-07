# Android 应用手动更新方案

## 问题背景

用户反馈：下载 APK 并手动安装太麻烦，希望实现应用内更新功能。

## 方案对比

### 方案一：Google Play 应用内更新（In-App Update）⭐ 推荐

**适用场景：**
- 应用已上架 Google Play 商店
- 需要 Google Play 服务支持

**工作原理：**
1. 应用启动时检查 Google Play 商店中的最新版本
2. 如果发现新版本，弹出更新提示
3. 用户点击更新，直接在应用内下载并安装
4. 无需离开应用，无需手动下载 APK

**优点：**
- ✅ 用户体验最好（无缝更新）
- ✅ 安全性高（Google Play 验证）
- ✅ 支持增量更新（节省流量）
- ✅ 自动处理权限和安装流程
- ✅ 支持强制更新和可选更新

**缺点：**
- ❌ 需要上架 Google Play 商店
- ❌ 需要 Google Play 服务（国内可能不可用）
- ❌ 需要配置 Google Play Console

**实现要点：**
- 使用 `react-native-in-app-update` 或 `expo-updates`（如果支持）
- 需要配置 Google Play Console 的更新策略
- 需要处理 Google Play 服务不可用的情况

---

### 方案二：自定义更新检查 + APK 下载安装

**适用场景：**
- 应用未上架应用商店
- 需要完全控制更新流程
- 支持国内环境

**工作原理：**
1. 应用启动时调用云函数检查最新版本
2. 对比本地版本号和服务器版本号
3. 如果有新版本，显示更新提示
4. 用户点击更新，下载 APK 文件
5. 下载完成后，调用系统安装器安装

**优点：**
- ✅ 完全自主控制
- ✅ 不依赖 Google Play
- ✅ 支持国内环境
- ✅ 可以自定义更新界面
- ✅ 可以控制更新策略（强制/可选）

**缺点：**
- ❌ 需要实现下载和安装逻辑
- ❌ 需要处理 Android 8.0+ 的安装权限
- ❌ 需要处理文件下载和存储
- ❌ 需要处理安装失败的情况

**实现要点：**
- 需要添加 `WRITE_EXTERNAL_STORAGE` 权限（Android 10 以下）
- 需要添加 `REQUEST_INSTALL_PACKAGES` 权限（Android 8.0+）
- 需要实现 APK 下载功能（使用 `expo-file-system`）
- 需要实现安装功能（使用 `expo-intent-launcher` 或原生模块）
- 需要处理下载进度显示
- 需要处理网络错误和下载失败

**技术栈：**
- `expo-file-system` - 文件下载
- `expo-intent-launcher` - 调用系统安装器
- 云函数 - 版本检查接口

---

### 方案三：Expo Updates（OTA 更新）⭐ 最适合只修改 JS 代码的场景

**适用场景：**
- ✅ 使用 Expo 管理的项目（你的项目符合）
- ✅ 只需要更新 JavaScript/TypeScript 代码
- ✅ 不需要更新原生代码
- ✅ 添加新模块、修改 UI、修复 bug（纯 JS 代码）

**工作原理：**
1. 使用 Expo Updates 服务
2. 发布新版本到 Expo 服务器（只上传 JS bundle）
3. 应用启动时检查更新
4. 自动下载并应用更新（无需重新安装 APK）

**优点：**
- ✅ **更新速度快**（只更新 JS 代码，通常几 MB）
- ✅ **用户无需重新安装**（无需下载 APK）
- ✅ **支持灰度发布**（可以指定部分用户更新）
- ✅ **可以回滚版本**（如果新版本有问题）
- ✅ **非常适合你的场景**（只修改 JS 代码，不需要重新打包）

**缺点：**
- ❌ 只能更新 JavaScript 代码
- ❌ 不能更新原生代码（需要重新打包）
- ❌ 需要 Expo 账户和服务
- ❌ 需要网络连接
- ❌ EAS Update 免费版有限制（可能需要付费）

**实现要点：**
- 安装 `expo-updates` 库
- 配置 `app.json` 中的更新策略
- 使用 EAS Update 服务（免费版有使用限制）
- 发布更新：`eas update --branch production`

---

### 方案四：第三方更新服务

**适用场景：**
- 不想自己实现更新逻辑
- 需要专业的更新服务

**可选服务：**
1. **Firebase App Distribution**
   - Google 提供的测试分发服务
   - 支持版本管理和自动更新通知

2. **Microsoft App Center**
   - 微软提供的应用管理平台
   - 支持分发和更新

3. **蒲公英 / fir.im**
   - 国内的应用分发平台
   - 支持版本管理和更新检查

**优点：**
- ✅ 专业的服务
- ✅ 完善的统计和分析
- ✅ 支持多种平台

**缺点：**
- ❌ 需要依赖第三方服务
- ❌ 可能有费用
- ❌ 需要集成 SDK

---

## 推荐方案

### 如果只修改 JS 代码（添加模块、修改功能）⭐ 强烈推荐

**推荐：方案三（Expo Updates OTA 更新）**

理由：
- ✅ **不需要重新打包 APK**（只更新 JS bundle）
- ✅ **用户无需重新安装**（自动更新，体验好）
- ✅ **更新速度快**（通常几秒到几分钟）
- ✅ **非常适合你的场景**（目前增加模块修改功能都只设计 JS）
- ✅ **支持灰度发布和回滚**

**适用场景：**
- 添加新模块（如任务清单模块）
- 修改 UI 界面
- 修复 bug
- 优化功能
- 所有纯 JS/TS 代码的修改

### 如果需要修改原生代码

**推荐：方案二（自定义更新检查 + APK 下载安装）**

理由：
- 需要重新打包 APK
- 需要用户重新安装
- 完全自主控制

**适用场景：**
- 添加新的原生模块
- 修改 `app.json` 配置（权限、插件等）
- 更新 Expo SDK 版本
- 修改原生代码

### 如果应用已上架 Google Play

**推荐：方案一（Google Play 应用内更新）**

理由：
- 用户体验最好
- 安全性高
- 实现相对简单

---

## 方案三详细设计（推荐用于你的场景）

### 1. 安装和配置

**第一步：安装 expo-updates**
```bash
npx expo install expo-updates
```

**第二步：配置 app.json**
```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/6871505d-550b-4d0e-8e87-b6537f15a5b4"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

**第三步：配置 eas.json**
```json
{
  "build": {
    "production": {
      "channel": "production"
    },
    "preview": {
      "channel": "preview"
    }
  },
  "update": {
    "production": {
      "channel": "production"
    },
    "preview": {
      "channel": "preview"
    }
  }
}
```

### 2. 发布更新流程

**开发完成后：**
```bash
# 1. 提交代码到 Git
git add .
git commit -m "添加新模块"
git push

# 2. 发布更新到生产环境
eas update --branch production --message "添加任务清单模块"

# 或发布到预览环境
eas update --branch preview --message "添加任务清单模块"
```

**用户端：**
- 应用启动时自动检查更新
- 如果有新版本，自动下载并应用
- 用户无需任何操作

### 3. 版本管理

**runtimeVersion 策略：**
- `appVersion`：使用 `app.json` 中的 `version`（如 "1.0.0"）
- `nativeVersion`：使用 `versionCode`（如 1）
- `sdkVersion`：使用 Expo SDK 版本

**重要：**
- 如果修改了原生代码，需要更新 `runtimeVersion` 并重新打包 APK
- 如果只修改 JS 代码，`runtimeVersion` 不变，可以直接发布更新

### 4. 更新检查策略

**checkAutomatically 选项：**
- `ON_LOAD`：应用启动时检查（推荐）
- `ON_ERROR_RECOVERY`：只在错误恢复时检查
- `NEVER`：不自动检查（需要手动调用）

### 5. 强制更新

如果需要强制更新：
```typescript
import * as Updates from 'expo-updates';

// 检查更新
const update = await Updates.checkForUpdateAsync();
if (update.isAvailable) {
  // 下载更新
  await Updates.fetchUpdateAsync();
  // 强制重启应用
  await Updates.reloadAsync();
}
```

### 6. 成本说明

**EAS Update 免费版限制：**
- 每月 10,000 次更新请求
- 存储限制 1 GB
- 适合中小型应用

**如果超出限制：**
- 需要升级到付费版
- 或使用方案二（自定义更新）

### 7. 工作流程示例

**场景：添加任务清单模块（纯 JS 代码）**

1. **开发阶段：**
   ```bash
   # 本地开发
   npm start
   # 修改代码，测试功能
   ```

2. **发布更新：**
   ```bash
   # 发布到生产环境
   eas update --branch production --message "添加任务清单模块"
   ```

3. **用户端：**
   - 用户打开应用
   - 应用自动检查更新
   - 发现新版本，自动下载（几 MB）
   - 下载完成后，自动应用更新
   - 用户看到新模块，无需重新安装

**优势：**
- ✅ 不需要重新打包 APK
- ✅ 不需要用户重新安装
- ✅ 更新速度快（几秒到几分钟）
- ✅ 可以随时回滚

---

## 方案二详细设计

### 1. 版本检查接口

**云函数接口：**
- 路径：`/app/check-update`
- 方法：`GET`
- 参数：
  - `currentVersion`: 当前版本号（如 "1.0.0"）
  - `versionCode`: 当前版本代码（如 1）
  - `platform`: 平台（"android"）
- 返回：
  ```json
  {
    "code": 200,
    "data": {
      "hasUpdate": true,
      "latestVersion": "1.0.1",
      "latestVersionCode": 2,
      "downloadUrl": "https://example.com/app-v1.0.1.apk",
      "forceUpdate": false,
      "updateLog": "修复了一些 bug",
      "fileSize": 12345678
    }
  }
  ```

### 2. 更新流程

**步骤：**
1. 应用启动时调用版本检查接口
2. 对比版本号，判断是否需要更新
3. 如果需要更新，显示更新对话框
4. 用户点击"立即更新"，开始下载
5. 显示下载进度
6. 下载完成后，调用系统安装器
7. 安装完成后，重启应用

### 3. 权限配置

**app.json 中添加：**
```json
{
  "android": {
    "permissions": [
      "android.permission.INTERNET",
      "android.permission.REQUEST_INSTALL_PACKAGES",
      "android.permission.WRITE_EXTERNAL_STORAGE"
    ]
  }
}
```

**注意：**
- Android 8.0+ 需要 `REQUEST_INSTALL_PACKAGES` 权限
- Android 10+ 可能不需要 `WRITE_EXTERNAL_STORAGE`（使用应用私有目录）
- 需要动态请求安装权限

### 4. APK 存储和分发

#### 4.1 EAS Build 构建后的 APK 位置

**EAS Build 构建完成后，APK 存储在以下位置：**

1. **Expo Dashboard（默认）**
   - 访问：https://expo.dev
   - 登录后，在项目页面可以看到构建历史
   - 每个构建都有下载链接
   - 链接格式：`https://expo.dev/artifacts/eas/xxx.apk`

2. **通过命令行获取**
   ```bash
   # 查看构建列表
   eas build:list
   
   # 下载 APK（会显示下载链接）
   eas build:download --platform android --latest
   ```

3. **GitHub Actions 构建**
   - 如果使用 GitHub Actions，APK 会作为 Artifact 存储
   - 可以在 GitHub Actions 页面下载
   - 保留时间：7 天（可配置）

#### 4.2 将 APK 上传到云存储（推荐）

**为了供用户下载，需要将 APK 上传到云存储：**

**方案 A：腾讯云 COS（推荐，与云函数同一平台）**

1. **创建 COS 存储桶**
   - 登录腾讯云控制台
   - 创建 COS 存储桶（如 `app-updates`）
   - 设置公开读取权限

2. **上传 APK 到 COS**
   ```bash
   # 使用腾讯云 CLI 上传
   coscmd upload app-release.apk /releases/v1.0.1/app-release.apk
   
   # 或使用 SDK 上传（在 CI/CD 中）
   ```

3. **获取下载链接**
   - COS 会生成公开访问链接
   - 格式：`https://app-updates-xxx.cos.ap-shanghai.myqcloud.com/releases/v1.0.1/app-release.apk`

**方案 B：GitHub Releases**

1. **创建 Release**
   ```bash
   # 使用 GitHub CLI
   gh release create v1.0.1 app-release.apk
   ```

2. **获取下载链接**
   - 格式：`https://github.com/username/repo/releases/download/v1.0.1/app-release.apk`

**方案 C：自建服务器**

1. **上传到服务器**
   ```bash
   # 使用 scp 上传
   scp app-release.apk user@server:/var/www/apps/
   ```

2. **配置 Nginx 提供下载**
   ```nginx
   location /apps/ {
       alias /var/www/apps/;
       add_header Content-Disposition "attachment";
   }
   ```

#### 4.3 自动化上传流程（CI/CD）

**在 GitHub Actions 中自动上传：**

```yaml
- name: Upload APK to COS
  if: success()
  run: |
    # 下载构建的 APK
    eas build:download --platform android --latest --output ./app-release.apk
    
    # 上传到腾讯云 COS
    pip install coscmd
    coscmd config -a ${{ secrets.COS_SECRET_ID }} -s ${{ secrets.COS_SECRET_KEY }} -b app-updates -r ap-shanghai
    coscmd upload app-release.apk /releases/v${{ github.ref_name }}/app-release.apk
    
    # 获取下载链接
    DOWNLOAD_URL="https://app-updates-xxx.cos.ap-shanghai.myqcloud.com/releases/v${{ github.ref_name }}/app-release.apk"
    echo "APK_DOWNLOAD_URL=$DOWNLOAD_URL" >> $GITHUB_ENV
```

#### 4.4 版本检查接口中的下载链接

**在云函数的版本检查接口中返回下载链接：**

```javascript
// 云函数 /app/check-update
{
  code: 200,
  data: {
    hasUpdate: true,
    latestVersion: "1.0.1",
    latestVersionCode: 2,
    downloadUrl: "https://app-updates-xxx.cos.ap-shanghai.myqcloud.com/releases/v1.0.1/app-release.apk",
    forceUpdate: false,
    updateLog: "添加任务清单模块",
    fileSize: 12345678
  }
}
```

#### 4.5 客户端下载存储位置

**应用下载 APK 后的存储位置：**
- Android 10+：使用应用私有目录（`FileSystem.documentDirectory`）
- Android 10 以下：可以使用外部存储（需要权限）

### 5. 更新策略

**可选更新：**
- 显示更新提示，用户可以选择"稍后更新"
- 可以设置"不再提醒"选项

**强制更新：**
- 必须更新才能使用应用
- 不允许跳过或关闭对话框

**版本对比：**
- 使用 `versionCode` 进行对比（数字，更可靠）
- 也可以使用 `version`（字符串，需要解析）

### 6. 错误处理

**需要处理的错误：**
- 网络错误（无法连接服务器）
- 下载失败（网络中断、存储空间不足）
- 安装失败（权限不足、APK 损坏）
- 版本检查失败（服务器错误）

**处理方式：**
- 显示友好的错误提示
- 提供重试功能
- 记录错误日志

### 7. 用户体验优化

**建议：**
- 在后台下载（不阻塞用户操作）
- 显示下载进度条
- 支持暂停和恢复下载
- 下载完成后自动安装（可选）
- 显示更新日志
- 支持增量更新（如果可能）

---

## 实现步骤（方案二）

### 第一步：创建版本检查接口

在云函数中添加 `/app/check-update` 接口：
- 从数据库或配置文件读取最新版本信息
- 对比客户端版本
- 返回更新信息（包括 APK 下载链接）

**接口实现要点：**
- 从数据库或配置文件读取最新版本
- 返回 APK 下载链接（存储在云存储中的地址）
- 支持版本对比（versionCode）

### 第二步：配置权限

在 `app.json` 中添加必要的权限：
- `REQUEST_INSTALL_PACKAGES`
- `WRITE_EXTERNAL_STORAGE`（如果需要）

### 第三步：实现更新服务

创建更新服务模块：
- 版本检查逻辑
- APK 下载逻辑
- 安装逻辑
- 进度回调

### 第四步：实现更新界面

创建更新对话框组件：
- 显示更新信息
- 下载进度显示
- 更新按钮
- 错误提示

### 第五步：集成到应用

在应用启动时调用更新检查：
- 在 `app/_layout.tsx` 或主入口文件中
- 静默检查（不阻塞启动）
- 有更新时显示提示

### 第六步：测试

测试场景：
- 正常更新流程
- 网络错误处理
- 下载失败处理
- 安装失败处理
- 强制更新流程

---

## 注意事项

### 1. 安全性

- APK 文件应该存储在安全的服务器上
- 下载时应该验证文件完整性（MD5/SHA256）
- 安装前应该验证签名

### 2. 兼容性

- 需要处理不同 Android 版本的权限差异
- 需要处理不同厂商的定制系统（MIUI、EMUI 等）
- 需要处理 Android 11+ 的包可见性限制

### 3. 用户体验

- 更新不应该影响正常使用
- 下载应该在后台进行
- 提供清晰的更新说明
- 支持取消和重试

### 4. 版本管理

- 版本号应该遵循语义化版本（Semantic Versioning）
- `versionCode` 应该递增
- 应该记录每个版本的更新日志

---

## 总结

### 针对你的场景（只修改 JS 代码）

**强烈推荐：方案三（Expo Updates OTA 更新）**

**理由：**
- ✅ **不需要重新打包 APK**（只更新 JS bundle）
- ✅ **用户无需重新安装**（自动更新）
- ✅ **更新速度快**（几秒到几分钟）
- ✅ **非常适合你的场景**（添加模块、修改功能都是 JS 代码）
- ✅ **支持灰度发布和回滚**

**工作流程：**
1. 开发完成 → 2. `eas update` 发布 → 3. 用户自动更新

**成本：**
- 免费版：每月 10,000 次更新请求（适合中小型应用）
- 如果超出：考虑付费或使用方案二

### 其他场景

**如果需要修改原生代码：**
- 推荐方案二（自定义更新检查 + APK 下载安装）
- 需要重新打包 APK，用户需要重新安装

**如果已上架 Google Play：**
- 推荐方案一（Google Play 应用内更新）
- 用户体验最好，但需要上架商店

### 实现难度对比

**方案三（Expo Updates）：**
- ⭐⭐⭐ 简单（配置 + 一条命令发布）
- 适合你的场景（只修改 JS 代码）

**方案二（自定义更新）：**
- ⭐⭐⭐⭐ 中等（需要实现下载、安装逻辑）
- 适合需要完全控制的场景

**方案一（Google Play）：**
- ⭐⭐⭐ 简单（但需要上架商店）
- 适合已上架的应用

