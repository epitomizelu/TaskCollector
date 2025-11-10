# 设置 JDK 17 为默认 Java 版本
# 使用方法: .\set-jdk17.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   设置 JDK 17 为默认 Java 版本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$JDK17_PATH = "D:\jdk17\jdk"
$JDK17_BIN = "$JDK17_PATH\bin"

# 检查 JDK 17 是否存在
if (-not (Test-Path "$JDK17_BIN\java.exe")) {
    Write-Host "错误: JDK 17 未找到在 $JDK17_PATH" -ForegroundColor Red
    exit 1
}

# 显示当前 Java 版本
Write-Host "当前系统默认 Java 版本:" -ForegroundColor Yellow
java -version 2>&1 | Select-Object -First 1
Write-Host ""

# 设置环境变量（当前会话）
$env:JAVA_HOME = $JDK17_PATH
# 将 JDK 17 路径添加到 PATH 最前面
$env:PATH = "$JDK17_BIN;" + ($env:PATH -replace [regex]::Escape("$JDK17_BIN;"), "")

Write-Host "已设置 JDK 17 环境变量（当前会话）" -ForegroundColor Green
Write-Host "JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Cyan
Write-Host ""

# 验证设置
Write-Host "验证 JDK 17 版本:" -ForegroundColor Yellow
& "$JDK17_BIN\java.exe" -version
Write-Host ""

# 检查系统 PATH 设置
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   系统 PATH 环境变量设置说明" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "要永久设置 JDK 17 为默认版本，需要修改系统环境变量:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 按 Win + R，输入 sysdm.cpl，回车" -ForegroundColor White
Write-Host "2. 点击'高级'标签 → '环境变量'" -ForegroundColor White
Write-Host "3. 在'系统变量'中找到 Path，点击'编辑'" -ForegroundColor White
Write-Host "4. 确保 '$JDK17_BIN' 在 PATH 的最前面" -ForegroundColor White
Write-Host "5. 将 Java 1.8 的路径（D:\Java\jdk1.8\bin）移到最后或删除" -ForegroundColor White
Write-Host "6. 点击'确定'保存，重启终端" -ForegroundColor White
Write-Host ""
Write-Host "或者运行以下命令（需要管理员权限）:" -ForegroundColor Yellow
Write-Host '[Environment]::SetEnvironmentVariable("Path", "$JDK17_BIN;" + [Environment]::GetEnvironmentVariable("Path", "Machine"), "Machine")' -ForegroundColor Cyan
Write-Host ""

# 检查 Gradle 配置
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Gradle 配置检查" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$gradleProps = "android\gradle.properties"
if (Test-Path $gradleProps) {
    $content = Get-Content $gradleProps -Raw
    if ($content -match "org\.gradle\.java\.home") {
        Write-Host "✅ Gradle 已配置使用 JDK 17" -ForegroundColor Green
        Write-Host "   配置位置: $gradleProps" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  Gradle 未配置 JDK 路径" -ForegroundColor Yellow
        Write-Host "   建议在 $gradleProps 中添加:" -ForegroundColor Yellow
        Write-Host "   org.gradle.java.home=$JDK17_PATH" -ForegroundColor Cyan
    }
} else {
    Write-Host "⚠️  未找到 Gradle 配置文件" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   设置完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "当前会话已使用 JDK 17" -ForegroundColor Green
Write-Host "要永久生效，请按照上面的说明修改系统环境变量" -ForegroundColor Yellow
Write-Host ""

