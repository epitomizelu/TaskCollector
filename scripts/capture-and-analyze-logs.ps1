# Capture all logs and analyze if getJSBundleFile is called

$logFile = "logcat_full_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"
$analysisFile = "logcat_analysis_$(Get-Date -Format 'yyyyMMdd_HHmmss').txt"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Capture and Analyze Logcat Logs" -ForegroundColor Cyan
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
} else {
    Write-Host "ERROR: Log file not generated" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 4: Analyze logs..." -ForegroundColor Yellow
Write-Host ""

# Analyze logs
$analysis = @"
========================================
Log Analysis Result
========================================
File: $logFile
Size: $fileSizeKB KB
Analysis Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
========================================

"@

# 1. Check MainApplication related logs
Write-Host "Checking MainApplication logs..." -ForegroundColor Cyan
$mainAppLogs = Select-String -Path $logFile -Pattern "MainApplication" -CaseSensitive:$false
$mainAppCount = ($mainAppLogs | Measure-Object).Count
$analysis += "MainApplication log count: $mainAppCount`n"

if ($mainAppCount -gt 0) {
    $analysis += "`nFirst 10 MainApplication logs:`n"
    $mainAppLogs | Select-Object -First 10 | ForEach-Object {
        $analysis += "  $($_.Line)`n"
    }
} else {
    $analysis += "WARNING: No MainApplication logs found`n"
}

$analysis += "`n"

# 2. Check getJSBundleFile related logs
Write-Host "Checking getJSBundleFile logs..." -ForegroundColor Cyan
$getJSBundleFileLogs = Select-String -Path $logFile -Pattern "getJSBundleFile|getJSBundle|检查 Bundle|加载下载的" -CaseSensitive:$false
$getJSBundleFileCount = ($getJSBundleFileLogs | Measure-Object).Count
$analysis += "getJSBundleFile related log count: $getJSBundleFileCount`n"

if ($getJSBundleFileCount -gt 0) {
    $analysis += "`nAll getJSBundleFile related logs:`n"
    $getJSBundleFileLogs | ForEach-Object {
        $analysis += "  $($_.Line)`n"
    }
} else {
    $analysis += "ERROR: No getJSBundleFile related logs found`n"
    $analysis += "   This may mean:`n"
    $analysis += "   1. getJSBundleFile() method was not called`n"
    $analysis += "   2. Logs were filtered out`n"
    $analysis += "   3. Code was not properly injected`n"
}

$analysis += "`n"

# 3. Check onCreate related logs
Write-Host "Checking onCreate logs..." -ForegroundColor Cyan
$onCreateLogs = Select-String -Path $logFile -Pattern "onCreate|MainApplication.*onCreate" -CaseSensitive:$false
$onCreateCount = ($onCreateLogs | Measure-Object).Count
$analysis += "onCreate related log count: $onCreateCount`n"

if ($onCreateCount -gt 0) {
    $analysis += "`nFirst 5 onCreate related logs:`n"
    $onCreateLogs | Select-Object -First 5 | ForEach-Object {
        $analysis += "  $($_.Line)`n"
    }
} else {
    $analysis += "WARNING: No onCreate related logs found`n"
}

$analysis += "`n"

# 4. Check ERROR level logs
Write-Host "Checking ERROR level logs..." -ForegroundColor Cyan
$errorLogs = Select-String -Path $logFile -Pattern "E/.*MainApplication" -CaseSensitive:$false
$errorCount = ($errorLogs | Measure-Object).Count
$analysis += "MainApplication ERROR level log count: $errorCount`n"

if ($errorCount -gt 0) {
    $analysis += "`nAll MainApplication ERROR level logs:`n"
    $errorLogs | ForEach-Object {
        $analysis += "  $($_.Line)`n"
    }
} else {
    $analysis += "WARNING: No MainApplication ERROR level logs found`n"
}

$analysis += "`n"

# 5. Check logs containing keywords
Write-Host "Checking logs with keywords..." -ForegroundColor Cyan
$checkLogs = Select-String -Path $logFile -Pattern "检查|加载|Bundle" -CaseSensitive:$false
$checkCount = ($checkLogs | Measure-Object).Count
$analysis += "Logs containing keywords count: $checkCount`n"

if ($checkCount -gt 0) {
    $analysis += "`nFirst 10 related logs:`n"
    $checkLogs | Select-Object -First 10 | ForEach-Object {
        $analysis += "  $($_.Line)`n"
    }
}

$analysis += "`n"

# 6. Check app startup related logs
Write-Host "Checking app startup logs..." -ForegroundColor Cyan
$startupLogs = Select-String -Path $logFile -Pattern "ReactNativeJS.*Running|ReactNative.*Initialize|MainActivity" -CaseSensitive:$false
$startupCount = ($startupLogs | Measure-Object).Count
$analysis += "App startup related log count: $startupCount`n"

if ($startupCount -gt 0) {
    $analysis += "`nFirst 5 startup related logs:`n"
    $startupLogs | Select-Object -First 5 | ForEach-Object {
        $analysis += "  $($_.Line)`n"
    }
}

$analysis += "`n========================================`n"
$analysis += "Analysis Complete`n"
$analysis += "========================================`n"

# Save analysis result
$analysis | Out-File -FilePath $analysisFile -Encoding UTF8

Write-Host ""
Write-Host "OK Analysis complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Files:" -ForegroundColor Cyan
Write-Host "   Full log: $logFile" -ForegroundColor Gray
Write-Host "   Analysis: $analysisFile" -ForegroundColor Gray
Write-Host ""

# Show key results
Write-Host "Key Results:" -ForegroundColor Cyan
Write-Host "   MainApplication logs: $mainAppCount" -ForegroundColor $(if ($mainAppCount -gt 0) { "Green" } else { "Yellow" })
Write-Host "   getJSBundleFile related: $getJSBundleFileCount" -ForegroundColor $(if ($getJSBundleFileCount -gt 0) { "Green" } else { "Red" })
Write-Host "   onCreate related: $onCreateCount" -ForegroundColor $(if ($onCreateCount -gt 0) { "Green" } else { "Yellow" })
Write-Host "   ERROR level: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Green" } else { "Yellow" })
Write-Host ""

if ($getJSBundleFileCount -eq 0) {
    Write-Host "WARNING: No getJSBundleFile related logs found" -ForegroundColor Yellow
    Write-Host "   Possible reasons:" -ForegroundColor Yellow
    Write-Host "   1. getJSBundleFile() method was not called" -ForegroundColor Gray
    Write-Host "   2. Expo Updates may have bypassed this method" -ForegroundColor Gray
    Write-Host "   3. Code was not properly injected" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Suggestions:" -ForegroundColor Yellow
    Write-Host "   - Check Codemagic build logs to confirm injection success" -ForegroundColor Gray
    Write-Host "   - Check Expo Updates configuration" -ForegroundColor Gray
    Write-Host "   - View full log file: $logFile" -ForegroundColor Gray
} else {
    Write-Host "OK Found getJSBundleFile related logs!" -ForegroundColor Green
    Write-Host "   View detailed analysis: $analysisFile" -ForegroundColor Gray
}

Write-Host ""
