/**
 * 通过 Logcat 查看 getFilesDir() 路径
 * 这是最简单的方法，不需要调试模式
 * 支持 Windows PowerShell
 */

const { execSync, spawn } = require('child_process');
const os = require('os');

const PACKAGE_NAME = 'com.lcy.taskcollection';
const isWindows = os.platform() === 'win32';

console.log('========================================');
console.log('  通过 Logcat 查看 getFilesDir() 路径');
console.log('========================================');
console.log(`包名: ${PACKAGE_NAME}`);
console.log(`系统: ${isWindows ? 'Windows' : 'Linux/Mac'}`);
console.log('');

console.log('📋 方法：查看应用启动时的日志');
console.log('----------------------------------------');
console.log('');
console.log('步骤 1: 清除旧的日志');
console.log('   adb logcat -c');
console.log('');
console.log('步骤 2: 重启应用（在设备上关闭并重新打开应用）');
console.log('');
console.log('步骤 3: 查看日志');
if (isWindows) {
  console.log('   Windows PowerShell:');
  console.log('     adb logcat | Select-String MainApplication');
  console.log('   或者使用此脚本（推荐）:');
  console.log('     npm run test-filesdir:logcat');
} else {
  console.log('   Linux/Mac:');
  console.log('     adb logcat | grep MainApplication');
  console.log('   或者使用此脚本（推荐）:');
  console.log('     npm run test-filesdir:logcat');
}
console.log('');

// 提供自动过滤选项
const args = process.argv.slice(2);
if (args.includes('--watch') || args.includes('-w')) {
  console.log('🔍 开始监听 Logcat...');
  console.log('   请重启应用以查看路径信息');
  console.log('   按 Ctrl+C 退出');
  console.log('');
  
  // 使用多种方式过滤日志，确保能看到
  // 方式1: 使用标签过滤 MainApplication
  // 方式2: 如果看不到，使用更宽泛的过滤（包含 "Bundle" 或 "MainApplication" 的日志）
  console.log('💡 提示: 如果看不到日志，尝试以下命令:');
  console.log('   adb logcat | Select-String -Pattern "MainApplication|Bundle|getFilesDir"');
  console.log('   adb logcat | Select-String -Pattern "检查|加载|Bundle"');
  console.log('');
  
  // 使用 -s 参数过滤 MainApplication 标签，同时显示所有包含关键字的日志
  // 先尝试只显示 MainApplication 标签
  const logcat = spawn('adb', ['logcat', '-s', 'MainApplication:D', 'ReactNativeJS:D'], {
    stdio: 'inherit',
    shell: isWindows // Windows 需要 shell
  });
  
  logcat.on('error', (error) => {
    console.error('❌ 无法启动 logcat:', error.message);
    console.error('   请确保 adb 已正确安装并在 PATH 中');
    console.error('   可以运行 "adb version" 检查');
  });
  
  logcat.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n❌ Logcat 进程退出，代码: ${code}`);
    }
  });
  
  process.on('SIGINT', () => {
    console.log('\n\n停止监听...');
    logcat.kill();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    logcat.kill();
    process.exit(0);
  });
} else {
  console.log('💡 提示:');
  console.log('   - 运行 "npm run test-filesdir:logcat" 可以自动监听日志');
  console.log('   - 或者手动运行以下命令:');
  console.log('');
  if (isWindows) {
    console.log('   PowerShell 命令:');
    console.log('     # 方式1: 使用标签过滤');
    console.log('     adb logcat -s MainApplication:D');
    console.log('');
    console.log('     # 方式2: 使用内容过滤（推荐，更全面）');
    console.log('     adb logcat | Select-String -Pattern "MainApplication|Bundle|getFilesDir|检查|加载"');
    console.log('');
    console.log('     # 方式3: 查看所有日志（会很多）');
    console.log('     adb logcat');
  } else {
    console.log('   Linux/Mac 命令:');
    console.log('     # 方式1: 使用标签过滤');
    console.log('     adb logcat -s MainApplication:D');
    console.log('');
    console.log('     # 方式2: 使用内容过滤（推荐，更全面）');
    console.log('     adb logcat | grep -E "MainApplication|Bundle|getFilesDir|检查|加载"');
    console.log('');
    console.log('     # 方式3: 查看所有日志（会很多）');
    console.log('     adb logcat');
  }
  console.log('');
  console.log('预期看到的日志:');
  console.log('   🔍 检查 Bundle 文件:');
  console.log('      filesDir: /data/user/0/com.lcy.taskcollection/files');
  console.log('      bundleDir: /data/user/0/com.lcy.taskcollection/files/js-bundles');
  console.log('      jsBundle 路径: ..., 存在: true/false, 大小: X');
  console.log('      hbcBundle 路径: ..., 存在: true/false, 大小: X');
  console.log('');
  console.log('如果文件存在，会看到:');
  console.log('   ✅ 加载下载的 JS Bundle: /data/user/0/.../index.android.js (X bytes)');
  console.log('');
  console.log('如果文件不存在，会看到:');
  console.log('   ⚠️  未找到下载的 Bundle 文件，使用默认 Bundle');
  console.log('   尝试列出 bundleDir 内容:');
  console.log('     - 文件名 (大小)');
  console.log('');
}

