# 修复 API Key 值为 "EXPO_PUBLIC_API_KEY" 字符串的问题

## 问题诊断

从日志可以看到：
```
API_KEY长度: 19
API_KEY前缀: EXPO_PUB...
```

这说明 API Key 的值是字符串 `"EXPO_PUBLIC_API_KEY"` 本身（正好 19 个字符），而不是实际的 API Key 值。

## 问题原因

`eas.json` 中使用了 `${EXPO_PUBLIC_API_KEY}` 语法，这需要从 **EAS Secrets** 读取。但可能：
1. EAS Secrets 没有配置
2. 或者 EAS Build 在 GitHub Actions 中运行时，不会自动从 EAS Secrets 读取

## 解决方案

### 方案 1：配置 EAS Secrets（推荐）

1. **在 EAS 中创建 Secret**：
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-actual-api-key-value
   ```

2. **验证 Secret**：
   ```bash
   eas secret:list
   ```

3. **重新构建 APK**：
   - 触发 GitHub Actions 工作流
   - 或手动运行：`eas build --platform android --profile preview`

### 方案 2：在 GitHub Actions 中直接传递值（临时方案）

如果 EAS Secrets 配置有问题，可以临时在 GitHub Actions 中直接设置值：

修改 `.github/workflows/eas-build.yml`：

```yaml
- name: Run EAS Build with Retry
  env:
    EXPO_PUBLIC_API_KEY: ${{ secrets.EXPO_PUBLIC_API_KEY }}
  run: |
    # 动态修改 eas.json，将 ${EXPO_PUBLIC_API_KEY} 替换为实际值
    sed -i "s|\"\\${EXPO_PUBLIC_API_KEY}\"|\"$EXPO_PUBLIC_API_KEY\"|g" eas.json
    eas build --platform android --profile preview --non-interactive
```

**注意**：这需要修改 `eas.json` 的语法，或者使用脚本动态替换。

### 方案 3：使用 app.json 的 extra 字段（不推荐，会暴露）

在 `app.json` 中添加：

```json
{
  "expo": {
    "extra": {
      "apiKey": "your-api-key-value"
    }
  }
}
```

然后在代码中读取：
```typescript
import Constants from 'expo-constants';
const apiKey = Constants.expoConfig?.extra?.apiKey;
```

**不推荐**：因为 API Key 会暴露在代码中。

## 推荐方案：使用 EAS Secrets

### 步骤 1：创建 EAS Secret

```bash
# 登录 EAS（如果还没登录）
eas login

# 创建 Secret
eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-actual-api-key-value
```

### 步骤 2：验证 Secret

```bash
# 列出所有 Secrets
eas secret:list

# 应该看到 EXPO_PUBLIC_API_KEY
```

### 步骤 3：确认 eas.json 配置

当前配置（已正确）：
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

### 步骤 4：重新构建

```bash
# 本地构建
eas build --platform android --profile preview

# 或触发 GitHub Actions
```

## 验证修复

重新构建 APK 后，查看日志应该看到：
- API Key 长度不是 19
- API Key 前缀不是 "EXPO_PUB..."
- 登录成功

## 当前状态

根据日志：
- ❌ API Key 值：`"EXPO_PUBLIC_API_KEY"`（字符串本身）
- ✅ 应该是：实际的 API Key 值（例如：`"a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"`）

## 下一步

1. **检查 EAS Secrets**：
   ```bash
   eas secret:list
   ```

2. **如果没有配置，创建 Secret**：
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-actual-api-key-value
   ```

3. **重新构建 APK**

4. **验证**：查看新 APK 的日志，确认 API Key 长度和前缀正确

