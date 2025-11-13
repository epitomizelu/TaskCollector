/**
 * 在构建时自动注入 getJSBundleFile() 方法到 MainApplication.kt
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
const GET_JS_BUNDLE_FILE_METHOD = `          override fun getJSBundleFile(): String? {
            // 检查是否有下载的 bundle 文件
            val bundleDir = File(this@MainApplication.getFilesDir(), "js-bundles")
            
            // 优先使用 .js 文件，如果没有则使用 .hbc 文件
            val jsBundle = File(bundleDir, "index.android.js")
            val hbcBundle = File(bundleDir, "index.android.hbc")
            
            return when {
              jsBundle.exists() && jsBundle.length() > 0 -> {
                Log.d("MainApplication", "✅ 加载下载的 JS Bundle: \${jsBundle.absolutePath} (\${jsBundle.length()} bytes)")
                jsBundle.absolutePath
              }
              hbcBundle.exists() && hbcBundle.length() > 0 -> {
                Log.d("MainApplication", "✅ 加载下载的 HBC Bundle: \${hbcBundle.absolutePath} (\${hbcBundle.length()} bytes)")
                hbcBundle.absolutePath
              }
              else -> {
                Log.d("MainApplication", "未找到下载的 Bundle 文件，使用默认 Bundle")
                null // 使用默认 bundle (APK assets 中的)
              }
            }
          }`;

function injectOTABundleLoader() {
  console.log('🔧 开始注入 OTA Bundle Loader 到 MainApplication.kt...');
  
  // 检查文件是否存在
  if (!fs.existsSync(MAIN_APPLICATION_PATH)) {
    console.error(`❌ 文件不存在: ${MAIN_APPLICATION_PATH}`);
    console.error('   请确保已经运行了 prebuild 或 android 文件夹已生成');
    process.exit(1);
  }

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

  // 5. 写入文件
  fs.writeFileSync(MAIN_APPLICATION_PATH, content, 'utf8');

  // 6. 验证修改
  if (content.includes('override fun getJSBundleFile()')) {
    // 验证是否包含 OTA 实现的关键代码
    const hasOTAImplementation = content.includes('File(this@MainApplication.getFilesDir()') || 
                                 content.includes('js-bundles');
    const hasSuperCall = content.includes('super.getJSBundleFile()');
    
    if (hasOTAImplementation) {
      console.log('✅ 成功注入 getJSBundleFile() 方法（包含 OTA 实现）');
      console.log(`   文件路径: ${MAIN_APPLICATION_PATH}`);
    } else if (hasSuperCall) {
      console.warn('⚠️  警告：检测到 getJSBundleFile() 方法，但只包含 super 调用');
      console.warn('   这可能意味着注入失败或被覆盖');
      console.warn('   方法内容预览:');
      const methodMatch = content.match(/override\s+fun\s+getJSBundleFile\(\)[\s\S]{0,300}/);
      if (methodMatch) {
        console.warn(`   ${methodMatch[0]}`);
      }
    } else {
      console.log('✅ 成功注入 getJSBundleFile() 方法');
      console.log(`   文件路径: ${MAIN_APPLICATION_PATH}`);
    }
  } else {
    console.error('❌ 注入失败：未找到注入的方法');
    // 恢复原文件
    fs.writeFileSync(MAIN_APPLICATION_PATH, originalContent, 'utf8');
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

