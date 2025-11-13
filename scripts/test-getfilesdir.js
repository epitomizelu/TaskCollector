/**
 * 通过 ADB 测试 getFilesDir() 的返回值
 * 使用 run-as 命令访问应用的文件目录
 */

const { execSync } = require('child_process');

const PACKAGE_NAME = 'com.lcy.taskcollection';

console.log('========================================');
console.log('  测试 getFilesDir() 路径');
console.log('========================================');
console.log(`包名: ${PACKAGE_NAME}`);
console.log('');

// 测试 1: 检查应用的文件目录路径
console.log('📋 测试 1: 检查应用文件目录路径');
console.log('----------------------------------------');

try {
  // 使用 run-as 进入应用上下文
  const command = `adb shell run-as ${PACKAGE_NAME} pwd`;
  const result = execSync(command, { encoding: 'utf8' }).trim();
  console.log(`✅ 当前工作目录: ${result}`);
} catch (error) {
  const errorMsg = error.message || error.stdout || '';
  if (errorMsg.includes('not debuggable')) {
    console.error('❌ 应用未启用调试模式');
    console.error('');
    console.error('💡 解决方案：');
    console.error('   方案 1（推荐）: 通过 Logcat 查看路径');
    console.error('     运行: npm run test-filesdir:logcat');
    console.error('     或: adb logcat | grep MainApplication');
    console.error('');
    console.error('   方案 2: 启用调试模式');
    console.error('     修改 android/app/src/main/AndroidManifest.xml');
    console.error('     在 <application> 标签添加: android:debuggable="true"');
    console.error('     重新构建并安装 APK');
    console.error('');
    console.error('   方案 3: 使用 root 权限（如果设备已 root）');
    console.error('     adb root');
    console.error('     adb shell ls -la /data/user/0/com.lcy.taskcollection/files/');
    console.error('');
    console.log('⚠️  由于应用未启用调试模式，跳过后续测试');
    console.log('   请使用 Logcat 方法查看路径信息');
    process.exit(0);
  } else {
    console.error('❌ 无法访问应用目录');
    console.error('   错误:', error.message);
  }
}

console.log('');

// 测试 2: 检查 files 目录
console.log('📋 测试 2: 检查 files 目录');
console.log('----------------------------------------');

try {
  const command = `adb shell run-as ${PACKAGE_NAME} ls -la files/`;
  const result = execSync(command, { encoding: 'utf8' });
  console.log('files 目录内容:');
  console.log(result);
} catch (error) {
  console.error('❌ 无法列出 files 目录');
  console.error('   错误:', error.message);
}

console.log('');

// 测试 3: 检查 js-bundles 目录
console.log('📋 测试 3: 检查 js-bundles 目录');
console.log('----------------------------------------');

try {
  const command = `adb shell run-as ${PACKAGE_NAME} ls -la files/js-bundles/ 2>&1`;
  const result = execSync(command, { encoding: 'utf8' });
  if (result.includes('No such file')) {
    console.log('⚠️  js-bundles 目录不存在');
  } else {
    console.log('js-bundles 目录内容:');
    console.log(result);
  }
} catch (error) {
  console.error('❌ 无法访问 js-bundles 目录');
  console.error('   错误:', error.message);
}

console.log('');

// 测试 4: 获取完整的文件路径
console.log('📋 测试 4: 获取完整文件路径');
console.log('----------------------------------------');

try {
  // 获取应用的数据目录路径
  const command = `adb shell run-as ${PACKAGE_NAME} sh -c 'echo $ANDROID_DATA'`;
  const androidData = execSync(command, { encoding: 'utf8' }).trim();
  console.log(`ANDROID_DATA: ${androidData}`);
  
  // 尝试获取实际的文件路径
  const pathCommand = `adb shell run-as ${PACKAGE_NAME} sh -c 'cd files && pwd'`;
  const filesPath = execSync(pathCommand, { encoding: 'utf8' }).trim();
  console.log(`files 目录路径: ${filesPath}`);
  
  // 检查是否是 /data/user/0 还是 /data/data
  if (filesPath.includes('/data/user/0')) {
    console.log('✅ 使用多用户路径: /data/user/0/...');
  } else if (filesPath.includes('/data/data')) {
    console.log('✅ 使用传统路径: /data/data/...');
  } else {
    console.log(`⚠️  未知路径格式: ${filesPath}`);
  }
} catch (error) {
  console.error('❌ 无法获取路径信息');
  console.error('   错误:', error.message);
}

console.log('');

// 测试 5: 检查文件是否存在
console.log('📋 测试 5: 检查 bundle 文件是否存在');
console.log('----------------------------------------');

const bundleFiles = [
  'files/js-bundles/index.android.js',
  'files/js-bundles/index.android.hbc',
];

bundleFiles.forEach(filePath => {
  try {
    const command = `adb shell run-as ${PACKAGE_NAME} test -f "${filePath}" && echo "存在" || echo "不存在"`;
    const result = execSync(command, { encoding: 'utf8' }).trim();
    const exists = result === '存在';
    
    if (exists) {
      // 获取文件大小
      const sizeCommand = `adb shell run-as ${PACKAGE_NAME} stat -c "%s" "${filePath}"`;
      const size = execSync(sizeCommand, { encoding: 'utf8' }).trim();
      const sizeMB = (parseInt(size) / 1024 / 1024).toFixed(2);
      console.log(`✅ ${filePath}`);
      console.log(`   大小: ${size} bytes (${sizeMB} MB)`);
    } else {
      console.log(`❌ ${filePath} - 不存在`);
    }
  } catch (error) {
    console.log(`❌ ${filePath} - 检查失败: ${error.message}`);
  }
});

console.log('');

// 测试 6: 使用 stat 获取详细信息
console.log('📋 测试 6: 获取 files 目录详细信息');
console.log('----------------------------------------');

try {
  const command = `adb shell run-as ${PACKAGE_NAME} stat files/`;
  const result = execSync(command, { encoding: 'utf8' });
  console.log('files 目录信息:');
  console.log(result);
} catch (error) {
  console.error('❌ 无法获取目录信息');
  console.error('   错误:', error.message);
}

console.log('');
console.log('========================================');
console.log('  测试完成');
console.log('========================================');
console.log('');
console.log('💡 提示:');
console.log('   - 如果无法访问，确保应用已安装且可调试');
console.log('   - 某些设备可能需要 root 权限');
console.log('   - 可以通过 Logcat 查看应用启动时的路径信息');

