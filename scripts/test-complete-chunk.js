/**
 * 测试分片合并功能
 * 使用方法: node scripts/test-complete-chunk.js <uploadId> [totalChunks] [filePath]
 * 
 * 示例:
 *   node scripts/test-complete-chunk.js upload_1762556904994_oggjndlfv
 *   node scripts/test-complete-chunk.js upload_1762556904994_oggjndlfv 56 test_files/test.apk
 */

const https = require('https');
const path = require('path');

// 配置信息
const API_BASE_URL = process.env.API_BASE_URL || 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || process.env.API_KEY;

// 从命令行参数获取配置
const args = process.argv.slice(2);
const UPLOAD_ID = args[0] || 'upload_1762556904994_oggjndlfv';
const TOTAL_CHUNKS = args[1] ? parseInt(args[1], 10) : null; // 如果不提供，会尝试自动检测
const FILE_PATH = args[2] || `test_files/${Date.now()}_merged_${path.basename(UPLOAD_ID)}.apk`;

console.log('============================================================');
console.log('🧪 测试分片合并功能');
console.log('============================================================');
console.log(`📋 配置信息:`);
console.log(`   UploadId: ${UPLOAD_ID}`);
console.log(`   TotalChunks: ${TOTAL_CHUNKS || '自动检测'}`);
console.log(`   目标文件路径: ${FILE_PATH}`);
console.log(`   API Base URL: ${API_BASE_URL}`);
console.log('============================================================\n');

/**
 * 发送 HTTP 请求
 */
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          // 尝试解析 JSON
          let result;
          try {
            result = JSON.parse(responseData);
          } catch (e) {
            // 如果不是 JSON，返回原始数据
            result = {
              raw: responseData,
              statusCode: res.statusCode,
              headers: res.headers,
            };
          }

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: result,
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

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

/**
 * 尝试检测分片数量（通过尝试不同的数量）
 */
