# GitHub Actions 配置 API Key 快速指南

## 🚀 三步配置

### 步骤 1：在 GitHub 仓库中设置 Secret

1. 进入你的 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**

#### 添加 Secret: EXPO_PUBLIC_API_KEY

- **Name:** `EXPO_PUBLIC_API_KEY`
- **Value:** 你的云函数 API Key（例如：`a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`）

**重要提示：**
- 这是用于云函数认证的 API Key
- 应该与云函数环境变量中的 `API_KEY_1` 值一致
- 不要包含引号，不要有空格

#### 确认已有 Secret: EXPO_TOKEN

如果还没有设置 `EXPO_TOKEN`，也需要添加：
- **Name:** `EXPO_TOKEN`
- **Value:** 你的 Expo Access Token

**获取方式：**
```bash
# 在本地运行
eas login
# 然后访问 https://expo.dev/accounts/[your-account]/settings/access-tokens
```

### 步骤 2：工作流已自动配置

已更新 `.github/workflows/eas-build.yml`，工作流会自动：

1. 读取 GitHub Secret `EXPO_PUBLIC_API_KEY`
2. 在构建时设置为环境变量
3. EAS Build 会将环境变量编译到 APK 中

### 步骤 3：触发构建

**方式一：自动触发**
```bash
# 推送到 main 分支
git push origin main
```

**方式二：手动触发**
1. 进入 GitHub 仓库
2. 点击 **Actions** 标签
3. 选择 **EAS Build Android Preview** 工作流
4. 点击 **Run workflow**

## ✅ 验证配置

### 1. 检查 GitHub Secrets

在仓库设置中确认：
- ✅ `EXPO_TOKEN` 已配置
- ✅ `EXPO_PUBLIC_API_KEY` 已配置

### 2. 查看构建日志

构建运行后，在 Actions 日志中查看：
- ✅ 环境变量是否设置
- ✅ EAS Build 是否成功
- ✅ APK 是否生成

### 3. 测试 APK

1. 从 Artifacts 下载 APK
2. 安装到设备
3. 打开应用
4. 测试 API 调用（应该可以正常调用云函数）

## 🔍 工作原理

```
GitHub Actions 工作流
    ↓
读取 GitHub Secret: EXPO_PUBLIC_API_KEY
    ↓
设置为环境变量: EXPO_PUBLIC_API_KEY
    ↓
EAS Build 读取环境变量
    ↓
编译到 APK 代码中
    ↓
用户安装 APK 后，应用自动使用 API Key
```

## 📝 工作流配置说明

已更新的 `.github/workflows/eas-build.yml` 包含：

```yaml
- name: Run EAS Build with Retry
  env:
    # 从 GitHub Secrets 读取 API Key，EAS Build 会自动将其编译到 APK 中
    EXPO_PUBLIC_API_KEY: ${{ secrets.EXPO_PUBLIC_API_KEY }}
  run: |
    eas build --platform android --profile preview --non-interactive
```

**关键点：**
- `env:` 部分设置环境变量
- `${{ secrets.EXPO_PUBLIC_API_KEY }}` 从 GitHub Secrets 读取
- EAS Build 会自动读取环境变量并编译到 APK 中

## 🔒 安全建议

1. **使用 GitHub Secrets**
   - ✅ 使用 GitHub Secrets 存储敏感信息
   - ❌ 不要在工作流文件中硬编码 API Key

2. **不同环境使用不同的 Key**
   - **开发环境**：`EXPO_PUBLIC_API_KEY_DEV`
   - **测试环境**：`EXPO_PUBLIC_API_KEY_PREVIEW`
   - **生产环境**：`EXPO_PUBLIC_API_KEY_PRODUCTION`

3. **定期更换**
   - 定期更换 API Key
   - 更新 GitHub Secrets
   - 重新构建 APK

## 🐛 常见问题

### Q1: 构建时找不到环境变量

**原因：** GitHub Secrets 未配置或名称错误

**解决：**
1. 检查 Secrets 名称是否完全匹配：`EXPO_PUBLIC_API_KEY`
2. 确认 Secrets 已保存
3. 检查工作流文件中的引用是否正确

### Q2: APK 中 API Key 为空

**原因：** 环境变量未正确传递

**解决：**
1. 检查工作流日志，确认环境变量是否设置
2. 确认 `eas.json` 中配置了环境变量：
   ```json
   {
     "build": {
       "preview": {
         "env": {
           "EXPO_PUBLIC_API_KEY": "${EXPO_PUBLIC_API_KEY}"
         }
       }
     }
   }
   ```
3. 检查 EAS Build 日志

### Q3: 构建失败

**原因：** 可能的原因很多

**解决：**
1. 查看 GitHub Actions 日志
2. 查看 EAS Build 日志
3. 确认 `EXPO_TOKEN` 有效
4. 确认 `eas.json` 配置正确

## 📚 相关文档

- [GitHub Actions 构建完整指南](./GITHUB_ACTIONS_BUILD.md)
- [APK 打包指南](./APK_BUILD_GUIDE.md)
- [环境变量配置指南](./ENV_VARIABLES_GUIDE.md)

## ✅ 检查清单

配置完成后，确认：

- [ ] GitHub Secrets `EXPO_TOKEN` 已配置
- [ ] GitHub Secrets `EXPO_PUBLIC_API_KEY` 已配置
- [ ] GitHub Actions 工作流已更新（已自动完成）
- [ ] `eas.json` 中配置了环境变量（已自动完成）
- [ ] 构建成功并生成 APK
- [ ] 测试 APK，API 调用正常

完成以上步骤后，GitHub Actions 构建的 APK 就会包含 API Key，用户安装后可以直接使用了！

