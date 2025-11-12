# 何时需要重新生成 android 文件夹

## 📋 快速判断

### ✅ **不需要**删除 android 文件夹的情况

如果只是修改了以下内容，**只需要清理构建缓存**，不需要重新生成：

1. **JavaScript/TypeScript 代码**（`app/`, `screens/`, `components/` 等）
2. **样式和资源文件**（CSS、图片等）
3. **业务逻辑代码**

**操作：**
```powershell
cd android
.\gradlew.bat clean
.\gradlew.bat assembleDebug  # 或 assembleRelease
```

---

### ⚠️ **需要**重新生成 android 文件夹的情况

如果修改了以下内容，**需要重新预构建**：

1. **`app.json` 配置**：
   - 修改了 `android.package`（应用包名）
   - 修改了 `android.versionCode`
   - 添加/删除了 Expo 插件（plugins）
   - 修改了 `android.permissions`
   - 修改了 `android.adaptiveIcon`
   - 修改了 `android.compileSdkVersion` 或 `targetSdkVersion`

2. **添加/删除了原生模块**：
   - 安装了新的 Expo 模块（如 `expo-camera`, `expo-av` 等）
   - 卸载了原生模块
   - 修改了 `newArchEnabled` 设置

3. **修改了 Expo SDK 版本**：
   - 升级或降级了 Expo SDK

4. **修改了原生配置**：
   - 手动修改了 `android/` 目录下的原生代码
   - 修改了 `android/gradle.properties` 中的关键配置（如 `newArchEnabled`）

**操作：**
```powershell
# 方法一：使用 --clean 参数（推荐）
npx expo prebuild --platform android --clean

# 方法二：手动删除后重新生成
Remove-Item -Path "android" -Recurse -Force
npx expo prebuild --platform android
```

---

## 🔍 详细说明

### 场景 1: 只修改了 JS/TS 代码

**示例：**
- 修改了 `app/index.tsx`
- 修改了 `screens/` 下的组件
- 修改了业务逻辑

**操作：**
```powershell
# 只需要清理构建缓存
cd android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
```

**原因：** JS/TS 代码会被打包到 APK 中，不需要重新生成原生项目结构。

---

### 场景 2: 修改了 app.json

**示例：**
- 修改了应用名称
- 添加了新的权限
- 添加了新的 Expo 插件

**操作：**
```powershell
# 需要重新预构建
npx expo prebuild --platform android --clean
cd android
.\gradlew.bat assembleDebug
```

**原因：** `app.json` 的更改会影响原生项目的配置文件和清单文件。

---

### 场景 3: 安装了新的 Expo 模块

**示例：**
```bash
npm install expo-camera
```

**操作：**
```powershell
# 需要重新预构建以链接新模块
npx expo prebuild --platform android --clean
cd android
.\gradlew.bat assembleDebug
```

**原因：** 新的原生模块需要链接到 Android 项目中。

---

### 场景 4: 修改了 android/gradle.properties

**关键配置（需要重新预构建）：**
- `newArchEnabled` - 新架构开关
- `reactNativeArchitectures` - 架构配置（通常不需要）

**非关键配置（不需要重新预构建）：**
- `org.gradle.jvmargs` - JVM 参数
- `org.gradle.parallel` - 并行构建
- `org.gradle.caching` - 构建缓存

**操作：**
```powershell
# 如果修改了 newArchEnabled，需要重新预构建
npx expo prebuild --platform android --clean

# 如果只修改了 JVM 参数等，只需要清理构建
cd android
.\gradlew.bat clean
```

---

## 🎯 推荐工作流程

### 日常开发（只修改代码）

```powershell
# 1. 修改代码
# 2. 清理并构建
cd android
.\gradlew.bat clean
.\gradlew.bat assembleDebug
```

### 修改配置或添加模块

```powershell
# 1. 修改 app.json 或安装新模块
# 2. 重新预构建
npx expo prebuild --platform android --clean
# 3. 构建
cd android
.\gradlew.bat assembleDebug
```

---

## ⚡ 快速检查清单

在构建前，问自己：

- [ ] 我修改了 `app.json` 吗？ → **需要重新预构建**
- [ ] 我安装/卸载了 Expo 模块吗？ → **需要重新预构建**
- [ ] 我修改了 `newArchEnabled` 吗？ → **需要重新预构建**
- [ ] 我只修改了 JS/TS 代码？ → **只需要清理构建**

---

## 💡 提示

1. **不确定时**：使用 `--clean` 参数重新预构建是安全的，只是会多花一些时间。

2. **构建脚本**：可以使用项目中的 `build-apk.ps1` 脚本，它会自动检查是否需要预构建。

3. **EAS Build**：如果使用 EAS Build，不需要关心这些，云端会自动处理。

---

## 📝 总结

| 修改内容 | 是否需要重新预构建 | 操作 |
|---------|------------------|------|
| JS/TS 代码 | ❌ 不需要 | `gradlew.bat clean` |
| app.json | ✅ 需要 | `expo prebuild --clean` |
| 添加/删除模块 | ✅ 需要 | `expo prebuild --clean` |
| gradle.properties (JVM参数) | ❌ 不需要 | `gradlew.bat clean` |
| gradle.properties (newArchEnabled) | ✅ 需要 | `expo prebuild --clean` |

