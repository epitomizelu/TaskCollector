# 检查已安装的 APK 版本信息

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  检查已安装的 APK 版本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$packageName = "com.lcy.taskcollection"

Write-Host "包名: $packageName" -ForegroundColor Yellow
Write-Host ""

# 检查是否已安装
$installed = adb shell pm list packages | Select-String $packageName
if (-not $installed) {
    Write-Host "❌ 应用未安装" -ForegroundColor Red
    exit 1
}

Write-Host "✅ 应用已安装" -ForegroundColor Green
Write-Host ""

# 获取版本信息
Write-Host "版本信息:" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray

$versionInfo = adb shell dumpsys package $packageName | Select-String -Pattern "versionCode|versionName|firstInstallTime|lastUpdateTime"

if ($versionInfo) {
    $versionInfo | ForEach-Object {
        $line = $_.Line.Trim()
        if ($line -match "versionCode=(\d+)") {
            Write-Host "版本代码 (versionCode): $($matches[1])" -ForegroundColor Green
        }
        if ($line -match "versionName=(.+)") {
            Write-Host "版本名称 (versionName): $($matches[1])" -ForegroundColor Green
        }
        if ($line -match "firstInstallTime=(\d+)") {
            $installTime = [DateTimeOffset]::FromUnixTimeMilliseconds([long]$matches[1]).LocalDateTime
            Write-Host "首次安装时间: $installTime" -ForegroundColor Gray
        }
        if ($line -match "lastUpdateTime=(\d+)") {
            $updateTime = [DateTimeOffset]::FromUnixTimeMilliseconds([long]$matches[1]).LocalDateTime
            Write-Host "最后更新时间: $updateTime" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "⚠️  无法获取版本信息" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 提示:" -ForegroundColor Cyan
Write-Host "   - 如果版本代码是旧的，说明 APK 不包含注入的代码" -ForegroundColor Gray
Write-Host "   - 需要重新构建并安装新版本的 APK" -ForegroundColor Gray
Write-Host "   - 检查 Codemagic 构建日志，确认注入是否成功" -ForegroundColor Gray
Write-Host ""

