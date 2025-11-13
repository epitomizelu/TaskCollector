/**
 * 在构建时自动注入 OTA Bundle Loader 到 MainApplication.kt
 * 支持 React Native 新架构 (BridgelessReact)
 * 
 * 新架构使用 ReactHost 和 getJSBundleLoader()，而不是 ReactNativeHost 和 getJSBundleFile()
 * 但 DefaultReactNativeHost 仍然有 getJSBundleFile() 方法，可能在新架构中也会被调用
 */

const fs = require('fs');
const path = require('path');

const MAIN_APPLICATION_PATH = path.join(
  __dirname,
  '..',
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'lcy',
  'taskcollection',
  'MainApplication.kt'
);

// 需要添加的导入
const REQUIRED_IMPORTS = [
  'import android.util.Log',
  'import java.io.File',
  'import com.facebook.react.bridge.JSBundleLoader',
  'import com.facebook.react.bridge.JSBundleLoaderDelegate'
];

// 检查并注入 getJSBundleFile() 方法（兼容新旧架构）
const GET_JS_BUNDLE_FILE_METHOD = `          override fun getJSBundleFile(): String? {
            // 强制输出日志，确保能看到
            Log.e("MainApplication", "========================================")
            Log.e("MainApplication", "getJSBundleFile() called (BridgelessReact compatible)")
            Log.e("MainApplication", "========================================")
            
            // 检查是否有下载的 bundle 文件
            val filesDir = this@MainApplication.getFilesDir()
            val bundleDir = File(filesDir, "js-bundles")
            
            Log.e("MainApplication", "Checking Bundle files:")
            Log.e("MainApplication", "   getFilesDir(): \${filesDir.absolutePath}")
            Log.e("MainApplication", "   bundleDir: \${bundleDir.absolutePath}")
            
            // 优先使用 .js 文件，如果没有则使用 .hbc 文件
            val jsBundle = File(bundleDir, "index.android.js")
            val hbcBundle = File(bundleDir, "index.android.hbc")
            
            Log.e("MainApplication", "   jsBundle: \${jsBundle.absolutePath}, exists: \${jsBundle.exists()}, size: \${if (jsBundle.exists()) jsBundle.length() else 0}")
            Log.e("MainApplication", "   hbcBundle: \${hbcBundle.absolutePath}, exists: \${hbcBundle.exists()}, size: \${if (hbcBundle.exists()) hbcBundle.length() else 0}")
            
            return when {
              jsBundle.exists() && jsBundle.length() > 0 -> {
                Log.e("MainApplication", "Loading downloaded JS Bundle: \${jsBundle.absolutePath} (\${jsBundle.length()} bytes)")
                jsBundle.absolutePath
              }
              hbcBundle.exists() && hbcBundle.length() > 0 -> {
                Log.e("MainApplication", "Loading downloaded HBC Bundle: \${hbcBundle.absolutePath} (\${hbcBundle.length()} bytes)")
                hbcBundle.absolutePath
              }
              else -> {
                Log.e("MainApplication", "No downloaded Bundle found, using default Bundle")
                if (bundleDir.exists() && bundleDir.isDirectory) {
                  val files = bundleDir.listFiles()
                  if (files != null && files.isNotEmpty()) {
                    Log.e("MainApplication", "Bundle directory contents:")
                    files.forEach { file ->
                      Log.e("MainApplication", "     - \${file.name} (\${file.length()} bytes)")
                    }
                  } else {
                    Log.e("MainApplication", "Bundle directory is empty")
                  }
                } else {
                  Log.e("MainApplication", "Bundle directory does not exist")
                }
                null // 使用默认 bundle (APK assets 中的)
              }
            }
          }`;

// 检查并注入 onCreate() 日志（用于验证代码是否执行）
const ON_CREATE_LOG_METHOD = `
  override fun onCreate() {
    super.onCreate()
    Log.e("MainApplication", "========================================")
    Log.e("MainApplication", "MainApplication.onCreate() called")
    Log.e("MainApplication", "Package: \${packageName}")
    Log.e("MainApplication", "getFilesDir(): \${getFilesDir().absolutePath}")
    Log.e("MainApplication", "========================================")
`;

