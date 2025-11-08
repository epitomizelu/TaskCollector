/**
 * 测试脚本：验证 API Key 注入到 app.json 的功能
 * 模拟 GitHub Actions 中的 API Key 注入逻辑
 * 
 * 使用方法:
 *   1. 不带环境变量: node scripts/test-inject-api-key.js
 *   2. 带环境变量: $env:EXPO_PUBLIC_API_KEY="your-api-key"; node scripts/test-inject-api-key.js
 *   3. Linux/Mac: EXPO_PUBLIC_API_KEY="your-api-key" node scripts/test-inject-api-key.js
 */

const fs = require('fs');
const path = require('path');

// 从环境变量读取 API Key（模拟 GitHub Secrets）
// 如果没有设置环境变量，使用测试值
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'test-api-key-123456789';

// 如果环境变量存在但值为占位符，也使用测试值
const isPlaceholder = API_KEY === '${EXPO_PUBLIC_API_KEY}' || API_KEY.includes('${');
const finalApiKey = isPlaceholder ? 'test-api-key-123456789' : API_KEY;

console.log('=== 开始测试 API Key 注入 ===\n');
console.log('1. 当前 API Key:');
console.log(`   环境变量 EXPO_PUBLIC_API_KEY: ${process.env.EXPO_PUBLIC_API_KEY || '(未设置)'}`);
console.log(`   是否为占位符: ${isPlaceholder ? '是' : '否'}`);
console.log(`   最终使用的 API Key:`);
console.log(`     长度: ${finalApiKey.length}`);
console.log(`     前缀: ${finalApiKey.substring(0, Math.min(8, finalApiKey.length))}...`);
console.log(`     后缀: ...${finalApiKey.substring(Math.max(0, finalApiKey.length - 4))}`);
console.log(`     完整值: ${finalApiKey}\n`);

// 读取 app.json
const appJsonPath = path.join(__dirname, '..', 'app.json');
console.log('2. 读取 app.json:');
console.log(`   路径: ${appJsonPath}`);

if (!fs.existsSync(appJsonPath)) {
  console.error('❌ 错误: app.json 文件不存在');
  process.exit(1);
}

const appJsonContent = fs.readFileSync(appJsonPath, 'utf8');
const appJson = JSON.parse(appJsonContent);

console.log('   ✅ app.json 读取成功\n');

// 显示注入前的状态
console.log('3. 注入前的状态:');
console.log(`   extra.apiKey: ${appJson.expo?.extra?.apiKey || '(未设置)'}\n`);

// 执行注入逻辑（与 GitHub Actions 中的代码相同）
console.log('4. 执行注入逻辑...');
if (!appJson.expo.extra) {
  appJson.expo.extra = {};
}
appJson.expo.extra.apiKey = finalApiKey;

// 保存到临时文件（不直接修改原文件）
const backupPath = path.join(__dirname, '..', 'app.json.backup');
const testOutputPath = path.join(__dirname, '..', 'app.json.test-output');

// 备份原文件
fs.copyFileSync(appJsonPath, backupPath);
console.log(`   ✅ 已备份原文件到: ${backupPath}`);

// 写入测试输出
fs.writeFileSync(testOutputPath, JSON.stringify(appJson, null, 2));
console.log(`   ✅ 测试输出已保存到: ${testOutputPath}\n`);

// 验证注入结果
console.log('5. 验证注入结果:');
const testOutput = JSON.parse(fs.readFileSync(testOutputPath, 'utf8'));
const injectedKey = testOutput.expo?.extra?.apiKey;

if (injectedKey === finalApiKey) {
  console.log('   ✅ API Key 注入成功！');
  console.log(`   注入的值: ${injectedKey.substring(0, Math.min(8, injectedKey.length))}...${injectedKey.substring(Math.max(0, injectedKey.length - 4))}`);
} else {
  console.log('   ❌ API Key 注入失败！');
  console.log(`   期望: ${finalApiKey}`);
  console.log(`   实际: ${injectedKey}`);
}

// 恢复原文件
fs.copyFileSync(backupPath, appJsonPath);
fs.unlinkSync(backupPath);
console.log('\n6. 已恢复原 app.json 文件');

// 显示测试输出文件的内容片段
console.log('\n7. 测试输出文件内容片段:');
const outputContent = fs.readFileSync(testOutputPath, 'utf8');
const lines = outputContent.split('\n');
const extraStartIndex = lines.findIndex(line => line.includes('"extra"'));
if (extraStartIndex !== -1) {
  const relevantLines = lines.slice(extraStartIndex, extraStartIndex + 10);
  console.log('   ' + relevantLines.join('\n   '));
}

console.log('\n=== 测试完成 ===');
console.log(`\n提示: 测试输出文件保存在 ${testOutputPath}`);
console.log('你可以手动检查该文件，确认 API Key 是否正确注入。');
console.log('如果确认无误，可以删除测试输出文件。\n');

