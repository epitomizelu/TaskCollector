/**
 * 注入 EAS Update Channel 到 AndroidManifest.xml
 * 
 * 使用方法：
 *   EAS_UPDATE_CHANNEL=preview node scripts/inject-eas-channel.js
 */

const fs = require('fs');
const path = require('path');

const channel = process.env.EAS_UPDATE_CHANNEL || 'preview';
const manifestPath = path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');

console.log(`📦 注入 EAS Update Channel: ${channel}`);

if (!fs.existsSync(manifestPath)) {
  console.error('❌ AndroidManifest.xml 不存在:', manifestPath);
  console.error('   请确保已运行: npx expo prebuild --platform android');
  process.exit(1);
}

// 读取 AndroidManifest.xml
let xmlContent = fs.readFileSync(manifestPath, 'utf8');

// 检查是否已存在 channel meta-data
const channelMetaDataRegex = /<meta-data\s+android:name="expo\.modules\.updates\.EXPO_UPDATE_CHANNEL"\s+android:value="([^"]+)"/;

if (channelMetaDataRegex.test(xmlContent)) {
  // 更新现有的 channel
  xmlContent = xmlContent.replace(
    channelMetaDataRegex,
    `<meta-data android:name="expo.modules.updates.EXPO_UPDATE_CHANNEL" android:value="${channel}"`
  );
  console.log(`✅ 已更新 channel 为: ${channel}`);
} else {
  // 查找 <application> 标签
  const applicationRegex = /(<application[^>]*>)/;
  
  if (!applicationRegex.test(xmlContent)) {
    console.error('❌ 无法找到 <application> 标签');
    process.exit(1);
  }
  
  // 在 <application> 标签后添加 channel meta-data
  // 查找 </application> 之前的位置，在最后一个 meta-data 之后添加
  const metaDataEndRegex = /(\s*<\/meta-data>)/g;
  const matches = [...xmlContent.matchAll(metaDataEndRegex)];
  
  if (matches.length > 0) {
    // 在最后一个 meta-data 之后添加
    const lastMatch = matches[matches.length - 1];
    const insertPosition = lastMatch.index + lastMatch[0].length;
    
    const newMetaData = `\n        <meta-data android:name="expo.modules.updates.EXPO_UPDATE_CHANNEL" android:value="${channel}" />`;
    xmlContent = xmlContent.slice(0, insertPosition) + newMetaData + xmlContent.slice(insertPosition);
    console.log(`✅ 已添加 channel: ${channel}`);
  } else {
    // 如果没有现有的 meta-data，在 <application> 标签后添加
    xmlContent = xmlContent.replace(
      applicationRegex,
      `$1\n        <meta-data android:name="expo.modules.updates.EXPO_UPDATE_CHANNEL" android:value="${channel}" />`
    );
    console.log(`✅ 已添加 channel: ${channel}`);
  }
}

// 写回 AndroidManifest.xml
fs.writeFileSync(manifestPath, xmlContent, 'utf8');

console.log(`✅ EAS Update Channel 已设置为: ${channel}`);
console.log(`   文件位置: ${manifestPath}`);

// 验证
if (fs.readFileSync(manifestPath, 'utf8').includes(`android:value="${channel}"`)) {
  console.log(`✅ 验证成功: channel 已正确设置`);
} else {
  console.error(`❌ 验证失败: channel 可能未正确设置`);
  process.exit(1);
}

