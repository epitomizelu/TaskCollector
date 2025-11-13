# Simple version: Only capture logs, no auto-analysis

$logFile = "logcat_full_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Capture Logcat Logs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Clear old logs..." -ForegroundColor Yellow
adb logcat -c
Write-Host "OK Logs cleared" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Start capturing logs..." -ForegroundColor Yellow
Write-Host "   Log file: $logFile" -ForegroundColor Gray
Write-Host "   Please restart the app, then wait 10 seconds" -ForegroundColor Yellow
Write-Host "   Press Ctrl+C to stop capturing" -ForegroundColor Gray
Write-Host ""

# Start logcat and write to file
$logcatProcess = Start-Process -FilePath "adb" -ArgumentList "logcat" -NoNewWindow -PassThru -RedirectStandardOutput $logFile

Write-Host "Waiting 10 seconds, please restart the app..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "Step 3: Stop log capture..." -ForegroundColor Yellow
Stop-Process -Id $logcatProcess.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

if (Test-Path $logFile) {
    $fileSize = (Get-Item $logFile).Length
    $fileSizeKB = [math]::Round($fileSize/1KB, 2)
    Write-Host "OK Log file saved: $logFile ($fileSizeKB KB)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tip: Use the following command to analyze logs:" -ForegroundColor Cyan
    Write-Host "   Select-String -Path $logFile -Pattern 'MainApplication|getJSBundleFile'" -ForegroundColor Gray
} else {
    Write-Host "ERROR: Log file not generated" -ForegroundColor Red
    exit 1
}

Write-Host ""