async function detectTotalChunks(uploadId) {
  console.log('🔍 尝试自动检测分片数量...');
  console.log('   提示: 如果自动检测失败，请手动指定 totalChunks 参数\n');
  
  // 方法1: 尝试从 uploadId 中提取时间戳，估算可能的文件大小
  // uploadId 格式: upload_<timestamp>_<random>
  const timestampMatch = uploadId.match(/upload_(\d+)_/);
  if (timestampMatch) {
    const uploadTime = parseInt(timestampMatch[1], 10);
    const ageMinutes = Math.floor((Date.now() - uploadTime) / 1000 / 60);
    console.log(`   上传时间: ${new Date(uploadTime).toLocaleString()}`);
    console.log(`   距今: ${ageMinutes} 分钟`);
  }
  
  // 常见的分片数量范围（根据文件大小估算）
  // 假设每个分片 2MB，文件可能在 50-200MB 之间
  // 先从常见数量开始尝试
  const commonChunks = [56, 50, 60, 55, 40, 70, 45, 80];
  console.log(`   首先尝试常见数量: ${commonChunks.join(', ')}`);
  
  for (const chunks of commonChunks) {
    console.log(`   ⏳ 尝试 ${chunks} 个分片...`);
    try {
      const result = await testCompleteChunk(uploadId, chunks, FILE_PATH, true);
      if (result.success) {
        console.log(`   ✅ 找到正确的分片数量: ${chunks}`);
        return chunks;
      } else {
        // 检查错误信息，如果是参数错误，说明数量不对；如果是其他错误，可能是真的有问题
        const errorMsg = result.error || '';
        if (errorMsg.includes('无法获取分片') || errorMsg.includes('读取分片')) {
          // 可能是数量不对，继续尝试
          console.log(`   ❌ ${chunks} 个分片: ${errorMsg.substring(0, 50)}...`);
        } else {
          // 其他错误，可能是真的失败了
          console.log(`   ⚠️  ${chunks} 个分片: ${errorMsg}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ ${chunks} 个分片异常: ${error.message.substring(0, 50)}...`);
    }
  }
  
  // 方法2: 如果常见数量都不行，尝试范围搜索（从 20 到 150）
  console.log('\n   ⚠️  常见数量未找到，尝试范围搜索 (20-150)...');
  console.log('   💡 提示: 这可能需要较长时间，建议手动指定 totalChunks');
  
  // 询问用户是否继续
  // 在非交互式环境中，我们跳过范围搜索，直接返回 null
  console.log('   ⏸️  跳过范围搜索（避免长时间等待）');
  console.log('   💡 建议: 请手动指定 totalChunks 参数');
  
  return null;
}

/**
 * 测试完成分片上传
 */
async function testCompleteChunk(uploadId, totalChunks, filePath, silent = false) {
  if (!silent) {
    console.log(`\n📤 开始合并分片...`);
    console.log(`   UploadId: ${uploadId}`);
    console.log(`   TotalChunks: ${totalChunks}`);
    console.log(`   FilePath: ${filePath}`);
  }

  const data = {
    u: uploadId, // 使用缩短字段名
    t: totalChunks,
    p: filePath,
    // 注意：如果没有 fileID 列表，将使用路径方式
    // 如果有 fileID 列表，应该在这里添加：fids: [fileID1, fileID2, ...]
  };

  const postData = JSON.stringify(data);
  const url = new URL(`${API_BASE_URL}/storage/complete-chunk`);

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Length': Buffer.byteLength(postData),
      'X-Content-Format': 'json',
    },
    timeout: 600000, // 10 分钟超时
  };

  try {
    const response = await makeRequest(url, options, postData);
    
    if (!silent) {
      console.log(`\n📥 响应状态码: ${response.statusCode}`);
      console.log(`📥 响应头:`, JSON.stringify(response.headers, null, 2));
      console.log(`📥 响应数据:`, JSON.stringify(response.data, null, 2));
    }

    if (response.statusCode === 200 && response.data.code === 0) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    } else {
      return {
        success: false,
        error: response.data.message || response.data.error || '未知错误',
        data: response.data,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 检查 API Key
    if (!API_KEY) {
      console.error('❌ 错误: 未设置 API_KEY 环境变量');
      console.error('   请设置: export EXPO_PUBLIC_API_KEY=your_api_key');
      process.exit(1);
    }

    let totalChunks = TOTAL_CHUNKS;

    // 如果没有提供 totalChunks，尝试自动检测
    if (!totalChunks) {
      console.log('⚠️  未提供 totalChunks 参数，尝试自动检测...\n');
      totalChunks = await detectTotalChunks(UPLOAD_ID);
      
      if (!totalChunks) {
        console.error('\n❌ 无法自动检测分片数量');
        console.error('\n💡 解决方案:');
        console.error('   1. 手动指定 totalChunks 参数:');
        console.error(`      node scripts/test-complete-chunk.js ${UPLOAD_ID} <totalChunks> [filePath]`);
        console.error('   2. 在云存储控制台查看分片文件数量');
        console.error('   3. 分片文件路径格式: temp_chunks/${uploadId}/chunk_0, chunk_1, ...');
        console.error(`   4. 当前 uploadId: ${UPLOAD_ID}`);
        process.exit(1);
      }
    }

    // 执行合并
    console.log(`\n🚀 使用 ${totalChunks} 个分片进行合并...\n`);
    const result = await testCompleteChunk(UPLOAD_ID, totalChunks, FILE_PATH, false);

    if (result.success) {
      console.log('\n============================================================');
      console.log('✅ 合并成功！');
      console.log('============================================================');
      console.log(`📁 文件路径: ${result.data?.filePath || FILE_PATH}`);
      console.log(`🔗 文件 URL: ${result.data?.fileUrl || 'N/A'}`);
      console.log(`📦 文件大小: ${result.data?.fileSize ? (result.data.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);
      console.log(`🆔 文件 ID: ${result.data?.fileId || 'N/A'}`);
      console.log('============================================================');
    } else {
      console.log('\n============================================================');
      console.log('❌ 合并失败！');
      console.log('============================================================');
      console.log(`错误信息: ${result.error}`);
      if (result.data) {
        console.log(`详细信息:`, JSON.stringify(result.data, null, 2));
      }
      console.log('============================================================');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n============================================================');
    console.error('❌ 测试失败！');
    console.error('============================================================');
    console.error(`错误: ${error.message}`);
    console.error(`堆栈: ${error.stack}`);
    console.error('============================================================');
    process.exit(1);
  }
}

// 运行主函数
main();

