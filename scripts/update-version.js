/**
 * 自动更新版本号脚本
 * 用于 GitHub Actions 中自动递增版本号
 * 
 * 使用方式：
 * - APK 构建：node scripts/update-version.js --type build
 * - OTA 更新：node scripts/update-version.js --type update [--patch|--minor|--major]
 */

const fs = require('fs');
const path = require('path');

const APP_JSON_PATH = path.join(__dirname, '..', 'app.json');

/**
 * 读取 app.json
 */
function readAppJson() {
  const content = fs.readFileSync(APP_JSON_PATH, 'utf8');
  return JSON.parse(content);
}

/**
 * 写入 app.json
 */
function writeAppJson(data) {
  fs.writeFileSync(APP_JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

/**
 * 解析版本号（如 "1.0.0" -> [1, 0, 0]）
 */
function parseVersion(version) {
  return version.split('.').map(Number);
}

/**
 * 格式化版本号（如 [1, 0, 0] -> "1.0.0"）
 */
function formatVersion(parts) {
  return parts.join('.');
}

/**
 * 递增版本号
 */
function incrementVersion(version, type = 'patch') {
  const parts = parseVersion(version);
  
  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
    default:
      parts[2]++;
      break;
  }
  
  return formatVersion(parts);
}

/**
 * 更新版本号
 */
function updateVersion(type, versionType) {
  const appJson = readAppJson();
  const currentVersion = appJson.expo.version;
  const currentVersionCode = appJson.expo.android?.versionCode || 1;
  
  let newVersion = currentVersion;
  let newVersionCode = currentVersionCode;
  
  if (type === 'build') {
    // APK 构建：必须更新 versionCode，可选更新 version
    newVersionCode = currentVersionCode + 1;
    // 如果 versionCode 是 10 的倍数，更新 patch 版本
    if (newVersionCode % 10 === 0) {
      newVersion = incrementVersion(currentVersion, 'patch');
    }
    console.log(`[APK 构建] 版本号更新:`);
    console.log(`  version: ${currentVersion} -> ${newVersion}`);
    console.log(`  versionCode: ${currentVersionCode} -> ${newVersionCode}`);
  } else if (type === 'update') {
    // OTA 更新：根据参数更新 version，不更新 versionCode
    const updateType = versionType || 'patch';
    newVersion = incrementVersion(currentVersion, updateType);
    console.log(`[OTA 更新] 版本号更新:`);
    console.log(`  version: ${currentVersion} -> ${newVersion} (${updateType})`);
    console.log(`  versionCode: ${currentVersionCode} (保持不变)`);
  } else {
    throw new Error(`未知的更新类型: ${type}`);
  }
  
  // 更新 app.json
  appJson.expo.version = newVersion;
  if (appJson.expo.android) {
    appJson.expo.android.versionCode = newVersionCode;
  } else {
    appJson.expo.android = { versionCode: newVersionCode };
  }
  
  writeAppJson(appJson);
  
  // 使用新的 GitHub Actions 输出格式
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `version=${newVersion}\n`);
    fs.appendFileSync(outputFile, `versionCode=${newVersionCode}\n`);
  }
  
  // 兼容旧的输出格式（已废弃但某些环境可能仍在使用）
  console.log(`::set-output name=version::${newVersion}`);
  console.log(`::set-output name=versionCode::${newVersionCode}`);
  
  return { version: newVersion, versionCode: newVersionCode };
}

// 解析命令行参数
const args = process.argv.slice(2);
const typeIndex = args.indexOf('--type');
const versionTypeIndex = args.indexOf('--patch') !== -1 ? args.indexOf('--patch') :
                         args.indexOf('--minor') !== -1 ? args.indexOf('--minor') :
                         args.indexOf('--major') !== -1 ? args.indexOf('--major') : -1;

if (typeIndex === -1 || !args[typeIndex + 1]) {
  console.error('用法:');
  console.error('  APK 构建: node scripts/update-version.js --type build');
  console.error('  OTA 更新: node scripts/update-version.js --type update [--patch|--minor|--major]');
  process.exit(1);
}

const type = args[typeIndex + 1];
let versionType = 'patch';

if (versionTypeIndex !== -1) {
  if (args[versionTypeIndex] === '--patch') versionType = 'patch';
  else if (args[versionTypeIndex] === '--minor') versionType = 'minor';
  else if (args[versionTypeIndex] === '--major') versionType = 'major';
}

try {
  const result = updateVersion(type, versionType);
  console.log(`✅ 版本号更新成功: v${result.version} (Build ${result.versionCode})`);
} catch (error) {
  console.error('❌ 更新版本号失败:', error.message);
  process.exit(1);
}

