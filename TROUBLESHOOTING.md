# Android 构建问题排查指南

## 问题：react-native-svg 编译错误

### 错误信息
```
error: too many template arguments for class template 'ConcreteShadowNode'
```

### 原因
`react-native-svg` 15.11.2 与 React Native 0.81.4 的新架构（New Architecture）不兼容。

### 解决方案

#### 方案 1：升级 react-native-svg（已应用）

已更新 `package.json` 中的 `react-native-svg` 版本到 `^15.15.0`。

**执行步骤：**

1. **更新依赖**：
   ```bash
   npm install
   ```

2. **清理 Android 构建缓存**：
   ```bash
   cd android
   gradlew.bat clean
   cd ..
   ```

3. **重新预构建**（如果之前已预构建）：
   ```bash
   npx expo prebuild --platform android --clean
   ```

4. **重新构建**：
   ```bash
   cd android
   gradlew.bat assembleDebug
   ```

#### 方案 2：如果升级后仍有问题，临时禁用新架构

如果方案 1 不起作用，可以临时禁用新架构：

1. **编辑 `android/gradle.properties`**：
   
   找到这一行：
   ```properties
   newArchEnabled=true
   ```
   
   改为：
   ```properties
   newArchEnabled=false
   ```

2. **清理并重新构建**：
   ```bash
   cd android
   gradlew.bat clean
   gradlew.bat assembleDebug
   ```

> ⚠️ **注意**：禁用新架构可能会影响某些使用新架构特性的库。如果可能，优先使用方案 1。

#### 方案 3：使用 patch-package（如果特定版本必须使用）

如果必须使用 `react-native-svg` 15.11.2，可以使用 patch-package 修复源代码：

1. **安装 patch-package**：
   ```bash
   npm install --save-dev patch-package
   ```

2. **修改源代码**（需要手动修复 C++ 代码）

3. **创建补丁**：
   ```bash
   npx patch-package react-native-svg
   ```

---

## 其他常见构建问题

### 问题：NDK 版本不兼容

**错误信息**：`NDK version not found` 或 NDK 相关编译错误

**解决方案**：
1. 在 Android Studio 中检查 NDK 版本
2. 在 `android/build.gradle` 中指定 NDK 版本：
   ```gradle
   ext {
       ndkVersion = "27.1.12297006"  // 使用你安装的版本
   }
   ```

### 问题：内存不足

**错误信息**：`OutOfMemoryError`

**解决方案**：
在 `android/gradle.properties` 中增加内存：
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

### 问题：Gradle 版本不兼容

**错误信息**：Gradle 相关错误

**解决方案**：
1. 检查 `android/gradle/wrapper/gradle-wrapper.properties` 中的 Gradle 版本
2. 确保与 Android Gradle Plugin 版本兼容

---

## 构建前检查清单

在构建前，确保：

- [ ] 已安装 Java JDK 17+
- [ ] 已安装 Android Studio 和 Android SDK
- [ ] 已配置 `ANDROID_HOME` 环境变量
- [ ] 已运行 `npm install` 安装所有依赖
- [ ] 已运行 `npx expo prebuild --platform android`（如果 android 目录不存在）
- [ ] 已清理构建缓存（`gradlew.bat clean`）

---

## 获取帮助

如果问题仍然存在：

1. 查看完整的构建日志，找出第一个错误
2. 检查 Expo SDK 版本兼容性
3. 查看相关库的 GitHub Issues
4. 清理所有缓存后重试：
   ```bash
   # 清理 npm 缓存
   npm cache clean --force
   
   # 删除 node_modules 和重新安装
   rm -rf node_modules
   npm install
   
   # 清理 Android 构建
   cd android
   gradlew.bat clean
   cd ..
   
   # 重新预构建
   npx expo prebuild --platform android --clean
   ```

