# Codemagic Git 集成配置指南

## 问题 1：git push 后 Codemagic 能自动获取最新代码吗？

**答案：可以，但需要正确配置！**

## 问题 2：手动触发构建时，Codemagic 会拉取最新代码吗？

**答案：会的！** ✅

**Codemagic 在手动触发构建时，默认会拉取指定分支的最新代码。**

## 🔧 配置步骤

### 步骤 1: 在 Codemagic 控制台配置 Git 集成

1. **登录 Codemagic 控制台**
   - 访问 [https://codemagic.io/](https://codemagic.io/)
   - 登录你的账号

2. **添加应用/项目**
   - 如果还没有添加项目，点击 "Add application"
   - 选择你的 Git 仓库（GitHub/GitLab/Bitbucket）
   - 授权 Codemagic 访问你的仓库

3. **配置构建触发**
   - 进入项目 **Settings > Build triggers**
   - 配置触发条件：
     - ✅ **Push to branch** - 推送到指定分支时触发
     - ✅ **Pull request** - 创建/更新 PR 时触发（可选）
     - ✅ **Tag** - 创建标签时触发（可选）

4. **选择分支**
   - 通常选择 `main` 或 `master` 分支
   - 也可以选择其他分支（如 `develop`）

5. **选择 Workflow**
   - 选择要触发的 workflow：
     - `android-preview` - 构建 APK
     - `android-production` - 构建 AAB
     - `ota-update-only` - 仅 OTA 更新

### 步骤 2: 验证配置

1. **测试触发**
   ```bash
   # 在本地修改代码
   git add .
   git commit -m "test: 测试 Codemagic 自动构建"
   git push origin main
   ```

2. **检查 Codemagic**
   - 登录 Codemagic 控制台
   - 查看 "Builds" 页面
   - 应该看到新的构建任务自动启动

3. **查看构建日志**
   - 点击构建任务
   - 查看 "Checkout code" 步骤
   - 应该显示最新的 commit hash

## 📋 当前配置检查

### 检查 1: Codemagic 项目设置

在 Codemagic 控制台检查：
- ✅ 项目已连接到正确的 Git 仓库
- ✅ Build triggers 已启用
- ✅ 选择了正确的分支（通常是 `main`）
- ✅ 选择了要触发的 workflow

### 检查 2: Git 仓库权限

确保：
- ✅ Codemagic 有读取仓库的权限
- ✅ Webhook 已正确配置（Codemagic 会自动配置）

### 检查 3: 构建日志验证

在构建日志中，第一个步骤应该是：

```
Checkout code
```

应该显示：
```
Cloning repository...
Checking out commit: <最新的 commit hash>
```

如果看到的是旧的 commit hash，说明：
- ❌ 构建触发配置有问题
- ❌ 或者构建是从旧代码触发的

## 🚀 推荐配置

### 配置 1: 自动构建 APK（推送到 main 分支）

**触发条件：**
- ✅ Push to branch: `main`
- ✅ Workflow: `android-preview`

**用途：** 每次推送到 main 分支时，自动构建 APK 并上传 OTA 更新

### 配置 2: 自动构建 AAB（推送到 main 分支）

**触发条件：**
- ✅ Push to branch: `main`
- ✅ Workflow: `android-production`

**用途：** 每次推送到 main 分支时，自动构建 AAB（用于 Google Play 发布）

### 配置 3: 仅 OTA 更新（推送到 main 分支）

**触发条件：**
- ✅ Push to branch: `main`
- ✅ Workflow: `ota-update-only`

**用途：** 快速发布 JS 代码更新，无需重新构建原生应用

## ⚠️ 注意事项

### 1. 避免循环触发

如果构建过程中会提交代码（如自动更新版本号），确保：
- 提交信息包含 `[skip ci]` 标记
- 或者配置 Codemagic 忽略包含特定标记的提交

### 2. 分支保护

如果使用分支保护规则：
- 确保 Codemagic 有推送权限（如果需要自动提交）
- 或者禁用自动提交功能

### 3. 构建频率

如果代码更新频繁：
- 考虑使用 `ota-update-only` workflow（构建时间短）
- 或者配置构建队列，避免同时触发多个构建

## 🔍 故障排查

### 问题 1: git push 后没有自动触发构建

**可能原因：**
1. Build triggers 未启用
2. 推送的分支不在配置的分支列表中
3. Webhook 配置有问题

**解决方法：**
1. 检查 Codemagic 控制台中的 Build triggers 设置
2. 确认推送的分支是否匹配
3. 检查 Git 仓库的 Webhook 设置（GitHub/GitLab 等）

### 问题 2: 构建使用的是旧代码

**可能原因：**
1. 构建是从旧 commit 触发的
2. 缓存问题

**解决方法：**
1. 检查构建日志中的 commit hash
2. 确认是否是最新的 commit
3. 如果使用缓存，尝试清除缓存

### 问题 3: 构建失败，提示找不到文件

**可能原因：**
1. 代码未正确推送
2. 分支配置错误

**解决方法：**
1. 检查 Git 仓库，确认代码已推送
2. 检查 Codemagic 构建日志中的 "Checkout code" 步骤
3. 确认分支名称正确

## 📝 手动触发构建

### 手动触发时，Codemagic 会拉取最新代码

**重要：** 无论是自动触发还是手动触发，Codemagic 都会：
1. ✅ 从 Git 仓库拉取指定分支的**最新代码**
2. ✅ 使用最新的 commit hash
3. ✅ 不会使用缓存的旧代码

### 手动触发步骤

1. **在 Codemagic 控制台**
   - 进入项目
   - 点击 "Start new build"
   - 选择 workflow（如 `android-preview`）
   - 选择分支（如 `main`）
   - 点击 "Start new build"

2. **验证是否使用最新代码**
   - 查看构建日志中的 "Checkout code" 步骤
   - 应该显示最新的 commit hash
   - 应该显示最新的 commit 信息

3. **使用 Codemagic CLI**
   ```bash
   # 安装 Codemagic CLI
   npm install -g codemagic-cli
   
   # 登录
   codemagic login
   
   # 触发构建（会自动拉取最新代码）
   codemagic start-build --workflow android-preview --branch main
   ```

### 手动触发的工作流程

```
1. 点击 "Start new build"
   ↓
2. Codemagic 连接到 Git 仓库
   ↓
3. 拉取指定分支的最新代码 ✅
   ↓
4. 检出最新的 commit
   ↓
5. 运行构建流程（prebuild → 注入 → 构建）
```

**注意：** 即使你本地还没有 `git push`，只要远程仓库有最新代码，Codemagic 也会拉取远程的最新代码。

## ✅ 验证清单

在配置完成后，验证以下项目：

- [ ] Codemagic 项目已连接到 Git 仓库
- [ ] Build triggers 已启用
- [ ] 选择了正确的分支（通常是 `main`）
- [ ] 选择了要触发的 workflow
- [ ] 测试推送代码，确认自动触发构建
- [ ] 检查构建日志，确认使用的是最新代码
- [ ] 确认构建成功，APK/AAB 已生成

## 🎯 总结

### 自动触发构建

**git push 后，Codemagic 能自动获取最新代码，前提是：**

1. ✅ 在 Codemagic 控制台正确配置了 Build triggers
2. ✅ 选择了正确的分支和 workflow
3. ✅ Git 仓库权限配置正确
4. ✅ Webhook 正常工作

**如果配置正确，每次 `git push` 到配置的分支时，Codemagic 会自动：**
1. 检出最新代码
2. 运行 `expo prebuild` 生成 android 文件夹
3. 运行注入脚本修改 MainApplication.kt
4. 构建 APK/AAB
5. 构建并上传 JS Bundle（OTA 更新）

### 手动触发构建

**手动触发时，Codemagic 也会拉取最新代码：**

1. ✅ **总是拉取最新代码** - Codemagic 不会使用缓存的旧代码
2. ✅ **拉取指定分支的最新 commit** - 确保使用最新的代码
3. ✅ **可以验证** - 在构建日志中查看 "Checkout code" 步骤，确认 commit hash

**无论自动触发还是手动触发，Codemagic 都会：**
- 从 Git 仓库拉取最新代码
- 使用最新的 commit
- 运行完整的构建流程（包括注入脚本）

