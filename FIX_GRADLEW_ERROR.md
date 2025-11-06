# 修复 EAS Build gradlew 错误

## 问题描述

在远程构建时遇到以下错误：
```
Command "expo doctor" failed.ENOENT: no such file or directory, open '/home/expo/workingdir/build/android/gradlew'
```

## 问题原因

1. **`.easignore` 配置问题**：`.easignore` 文件中忽略了 `android/gradlew` 和 `android/gradlew.bat`，虽然这些文件应该由 EAS Build 自动生成，但在某些情况下可能导致检查失败。

2. **预构建时序问题**：`expo doctor` 在执行检查时，可能在 Android 原生项目完全生成之前就尝试访问 `gradlew` 文件。

3. **新架构配置**：项目启用了 `newArchEnabled: true`，需要预构建原生代码，可能在某些检查阶段出现问题。

## 已应用的修复

### 1. 更新 `.easignore`

注释掉了对 `gradlew` 文件的忽略，允许 EAS Build 在需要时生成这些文件：

```diff
- android/gradlew
- android/gradlew.bat
+ # Note: gradlew files should NOT be ignored - they are generated during build
+ # android/gradlew
+ # android/gradlew.bat
```

### 2. 更新 `eas.json`

添加了构建镜像配置，确保使用最新的构建环境：

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk",
        "image": "latest"
      }
    }
  }
}
```

## 验证步骤

1. **确保本地没有 `android` 目录**：
   ```bash
   # 如果存在，删除它（EAS Build 会自动生成）
   rm -rf android
   ```

2. **检查依赖版本**：
   ```bash
   npx expo install --check
   npx expo install --fix
   ```

3. **重新运行构建**：
   ```bash
   eas build --platform android --profile preview
   ```

## 如果问题仍然存在

### 方案 1：临时禁用新架构（不推荐）

如果上述修复无效，可以临时禁用新架构进行测试：

1. 编辑 `app.json`：
   ```json
   {
     "expo": {
       "newArchEnabled": false
     }
   }
   ```

2. 重新构建

> ⚠️ **注意**：禁用新架构可能会影响某些库的功能，仅用于排查问题。

### 方案 2：使用本地预构建

如果远程构建持续失败，可以尝试本地预构建后提交：

```bash
# 本地预构建
npx expo prebuild --platform android --clean

# 提交 android 目录（如果使用 bare workflow）
# 注意：对于 managed workflow，通常不需要提交 android 目录
```

### 方案 3：联系 Expo 支持

如果问题持续存在，建议：
1. 查看完整的构建日志
2. 在 [Expo Forums](https://forums.expo.dev/) 或 [GitHub Issues](https://github.com/expo/eas-cli/issues) 寻求帮助
3. 提供完整的错误日志和项目配置

## 相关链接

- [EAS Build 文档](https://docs.expo.dev/build/introduction/)
- [Expo 新架构文档](https://docs.expo.dev/development/new-architecture/)
- [常见构建错误](https://docs.expo.dev/build/troubleshooting/)

