# 查看应用崩溃日志
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   查看应用崩溃日志" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 清除旧日志
Write-Host "清除旧日志..." -ForegroundColor Yellow
adb logcat -c

Write-Host ""
Write-Host "开始监控日志..." -ForegroundColor Green
Write-Host "请在手机上打开应用" -ForegroundColor Yellow
Write-Host "按 Ctrl+C 停止监控" -ForegroundColor Gray
Write-Host ""

# 过滤应用相关的错误和警告
adb logcat *:E *:W | Select-String -Pattern "taskcollection|ReactNative|Expo|AndroidRuntime|FATAL|Exception|Error|Crash" -CaseSensitive:$false

