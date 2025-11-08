#!/bin/bash

# 测试脚本：测试从下载 APK 到上传到腾讯云存储的完整流程
# 使用方法：
#   1. 提供一个 APK 下载 URL：bash scripts/test-download-upload.sh <download_url>
#   2. 或者使用测试 URL：bash scripts/test-download-upload.sh

set -e  # 遇到错误立即退出

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== 测试 APK 下载和上传流程 ===${NC}\n"

# 检查环境变量
if [ -z "$EXPO_PUBLIC_API_KEY" ] && [ -z "$API_KEY" ]; then
    echo -e "${RED}❌ 错误: 未设置 API_KEY${NC}"
    echo "请设置环境变量: export EXPO_PUBLIC_API_KEY=your-api-key"
    exit 1
fi

API_KEY=${EXPO_PUBLIC_API_KEY:-$API_KEY}
echo -e "${GREEN}✅ API Key 已设置${NC}"

# 获取下载 URL
if [ -n "$1" ]; then
    DOWNLOAD_URL="$1"
else
    # 如果没有提供 URL，尝试从最近的构建中获取
    echo -e "${YELLOW}⚠️  未提供下载 URL，尝试获取最近的构建...${NC}"
    
    # 检查是否安装了 eas-cli
    if ! command -v eas &> /dev/null; then
        echo -e "${RED}❌ 未安装 eas-cli，请提供下载 URL${NC}"
        echo "使用方法: bash scripts/test-download-upload.sh <download_url>"
        exit 1
    fi
    
    # 获取最新的构建信息
    echo "获取最新的构建信息..."
    BUILD_INFO=$(eas build:list --platform android --limit 1 --json 2>/dev/null || echo "")
    
    if [ -z "$BUILD_INFO" ]; then
        echo -e "${RED}❌ 无法获取构建信息，请手动提供下载 URL${NC}"
        echo "使用方法: bash scripts/test-download-upload.sh <download_url>"
        exit 1
    fi
    
    # 从 JSON 中提取下载 URL（需要 jq）
    if command -v jq &> /dev/null; then
        DOWNLOAD_URL=$(echo "$BUILD_INFO" | jq -r '.[0].artifacts.buildUrl // empty' 2>/dev/null || echo "")
    else
        echo -e "${YELLOW}⚠️  未安装 jq，无法自动提取 URL${NC}"
        echo "请手动提供下载 URL"
        exit 1
    fi
    
    if [ -z "$DOWNLOAD_URL" ] || [ "$DOWNLOAD_URL" = "null" ]; then
        echo -e "${RED}❌ 无法从构建信息中提取下载 URL${NC}"
        echo "请手动提供下载 URL"
        exit 1
    fi
fi

echo -e "${GREEN}📥 下载 URL: ${DOWNLOAD_URL}${NC}\n"

# 步骤 1: 下载 APK
echo -e "${GREEN}=== 步骤 1: 下载 APK ===${NC}"
APK_FILE="./test-app-release.apk"

# 删除旧文件
if [ -f "$APK_FILE" ]; then
    rm "$APK_FILE"
    echo "已删除旧的测试文件"
fi

# 下载文件
echo "开始下载..."
if command -v curl &> /dev/null; then
    curl -L -o "$APK_FILE" "$DOWNLOAD_URL" || {
        echo -e "${RED}❌ curl 下载失败，尝试使用 wget...${NC}"
        if command -v wget &> /dev/null; then
            wget -O "$APK_FILE" "$DOWNLOAD_URL" || {
                echo -e "${RED}❌ 下载失败${NC}"
                exit 1
            }
        else
            echo -e "${RED}❌ 未安装 curl 或 wget${NC}"
            exit 1
        fi
    }
elif command -v wget &> /dev/null; then
    wget -O "$APK_FILE" "$DOWNLOAD_URL" || {
        echo -e "${RED}❌ 下载失败${NC}"
        exit 1
    }
else
    echo -e "${RED}❌ 未安装 curl 或 wget${NC}"
    exit 1
fi

# 验证下载
if [ ! -f "$APK_FILE" ]; then
    echo -e "${RED}❌ APK 文件不存在${NC}"
    exit 1
fi

FILE_SIZE=$(ls -lh "$APK_FILE" | awk '{print $5}')
echo -e "${GREEN}✅ APK 下载成功${NC}"
echo "文件: $APK_FILE"
echo "大小: $FILE_SIZE"
echo ""

# 步骤 2: 获取版本信息
echo -e "${GREEN}=== 步骤 2: 获取版本信息 ===${NC}"
if [ ! -f "./app.json" ]; then
    echo -e "${RED}❌ 未找到 app.json 文件${NC}"
    exit 1
fi

if command -v node &> /dev/null; then
    VERSION=$(node -p "require('./app.json').expo.version" 2>/dev/null || echo "unknown")
    VERSION_CODE=$(node -p "require('./app.json').expo.android.versionCode" 2>/dev/null || echo "0")
    echo -e "${GREEN}✅ 版本信息获取成功${NC}"
    echo "版本: v$VERSION"
    echo "版本代码: $VERSION_CODE"
else
    echo -e "${YELLOW}⚠️  未安装 Node.js，跳过版本信息获取${NC}"
    VERSION="unknown"
    VERSION_CODE="0"
fi
echo ""

# 步骤 3: 上传到腾讯云存储
echo -e "${GREEN}=== 步骤 3: 上传到腾讯云存储 ===${NC}"

# 检查上传脚本
if [ ! -f "./scripts/upload-apk-to-tcb.js" ]; then
    echo -e "${RED}❌ 未找到上传脚本: scripts/upload-apk-to-tcb.js${NC}"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 未安装 Node.js${NC}"
    exit 1
fi

# 设置环境变量
export EXPO_PUBLIC_API_KEY="$API_KEY"
export API_BASE_URL="https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api"

echo "开始上传..."
echo "API Base URL: $API_BASE_URL"
echo ""

# 运行上传脚本
node scripts/upload-apk-to-tcb.js "$APK_FILE"

UPLOAD_EXIT_CODE=$?

if [ $UPLOAD_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ 上传成功！${NC}"
    echo ""
    echo -e "${GREEN}=== 测试完成 ===${NC}"
    echo "✅ 下载: 成功"
    echo "✅ 版本信息: 成功"
    echo "✅ 上传: 成功"
    
    # 清理测试文件（可选）
    read -p "是否删除测试 APK 文件? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm "$APK_FILE"
        echo "已删除测试文件: $APK_FILE"
    fi
else
    echo ""
    echo -e "${RED}❌ 上传失败 (退出码: $UPLOAD_EXIT_CODE)${NC}"
    exit 1
fi

