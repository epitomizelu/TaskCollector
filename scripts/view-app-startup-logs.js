/**
 * 查看应用启动时的 MainApplication 日志
 * 解决 adb logcat --pid 看不到完整日志的问题
 */

const { spawn } = require('child_process');
const os = require('os');

const PACKAGE_NAME = 'com.lcy.taskcollection';
const isWindows = os.platform() === 'win32';

console.log('========================================');
console.log('  查看应用启动时的 MainApplication 日志');
console.log('========================================');
console.log(`包名: ${PACKAGE_NAME}`);
console.log(`系统: ${isWindows ? 'Windows' : 'Linux/Mac'}`);
console.log('');

const args = process.argv.slice(2);
const clearLogs = !args.includes('--no-clear');
const filterMode = args.includes('--content') ? 'content' : 
                   args.includes('--all') ? 'all' : 'all';

if (clearLogs) {
  console.log('📋 步骤 1: 清除旧的日志...');
  try {
    require('child_process').execSync('adb logcat -c', { stdio: 'inherit' });
    console.log('✅ 日志已清除');
  } catch (error) {
    console.error('⚠️  清除日志失败（可能不影响使用）:', error.message);
  }
  console.log('');
}

console.log('📋 步骤 2: 开始监听日志...');
console.log('   请在设备上关闭并重新打开应用');
console.log('   按 Ctrl+C 停止监听');
console.log('');

// 根据过滤模式选择不同的命令
let logcatArgs = [];

if (filterMode === 'tag') {
  // 方式1: 使用标签过滤（推荐，最精确）
  // MainApplication:E 表示显示 MainApplication 标签的 ERROR 级别日志（确保能看到）
  // ReactNativeJS:D 显示 React Native JS 层的日志
  // ReactNative:V 显示 React Native 框架日志
  console.log('🔍 使用标签过滤模式（推荐）');
  console.log('   过滤标签: MainApplication (ERROR级别), ReactNativeJS, ReactNative');
  console.log('   注意: 使用 ERROR 级别确保日志不会被过滤');
  console.log('');
  logcatArgs = ['logcat', '-s', 'MainApplication:E', 'ReactNativeJS:D', 'ReactNative:V'];
} else if (filterMode === 'content') {
  // 方式2: 使用内容过滤（更全面，但可能包含无关日志）
  console.log('🔍 使用内容过滤模式（更全面）');
  console.log('   搜索关键词: MainApplication, Bundle, getFilesDir, 检查, 加载');
  console.log('');
  logcatArgs = ['logcat'];
} else {
  // 方式3: 显示所有日志（会很多，不推荐）
  console.log('🔍 显示所有日志（信息量很大）');
  console.log('');
  logcatArgs = ['logcat'];
}

const logcat = spawn('adb', logcatArgs, {
  stdio: filterMode === 'content' ? ['inherit', 'pipe', 'inherit'] : 'inherit',
  shell: isWindows
});

if (filterMode === 'content') {
  // 在 Windows 上使用 Select-String，在 Linux/Mac 上使用 grep
  let filterProcess;
  
  if (isWindows) {
    // PowerShell Select-String
    filterProcess = spawn('powershell', [
      '-Command',
      `$input | Select-String -Pattern "MainApplication|Bundle|getFilesDir|检查|加载|filesDir|bundleDir|js-bundles|index.android" -Context 0,2`
    ], {
      stdio: ['pipe', 'inherit', 'inherit']
    });
  } else {
    // Linux/Mac grep
    filterProcess = spawn('grep', [
      '-E',
      'MainApplication|Bundle|getFilesDir|检查|加载|filesDir|bundleDir|js-bundles|index.android',
      '--line-buffered'
    ], {
      stdio: ['pipe', 'inherit', 'inherit']
    });
  }
  
  logcat.stdout.pipe(filterProcess.stdin);
  
  filterProcess.on('error', (error) => {
    console.error('❌ 过滤进程错误:', error.message);
    console.error('   尝试直接使用标签过滤模式: npm run view-startup-logs');
  });
  
  filterProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n⚠️  过滤进程退出，代码: ${code}`);
    }
  });
}

logcat.on('error', (error) => {
  console.error('❌ 无法启动 logcat:', error.message);
  console.error('   请确保 adb 已正确安装并在 PATH 中');
  console.error('   可以运行 "adb version" 检查');
  process.exit(1);
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

console.log('💡 提示:');
console.log('   - 如果看不到日志，尝试使用内容过滤模式:');
console.log('     npm run view-startup-logs -- --content');
console.log('   - 或者查看所有日志（信息量很大）:');
console.log('     npm run view-startup-logs -- --all');
console.log('   - 预期看到的日志格式:');
console.log('     MainApplication: 🔍 检查 Bundle 文件:');
console.log('     MainApplication:    getFilesDir(): /data/user/0/...');
console.log('     MainApplication:    bundleDir: /data/user/0/.../js-bundles');
console.log('     MainApplication:    jsBundle: ..., 存在: true/false, 大小: X');
console.log('     MainApplication: ✅ 加载下载的 JS Bundle: ...');
console.log('');

