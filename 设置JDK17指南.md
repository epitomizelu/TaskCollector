# 设置 JDK 17 为默认 Java 版本

## 当前状态

- ✅ JDK 17 已安装：`D:\jdk17\jdk` (版本 17.0.11)
- ✅ JAVA_HOME 已设置：`D:\jdk17\jdk`
- ❌ PATH 环境变量中 Java 1.8 路径在前，导致系统默认使用 Java 1.8

## 解决方案

### 方法一：修改系统 PATH 环境变量（推荐，永久生效）

#### 步骤：

1. **打开系统环境变量设置**：
   - 按 `Win + R`，输入 `sysdm.cpl`，回车
   - 或者：右键"此电脑" → "属性" → "高级系统设置" → "环境变量"

2. **修改 PATH 环境变量**：
   - 在"系统变量"中找到 `Path`
   - 点击"编辑"
   - 找到 `D:\Java\jdk1.8\bin` 条目
   - 点击"删除"或"上移"到 JDK 17 之后
   - 确保 `D:\jdk17\jdk\bin` 在 PATH 的最前面（如果没有，点击"新建"添加）
   - 点击"确定"保存

3. **验证设置**：
   - 打开新的 PowerShell 或命令提示符窗口
   - 运行：`java -version`
   - 应该显示 Java 17 版本

#### PATH 顺序应该是：
```
D:\jdk17\jdk\bin        ← JDK 17（应该在最前面）
D:\Java\jdk1.8\bin      ← JDK 1.8（可以保留，但要在后面）
```

---

### 方法二：在当前 PowerShell 会话中临时设置（仅当前会话有效）

在 PowerShell 中运行：

```powershell
# 将 JDK 17 路径添加到 PATH 最前面
$env:PATH = "D:\jdk17\jdk\bin;" + $env:PATH

# 验证
java -version
```

---

### 方法三：使用 Gradle 配置（已配置）

已经在 `android/gradle.properties` 中设置了：
```properties
org.gradle.java.home=D:\\jdk17\\jdk
```

这样 Gradle 构建时会使用 JDK 17，即使系统默认是 Java 1.8。

---

## 验证设置

### 1. 检查系统默认 Java 版本

```powershell
java -version
```

**应该显示**：
```
java version "17.0.11" 2024-04-16 LTS
Java(TM) SE Runtime Environment Oracle GraalVM 17.0.11+7.1
```

### 2. 检查 JAVA_HOME

```powershell
echo $env:JAVA_HOME
```

**应该显示**：
```
D:\jdk17\jdk
```

### 3. 检查 javac 版本

```powershell
javac -version
```

**应该显示**：
```
javac 17.0.11
```

### 4. 检查 Gradle 使用的 Java 版本

```powershell
cd android
.\gradlew.bat --version
```

查看输出的 "JVM" 信息，应该显示 Java 17。

---

## 快速设置脚本（PowerShell）

创建一个 PowerShell 脚本 `set-jdk17.ps1`：

```powershell
# 设置 JDK 17 为当前会话的默认 Java
$env:JAVA_HOME = "D:\jdk17\jdk"
$env:PATH = "$env:JAVA_HOME\bin;" + ($env:PATH -replace "D:\\Java\\jdk1.8\\bin;", "")

Write-Host "JDK 17 已设置为默认 Java 版本" -ForegroundColor Green
Write-Host "Java 版本:" -ForegroundColor Yellow
java -version
```

使用方法：
```powershell
.\set-jdk17.ps1
```

---

## 注意事项

1. **修改系统 PATH 后需要重启终端**：环境变量更改后，需要关闭并重新打开 PowerShell/命令行窗口才能生效。

2. **Android Studio 设置**：如果使用 Android Studio，也需要在 IDE 中设置 JDK 路径：
   - File → Project Structure → SDK Location
   - 设置 JDK location 为 `D:\jdk17\jdk`

3. **Gradle 配置已生效**：即使系统默认是 Java 1.8，Gradle 构建时也会使用 JDK 17（因为已在 `gradle.properties` 中配置）。

4. **保留 Java 1.8**：如果某些旧项目需要 Java 1.8，可以保留在 PATH 中，只要确保 JDK 17 的路径在前面即可。

---

## 当前配置状态

- ✅ JAVA_HOME: `D:\jdk17\jdk` （正确）
- ✅ Gradle 配置: `org.gradle.java.home=D:\\jdk17\\jdk` （已配置）
- ❌ 系统 PATH: Java 1.8 路径在前（需要调整）

---

## 推荐操作

1. **修改系统 PATH**（方法一），将 JDK 17 路径放在最前面
2. **重启终端**验证设置
3. **重新尝试构建 APK**

如果构建仍然失败，问题可能是 Android SDK 36 的兼容性问题，而不是 JDK 版本问题。

