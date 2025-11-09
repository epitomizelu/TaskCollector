#!/bin/bash
# 本地构建和上传脚本
# 自动更新版本号、构建 APK、上传到云存储

set -e  # 遇到错误立即退出

echo "🚀 开始构建和上传流程..."

# 1. 更新版本号
echo ""
echo "📝 步骤 1: 更新版本号..."
node scripts/update-version.js --type build
VERSION=$(node -p "require('./app.json').expo.version")
VERSION_CODE=$(node -p "require('./app.json').expo.android.versionCode")
echo "✅ 版本号已更新: v$VERSION (Build $VERSION_CODE)"

# 2. 构建 APK
echo ""
echo "🔨 步骤 2: 构建 APK..."
eas build --platform android --profile preview --non-interactive

# 3. 获取构建信息（需要手动输入 EAS 下载 URL）
echo ""
echo "📥 步骤 3: 获取 APK 下载地址..."
read -p "请输入 EAS 下载 URL: " EAS_DOWNLOAD_URL

if [ -z "$EAS_DOWNLOAD_URL" ]; then
  echo "❌ 错误: 未提供 EAS 下载 URL"
  exit 1
fi

# 4. 下载 APK
echo ""
echo "📥 步骤 4: 下载 APK..."
curl -L -o ./app-release.apk "$EAS_DOWNLOAD_URL" || wget -O ./app-release.apk "$EAS_DOWNLOAD_URL"

if [ ! -f "./app-release.apk" ]; then
  echo "❌ 错误: APK 下载失败"
  exit 1
fi

echo "✅ APK 下载成功"

# 5. 保存版本信息（EAS URL）
echo ""
echo "💾 步骤 5: 保存版本信息到数据库..."
if [ -z "$API_BASE_URL" ]; then
  export API_BASE_URL="https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api"
fi
if [ -z "$EXPO_PUBLIC_API_KEY" ]; then
  echo "⚠️  警告: EXPO_PUBLIC_API_KEY 环境变量未设置，将跳过保存版本信息"
else
  node scripts/save-version-info.js "$EAS_DOWNLOAD_URL" "./app-release.apk"
  echo "✅ 版本信息已保存"
fi

# 6. 上传到腾讯云存储
echo ""
echo "☁️  步骤 6: 上传 APK 到腾讯云存储..."
if [ -z "$EXPO_PUBLIC_API_KEY" ]; then
  echo "⚠️  警告: EXPO_PUBLIC_API_KEY 环境变量未设置，将跳过上传"
else
  node scripts/upload-apk-to-tcb.js ./app-release.apk "$EAS_DOWNLOAD_URL"
  echo "✅ APK 已上传到云存储"
fi

# 7. 提交版本号更新到 Git（可选）
echo ""
read -p "是否提交版本号更新到 Git? (y/n): " COMMIT_VERSION
if [ "$COMMIT_VERSION" = "y" ] || [ "$COMMIT_VERSION" = "Y" ]; then
  echo "📝 提交版本号更新..."
  git add app.json
  git commit -m "chore: 自动更新版本号 v$VERSION (Build $VERSION_CODE)"
  echo "✅ 版本号已提交到 Git"
  read -p "是否推送到远程仓库? (y/n): " PUSH_VERSION
  if [ "$PUSH_VERSION" = "y" ] || [ "$PUSH_VERSION" = "Y" ]; then
    git push
    echo "✅ 版本号已推送到远程仓库"
  fi
fi

echo ""
echo "✅ 构建和上传流程完成！"
echo "   版本: v$VERSION (Build $VERSION_CODE)"
echo "   EAS 下载地址: $EAS_DOWNLOAD_URL"

