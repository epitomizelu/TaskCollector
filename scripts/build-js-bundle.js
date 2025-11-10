/**
 * 构建 JS Bundle 脚本
 * 用于本地构建 JavaScript bundle，用于简易版 OTA 更新
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置信息
const OUTPUT_DIR = path.join(__dirname, '..', 'js-bundles');
const BUNDLE_NAME = 'index.android.bundle';
const ASSETS_DEST = path.join(OUTPUT_DIR, 'assets');

/**
 * 读取 app.json 获取版本信息
 */
function getVersionInfo() {
  const appJsonPath = path.join(__dirname, '..', 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  return {
    version: appJson.expo.version,
    versionCode: appJson.expo.android.versionCode,
  };
}

/**
 * 确保输出目录存在
 */
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`✅ 创建输出目录: ${OUTPUT_DIR}`);
  }
  
  if (!fs.existsSync(ASSETS_DEST)) {
    fs.mkdirSync(ASSETS_DEST, { recursive: true });
    console.log(`✅ 创建资源目录: ${ASSETS_DEST}`);
  }
}

/**
 * 构建 JS Bundle
 */
function buildBundle() {
  const { version, versionCode } = getVersionInfo();
  const bundlePath = path.join(OUTPUT_DIR, BUNDLE_NAME);
  
  console.log('========================================');
  console.log('  构建 JS Bundle');
  console.log('========================================');
  console.log(`版本: ${version} (Build ${versionCode})`);
  console.log(`输出目录: ${OUTPUT_DIR}`);
  console.log('');
  
  // 确保输出目录存在
  ensureOutputDir();
  
  // 构建命令
  // 使用 react-native bundle 命令构建 Android bundle
  // 注意：Expo 项目的入口文件是 expo-router/entry
  const entryFile = 'expo-router/entry';
  const bundleCommand = [
    'npx react-native bundle',
    '--platform android',
    '--dev false',
    `--entry-file ${entryFile}`,
    `--bundle-output "${bundlePath}"`,
    `--assets-dest "${ASSETS_DEST}"`,
    '--reset-cache',
  ].join(' ');
  
  console.log('执行构建命令...');
  console.log(`命令: ${bundleCommand}`);
  console.log('');
  
  try {
    execSync(bundleCommand, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });
    
    // 检查文件是否生成
    if (!fs.existsSync(bundlePath)) {
      throw new Error('Bundle 文件未生成');
    }
    
    const stats = fs.statSync(bundlePath);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log('');
    console.log('✅ Bundle 构建成功！');
    console.log(`   文件路径: ${bundlePath}`);
    console.log(`   文件大小: ${fileSizeMB} MB`);
    console.log('');
    
    return {
      bundlePath,
      assetsPath: ASSETS_DEST,
      version,
      versionCode,
      fileSize: stats.size,
    };
  } catch (error) {
    console.error('');
    console.error('❌ Bundle 构建失败:', error.message);
    throw error;
  }
}

/**
 * 主函数
 */
function main() {
  try {
    const result = buildBundle();
    
    console.log('========================================');
    console.log('  构建完成');
    console.log('========================================');
    console.log(`Bundle 路径: ${result.bundlePath}`);
    console.log(`资源路径: ${result.assetsPath}`);
    console.log(`版本: ${result.version} (Build ${result.versionCode})`);
    console.log(`文件大小: ${(result.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log('');
    console.log('下一步: 运行上传脚本');
    console.log('  node scripts/upload-js-bundle.js');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { buildBundle, getVersionInfo };

