# Android APK 本地构建脚本
# 使用方法: .\build-apk.ps1 [debug|release]

param(
    [string]$BuildType = "release"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Android APK 本地构建脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在项目根目录
if (-not (Test-Path "package.json")) {
    Write-Host "错误: 请在项目根目录运行此脚本" -ForegroundColor Red
    exit 1
}

# 检查是否已预构建 Android 项目
if (-not (Test-Path "android")) {
    Write-Host "检测到未预构建 Android 项目，开始预构建..." -ForegroundColor Yellow
    Write-Host ""
    
    npx expo prebuild --platform android
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "预构建失败！请检查错误信息" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "预构建完成！" -ForegroundColor Green
    Write-Host ""
}

# 进入 Android 目录
Set-Location android

# 清理之前的构建
Write-Host "清理构建缓存..." -ForegroundColor Yellow
.\gradlew.bat clean

if ($LASTEXITCODE -ne 0) {
    Write-Host "清理失败！" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# 构建 APK
if ($BuildType -eq "debug") {
    Write-Host ""
    Write-Host "构建 Debug APK..." -ForegroundColor Yellow
    .\gradlew.bat assembleDebug
    $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
} else {
    Write-Host ""
    Write-Host "构建 Release APK..." -ForegroundColor Yellow
    .\gradlew.bat assembleRelease
    $apkPath = "app\build\outputs\apk\release\app-release.apk"
}

# 返回项目根目录
Set-Location ..

# 检查构建结果
$fullApkPath = "android\$apkPath"
if (Test-Path $fullApkPath) {
    $apkFile = Get-Item $fullApkPath
    $apkSize = [math]::Round($apkFile.Length / 1MB, 2)
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   构建成功！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "APK 类型: $BuildType" -ForegroundColor Cyan
    Write-Host "APK 位置: $fullApkPath" -ForegroundColor Cyan
    Write-Host "APK 大小: $apkSize MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "完整路径: $(Resolve-Path $fullApkPath)" -ForegroundColor White
    Write-Host ""
    
    # 询问是否安装到设备
    $install = Read-Host "是否安装到连接的 Android 设备? (y/n)"
    if ($install -eq "y" -or $install -eq "Y") {
        Write-Host ""
        Write-Host "正在安装..." -ForegroundColor Yellow
        adb install -r $fullApkPath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "安装成功！" -ForegroundColor Green
        } else {
            Write-Host "安装失败，请确保设备已连接并启用 USB 调试" -ForegroundColor Red
        }
    }
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   构建失败！" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查上面的错误信息" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "常见问题:" -ForegroundColor Yellow
    Write-Host "1. 确保已安装 Java JDK 17+" -ForegroundColor White
    Write-Host "2. 确保已安装 Android Studio 并配置 SDK" -ForegroundColor White
    Write-Host "3. 确保 ANDROID_HOME 环境变量已设置" -ForegroundColor White
    Write-Host "4. 检查 android/local.properties 文件中的 SDK 路径" -ForegroundColor White
    Write-Host ""
    exit 1
}

