# 查看所有日志（不过滤，确保能看到所有内容）

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  查看所有日志（不过滤）" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  注意：这会显示所有日志，信息量很大" -ForegroundColor Yellow
Write-Host "   按 Ctrl+C 停止" -ForegroundColor Gray
Write-Host ""

# 清除旧日志
Write-Host "清除旧日志..." -ForegroundColor Yellow
adb logcat -c
Write-Host "✅ 日志已清除" -ForegroundColor Green
Write-Host ""

Write-Host "开始监听所有日志..." -ForegroundColor Green
Write-Host "请重启应用，然后按 Ctrl+C 停止" -ForegroundColor Gray
Write-Host ""

# 查看所有日志
adb logcat

