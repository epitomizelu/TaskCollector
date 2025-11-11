/**
 * 测试 JS Bundle 版本检查逻辑
 * 测试 jsVersionCode 的读取、比较和应用逻辑
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// 从 api.config.js 读取配置
let API_CONFIG;
try {
  const apiConfigPath = path.join(__dirname, '../config/api.config.js');
  if (fs.existsSync(apiConfigPath)) {
    delete require.cache[require.resolve(apiConfigPath)];
    const configModule = require(apiConfigPath);
    API_CONFIG = configModule.API_CONFIG || configModule;
  } else {
    // 使用默认配置
    API_CONFIG = {
      UPDATE_SERVICE_URL: process.env.UPDATE_SERVICE_URL || 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/app-update-api',
      API_KEY: process.env.API_KEY || process.env.EXPO_PUBLIC_API_KEY || '',
    };
  }
} catch (error) {
  console.error('读取 API 配置失败:', error);
  // 使用默认配置
  API_CONFIG = {
    UPDATE_SERVICE_URL: process.env.UPDATE_SERVICE_URL || 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/app-update-api',
    API_KEY: process.env.API_KEY || process.env.EXPO_PUBLIC_API_KEY || '',
  };
}

const UPDATE_SERVICE_URL = API_CONFIG.UPDATE_SERVICE_URL || API_CONFIG.BASE_URL || 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/app-update-api';
const API_KEY = API_CONFIG.API_KEY || process.env.API_KEY || process.env.EXPO_PUBLIC_API_KEY || '';

console.log('='.repeat(60));
console.log('JS Bundle 版本检查逻辑测试');
console.log('='.repeat(60));
console.log('配置信息:');
console.log('  UPDATE_SERVICE_URL:', UPDATE_SERVICE_URL);
console.log('  API_KEY:', API_KEY ? `${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}` : '未设置');
console.log('');

/**
 * 模拟客户端检查更新
 */
async function testCheckUpdate(currentJsVersionCode, platform = 'android') {
  return new Promise((resolve, reject) => {
    const url = `${UPDATE_SERVICE_URL}/app/check-js-bundle-update?jsVersionCode=${currentJsVersionCode}&platform=${platform}`;
    console.log(`[测试] 检查更新请求:`);
    console.log(`  URL: ${url}`);
    console.log(`  当前 jsVersionCode: ${currentJsVersionCode}`);
    console.log(`  平台: ${platform}`);
    console.log('');

    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'Authorization': `Bearer ${API_KEY}` } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            result,
          });
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}\n响应内容: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.end();
  });
}

/**
 * 测试场景
 */
async function runTests() {
  const testCases = [
    {
      name: '测试 1: 首次使用（jsVersionCode = 0）',
      currentJsVersionCode: 0,
      platform: 'android',
      expected: {
        shouldHaveUpdate: true, // 假设服务器有版本 1 或更高
      },
    },
    {
      name: '测试 2: 已更新到版本 1',
      currentJsVersionCode: 1,
      platform: 'android',
      expected: {
        shouldHaveUpdate: null, // 取决于服务器实际版本
      },
    },
    {
      name: '测试 3: 已更新到版本 2',
      currentJsVersionCode: 2,
      platform: 'android',
      expected: {
        shouldHaveUpdate: null, // 取决于服务器实际版本
      },
    },
    {
      name: '测试 4: 版本号过大（测试边界情况）',
      currentJsVersionCode: 999,
      platform: 'android',
      expected: {
        shouldHaveUpdate: false, // 应该没有更新
      },
    },
    {
      name: '测试 5: 无效版本号（字符串）',
      currentJsVersionCode: 'invalid',
      platform: 'android',
      expected: {
        shouldHaveUpdate: null, // 应该被解析为 0
      },
    },
  ];

  console.log('开始测试...\n');

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${testCase.name}`);
    console.log('='.repeat(60));

    try {
      // 将版本号转换为数字（模拟客户端行为）
      let jsVersionCode;
      if (typeof testCase.currentJsVersionCode === 'number' && !isNaN(testCase.currentJsVersionCode)) {
        jsVersionCode = testCase.currentJsVersionCode;
      } else {
        jsVersionCode = parseInt(testCase.currentJsVersionCode || '0', 10);
        if (isNaN(jsVersionCode)) {
          jsVersionCode = 0;
        }
      }

      const { statusCode, result } = await testCheckUpdate(jsVersionCode, testCase.platform);

      console.log(`\n[响应] HTTP 状态码: ${statusCode}`);
      console.log(`[响应] 结果代码: ${result.code}`);
      console.log(`[响应] 消息: ${result.message}`);

      if (result.code === 0 && result.data) {
        const data = result.data;
        console.log(`\n[数据] 更新信息:`);
        console.log(`  有更新: ${data.hasUpdate}`);
        console.log(`  最新版本: ${data.latestVersion || 'N/A'}`);
        console.log(`  最新 jsVersionCode: ${data.latestJsVersionCode}`);
        console.log(`  下载地址: ${data.downloadUrl || 'N/A'}`);
        console.log(`  文件大小: ${data.fileSize ? (data.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);

        // 验证逻辑
        console.log(`\n[验证] 版本比较:`);
        console.log(`  客户端 jsVersionCode: ${jsVersionCode}`);
        console.log(`  服务器 latestJsVersionCode: ${data.latestJsVersionCode}`);
        console.log(`  比较结果: ${data.latestJsVersionCode} > ${jsVersionCode} = ${data.latestJsVersionCode > jsVersionCode}`);
        console.log(`  服务器返回 hasUpdate: ${data.hasUpdate}`);

        // 客户端二次校验（模拟客户端逻辑）
        const clientSideCheck = data.hasUpdate && data.latestJsVersionCode > jsVersionCode;
        console.log(`  客户端二次校验: ${clientSideCheck}`);

        // 判断测试是否通过
        if (testCase.expected.shouldHaveUpdate !== null) {
          const passed = data.hasUpdate === testCase.expected.shouldHaveUpdate;
          console.log(`\n[结果] ${passed ? '✅ 通过' : '❌ 失败'}`);
          if (!passed) {
            console.log(`  期望: hasUpdate = ${testCase.expected.shouldHaveUpdate}`);
            console.log(`  实际: hasUpdate = ${data.hasUpdate}`);
          }
        } else {
          console.log(`\n[结果] ⚠️  无法自动判断（取决于服务器实际版本）`);
        }
      } else {
        console.log(`\n[错误] 请求失败:`, result.message || '未知错误');
      }
    } catch (error) {
      console.error(`\n[错误] 测试失败:`, error.message);
      if (error.stack) {
        console.error(error.stack);
      }
    }

    // 等待一下再执行下一个测试
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('测试完成');
  console.log('='.repeat(60));
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});

