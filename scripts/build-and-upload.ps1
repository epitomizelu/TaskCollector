# 本地构建和上传脚本 (PowerShell)
# 自动更新版本号、构建 APK、上传到云存储

$ErrorActionPreference = "Stop"

Write-Host "🚀 开始构建和上传流程..." -ForegroundColor Green

# 1. 更新版本号
Write-Host ""
Write-Host "📝 步骤 1: 更新版本号..." -ForegroundColor Yellow
node scripts/update-version.js --type build
$appJson = Get-Content app.json | ConvertFrom-Json
$VERSION = $appJson.expo.version
$VERSION_CODE = $appJson.expo.android.versionCode
Write-Host "✅ 版本号已更新: v$VERSION (Build $VERSION_CODE)" -ForegroundColor Green

# 2. 构建 APK
Write-Host ""
Write-Host "🔨 步骤 2: 构建 APK..." -ForegroundColor Yellow
eas build --platform android --profile preview --non-interactive

# 3. 获取构建信息（需要手动输入 EAS 下载 URL）
Write-Host ""
Write-Host "📥 步骤 3: 获取 APK 下载地址..." -ForegroundColor Yellow
$EAS_DOWNLOAD_URL = Read-Host "请输入 EAS 下载 URL"

if ([string]::IsNullOrEmpty($EAS_DOWNLOAD_URL)) {
    Write-Host "❌ 错误: 未提供 EAS 下载 URL" -ForegroundColor Red
    exit 1
}

# 4. 下载 APK
Write-Host ""
Write-Host "📥 步骤 4: 下载 APK..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $EAS_DOWNLOAD_URL -OutFile "./app-release.apk"
    if (Test-Path "./app-release.apk") {
        Write-Host "✅ APK 下载成功" -ForegroundColor Green
    } else {
        Write-Host "❌ 错误: APK 下载失败" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ 错误: APK 下载失败 - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 5. 保存版本信息（EAS URL）
Write-Host ""
Write-Host "💾 步骤 5: 保存版本信息到数据库..." -ForegroundColor Yellow
if ([string]::IsNullOrEmpty($env:API_BASE_URL)) {
    $env:API_BASE_URL = "https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api"
}
if ([string]::IsNullOrEmpty($env:EXPO_PUBLIC_API_KEY)) {
    Write-Host "⚠️  警告: EXPO_PUBLIC_API_KEY 环境变量未设置，将跳过保存版本信息" -ForegroundColor Yellow
} else {
    node scripts/save-version-info.js $EAS_DOWNLOAD_URL "./app-release.apk"
    Write-Host "✅ 版本信息已保存" -ForegroundColor Green
}

# 6. 上传到腾讯云存储
Write-Host ""
Write-Host "☁️  步骤 6: 上传 APK 到腾讯云存储..." -ForegroundColor Yellow
if ([string]::IsNullOrEmpty($env:EXPO_PUBLIC_API_KEY)) {
    Write-Host "⚠️  警告: EXPO_PUBLIC_API_KEY 环境变量未设置，将跳过上传" -ForegroundColor Yellow
} else {
    node scripts/upload-apk-to-tcb.js ./app-release.apk $EAS_DOWNLOAD_URL
    Write-Host "✅ APK 已上传到云存储" -ForegroundColor Green
}

# 7. 提交版本号更新到 Git（可选）
Write-Host ""
$COMMIT_VERSION = Read-Host "是否提交版本号更新到 Git? (y/n)"
if ($COMMIT_VERSION -eq "y" -or $COMMIT_VERSION -eq "Y") {
    Write-Host "📝 提交版本号更新..." -ForegroundColor Yellow
    git add app.json
    git commit -m "chore: 自动更新版本号 v$VERSION (Build $VERSION_CODE)"
    Write-Host "✅ 版本号已提交到 Git" -ForegroundColor Green
    $PUSH_VERSION = Read-Host "是否推送到远程仓库? (y/n)"
    if ($PUSH_VERSION -eq "y" -or $PUSH_VERSION -eq "Y") {
        git push
        Write-Host "✅ 版本号已推送到远程仓库" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✅ 构建和上传流程完成！" -ForegroundColor Green
Write-Host "   版本: v$VERSION (Build $VERSION_CODE)"
Write-Host "   EAS 下载地址: $EAS_DOWNLOAD_URL"

