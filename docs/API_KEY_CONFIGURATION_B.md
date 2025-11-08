# 方案 B：使用环境变量配置 API Key

## 配置说明

当前采用**方案 B（环境变量）**，通过 GitHub Actions 传递环境变量到 EAS Build。

## 配置步骤

### 1. GitHub Secrets 配置

在 GitHub 仓库中设置 Secret：
- 路径：Settings → Secrets and variables → Actions
- Secret 名称：`EXPO_PUBLIC_API_KEY`
- Secret 值：你的实际 API Key

### 2. GitHub Actions 工作流配置

`.github/workflows/eas-build.yml` 中已配置：

```yaml
- name: Run EAS Build with Retry
  env:
    EXPO_PUBLIC_API_KEY: ${{ secrets.EXPO_PUBLIC_API_KEY }}
  run: eas build --platform android --profile preview
```

### 3. `eas.json` 配置

`eas.json` 中已配置：

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "EXPO_PUBLIC_API_KEY"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "EXPO_PUBLIC_API_KEY"
      }
    }
  }
}
```

**说明**：`env` 字段的值直接写变量名，EAS Build 会自动从构建环境的环境变量中读取。

## 工作原理

1. GitHub Actions 从 Secrets 读取 `EXPO_PUBLIC_API_KEY`
2. 设置为环境变量传递给 EAS Build
3. EAS Build 读取 `eas.json` 中的 `env` 配置
4. 从环境变量中读取 `EXPO_PUBLIC_API_KEY` 的值
5. 编译到 APK 中，应用可以通过 `process.env.EXPO_PUBLIC_API_KEY` 访问

## 验证配置

### 检查 GitHub Secrets

1. 进入仓库 Settings → Secrets and variables → Actions
2. 确认 `EXPO_PUBLIC_API_KEY` Secret 已配置

### 检查构建日志

在 GitHub Actions 构建日志中，应该能看到：
- ✅ 环境变量已设置（不会显示实际值，这是安全措施）
- ✅ EAS Build 成功执行

### 检查 APK

安装 APK 后，查看登录时的控制台日志：
- 应该能看到 `API_KEY 已配置`
- 如果看到 `API_KEY 未配置`，说明环境变量未正确传递

## 本地构建

如果需要在本地构建，需要设置环境变量：

```bash
# Windows PowerShell
$env:EXPO_PUBLIC_API_KEY="your-api-key-value"
eas build --platform android --profile preview

# Windows CMD
set EXPO_PUBLIC_API_KEY=your-api-key-value
eas build --platform android --profile preview

# Linux/Mac
export EXPO_PUBLIC_API_KEY=your-api-key-value
eas build --platform android --profile preview
```

## 故障排查

### 问题 1：APK 中 API Key 未配置

**可能原因**：
- GitHub Secrets 未配置或值不正确
- GitHub Actions 环境变量未正确传递
- `eas.json` 配置错误

**解决方法**：
1. 检查 GitHub Secrets 配置
2. 检查 GitHub Actions 构建日志
3. 确认 `eas.json` 中的 `env` 配置正确

### 问题 2：登录时提示 "Credentials are invalid"

**可能原因**：
- API Key 未正确编译到 APK 中
- API Key 值与云函数环境变量不匹配

**解决方法**：
1. 查看 APK 登录时的控制台日志
2. 确认 `API_KEY` 是否正确读取
3. 检查云函数环境变量 `API_KEY_1` 和 `API_KEY_2` 是否包含相同的值

## 相关文件

- `eas.json` - EAS Build 配置
- `.github/workflows/eas-build.yml` - GitHub Actions 工作流
- `config/api.config.ts` - API 配置（读取 `process.env.EXPO_PUBLIC_API_KEY`）

