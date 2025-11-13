# 诊断 MainApplication 日志问题
# 用于排查为什么看不到 MainApplication 的日志

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  诊断 MainApplication 日志问题" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 步骤 1: 检查 APK 版本
Write-Host "📋 步骤 1: 检查已安装的 APK 版本..." -ForegroundColor Yellow
$packageInfo = adb shell dumpsys package com.lcy.taskcollection | Select-String -Pattern "versionCode|versionName"
if ($packageInfo) {
    Write-Host "已安装的 APK 信息:" -ForegroundColor Green
    $packageInfo | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "⚠️  无法获取 APK 版本信息" -ForegroundColor Yellow
}
Write-Host ""

# 步骤 2: 清除日志
Write-Host "📋 步骤 2: 清除旧日志..." -ForegroundColor Yellow
adb logcat -c
Write-Host "✅ 日志已清除" -ForegroundColor Green
Write-Host ""

# 步骤 3: 检查是否有 MainApplication 相关的日志
Write-Host "📋 步骤 3: 检查 MainApplication 日志..." -ForegroundColor Yellow
Write-Host "   请重启应用，然后按 Ctrl+C 停止" -ForegroundColor Gray
Write-Host ""

# 使用更宽泛的过滤，确保能看到所有相关日志
Write-Host "🔍 使用宽泛过滤（包含所有可能的日志）..." -ForegroundColor Cyan
Write-Host ""

# 方式1: 先尝试标签过滤
Write-Host "方式 1: 标签过滤 (MainApplication:D)" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
$logcat1 = Start-Process -FilePath "adb" -ArgumentList "logcat", "-s", "MainApplication:D" -NoNewWindow -PassThru -RedirectStandardOutput "logcat_mainapplication.txt"

Start-Sleep -Seconds 2
Write-Host ""
Write-Host "方式 2: 内容过滤（更全面）" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host "   搜索关键词: MainApplication, onCreate, getJSBundleFile, Bundle, 检查" -ForegroundColor Gray
Write-Host ""

# 停止第一个进程
Stop-Process -Id $logcat1.Id -Force -ErrorAction SilentlyContinue

# 使用内容过滤
adb logcat | Select-String -Pattern "MainApplication|onCreate|getJSBundleFile|Bundle|检查|加载|filesDir|bundleDir|js-bundles|index.android|🚀|🔍|✅|⚠️" -Context 0,1

