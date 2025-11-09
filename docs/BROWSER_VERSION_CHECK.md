# 浏览器控制台版本号检查脚本

## 使用方法

### 方法 1：直接复制代码到控制台

1. 打开浏览器开发者工具（F12）
2. 切换到 Console（控制台）标签
3. 复制以下代码并粘贴到控制台，按 Enter 执行：

```javascript
// 检查版本号的函数
function checkVersion() {
  const Constants = window.Constants || window.expo?.Constants;
  
  if (!Constants) {
    console.error('❌ 无法找到 Constants 对象');
    return;
  }
  
  console.log('='.repeat(60));
  console.log('📱 版本号检查报告');
  console.log('='.repeat(60));
  
  // 原生版本号
  console.log('\n1️⃣ 原生版本号:');
  console.log('   nativeAppVersion:', Constants.nativeAppVersion || '❌ 不可用');
  console.log('   nativeBuildVersion:', Constants.nativeBuildVersion || '❌ 不可用');
  
  // Expo Config 版本号
  console.log('\n2️⃣ Expo Config 版本号:');
  console.log('   expoConfig.version:', Constants.expoConfig?.version || '❌ 不可用');
  console.log('   expoConfig.android.versionCode:', Constants.expoConfig?.android?.versionCode || '❌ 不可用');
  
  // 最终使用的版本号
  const nativeBuildVersion = Constants.nativeBuildVersion;
  const nativeBuildVersionParsed = nativeBuildVersion 
    ? (typeof nativeBuildVersion === 'number' 
        ? nativeBuildVersion 
        : parseInt(String(nativeBuildVersion), 10))
    : null;
  
  const expoConfigVersionCode = Constants.expoConfig?.android?.versionCode;
  let finalVersionCode = nativeBuildVersionParsed 
    ? nativeBuildVersionParsed 
    : (expoConfigVersionCode || 1);
  
  const finalVersion = Constants.nativeAppVersion || Constants.expoConfig?.version || '1.0.0';
  
  console.log('\n3️⃣ 最终使用的版本号:');
  console.log('   ✅ version:', finalVersion);
  console.log('   ✅ versionCode:', finalVersionCode);
  
  // 与 app.json 对比
  console.log('\n4️⃣ 与 app.json 对比:');
  console.log('   当前 app.json 中 versionCode 应该是: 2');
  if (finalVersionCode === 2) {
    console.log('   ✅ 版本号匹配！');
  } else {
    console.log('   ❌ 版本号不匹配！');
    console.log('   期望: 2');
    console.log('   实际:', finalVersionCode);
    console.log('   💡 解决方案: 重启开发服务器 (expo start --web --clear)');
  }
  
  console.log('\n' + '='.repeat(60));
  
  return {
    version: finalVersion,
    versionCode: finalVersionCode,
    isCorrect: finalVersionCode === 2
  };
}

// 运行检查
const result = checkVersion();

// 导出到全局
window.checkVersion = checkVersion;
```

### 方法 2：使用脚本文件

1. 打开 `scripts/check-version-in-browser.js` 文件
2. 复制全部内容
3. 粘贴到浏览器控制台并执行

## 输出说明

脚本会输出以下信息：

1. **原生版本号**：实际安装的应用版本（Web 端通常不可用）
2. **Expo Config 版本号**：从 `app.json` 读取的版本号
3. **最终使用的版本号**：AppUpdateService 实际使用的版本号
4. **版本号对比**：与 `app.json` 中的期望值（2）进行对比

## 预期结果

如果版本号正确，应该看到：

```
✅ version: 1.0.0
✅ versionCode: 2
✅ 版本号匹配！
```

如果版本号不正确，应该看到：

```
❌ 版本号不匹配！
期望: 2
实际: 1
💡 解决方案: 重启开发服务器 (expo start --web --clear)
```

## 常见问题

### Q: 为什么 versionCode 还是 1？

A: 可能是 Expo 缓存了旧的配置。解决方法：
1. 停止开发服务器（Ctrl+C）
2. 运行 `expo start --web --clear` 清除缓存
3. 重新打开浏览器页面

### Q: 如何再次检查？

A: 在控制台输入 `checkVersion()` 即可重新检查。

