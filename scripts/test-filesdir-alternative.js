/**
 * 替代方案：通过 Logcat 查看 getFilesDir() 路径
 * 或者创建一个简单的测试命令
 */

const { execSync } = require('child_process');

const PACKAGE_NAME = 'com.lcy.taskcollection';

console.log('========================================');
console.log('  测试 getFilesDir() 路径（替代方案）');
console.log('========================================');
console.log(`包名: ${PACKAGE_NAME}`);
console.log('');

console.log('⚠️  应用未启用调试模式，无法使用 run-as');
console.log('');
console.log('📋 替代方案：');
console.log('');

// 方案 1: 通过 Logcat 查看
console.log('方案 1: 通过 Logcat 查看路径（推荐）');
console.log('----------------------------------------');
console.log('1. 确保应用已安装并运行');
console.log('2. 运行以下命令查看日志:');
console.log('');
console.log('   adb logcat | grep MainApplication');
console.log('');
console.log('3. 重启应用，查看启动时的路径日志');
console.log('   应该能看到类似这样的输出:');
console.log('   🔍 检查 Bundle 文件:');
console.log('      filesDir: /data/user/0/...');
console.log('      bundleDir: /data/user/0/.../js-bundles');
console.log('');

// 方案 2: 使用 root 权限（如果有）
console.log('方案 2: 使用 root 权限（如果设备已 root）');
console.log('----------------------------------------');
console.log('如果设备已 root，可以使用以下命令:');
console.log('');
console.log('   adb root');
console.log('   adb shell ls -la /data/user/0/com.lcy.taskcollection/files/');
console.log('   adb shell ls -la /data/user/0/com.lcy.taskcollection/files/js-bundles/');
console.log('');

// 方案 3: 检查应用是否可调试
console.log('方案 3: 启用应用调试模式');
console.log('----------------------------------------');
console.log('修改 AndroidManifest.xml，添加 debuggable 属性:');
console.log('');
console.log('   <application');
console.log('       android:debuggable="true"');
console.log('       ...>');
console.log('');
console.log('然后重新构建并安装 APK');
console.log('');

// 方案 4: 直接测试路径
console.log('方案 4: 测试可能的路径');
console.log('----------------------------------------');

const possiblePaths = [
  '/data/data/com.lcy.taskcollection/files/js-bundles/index.android.js',
  '/data/user/0/com.lcy.taskcollection/files/js-bundles/index.android.js',
];

console.log('尝试检查可能的路径（需要 root 权限）:');
possiblePaths.forEach((path, index) => {
  try {
    const command = `adb shell su -c "test -f '${path}' && echo '存在' || echo '不存在'" 2>&1`;
    const result = execSync(command, { encoding: 'utf8', timeout: 3000 }).trim();
    if (result.includes('存在')) {
      console.log(`✅ ${path} - 存在`);
      // 获取文件大小
      try {
        const sizeCommand = `adb shell su -c "stat -c '%s' '${path}'" 2>&1`;
        const size = execSync(sizeCommand, { encoding: 'utf8', timeout: 3000 }).trim();
        if (size && !size.includes('Permission denied') && !size.includes('not found')) {
          const sizeMB = (parseInt(size) / 1024 / 1024).toFixed(2);
          console.log(`   大小: ${size} bytes (${sizeMB} MB)`);
        }
      } catch (e) {
        // 忽略大小获取错误
      }
    } else if (result.includes('不存在')) {
      console.log(`❌ ${path} - 不存在`);
    } else {
      console.log(`⚠️  ${path} - 无法检查（可能需要 root）`);
    }
  } catch (error) {
    console.log(`⚠️  ${path} - 检查失败（可能需要 root 权限）`);
  }
});

console.log('');
console.log('========================================');
console.log('  推荐方案');
console.log('========================================');
console.log('');
console.log('✅ 最简单的方法：');
console.log('   1. 重启应用');
console.log('   2. 运行: adb logcat | grep MainApplication');
console.log('   3. 查看启动时的路径日志');
console.log('');
console.log('✅ 或者启用调试模式：');
console.log('   修改 AndroidManifest.xml 添加 android:debuggable="true"');
console.log('   重新构建并安装 APK');
console.log('');

