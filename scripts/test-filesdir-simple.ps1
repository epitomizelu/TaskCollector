# 简单的 PowerShell 脚本：查看 MainApplication 日志
# 支持 Windows PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   查看 MainApplication 日志" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 清除旧日志
Write-Host "清除旧日志..." -ForegroundColor Yellow
adb logcat -c

Write-Host ""
Write-Host "开始监控日志..." -ForegroundColor Green
Write-Host "请重启应用以查看路径信息" -ForegroundColor Yellow
Write-Host "按 Ctrl+C 停止监控" -ForegroundColor Gray
Write-Host ""

# 方式1: 使用标签过滤（如果看不到，尝试方式2）
Write-Host "方式1: 使用标签过滤 MainApplication" -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray
adb logcat -s MainApplication:D

# 如果上面的命令看不到日志，取消注释下面的命令（方式2）
# Write-Host ""
# Write-Host "方式2: 使用内容过滤（更全面）" -ForegroundColor Cyan
# Write-Host "----------------------------------------" -ForegroundColor Gray
# adb logcat | Select-String -Pattern "MainApplication|Bundle|getFilesDir|检查|加载|filesDir|bundleDir"

