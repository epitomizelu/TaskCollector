# 当前 API Key 配置方案分析

## 当前配置状态

### 1. `eas.json` 配置
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

**说明**：`${EXPO_PUBLIC_API_KEY}` 语法表示从 **EAS Secrets** 读取，而不是从环境变量读取。

### 2. GitHub Actions 配置
```yaml
- name: Run EAS Build with Retry
  env:
    EXPO_PUBLIC_API_KEY: ${{ secrets.EXPO_PUBLIC_API_KEY }}
  run: eas build --platform android --profile preview
```

**说明**：设置了环境变量，但 EAS Build 不会自动将环境变量替换到 `${EXPO_PUBLIC_API_KEY}` 中。

## 问题诊断

当前采用的是**方案 2（GitHub Actions 环境变量）**，但配置有误：

1. ✅ GitHub Actions 正确设置了环境变量
2. ❌ `eas.json` 使用了 `${EXPO_PUBLIC_API_KEY}` 语法，期望从 EAS Secrets 读取
3. ❌ EAS Build 在 GitHub Actions 中运行时，不会自动将环境变量替换到 `${}` 语法中

## 解决方案

### 方案 A：使用 EAS Secrets（推荐，适合 CI/CD）

1. **在 EAS 中配置 Secret**：
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-api-key-value
   ```

2. **保持 `eas.json` 不变**（已正确配置）

3. **GitHub Actions 不需要设置环境变量**（EAS Build 会自动从 Secrets 读取）

### 方案 B：使用环境变量（适合本地构建）

1. **修改 `eas.json`**，移除 `${}` 语法：
   ```json
   {
     "build": {
       "preview": {
         "env": {
           "EXPO_PUBLIC_API_KEY": "$EXPO_PUBLIC_API_KEY"
         }
       }
     }
   }
   ```

2. **GitHub Actions 保持当前配置**（已正确）

3. **本地构建时需要设置环境变量**：
   ```bash
   export EXPO_PUBLIC_API_KEY=your-api-key-value
   eas build --platform android --profile preview
   ```

### 方案 C：混合方案（当前尝试的方案，但有问题）

当前配置的问题：
- `eas.json` 使用 `${EXPO_PUBLIC_API_KEY}`（期望从 EAS Secrets 读取）
- GitHub Actions 设置了环境变量（但 EAS Build 不会使用）

**修复方法**：选择方案 A 或方案 B，不要混用。

## 推荐方案

**推荐使用方案 A（EAS Secrets）**，因为：
1. ✅ 更安全（密钥不暴露在 GitHub Actions 日志中）
2. ✅ 更灵活（可以在 EAS 控制台管理，不需要修改代码）
3. ✅ 支持多环境（可以为不同 profile 配置不同的 Secrets）
4. ✅ 适合 CI/CD 场景

## 验证步骤

### 如果使用方案 A（EAS Secrets）：

1. 检查 EAS Secrets：
   ```bash
   eas secret:list
   ```

2. 如果没有配置，创建 Secret：
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-api-key-value
   ```

3. 重新构建 APK：
   ```bash
   eas build --platform android --profile preview
   ```

### 如果使用方案 B（环境变量）：

1. 修改 `eas.json`（移除 `${}` 语法）
2. 确保 GitHub Actions 中设置了环境变量（已配置）
3. 重新构建 APK

## 当前状态

根据检查结果：
- ❌ **未配置 EAS Secrets**（`eas secret:list` 无输出）
- ✅ **GitHub Actions 已配置环境变量**
- ❌ **`eas.json` 使用了错误的语法**（`${}` 期望从 Secrets 读取，但 Secrets 未配置）

**结论**：当前配置不匹配，需要选择方案 A 或方案 B 并修复配置。

