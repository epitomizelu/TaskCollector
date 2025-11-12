# 修复 CMake 构建卡住问题

## 当前问题

构建卡在 CMake 配置阶段，可能原因：
1. CMake 正在下载依赖（网络慢）
2. CMake 配置过程本身很慢
3. 仍在构建多个架构（x86, arm64-v8a 等）

## 解决方案

### 步骤 1: 停止当前构建

按 `Ctrl+C` 停止当前构建。

### 步骤 2: 清理 CMake 缓存

```powershell
cd android

# 清理 Gradle 构建缓存
.\gradlew.bat clean

# 删除 CMake 缓存目录
Remove-Item -Path "app\.cxx" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "react-native-reanimated\.cxx" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "react-native-worklets\.cxx" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "react-native-gesture-handler\.cxx" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "react-native-screens\.cxx" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "expo-modules-core\.cxx" -Recurse -Force -ErrorAction SilentlyContinue
```

### 步骤 3: 验证架构配置

确保 `android/gradle.properties` 中只构建 arm64-v8a：

```properties
reactNativeArchitectures=arm64-v8a
```

### 步骤 4: 重新构建（仅 arm64-v8a）

```powershell
# 设置环境变量强制只构建 arm64-v8a
$env:REACT_NATIVE_ARCHITECTURES = "arm64-v8a"

# 重新构建
.\gradlew.bat assembleDebug --no-daemon
```

### 步骤 5: 如果仍然卡住，尝试跳过 CMake 任务

如果 CMake 配置一直卡住，可以尝试：

```powershell
# 跳过 CMake 配置，直接构建（如果可能）
.\gradlew.bat assembleDebug --no-daemon -x configureCMakeDebug
```

## 替代方案：使用 EAS Build

如果本地构建一直有问题，建议使用 EAS Build：

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

## 检查网络连接

CMake 配置可能需要下载依赖，确保：
- 网络连接正常
- 如果使用代理，配置 Gradle 代理
- 检查防火墙设置

