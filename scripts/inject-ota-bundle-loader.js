/**
 * 在构建时自动注入 OTA Bundle Loader 到 MainApplication.kt
 * 支持传统架构（getJSBundleFile）
 * 
 * 注意：新架构（BridgelessReact）不支持通过 MainApplication 注入 bundle loader
 * 新架构需要使用其他方式（如 EAS OTA 更新）来实现 OTA 更新
 * 用于支持 OTA 更新功能
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
  'import java.io.File'
];

// getJSBundleFile() 方法的实现
// 注意：路径必须与 JavaScript 端的 FileSystem.documentDirectory 一致
// FileSystem.documentDirectory 返回: file:///data/user/0/.../files/ 或 file:///data/data/.../files/
// getFilesDir() 返回: /data/user/0/.../files 或 /data/data/.../files
// 两者指向同一个物理位置，只是格式不同（URI vs 文件系统路径）
const GET_JS_BUNDLE_FILE_METHOD = `          override fun getJSBundleFile(): String? {
            // 强制输出日志，确保能看到
            Log.e("MainApplication", "========================================")
            Log.e("MainApplication", "🔍 getJSBundleFile() 被调用！")
            Log.e("MainApplication", "========================================")
            
            // 检查是否有下载的 bundle 文件
            // 使用 getFilesDir() 获取应用文件目录，这与 FileSystem.documentDirectory 对应
            val filesDir = this@MainApplication.getFilesDir()
            val bundleDir = File(filesDir, "js-bundles")
            
            // 添加调试日志，用于对比 JavaScript 端的路径
            Log.e("MainApplication", "🔍 检查 Bundle 文件:")
            Log.e("MainApplication", "   getFilesDir(): \${filesDir.absolutePath}")
            Log.e("MainApplication", "   bundleDir: \${bundleDir.absolutePath}")
            Log.e("MainApplication", "   对应 JS 端路径: file://\${filesDir.absolutePath}/js-bundles/")
            
            // 优先使用 .js 文件，如果没有则使用 .hbc 文件
            val jsBundle = File(bundleDir, "index.android.js")
            val hbcBundle = File(bundleDir, "index.android.hbc")
            
            Log.e("MainApplication", "   jsBundle: \${jsBundle.absolutePath}, 存在: \${jsBundle.exists()}, 大小: \${if (jsBundle.exists()) jsBundle.length() else 0}")
            Log.e("MainApplication", "   hbcBundle: \${hbcBundle.absolutePath}, 存在: \${hbcBundle.exists()}, 大小: \${if (hbcBundle.exists()) hbcBundle.length() else 0}")
            
            return when {
              jsBundle.exists() && jsBundle.length() > 0 -> {
                Log.e("MainApplication", "✅ 加载下载的 JS Bundle: \${jsBundle.absolutePath} (\${jsBundle.length()} bytes)")
                jsBundle.absolutePath
              }
              hbcBundle.exists() && hbcBundle.length() > 0 -> {
                Log.e("MainApplication", "✅ 加载下载的 HBC Bundle: \${hbcBundle.absolutePath} (\${hbcBundle.length()} bytes)")
                hbcBundle.absolutePath
              }
              else -> {
                Log.e("MainApplication", "⚠️  未找到下载的 Bundle 文件，使用默认 Bundle")
                Log.e("MainApplication", "   尝试列出 bundleDir 内容:")
                if (bundleDir.exists() && bundleDir.isDirectory) {
                  val files = bundleDir.listFiles()
                  if (files != null && files.isNotEmpty()) {
                    files.forEach { file ->
                      Log.e("MainApplication", "     - \${file.name} (\${file.length()} bytes)")
                    }
                  } else {
                    Log.e("MainApplication", "     bundleDir 为空")
                  }
                } else {
                  Log.e("MainApplication", "     bundleDir 不存在或不是目录")
                }
                null // 使用默认 bundle (APK assets 中的)
              }
            }
          }`;

function injectOTABundleLoader() {
  console.log('========================================');
  console.log('🔧 开始注入 OTA Bundle Loader');
  console.log('========================================');
  console.log(`目标文件: ${MAIN_APPLICATION_PATH}`);
  console.log('');
  
  // 检查文件是否存在
  if (!fs.existsSync(MAIN_APPLICATION_PATH)) {
    console.error(`❌ 文件不存在: ${MAIN_APPLICATION_PATH}`);
    console.error('');
    console.error('可能的原因:');
    console.error('  1. 还没有运行 expo prebuild');
    console.error('  2. android 文件夹路径不正确');
    console.error('  3. 包名或路径配置错误');
    console.error('');
    console.error('解决方案:');
    console.error('  1. 确保在 Codemagic 构建流程中，先运行 "expo prebuild"');
    console.error('  2. 检查 app.json 中的包名配置');
    console.error('  3. 检查注入脚本中的路径配置');
    console.error('');
    process.exit(1);
  }
  
  console.log('✅ 文件存在，开始读取...');

  // 读取文件内容
  let content = fs.readFileSync(MAIN_APPLICATION_PATH, 'utf8');
  const originalContent = content;

  // 1. 检查并添加必要的导入
  let importsAdded = false;
  REQUIRED_IMPORTS.forEach(importLine => {
    if (!content.includes(importLine)) {
      // 在最后一个 import 语句后添加
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
    console.log('✅ 已添加必要的导入语句');
  }

  // 2. 检查是否已经存在 getJSBundleFile() 方法
  // 使用更灵活的正则表达式匹配方法（包括多行和不同缩进）
  const getJSBundleFileStartRegex = /override\s+fun\s+getJSBundleFile\(\)\s*:\s*String\?/;
  const methodStartMatch = content.match(getJSBundleFileStartRegex);
  
  console.log(`🔍 检查 getJSBundleFile() 方法是否存在...`);
  console.log(`   文件内容长度: ${content.length} 字符`);
  console.log(`   是否包含 'getJSBundleFile': ${content.includes('getJSBundleFile')}`);
  console.log(`   是否包含 'override fun getJSBundleFile': ${content.includes('override fun getJSBundleFile')}`);
  
  if (methodStartMatch) {
    console.log(`   ✅ 找到方法声明，位置: ${methodStartMatch.index}`);
    // 找到方法声明行的开始（包括缩进）
    let methodStartIndex = methodStartMatch.index;
    // 向前查找，找到这一行的开始（换行符或文件开始）
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
    
    console.log('🔍 检测到 getJSBundleFile() 方法，开始分析...');
    
    // 找到方法开始位置后的第一个 {
    let braceIndex = content.indexOf('{', methodStartMatch.index);
    if (braceIndex === -1) {
      console.error('❌ 无法找到方法体的开始');
      process.exit(1);
    }
    
    // 找到匹配的结束 }
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
      console.error('❌ 无法找到方法体的结束');
      process.exit(1);
    }
    
    // 提取方法内容
    const methodContent = content.substring(methodStartIndex, methodEndIndex);
    
    console.log(`   方法内容预览 (前200字符): ${methodContent.substring(0, 200)}...`);
    console.log(`   方法内容长度: ${methodContent.length} 字符`);
    
    // 检查是否是默认实现（只调用 super）或已包含 OTA 实现
    const hasOTAImplementation = methodContent.includes('File(this@MainApplication.getFilesDir()') || 
                                 methodContent.includes('js-bundles');
    const hasSuperCall = methodContent.includes('super.getJSBundleFile()') || 
                        methodContent.includes('return super');
    
    console.log(`   包含 OTA 实现: ${hasOTAImplementation}`);
    console.log(`   包含 super 调用: ${hasSuperCall}`);
    
    if (hasOTAImplementation) {
      console.log('ℹ️  getJSBundleFile() 方法已包含 OTA 实现，跳过注入');
      return;
    } else if (hasSuperCall) {
      console.log('⚠️  检测到默认的 getJSBundleFile() 方法，将替换为 OTA 实现');
      // 替换现有的方法
      const beforeMethod = content.substring(0, methodStartIndex);
      const afterMethod = content.substring(methodEndIndex);
      // 替换方法
      content = beforeMethod + GET_JS_BUNDLE_FILE_METHOD + afterMethod;
    } else {
      console.log('⚠️  检测到自定义的 getJSBundleFile() 方法，将替换为 OTA 实现');
      // 替换现有的方法
      const beforeMethod = content.substring(0, methodStartIndex);
      const afterMethod = content.substring(methodEndIndex);
      content = beforeMethod + GET_JS_BUNDLE_FILE_METHOD + afterMethod;
    }
  } else {
    console.log('   ℹ️  未找到 getJSBundleFile() 方法，将插入新方法');
    // 3. 方法不存在，查找插入位置（在 getUseDeveloperSupport() 方法之后）
    const insertMarker = 'override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG';
    const markerIndex = content.indexOf(insertMarker);
    
    if (markerIndex === -1) {
      console.error('❌ 找不到插入位置标记: getUseDeveloperSupport()');
      console.error('   请检查 MainApplication.kt 文件结构');
      process.exit(1);
    }

    // 找到 marker 所在行的末尾
    const lineEndIndex = content.indexOf('\n', markerIndex);
    if (lineEndIndex === -1) {
      console.error('❌ 无法找到行结束符');
      process.exit(1);
    }

    // 4. 插入 getJSBundleFile() 方法
    const beforeMethod = content.slice(0, lineEndIndex + 1);
    const afterMethod = content.slice(lineEndIndex + 1);
    
    content = beforeMethod + '\n' + GET_JS_BUNDLE_FILE_METHOD + '\n' + afterMethod;
  }

  // 3. 检查并添加 onCreate() 日志（用于验证代码是否执行）
  if (!content.includes('MainApplication.onCreate() called')) {
    const onCreateRegex = /override\s+fun\s+onCreate\(\)/;
    const onCreateMatch = content.match(onCreateRegex);
    
    if (onCreateMatch) {
      console.log('INFO: Found onCreate() method, adding verification logs...');
      // 在 onCreate() 方法开始处添加日志
      const onCreateIndex = onCreateMatch.index;
      const onCreateBraceIndex = content.indexOf('{', onCreateIndex);
      if (onCreateBraceIndex !== -1) {
        const afterBrace = content.indexOf('\n', onCreateBraceIndex);
        if (afterBrace !== -1) {
          const beforeOnCreate = content.slice(0, afterBrace + 1);
          const afterOnCreate = content.slice(afterBrace + 1);
          // 在 super.onCreate() 之前添加日志
          const onCreateLog = `
    Log.e("MainApplication", "========================================")
    Log.e("MainApplication", "MainApplication.onCreate() called")
    Log.e("MainApplication", "Package: \${packageName}")
    Log.e("MainApplication", "getFilesDir(): \${getFilesDir().absolutePath}")
    Log.e("MainApplication", "========================================")
`;
          content = beforeOnCreate + onCreateLog + afterOnCreate;
        }
      }
    }
  }

  // 4. 写入文件
  console.log('');
  console.log('💾 写入修改后的文件...');
  fs.writeFileSync(MAIN_APPLICATION_PATH, content, 'utf8');
  console.log('✅ 文件已写入');

  // 5. 验证修改
  console.log('');
  console.log('🔍 验证注入结果...');
  const hasGetJSBundleFile = content.includes('override fun getJSBundleFile()');
  
  if (hasGetJSBundleFile) {
    // 验证是否包含 OTA 实现的关键代码
    const hasOTAImplementation = content.includes('File(this@MainApplication.getFilesDir()') || 
                                 content.includes('js-bundles');
    const hasLogStatements = content.includes('Log.e("MainApplication"') || content.includes('Log.d("MainApplication"');
    const hasSuperCall = content.includes('super.getJSBundleFile()');
    
    console.log(`   包含 getJSBundleFile() 方法（传统架构）: ✅`);
    console.log(`   包含 OTA 实现 (js-bundles): ${hasOTAImplementation ? '✅' : '❌'}`);
    console.log(`   包含日志语句: ${hasLogStatements ? '✅' : '❌'}`);
    console.log(`   包含 super 调用: ${hasSuperCall ? '⚠️  (可能被覆盖)' : '✅'}`);
    
    if (hasOTAImplementation && hasLogStatements && !hasSuperCall) {
      console.log('');
      console.log('========================================');
      console.log('✅ 成功注入 OTA Bundle Loader！');
      console.log('========================================');
      console.log(`文件路径: ${MAIN_APPLICATION_PATH}`);
      console.log('');
      console.log('注入的方法包括:');
      console.log('  ✅ getJSBundleFile() 方法（传统架构支持）');
      console.log('  ✅ OTA bundle 加载逻辑');
      console.log('  ✅ 详细的调试日志 (ERROR 级别)');
      console.log('');
      console.log('兼容性:');
      console.log('  ✅ 传统架构 (ReactNativeHost): 通过 getJSBundleFile() 支持');
      console.log('  ⚠️  新架构 (BridgelessReact): 不支持通过 MainApplication 注入');
      console.log('     新架构需要使用其他方式（如 EAS OTA 更新）来实现 OTA 更新');
      console.log('');
      console.log('下一步:');
      console.log('  1. 继续构建 APK/AAB');
      console.log('  2. 安装后查看 logcat 日志:');
      console.log('     adb logcat -s MainApplication:E');
      console.log('  3. 检查是否看到 "getJSBundleFile() 被调用" 等日志');
      console.log('  4. 如果使用新架构，考虑使用 EAS OTA 更新或其他方案');
      console.log('');
    } else if (hasSuperCall) {
      console.warn('');
      console.warn('⚠️  警告：检测到方法，但只包含 super 调用');
      console.warn('   这可能意味着注入失败或被覆盖');
      console.warn('   方法内容预览:');
      if (hasGetJSBundleFile) {
        const methodMatch = content.match(/override\s+fun\s+getJSBundleFile\(\)[\s\S]{0,300}/);
        if (methodMatch) {
          console.warn(`   getJSBundleFile(): ${methodMatch[0].substring(0, 200)}...`);
        }
      }
      console.warn('');
      console.warn('建议:');
      console.warn('  1. 检查 MainApplication.kt 文件内容');
      console.warn('  2. 确认注入脚本是否正确执行');
      console.warn('  3. 检查是否有其他脚本覆盖了文件');
      console.warn('');
      process.exit(1);
    } else {
      console.log('');
      console.log(`✅ 成功注入 getJSBundleFile() 方法`);
      console.log(`   文件路径: ${MAIN_APPLICATION_PATH}`);
      console.log('');
    }
  } else {
    console.error('');
    console.error('❌ 注入失败：未找到 getJSBundleFile() 方法');
    console.error('');
    console.error('可能的原因:');
    console.error('  1. 文件写入失败');
    console.error('  2. 方法插入位置不正确');
    console.error('  3. 文件格式问题');
    console.error('');
    console.error('尝试恢复原文件...');
    // 恢复原文件
    fs.writeFileSync(MAIN_APPLICATION_PATH, originalContent, 'utf8');
    console.error('已恢复原文件');
    process.exit(1);
  }
}

// 执行注入
try {
  injectOTABundleLoader();
  console.log('🎉 OTA Bundle Loader 注入完成！');
} catch (error) {
  console.error('❌ 注入过程中发生错误:', error.message);
  console.error(error.stack);
  process.exit(1);
}

