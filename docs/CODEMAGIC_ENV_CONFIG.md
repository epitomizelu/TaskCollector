# Codemagic 环境变量配置指南

## 问题描述

在使用 Codemagic 构建 APK 时，`EXPO_PUBLIC_API_KEY` 没有被正确编译进 APK，导致登录失败。

**错误日志：**
```
API_KEY长度: 20, 前缀: $EXPO_PU...
```

这说明 API_KEY 的值是字符串 `$EXPO_PUBLIC_API_KEY` 本身，而不是实际的值。

## 原因分析

在 `codemagic.yaml` 中，`vars` 部分的 `EXPO_PUBLIC_API_KEY: $EXPO_PUBLIC_API_KEY` 语法**不会自动替换**。Codemagic 不会解析 `$` 符号作为环境变量引用。

## 解决方案

### 方案 1：在 Codemagic UI 中配置环境变量（推荐）

这是最安全和推荐的方式。

#### 步骤：

1. **登录 Codemagic 控制台**
   - 访问 https://codemagic.io
   - 登录你的账户

2. **进入项目设置**
   - 选择你的项目
   - 点击 **Settings**（设置）

3. **添加环境变量**
   - 导航到 **Environment variables**（环境变量）部分
   - 点击 **Add variable**（添加变量）

4. **配置变量**
   - **Variable name（变量名）**: `EXPO_PUBLIC_API_KEY`
   - **Variable value（变量值）**: 你的实际 API Key
   - **勾选 "Secure" 选项**：加密存储（推荐）

5. **保存配置**
   - 点击 **Save**（保存）

#### 验证配置

配置完成后，在构建日志中应该能看到：
- ✅ `EXPO_PUBLIC_API_KEY 已设置 (长度: XX)`
- ❌ 如果看到 `EXPO_PUBLIC_API_KEY 环境变量未设置`，说明配置有问题

### 方案 2：使用环境变量组（适合多个项目）

如果你有多个项目需要使用相同的环境变量，可以使用环境变量组：

1. **创建环境变量组**
   - 在 Codemagic 控制台，进入 **Teams** > **Environment variables**
   - 创建新的环境变量组
   - 添加 `EXPO_PUBLIC_API_KEY` 到组中

2. **在 `codemagic.yaml` 中引用**
   ```yaml
   environment:
     groups:
       - your_group_name
   ```

### 方案 3：在构建脚本中设置（不推荐，仅用于测试）

如果需要在构建脚本中临时设置（不推荐用于生产环境）：

```yaml
scripts:
  - name: Set environment variable
    script: |
      export EXPO_PUBLIC_API_KEY="your-api-key-here"
```

**注意：** 这种方式会将 API Key 暴露在构建日志中，不安全。

## 当前配置说明

### `codemagic.yaml` 配置

当前配置已经更新为：

```yaml
environment:
  # vars 部分留空，环境变量会自动从 Codemagic UI 读取
  vars: {}
```

### 构建脚本

添加了环境变量验证步骤：

```yaml
- name: Verify environment variables
  script: |
    if [ -z "$EXPO_PUBLIC_API_KEY" ]; then
      echo "❌ 错误: EXPO_PUBLIC_API_KEY 环境变量未设置"
      echo "请在 Codemagic UI 中配置环境变量: Settings > Environment variables"
      exit 1
    fi
    echo "✅ EXPO_PUBLIC_API_KEY 已设置 (长度: ${#EXPO_PUBLIC_API_KEY})"
```

### Prebuild 步骤

确保环境变量在 prebuild 时可用：

```yaml
- name: Prebuild (if needed)
  script: |
    # 确保环境变量在 prebuild 时可用
    export EXPO_PUBLIC_API_KEY="$EXPO_PUBLIC_API_KEY"
    npx expo prebuild --platform android --clean || true
```

## 工作原理

1. **Codemagic UI 配置**
   - 在 Codemagic UI 中配置的环境变量会自动注入到构建环境中

2. **构建时读取**
   - 构建脚本通过 `$EXPO_PUBLIC_API_KEY` 访问环境变量
   - Expo prebuild 会自动读取 `EXPO_PUBLIC_` 前缀的环境变量

3. **编译到 APK**
   - Expo 会将 `EXPO_PUBLIC_API_KEY` 编译到 JavaScript bundle 中
   - 应用运行时可以通过 `process.env.EXPO_PUBLIC_API_KEY` 访问

## 验证构建结果

### 方法 1：查看构建日志

在 Codemagic 构建日志中，应该能看到：
```
✅ EXPO_PUBLIC_API_KEY 已设置 (长度: XX)
```

### 方法 2：检查 APK

安装 APK 后，查看应用日志：
- ✅ 应该能看到 `API_KEY 已配置`
- ❌ 如果看到 `API_KEY 未配置` 或 `API_KEY长度: 20, 前缀: $EXPO_PU...`，说明环境变量未正确传递

### 方法 3：反编译 APK（仅用于验证）

可以使用工具反编译 APK，检查 JavaScript bundle 中是否包含正确的 API Key：
- 使用 `apktool` 或 `jadx` 反编译 APK
- 查找 `EXPO_PUBLIC_API_KEY` 或实际的 API Key 值

## 常见问题

### Q1: 构建时仍然显示 `$EXPO_PUBLIC_API_KEY` 字符串

**原因：** 环境变量未在 Codemagic UI 中配置

**解决：**
1. 检查 Codemagic UI 中是否配置了 `EXPO_PUBLIC_API_KEY`
2. 确认变量名完全匹配（大小写敏感）
3. 重新触发构建

### Q2: 环境变量验证失败

**原因：** 环境变量未正确设置或未传递到构建环境

**解决：**
1. 检查 Codemagic UI 中的环境变量配置
2. 确认变量名正确
3. 检查构建日志中的错误信息

### Q3: 本地构建正常，但 Codemagic 构建失败

**原因：** 本地使用了 `.env` 文件，但 Codemagic 不会自动读取

**解决：**
1. 在 Codemagic UI 中配置环境变量
2. 不要依赖 `.env` 文件（Codemagic 不会读取）

## 安全建议

1. **使用 Secure 选项**
   - 在 Codemagic UI 中配置环境变量时，勾选 "Secure" 选项
   - 这样 API Key 会被加密存储，不会在构建日志中显示

2. **限制 API Key 权限**
   - 在云函数中限制 API Key 的权限范围
   - 添加请求频率限制
   - 记录访问日志

3. **定期更换**
   - 定期更换 API Key
   - 更新 Codemagic 中的环境变量
   - 重新构建 APK

4. **不同环境使用不同的 Key**
   - 开发环境：`EXPO_PUBLIC_API_KEY_DEV`
   - 预览环境：`EXPO_PUBLIC_API_KEY_PREVIEW`
   - 生产环境：`EXPO_PUBLIC_API_KEY_PRODUCTION`

## 相关文档

- [Codemagic 环境变量文档](https://docs.codemagic.io/variables/environment-variables/)
- [Expo 环境变量文档](https://docs.expo.dev/guides/environment-variables/)
- [EAS Build 环境变量配置](./EAS_BUILD_APK_FLOW.md)

