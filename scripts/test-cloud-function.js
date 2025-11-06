/**
 * 云函数测试脚本
 * 用于测试云函数是否能正常调用
 * 
 * 使用方法：
 * node scripts/test-cloud-function.js
 */

const API_KEY = process.env.EXPO_PUBLIC_API_KEY || '';
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api';

// 如果没有 API Key，提示用户
if (!API_KEY) {
  console.error('❌ 错误：未找到 API Key');
  console.log('请设置环境变量：EXPO_PUBLIC_API_KEY=your-api-key');
  console.log('或在 .env 文件中配置：EXPO_PUBLIC_API_KEY=your-api-key');
  process.exit(1);
}

// 测试配置
console.log('📋 测试配置：');
console.log('  API Key:', API_KEY.substring(0, 8) + '...' + API_KEY.substring(API_KEY.length - 4));
console.log('  Base URL:', BASE_URL);
console.log('');

// 测试函数
async function testCloudFunction() {
  const tests = [
    {
      name: '测试 1: 获取所有任务',
      method: 'GET',
      endpoint: '/tasks',
    },
    {
      name: '测试 2: 创建任务',
      method: 'POST',
      endpoint: '/tasks',
      body: {
        rawText: '测试任务 - 完成代码审查 3个',
        taskName: '代码审查',
        completionTime: new Date().toISOString(),
        quantity: { '个': 3 },
        recordDate: new Date().toISOString().split('T')[0],
        recordMonth: String(new Date().getMonth() + 1),
        recordYear: String(new Date().getFullYear()),
      },
    },
    {
      name: '测试 3: 获取今日统计',
      method: 'GET',
      endpoint: '/stats/today',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`🧪 ${test.name}`);
    console.log(`   ${test.method} ${test.endpoint}`);

    try {
      const url = `${BASE_URL}${test.endpoint}`;
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
      };

      if (test.body) {
        options.body = JSON.stringify(test.body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (response.ok && data.code === 0) {
        console.log(`   ✅ 成功 (${response.status})`);
        console.log(`   响应:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
        passed++;
      } else {
        console.log(`   ❌ 失败 (${response.status})`);
        console.log(`   错误:`, data.message || '未知错误');
        console.log(`   响应:`, JSON.stringify(data, null, 2));
        failed++;
      }
    } catch (error) {
      console.log(`   ❌ 错误:`, error.message);
      failed++;
    }

    console.log('');
  }

  // 总结
  console.log('📊 测试结果：');
  console.log(`   ✅ 通过: ${passed}`);
  console.log(`   ❌ 失败: ${failed}`);
  console.log(`   总计: ${passed + failed}`);

  if (failed === 0) {
    console.log('\n🎉 所有测试通过！云函数配置正确。');
  } else {
    console.log('\n⚠️  部分测试失败，请检查：');
    console.log('   1. 云函数地址是否正确');
    console.log('   2. API Key 是否正确');
    console.log('   3. 云函数是否已部署');
    console.log('   4. 云函数环境变量是否配置');
  }
}

// 运行测试
testCloudFunction().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});

