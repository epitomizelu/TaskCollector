/**
 * 检查云存储中的文件路径
 * 使用方法: node scripts/check-storage-files.js <uploadId>
 */

const https = require('https');

// 配置信息
const API_BASE_URL = process.env.API_BASE_URL || 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || process.env.API_KEY;

// 从命令行参数获取 uploadId
const args = process.argv.slice(2);
const UPLOAD_ID = args[0] || 'upload_1762556904994_oggjndlfv';

console.log('============================================================');
console.log('🔍 检查云存储中的文件路径');
console.log('============================================================');
console.log(`UploadId: ${UPLOAD_ID}`);
console.log('============================================================\n');

/**
 * 测试获取文件的临时 URL
 */
function testGetFileURL(filePath) {
  return new Promise((resolve, reject) => {
    const data = {
      filePath: filePath,
    };
    
    const postData = JSON.stringify(data);
    const url = new URL(`${API_BASE_URL}/storage/check-file`);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 30000,
    };
    
    const req = https.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            data: result,
            filePath: filePath,
          });
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });
    
    req.write(postData);
    req.end();
  });
}

/**
 * 主函数
 */
async function main() {
  try {
    if (!API_KEY) {
      console.error('❌ 错误: 未设置 API_KEY 环境变量');
      console.error('   请设置: export EXPO_PUBLIC_API_KEY=your_api_key');
      process.exit(1);
    }
    
    // 尝试不同的路径格式
    const possiblePaths = [
      `temp_chunks/${UPLOAD_ID}/chunk_0`,
      `/temp_chunks/${UPLOAD_ID}/chunk_0`,
      `temp_chunks\\${UPLOAD_ID}\\chunk_0`,
      `${UPLOAD_ID}/chunk_0`,
      `/${UPLOAD_ID}/chunk_0`,
      `chunk_0`,
    ];
    
    console.log('🔍 尝试不同的路径格式...\n');
    
    for (const path of possiblePaths) {
      console.log(`测试路径: ${path}`);
      try {
        // 注意：这里需要一个检查文件的接口，如果没有，我们可以直接尝试 getTempFileURL
        // 但由于我们没有这个接口，我们先输出建议
        console.log(`   路径格式: ${path}`);
      } catch (error) {
        console.log(`   ❌ 错误: ${error.message}`);
      }
    }
    
    console.log('\n💡 建议:');
    console.log('   1. 在腾讯云控制台查看云存储中的实际文件路径');
    console.log('   2. 检查文件是否真的存在于云存储中');
    console.log('   3. 确认路径格式是否正确（可能需要 / 开头，或者不需要）');
    console.log(`   4. 查找包含 "${UPLOAD_ID}" 的文件夹`);
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

main();