function injectOTABundleLoader() {
  console.log('========================================');
  console.log('Injecting OTA Bundle Loader (BridgelessReact Compatible)');
  console.log('========================================');
  console.log(`Target file: ${MAIN_APPLICATION_PATH}`);
  console.log('');
  
  // 检查文件是否存在
  if (!fs.existsSync(MAIN_APPLICATION_PATH)) {
    console.error(`ERROR: File not found: ${MAIN_APPLICATION_PATH}`);
    console.error('');
    console.error('Possible reasons:');
    console.error('  1. expo prebuild has not been run');
    console.error('  2. android folder path is incorrect');
    console.error('  3. Package name or path configuration error');
    console.error('');
    process.exit(1);
  }
  
  console.log('OK File exists, reading...');

  // 读取文件内容
  let content = fs.readFileSync(MAIN_APPLICATION_PATH, 'utf8');
  const originalContent = content;

  // 1. 检查并添加必要的导入
  let importsAdded = false;
  REQUIRED_IMPORTS.forEach(importLine => {
    if (!content.includes(importLine)) {
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, nextLineIndex + 1) + 
                  importLine + '\n' + 
                  content.slice(nextLineIndex + 1);
        importsAdded = true;
      }
    }
  });

  if (importsAdded) {
    console.log('OK Added required imports');
  }

  // 2. 检查是否已经存在 getJSBundleFile() 方法
  const getJSBundleFileStartRegex = /override\s+fun\s+getJSBundleFile\(\)\s*:\s*String\?/;
  const methodStartMatch = content.match(getJSBundleFileStartRegex);
  
  console.log(`Checking if getJSBundleFile() method exists...`);
  console.log(`   File length: ${content.length} characters`);
  console.log(`   Contains 'getJSBundleFile': ${content.includes('getJSBundleFile')}`);
  
  if (methodStartMatch) {
    console.log(`   OK Found method declaration at position: ${methodStartMatch.index}`);
    
    let methodStartIndex = methodStartMatch.index;
    for (let i = methodStartIndex - 1; i >= 0; i--) {
      if (content[i] === '\n') {
        methodStartIndex = i + 1;
        break;
      }
      if (i === 0) {
        methodStartIndex = 0;
        break;
      }
    }
    
    // 找到方法体
    let braceIndex = content.indexOf('{', methodStartMatch.index);
    if (braceIndex === -1) {
      console.error('ERROR: Cannot find method body start');
      process.exit(1);
    }
    
    let braceCount = 0;
    let methodEndIndex = braceIndex;
    for (let i = braceIndex; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') braceCount--;
      if (braceCount === 0) {
        methodEndIndex = i + 1;
        break;
      }
    }
    
    if (methodEndIndex === braceIndex) {
      console.error('ERROR: Cannot find method body end');
      process.exit(1);
    }
    
    const methodContent = content.substring(methodStartIndex, methodEndIndex);
    const hasOTAImplementation = methodContent.includes('File(this@MainApplication.getFilesDir()') || 
                                 methodContent.includes('js-bundles');
    const hasSuperCall = methodContent.includes('super.getJSBundleFile()') || 
                        methodContent.includes('return super');
    
    console.log(`   Contains OTA implementation: ${hasOTAImplementation}`);
    console.log(`   Contains super call: ${hasSuperCall}`);
    
    if (hasOTAImplementation) {
      console.log('INFO: getJSBundleFile() method already contains OTA implementation, skipping');
      return;
    } else {
      console.log('WARNING: Detected getJSBundleFile() method, will replace with OTA implementation');
      const beforeMethod = content.substring(0, methodStartIndex);
      const afterMethod = content.substring(methodEndIndex);
      content = beforeMethod + GET_JS_BUNDLE_FILE_METHOD + afterMethod;
    }
  } else {
    console.log('   INFO: getJSBundleFile() method not found, will insert new method');
    // 查找插入位置
    const insertMarker = 'override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG';
    const markerIndex = content.indexOf(insertMarker);
    
    if (markerIndex === -1) {
      console.error('ERROR: Cannot find insertion marker: getUseDeveloperSupport()');
      console.error('   Please check MainApplication.kt file structure');
      process.exit(1);
    }

    const lineEndIndex = content.indexOf('\n', markerIndex);
    if (lineEndIndex === -1) {
      console.error('ERROR: Cannot find line terminator');
      process.exit(1);
    }

    const beforeMethod = content.slice(0, lineEndIndex + 1);
    const afterMethod = content.slice(lineEndIndex + 1);
    
    content = beforeMethod + '\n' + GET_JS_BUNDLE_FILE_METHOD + '\n' + afterMethod;
  }

  // 3. 检查并添加 onCreate() 日志（如果还没有）
  if (!content.includes('MainApplication.onCreate() called')) {
    const onCreateRegex = /override\s+fun\s+onCreate\(\)/;
    const onCreateMatch = content.match(onCreateRegex);
    
    if (onCreateMatch) {
      console.log('INFO: Found onCreate() method, adding logs...');
      // 在 onCreate() 方法开始处添加日志
      const onCreateIndex = onCreateMatch.index;
      const onCreateBraceIndex = content.indexOf('{', onCreateIndex);
      if (onCreateBraceIndex !== -1) {
        const afterBrace = content.indexOf('\n', onCreateBraceIndex);
        if (afterBrace !== -1) {
          const beforeOnCreate = content.slice(0, afterBrace + 1);
          const afterOnCreate = content.slice(afterBrace + 1);
          // 在 super.onCreate() 之前添加日志
          content = beforeOnCreate + ON_CREATE_LOG_METHOD + afterOnCreate;
        }
      }
    }
  }

  // 4. 写入文件
  console.log('');
  console.log('Writing modified file...');
  fs.writeFileSync(MAIN_APPLICATION_PATH, content, 'utf8');
  console.log('OK File written');

  // 5. 验证修改
  console.log('');
  console.log('Verifying injection result...');
  if (content.includes('override fun getJSBundleFile()')) {
    const hasOTAImplementation = content.includes('File(this@MainApplication.getFilesDir()') || 
                                 content.includes('js-bundles');
    const hasLogStatements = content.includes('Log.e("MainApplication"') || content.includes('Log.d("MainApplication"');
    const hasSuperCall = content.includes('super.getJSBundleFile()');
    
    console.log(`   Contains getJSBundleFile() method: OK`);
    console.log(`   Contains OTA implementation (js-bundles): ${hasOTAImplementation ? 'OK' : 'ERROR'}`);
    console.log(`   Contains log statements: ${hasLogStatements ? 'OK' : 'ERROR'}`);
    console.log(`   Contains super call: ${hasSuperCall ? 'WARNING (may be overridden)' : 'OK'}`);
    
    if (hasOTAImplementation && hasLogStatements && !hasSuperCall) {
      console.log('');
      console.log('========================================');
      console.log('OK Successfully injected OTA Bundle Loader!');
      console.log('========================================');
      console.log(`File path: ${MAIN_APPLICATION_PATH}`);
      console.log('');
      console.log('Injected method includes:');
      console.log('  OK getJSBundleFile() method');
      console.log('  OK OTA bundle loading logic');
      console.log('  OK Detailed debug logs (ERROR level)');
      console.log('');
      console.log('Note: This works for both old and new architecture');
      console.log('  - Old architecture: getJSBundleFile() will be called');
      console.log('  - New architecture: May still call getJSBundleFile() or use JSBundleLoader');
      console.log('');
    } else if (hasSuperCall) {
      console.warn('');
      console.warn('WARNING: Detected getJSBundleFile() method but only contains super call');
      console.warn('   This may mean injection failed or was overridden');
      process.exit(1);
    } else {
      console.log('');
      console.log('OK Successfully injected getJSBundleFile() method');
      console.log(`   File path: ${MAIN_APPLICATION_PATH}`);
      console.log('');
    }
  } else {
    console.error('');
    console.error('ERROR: Injection failed: method not found');
    console.error('');
    fs.writeFileSync(MAIN_APPLICATION_PATH, originalContent, 'utf8');
    console.error('Restored original file');
    process.exit(1);
  }
}

// 执行注入
try {
  injectOTABundleLoader();
  console.log('OTA Bundle Loader injection complete!');
  process.exit(0);
} catch (error) {
  console.error('');
  console.error('ERROR: Error during injection:');
  console.error(error.message);
  console.error('');
  console.error('Stack trace:');
  console.error(error.stack);
  console.error('');
  process.exit(1);
}

