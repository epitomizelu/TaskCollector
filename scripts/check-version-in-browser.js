/**
 * 浏览器控制台版本号检查脚本
 * 使用方法：复制以下代码到浏览器控制台运行
 */

// 辅助函数：查找 Constants 对象
function findConstants() {
  // 方法1: 从 window 对象
  if (window.Constants) {
    return window.Constants;
  }
  // 方法2: 从 expo 命名空间
  if (window.expo?.Constants) {
    return window.expo.Constants;
  }
  // 方法3: 从 React 组件树查找（如果 React DevTools 可用）
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    // 尝试从 React 根节点查找
    const reactRoot = document.querySelector('#root') || document.querySelector('[data-reactroot]');
    if (reactRoot && reactRoot._reactInternalInstance) {
      // 尝试查找包含 Constants 的组件
    }
  }
  // 方法4: 遍历 window 对象查找包含 expoConfig 的对象
  for (const key in window) {
    try {
      const obj = window[key];
      if (obj && typeof obj === 'object' && obj.expoConfig) {
        console.log('✅ 从 window.' + key + ' 找到包含 expoConfig 的对象');
        return obj;
      }
    } catch (e) {
      // 忽略访问错误
    }
  }
  return null;
}

// 检查版本号的函数
function checkVersion(manualConstants = null) {
  // 如果提供了手动传入的 Constants，使用它
  let Constants = manualConstants;
  
  // 否则尝试自动查找
  if (!Constants) {
    Constants = findConstants();
  }
  
  if (!Constants) {
    console.error('❌ 无法自动找到 Constants 对象');
    console.log('\n💡 请尝试以下方法手动查找:');
    console.log('\n方法1: 查找包含 expoConfig 的对象');
    console.log('   在控制台输入:');
    console.log('   Object.keys(window).find(k => window[k]?.expoConfig)');
    console.log('   然后运行: checkVersion(window.找到的变量名)');
    console.log('\n方法2: 查找所有可能包含 Constants 的变量');
    console.log('   在控制台输入:');
    console.log('   Object.keys(window).filter(k => k.includes("Constant") || k.includes("expo"))');
    console.log('\n方法3: 直接从代码中查找');
    console.log('   在应用代码中，Constants 通常是通过以下方式导入的:');
    console.log('   import Constants from "expo-constants";');
    console.log('   尝试在控制台输入: require("expo-constants").default');
    console.log('\n方法4: 使用简化版本（直接读取 app.json）');
    console.log('   运行: checkVersionFromAppJson()');
    return null;
  }
  
  console.log('='.repeat(60));
  console.log('📱 版本号检查报告');
  console.log('='.repeat(60));
  
  // 1. 原生版本号
  console.log('\n1️⃣ 原生版本号（实际安装的版本）:');
  console.log('   nativeAppVersion:', Constants.nativeAppVersion || '❌ 不可用');
  console.log('   nativeBuildVersion:', Constants.nativeBuildVersion || '❌ 不可用');
  console.log('   nativeBuildVersion 类型:', typeof Constants.nativeBuildVersion);
  
  // 2. Expo Config 版本号
  console.log('\n2️⃣ Expo Config 版本号（app.json 中的值）:');
  console.log('   expoConfig.version:', Constants.expoConfig?.version || '❌ 不可用');
  console.log('   expoConfig.android.versionCode:', Constants.expoConfig?.android?.versionCode || '❌ 不可用');
  console.log('   expoConfig.android:', JSON.stringify(Constants.expoConfig?.android, null, 2));
  
  // 3. 环境变量
  console.log('\n3️⃣ 环境变量:');
  console.log('   EXPO_PUBLIC_VERSION_CODE:', process?.env?.EXPO_PUBLIC_VERSION_CODE || '❌ 不可用');
  
  // 4. 平台信息
  console.log('\n4️⃣ 平台信息:');
  console.log('   Platform.OS:', window.Platform?.OS || 'web');
  console.log('   __DEV__:', typeof __DEV__ !== 'undefined' ? __DEV__ : '❌ 不可用');
  
  // 5. 最终使用的版本号（模拟 AppUpdateService 的逻辑）
  console.log('\n5️⃣ 最终使用的版本号（AppUpdateService 逻辑）:');
  const nativeVersion = Constants.nativeAppVersion;
  const nativeBuildVersion = Constants.nativeBuildVersion;
  const nativeBuildVersionParsed = nativeBuildVersion 
    ? (typeof nativeBuildVersion === 'number' 
        ? nativeBuildVersion 
        : parseInt(String(nativeBuildVersion), 10))
    : null;
  
  const expoConfigVersion = Constants.expoConfig?.version;
  const expoConfigVersionCode = Constants.expoConfig?.android?.versionCode;
  
  let finalVersionCode = nativeBuildVersionParsed 
    ? nativeBuildVersionParsed 
    : (expoConfigVersionCode || 1);
  
  // Web 端特殊处理
  if (finalVersionCode === 1) {
    const envVersionCode = process?.env?.EXPO_PUBLIC_VERSION_CODE 
      ? parseInt(process.env.EXPO_PUBLIC_VERSION_CODE, 10) 
      : null;
    if (envVersionCode && envVersionCode > 1) {
      console.warn('   ⚠️  检测到 versionCode 缓存问题，使用环境变量覆盖:', envVersionCode);
      finalVersionCode = envVersionCode;
    } else {
      console.warn('   ⚠️  versionCode 为 1，可能是缓存问题');
      console.warn('   建议重启开发服务器: expo start --web --clear');
    }
  }
  
  const finalVersion = nativeVersion || expoConfigVersion || '1.0.0';
  
  console.log('   ✅ 最终 version:', finalVersion);
  console.log('   ✅ 最终 versionCode:', finalVersionCode);
  console.log('   📍 version 来源:', nativeVersion ? 'native' : 'expoConfig');
  console.log('   📍 versionCode 来源:', nativeBuildVersionParsed ? 'native' : 'expoConfig');
  
  // 6. 与 app.json 对比
  console.log('\n6️⃣ 与 app.json 对比:');
  console.log('   当前 app.json 中 versionCode 应该是: 2');
  if (finalVersionCode === 2) {
    console.log('   ✅ 版本号匹配！');
  } else {
    console.log('   ❌ 版本号不匹配！');
    console.log('   期望: 2');
    console.log('   实际:', finalVersionCode);
    console.log('   💡 解决方案: 重启开发服务器 (expo start --web --clear)');
  }
  
  // 7. Constants 完整对象（用于调试）
  console.log('\n7️⃣ Constants 完整对象:');
  console.log('   Constants 所有属性:', Object.keys(Constants));
  console.log('   Constants.expoConfig 完整内容:', JSON.stringify(Constants.expoConfig, null, 2));
  
  console.log('\n' + '='.repeat(60));
  
  return {
    version: finalVersion,
    versionCode: finalVersionCode,
    nativeVersion,
    nativeBuildVersion,
    expoConfigVersion,
    expoConfigVersionCode,
    isCorrect: finalVersionCode === 2
  };
}

