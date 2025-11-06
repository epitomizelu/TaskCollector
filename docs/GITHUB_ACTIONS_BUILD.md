# GitHub Actions 构建 APK 配置指南

## 🎯 核心配置

在 GitHub Actions 中构建 APK 时，需要配置 `EXPO_PUBLIC_API_KEY` 环境变量，这样打包后的 APK 才会包含 API Key。

## 📋 配置步骤

### 步骤 1：在 GitHub 仓库中设置 Secrets

1. 进入你的 GitHub 仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 添加以下 Secrets：

#### Secret 1: EXPO_TOKEN
- **Name:** `EXPO_TOKEN`
- **Value:** 你的 Expo Access Token
- **获取方式：**
  ```bash
  # 在本地运行
  eas login
  # 然后获取 token
  cat ~/.expo/config.json
  # 或者访问 https://expo.dev/accounts/[your-account]/settings/access-tokens
  ```

#### Secret 2: EXPO_PUBLIC_API_KEY
- **Name:** `EXPO_PUBLIC_API_KEY`
- **Value:** 你的云函数 API Key（例如：`a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`）

**重要：**
- 这是用于云函数认证的 API Key
- 应该与云函数环境变量中的 `API_KEY_1` 值一致
- 不要包含引号

### 步骤 2：更新 GitHub Actions 工作流

已更新 `.github/workflows/eas-build.yml`，添加环境变量配置。

工作流会自动：
1. 读取 GitHub Secrets 中的 `EXPO_PUBLIC_API_KEY`
2. 在构建时设置环境变量
3. EAS Build 会将环境变量编译到 APK 中

### 步骤 3：验证配置

提交代码后，GitHub Actions 会自动运行：

1. **触发构建**
   - 推送到 `main` 分支
   - 或手动触发（Actions → Run workflow）

2. **查看构建日志**
   - 进入 Actions 标签
   - 查看构建日志
   - 确认环境变量已设置

3. **下载 APK**
   - 构建完成后，在 Artifacts 中下载
   - 或从 Expo Dashboard 下载

## 🔧 工作流配置说明

### 环境变量传递

GitHub Actions 工作流会：

```yaml
- name: Run EAS Build
  env:
    EXPO_PUBLIC_API_KEY: ${{ secrets.EXPO_PUBLIC_API_KEY }}
  run: |
    eas build --platform android --profile preview --non-interactive
```

**工作原理：**
1. GitHub Actions 读取 `secrets.EXPO_PUBLIC_API_KEY`
2. 设置为环境变量 `EXPO_PUBLIC_API_KEY`
3. EAS Build 读取环境变量
4. 编译到 APK 代码中

### 不同环境配置

如果需要为不同环境使用不同的 API Key：

```yaml
- name: Run EAS Build (Preview)
  env:
    EXPO_PUBLIC_API_KEY: ${{ secrets.EXPO_PUBLIC_API_KEY_PREVIEW }}
  run: |
    eas build --platform android --profile preview --non-interactive

- name: Run EAS Build (Production)
  env:
    EXPO_PUBLIC_API_KEY: ${{ secrets.EXPO_PUBLIC_API_KEY_PRODUCTION }}
  run: |
    eas build --platform android --profile production --non-interactive
```

## 📝 完整配置示例

### GitHub Secrets 配置

在 GitHub 仓库中添加以下 Secrets：

```
EXPO_TOKEN = your-expo-access-token
EXPO_PUBLIC_API_KEY = your-production-api-key
```

### GitHub Actions 工作流

已更新的 `.github/workflows/eas-build.yml` 包含：

```yaml
- name: Run EAS Build
  env:
    EXPO_PUBLIC_API_KEY: ${{ secrets.EXPO_PUBLIC_API_KEY }}
  run: |
    eas build --platform android --profile preview --non-interactive
```

## ✅ 验证步骤

### 1. 检查 GitHub Secrets

在仓库设置中确认：
- ✅ `EXPO_TOKEN` 已配置
- ✅ `EXPO_PUBLIC_API_KEY` 已配置

### 2. 运行构建

```bash
# 推送到 main 分支
git push origin main

# 或手动触发
# 在 GitHub 仓库页面：Actions → Run workflow
```

### 3. 查看构建日志

在 GitHub Actions 日志中查看：
- ✅ 环境变量是否设置
- ✅ EAS Build 是否成功
- ✅ APK 是否生成

### 4. 测试 APK

1. 下载构建的 APK
2. 安装到设备
3. 打开应用
4. 测试 API 调用（应该可以正常调用云函数）

## 🔒 安全建议

### 1. 使用 GitHub Secrets

- ✅ 使用 GitHub Secrets 存储敏感信息
- ❌ 不要在工作流文件中硬编码 API Key

### 2. 不同环境使用不同的 Key

- **开发环境**：`EXPO_PUBLIC_API_KEY_DEV`
- **测试环境**：`EXPO_PUBLIC_API_KEY_PREVIEW`
- **生产环境**：`EXPO_PUBLIC_API_KEY_PRODUCTION`

### 3. 定期更换

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
2. 确认 `eas.json` 中配置了环境变量
3. 检查 EAS Build 日志

### Q3: 构建失败

**原因：** 可能的原因很多

**解决：**
1. 查看 GitHub Actions 日志
2. 查看 EAS Build 日志
3. 确认 `EXPO_TOKEN` 有效
4. 确认 `eas.json` 配置正确

## 📚 相关文档

- [APK 打包指南](./APK_BUILD_GUIDE.md)
- [APK 分发指南](./APK_DISTRIBUTION.md)
- [环境变量配置指南](./ENV_VARIABLES_GUIDE.md)

## ✅ 检查清单

配置完成后，确认：

- [ ] GitHub Secrets `EXPO_TOKEN` 已配置
- [ ] GitHub Secrets `EXPO_PUBLIC_API_KEY` 已配置
- [ ] GitHub Actions 工作流已更新
- [ ] `eas.json` 中配置了环境变量
- [ ] 构建成功并生成 APK
- [ ] 测试 APK，API 调用正常

完成以上步骤后，GitHub Actions 构建的 APK 就会包含 API Key，用户安装后可以直接使用了！

