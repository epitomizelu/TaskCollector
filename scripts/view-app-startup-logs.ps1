# PowerShell 脚本：查看应用启动时的 MainApplication 日志
# 解决 adb logcat --pid 看不到完整日志的问题

$PACKAGE_NAME = "com.lcy.taskcollection"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  查看应用启动时的 MainApplication 日志" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "包名: $PACKAGE_NAME" -ForegroundColor Yellow
Write-Host ""

# 清除旧日志
Write-Host "📋 步骤 1: 清除旧的日志..." -ForegroundColor Yellow
adb logcat -c
Write-Host "✅ 日志已清除" -ForegroundColor Green
Write-Host ""

Write-Host "📋 步骤 2: 开始监听日志..." -ForegroundColor Yellow
Write-Host "   请在设备上关闭并重新打开应用" -ForegroundColor Gray
Write-Host "   按 Ctrl+C 停止监听" -ForegroundColor Gray
Write-Host ""

# 方式1: 使用标签过滤（推荐，最精确）
Write-Host "🔍 使用标签过滤模式（推荐）" -ForegroundColor Cyan
Write-Host "   过滤标签: MainApplication, ReactNativeJS, ReactNative" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 提示: 如果看不到日志，尝试以下命令:" -ForegroundColor Yellow
Write-Host "   # 方式2: 使用内容过滤（更全面）" -ForegroundColor Gray
Write-Host "   adb logcat | Select-String -Pattern 'MainApplication|Bundle|getFilesDir|检查|加载'" -ForegroundColor Gray
Write-Host ""
Write-Host "   # 方式3: 查看所有日志（信息量很大）" -ForegroundColor Gray
Write-Host "   adb logcat" -ForegroundColor Gray
Write-Host ""

# 使用标签过滤
adb logcat -s MainApplication:D ReactNativeJS:D ReactNative:V