// 简化版本：直接从 app.json 读取（如果无法找到 Constants）
function checkVersionFromAppJson() {
  console.log('='.repeat(60));
  console.log('📱 版本号检查报告（从 app.json 读取）');
  console.log('='.repeat(60));
  console.log('\n⚠️  这是简化版本，直接从 app.json 读取');
  console.log('   实际运行时，应用会使用 Constants.expoConfig 中的值');
  console.log('\n📝 app.json 中的版本号:');
  console.log('   version: 1.0.0');
  console.log('   versionCode: 2');
  console.log('\n💡 如果应用读取的 versionCode 不是 2，可能是缓存问题');
  console.log('   解决方案: 重启开发服务器 (expo start --web --clear)');
  console.log('\n' + '='.repeat(60));
  
  return {
    version: '1.0.0',
    versionCode: 2,
    source: 'app.json',
    note: '这是 app.json 中的值，实际应用可能读取到缓存值'
  };
}

// 从控制台日志中查找版本号（查找 AppUpdateService 的日志）
function checkVersionFromLogs() {
  console.log('='.repeat(60));
  console.log('📱 从控制台日志查找版本号');
  console.log('='.repeat(60));
  console.log('\n🔍 正在查找 [AppUpdateService] 相关的日志...');
  console.log('\n💡 请查看控制台中的以下日志:');
  console.log('   [AppUpdateService] 初始化版本信息');
  console.log('   [AppUpdateService] 检查更新');
  console.log('\n📝 在这些日志中，你应该能看到:');
  console.log('   - versionCode: 实际读取的版本号');
  console.log('   - expoConfigVersionCode: 从 expoConfig 读取的版本号');
  console.log('\n如果 versionCode 是 1，但 expoConfigVersionCode 是 2，说明是缓存问题');
  console.log('\n' + '='.repeat(60));
  
  // 尝试从控制台历史中查找（如果浏览器支持）
  if (console.history) {
    const logs = console.history.filter(log => 
      log.message && log.message.includes('[AppUpdateService]')
    );
    if (logs.length > 0) {
      console.log('\n✅ 找到相关日志:');
      logs.slice(-5).forEach(log => {
        console.log('   ', log.message);
      });
    }
  }
  
  return {
    method: '从日志查找',
    note: '请查看控制台中的 [AppUpdateService] 日志，找到实际的 versionCode 值'
  };
}

// 创建一个简单的测试：触发更新检查，查看实际使用的版本号
function testUpdateCheck() {
  console.log('='.repeat(60));
  console.log('🧪 测试更新检查（查看实际使用的版本号）');
  console.log('='.repeat(60));
  console.log('\n💡 这个方法会触发应用的更新检查');
  console.log('   在检查过程中，会输出 [AppUpdateService] 日志');
  console.log('   日志中会显示实际使用的 versionCode');
  console.log('\n📝 请执行以下步骤:');
  console.log('1. 在应用中打开"检查更新"功能');
  console.log('2. 查看控制台中的 [AppUpdateService] 日志');
  console.log('3. 查找 "初始化版本信息" 或 "检查更新" 日志');
  console.log('4. 查看其中的 versionCode 值');
  console.log('\n如果 versionCode 是 1，说明读取了缓存值');
  console.log('如果 versionCode 是 2，说明读取正确');
  console.log('\n' + '='.repeat(60));
  
  return {
    method: '测试更新检查',
    note: '请在应用中触发更新检查，查看控制台日志'
  };
}

// 导出到全局，方便再次调用
window.checkVersion = checkVersion;
window.findConstants = findConstants;
window.checkVersionFromAppJson = checkVersionFromAppJson;
window.checkVersionFromLogs = checkVersionFromLogs;
window.testUpdateCheck = testUpdateCheck;

// 尝试自动运行（如果找到 Constants）
console.log('🔍 正在查找 Constants 对象...');
const result = checkVersion();

if (result) {
  console.log('\n✅ 检查完成！');
} else {
  console.log('\n⚠️  无法自动检查，请尝试以下方法:');
  console.log('1. 运行简化版本: checkVersionFromAppJson()');
  console.log('2. 手动查找 Constants 后运行: checkVersion(你的Constants对象)');
  console.log('3. 使用查找函数: findConstants()');
}

