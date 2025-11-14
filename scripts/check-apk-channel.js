/**
 * 检查 APK 中的 EAS Update Channel
 * 
 * 使用方法：
 *   node scripts/check-apk-channel.js [apk-path]
 * 
 * 如果没有提供 APK 路径，会尝试从 AndroidManifest.xml 读取
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apkPath = process.argv[2];
const manifestPath = path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');

console.log('🔍 检查 EAS Update Channel...\n');

// 方法 1: 从 AndroidManifest.xml 读取（如果存在）
if (fs.existsSync(manifestPath)) {
  console.log('📋 方法 1: 从 AndroidManifest.xml 读取');
  console.log(`   文件路径: ${manifestPath}\n`);
  
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  
  // 查找 channel meta-data
  const channelMatch = manifestContent.match(
    /<meta-data\s+android:name="expo\.modules\.updates\.EXPO_UPDATE_CHANNEL"\s+android:value="([^"]+)"/i
  );
  
  if (channelMatch) {
    const channel = channelMatch[1];
    console.log(`✅ 找到 Channel: "${channel}"`);
    console.log(`   位置: AndroidManifest.xml`);
  } else {
    console.log('❌ 未找到 EXPO_UPDATE_CHANNEL meta-data');
    console.log('   说明: AndroidManifest.xml 中没有注入 channel');
  }
  
  // 查找其他相关配置
  const enabledMatch = manifestContent.match(
    /<meta-data\s+android:name="expo\.modules\.updates\.ENABLED"\s+android:value="([^"]+)"/i
  );
  if (enabledMatch) {
    console.log(`\n📋 Updates 启用状态: ${enabledMatch[1]}`);
  }
  
  // 查找 runtimeVersion
  const runtimeVersionMatch = manifestContent.match(
    /<meta-data\s+android:name="expo\.modules\.updates\.RUNTIME_VERSION"\s+android:value="([^"]+)"/i
  );
  if (runtimeVersionMatch) {
    console.log(`📋 Runtime Version: ${runtimeVersionMatch[1]}`);
  }
  
  console.log('\n');
}

// 方法 2: 从 APK 文件读取（如果提供了路径）
if (apkPath && fs.existsSync(apkPath)) {
  console.log('📋 方法 2: 从 APK 文件读取');
  console.log(`   APK 路径: ${apkPath}\n`);
  
  try {
    // 使用 aapt 工具读取 AndroidManifest.xml
    // 注意：需要 Android SDK 的 aapt 工具
    const aaptPath = process.env.ANDROID_HOME 
      ? path.join(process.env.ANDROID_HOME, 'build-tools', '*/aapt')
      : 'aapt';
    
    try {
      const output = execSync(
        `"${aaptPath}" dump xmltree "${apkPath}" AndroidManifest.xml`,
        { encoding: 'utf8', stdio: 'pipe' }
      );
      
      // 查找 channel
      const channelMatch = output.match(/EXPO_UPDATE_CHANNEL.*value="([^"]+)"/i);
      if (channelMatch) {
        console.log(`✅ 找到 Channel: "${channelMatch[1]}"`);
        console.log(`   位置: APK 中的 AndroidManifest.xml`);
      } else {
        console.log('❌ 未找到 EXPO_UPDATE_CHANNEL');
        console.log('   说明: APK 中没有注入 channel');
      }
      
      // 查找 runtimeVersion
      const runtimeVersionMatch = output.match(/RUNTIME_VERSION.*value="([^"]+)"/i);
      if (runtimeVersionMatch) {
        console.log(`📋 Runtime Version: ${runtimeVersionMatch[1]}`);
      }
    } catch (error) {
      console.log('⚠️  无法使用 aapt 工具读取 APK');
      console.log('   提示: 需要安装 Android SDK 并配置 ANDROID_HOME 环境变量');
      console.log(`   错误: ${error.message}`);
    }
  } catch (error) {
    console.log(`❌ 读取 APK 失败: ${error.message}`);
  }
  
  console.log('\n');
}

// 方法 3: 从应用运行时读取（需要应用支持）
console.log('📋 方法 3: 从应用运行时读取');
console.log('   在应用中运行以下代码：\n');
console.log('   ```typescript');
console.log('   import * as Updates from "expo-updates";');
console.log('   ');
console.log('   console.log("Channel:", Updates.channel);');
console.log('   console.log("Runtime Version:", Updates.runtimeVersion);');
console.log('   console.log("Update ID:", Updates.updateId);');
console.log('   ```\n');

// 总结
console.log('📝 总结：');
console.log('   如果未找到 channel，说明：');
console.log('   1. APK 构建时没有注入 channel');
console.log('   2. 需要重新构建 APK（使用 inject-eas-channel.js 脚本）');
console.log('   3. 或者使用 EAS Build（会自动处理 channel）\n');

