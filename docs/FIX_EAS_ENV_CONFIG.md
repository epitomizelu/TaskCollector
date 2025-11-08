# 修复 EAS Build 环境变量配置

## 问题

`eas.json` 中的配置 `"EXPO_PUBLIC_API_KEY": "EXPO_PUBLIC_API_KEY"` 是错误的，这样会把字符串 "EXPO_PUBLIC_API_KEY" 直接作为值，而不是从环境变量读取。

## 原因

根据 Expo 文档，`eas.json` 中的 `env` 字段不支持从环境变量动态读取，只能：
1. **直接写值**（不安全，不推荐）
2. **使用 EAS Secrets**（`${VAR_NAME}` 语法，推荐）

## 解决方案

### 方案 A：使用 EAS Secrets（推荐）

1. **在 EAS 中创建 Secret**：
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-api-key-value
   ```

2. **修改 `eas.json`**（已修复）：
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

3. **GitHub Actions 不需要设置环境变量**（EAS Build 会自动从 Secrets 读取）

### 方案 B：使用环境变量（需要修改构建脚本）

如果坚持使用环境变量，需要在构建脚本中动态替换 `eas.json`：

1. **修改 GitHub Actions 工作流**：
   ```yaml
   - name: Run EAS Build with Retry
     env:
       EXPO_PUBLIC_API_KEY: ${{ secrets.EXPO_PUBLIC_API_KEY }}
     run: |
       # 动态替换 eas.json 中的值
       sed -i "s/\"EXPO_PUBLIC_API_KEY\": \".*\"/\"EXPO_PUBLIC_API_KEY\": \"$EXPO_PUBLIC_API_KEY\"/" eas.json
       eas build --platform android --profile preview
   ```

2. **修改 `eas.json`**（使用实际值占位符）：
   ```json
   {
     "build": {
       "preview": {
         "env": {
           "EXPO_PUBLIC_API_KEY": "PLACEHOLDER_TO_BE_REPLACED"
         }
       }
     }
   }
   ```

## 当前配置

已修改为使用 EAS Secrets（方案 A）：
- `eas.json` 使用 `${EXPO_PUBLIC_API_KEY}` 语法
- 需要在 EAS 中创建 Secret

## 下一步

1. **创建 EAS Secret**：
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_API_KEY --value your-api-key-value
   ```

2. **验证 Secret**：
   ```bash
   eas secret:list
   ```

3. **重新构建 APK**：
   - 触发 GitHub Actions 工作流
   - 或手动运行：`eas build --platform android --profile preview`

## 验证

安装新构建的 APK 后，查看登录时的控制台日志：
- 应该能看到 `API_KEY 已配置`
- 如果看到 `API_KEY 未配置`，说明 Secret 未正确配置

