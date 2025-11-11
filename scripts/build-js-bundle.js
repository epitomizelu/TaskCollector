/**
 * 构建 JS Bundle 脚本（适用于 Expo Router 项目）
 * 用于本地构建 JavaScript bundle（.js 格式），用于简易 OTA 更新
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // 🆕 新增：自动加载 .env 文件中的环境变量

// 配置信息
const OUTPUT_DIR = path.join(__dirname, '..', 'js-bundles');
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
 * 🆕 修改：使用 Expo 的 export 命令生成 JS bundle
 * 关闭 Hermes，导出 .js bundle 而不是 .hbc
 */
function buildBundle() {
  const { version, versionCode } = getVersionInfo();

  console.log('========================================');
  console.log('  构建 JS Bundle（Expo 导出模式）');
  console.log('========================================');
  console.log(`版本: ${version} (Build ${versionCode})`);
  console.log(`输出目录: ${OUTPUT_DIR}`);
  console.log('');

  ensureOutputDir();

  // 🆕 修改：使用 expo export 而非 react-native bundle
  // --no-minify --dev 生成 .js 文件（非 .hbc）
  const bundleCommand = [
    'npx expo export',
    '--platform android',
    `--output-dir "${OUTPUT_DIR}"`,
    '--no-minify',
    '--dev'
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
        EXPO_NO_HERMES: '1', // 🆕 新增：关闭 Hermes，强制生成 .js bundle
      },
    });

    // 🆕 新增：自动检测生成的 .js bundle 文件
    const bundleDir = path.join(OUTPUT_DIR, '_expo', 'static', 'js', 'android');
    const bundleFiles = fs.readdirSync(bundleDir).filter(f => f.endsWith('.js'));
    if (bundleFiles.length === 0) {
      throw new Error('未找到 .js Bundle 文件');
    }

    const bundleFile = path.join(bundleDir, bundleFiles[0]);
    const stats = fs.statSync(bundleFile);
    const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log('');
    console.log('✅ Bundle 构建成功！');
    console.log(`   文件路径: ${bundleFile}`);
    console.log(`   文件大小: ${fileSizeMB} MB`);
    console.log('');

    return {
      bundlePath: bundleFile,
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
