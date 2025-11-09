# 自动版本号更新功能

## 概述

GitHub Actions 工作流现在支持自动更新版本号，确保每次构建或更新时版本号正确递增，应用能够检测到更新。

## 功能说明

### APK 构建时的版本号更新

**触发时机：** 运行 "EAS Build Android Preview" 工作流时

**更新规则：**
- `versionCode` 自动递增（必须，Android 要求）
- `version` 在 `versionCode` 是 10 的倍数时自动递增 patch 版本

**示例：**
```
初始: v1.0.0 (Build 1)
构建1: v1.0.0 (Build 2)
构建2: v1.0.0 (Build 3)
...
构建10: v1.0.1 (Build 10)  ← versionCode 是 10 的倍数，version 递增
```

### OTA 更新时的版本号

**触发时机：** 运行 "EAS Update (OTA)" 工作流时

**重要说明：**
- **OTA 更新不会改变 `version`**，因为 `runtimeVersion` 使用 `appVersion` 策略
- 如果 `version` 改变，`runtimeVersion` 也会改变，已安装的应用将无法接收 OTA 更新
- `versionCode` 保持不变（OTA 更新不改变原生代码）

**为什么不能改变 version？**
- `runtimeVersion: { policy: "appVersion" }` 意味着 runtimeVersion = `app.json` 中的 `version`
- 已安装的应用的 runtimeVersion 是构建时的 `version`
- 如果 OTA 更新时改变了 `version`，新发布的 OTA 更新的 runtimeVersion 会不同
- Expo Updates 只会将更新推送给 runtimeVersion 匹配的应用
- 因此，已安装的应用无法接收更新

**正确的做法：**
- OTA 更新时：保持 `version` 不变，只更新 JavaScript 代码
- APK 构建时：更新 `version` 和 `versionCode`，重新构建 APK

## 工作流配置

### APK 构建工作流 (`.github/workflows/eas-build.yml`)

```yaml
- name: Update version for APK build
  id: version
  run: |
    echo "更新版本号（APK 构建）..."
    node scripts/update-version.js --type build
    echo "版本号更新完成"
    # 读取更新后的版本号
    VERSION=$(node -p "require('./app.json').expo.version")
    VERSION_CODE=$(node -p "require('./app.json').expo.android.versionCode")
    echo "version=$VERSION" >> $GITHUB_OUTPUT
    echo "versionCode=$VERSION_CODE" >> $GITHUB_OUTPUT
    echo "新版本: v$VERSION (Build $VERSION_CODE)"

- name: Commit version update
  run: |
    git config --local user.email "action@github.com"
    git config --local user.name "GitHub Action"
    git add app.json
    git commit -m "chore: 自动更新版本号 [skip ci]" || echo "没有版本变更或已是最新"
    git push || echo "推送失败或无需推送"
```

### OTA 更新工作流 (`.github/workflows/eas-update.yml`)

```yaml
- name: Update version for OTA update
  id: version
  run: |
    echo "更新版本号（OTA 更新）..."
    # 根据提交信息判断版本类型
    COMMIT_MSG="${{ github.event.head_commit.message || github.event.inputs.message }}"
    if echo "$COMMIT_MSG" | grep -qiE "^(feat|feature)"; then
      echo "检测到新功能，更新 minor 版本"
      node scripts/update-version.js --type update --minor
    elif echo "$COMMIT_MSG" | grep -qiE "^(fix|bugfix|hotfix)"; then
      echo "检测到 bug 修复，更新 patch 版本"
      node scripts/update-version.js --type update --patch
    else
      echo "默认更新 patch 版本"
      node scripts/update-version.js --type update --patch
    fi
    echo "版本号更新完成"
    # 读取更新后的版本号
    VERSION=$(node -p "require('./app.json').expo.version")
    VERSION_CODE=$(node -p "require('./app.json').expo.android.versionCode")
    echo "version=$VERSION" >> $GITHUB_OUTPUT
    echo "versionCode=$VERSION_CODE" >> $GITHUB_OUTPUT
    echo "新版本: v$VERSION (Build $VERSION_CODE)"
```

## 版本号更新脚本

**文件：** `scripts/update-version.js`

**使用方法：**

```bash
# APK 构建：自动递增 versionCode，必要时更新 version
node scripts/update-version.js --type build

# OTA 更新：更新 version，不改变 versionCode
node scripts/update-version.js --type update --patch   # 1.0.0 → 1.0.1
node scripts/update-version.js --type update --minor   # 1.0.0 → 1.1.0
node scripts/update-version.js --type update --major   # 1.0.0 → 2.0.0
```

## 版本号保存

### Git 提交

工作流会自动将更新后的版本号提交到 Git：

- 提交信息：`chore: 自动更新版本号 [skip ci]`
- `[skip ci]` 标记防止触发其他工作流
- 如果版本号没有变化或推送失败，不会中断工作流

### 数据库保存

**APK 构建：**
- 版本号会通过 `save-version-info.js` 保存到数据库
- 包含 EAS 下载 URL 和 APK 文件信息
- 保存时机：APK 构建完成后立即保存

**OTA 更新：**
- 版本号会通过 `save-ota-version.js` 保存到数据库
- 包含版本号、更新类型和更新说明
- 保存时机：OTA 更新发布成功后保存
- 不包含 APK 文件信息（因为是 OTA 更新）

## 为什么需要自动更新版本号？

### APK 构建

1. **Android 要求**：每次构建 APK 时，`versionCode` 必须递增
2. **更新检测**：应用通过对比 `versionCode` 来判断是否有更新
3. **避免冲突**：如果版本号不变，用户可能无法安装新版本

### OTA 更新

1. **更新检测**：虽然 OTA 更新使用 `runtimeVersion`，但更新版本号有助于：
   - 用户看到版本号变化
   - 更好的版本管理
   - 支持强制更新逻辑

2. **版本管理**：清晰的版本号有助于追踪更新历史

## 注意事项

1. **首次使用**：确保 `app.json` 中有正确的初始版本号
2. **版本号格式**：遵循语义化版本（Semantic Versioning）
3. **Git 权限**：确保 GitHub Actions 有推送权限（通常已配置）
4. **版本冲突**：如果多人同时构建，可能会有版本号冲突，建议：
   - 使用分支保护
   - 或手动管理版本号

## 手动更新版本号

如果需要手动更新版本号：

```bash
# 直接编辑 app.json
# 或使用脚本
node scripts/update-version.js --type update --patch
```

## 故障排除

### 版本号没有更新

1. 检查工作流日志，查看是否有错误
2. 确认 `app.json` 文件格式正确
3. 检查 Git 推送权限

### 版本号冲突

如果出现版本号冲突：
1. 手动解决冲突
2. 或删除冲突的提交，重新运行工作流

### 更新检测不到

1. 确认版本号已正确更新
2. 检查 `runtimeVersion` 配置（OTA 更新）
3. 检查 `versionCode` 是否递增（APK 更新）

