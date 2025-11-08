/**
 * 测试云存储上传和下载功能
 * 使用方法: node scripts/test-storage-upload-download.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// 配置信息
const API_BASE_URL = process.env.API_BASE_URL || 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || process.env.API_KEY;
const TCB_STORAGE_DOMAIN = '636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la';

// 测试文件配置
// 如果命令行提供了文件路径，使用指定的文件；否则生成测试文件
const args = process.argv.slice(2);
const CUSTOM_TEST_FILE = args[0]; // 用户指定的测试文件

const TEST_FILE_SIZE = 2 * 1024 * 1024; // 2MB 测试文件（仅当需要生成时）
const TEST_FILE_NAME = CUSTOM_TEST_FILE ? path.basename(CUSTOM_TEST_FILE) : 'test-upload-download.bin';
const TEST_FILE_PATH = CUSTOM_TEST_FILE 
  ? (path.isAbsolute(CUSTOM_TEST_FILE) ? CUSTOM_TEST_FILE : path.join(__dirname, '..', CUSTOM_TEST_FILE))
  : path.join(__dirname, '..', TEST_FILE_NAME);
const TEST_CLOUD_PATH = `test_files/${Date.now()}_${TEST_FILE_NAME}`;

/**
 * 生成测试文件
 */
function generateTestFile() {
  console.log('📝 生成测试文件...');
  const buffer = Buffer.alloc(TEST_FILE_SIZE);
  // 填充一些数据（使用随机数据）
  crypto.randomFillSync(buffer);
  fs.writeFileSync(TEST_FILE_PATH, buffer);
  
  // 计算文件 MD5
  const hash = crypto.createHash('md5');
  hash.update(buffer);
  const md5 = hash.digest('hex');
  
  console.log(`✅ 测试文件已生成: ${TEST_FILE_PATH}`);
  console.log(`   大小: ${(TEST_FILE_SIZE / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   MD5: ${md5}`);
  
  return { buffer, md5 };
}

/**
 * 上传文件到云存储（使用分片上传）
 */
async function uploadFile(filePath, cloudPath) {
  return new Promise(async (resolve, reject) => {
    try {
      const fileContent = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const fileSize = fileContent.length;
      const fileSizeMB = fileSize / 1024 / 1024;

      console.log(`\n📤 开始上传文件...`);
      console.log(`   文件: ${fileName}`);
      console.log(`   大小: ${fileSizeMB.toFixed(2)} MB`);
      console.log(`   目标路径: ${cloudPath}`);

      // 对于大文件（> 10MB），使用分片上传
      if (fileSizeMB > 10) {
        console.log('   使用分片上传...');
        return await uploadInChunks(filePath, cloudPath, fileName, fileContent, resolve, reject);
      }

      // 小文件使用直接上传
      console.log('   使用直接上传...');
      return await uploadDirectly(filePath, cloudPath, fileName, fileContent, resolve, reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 分片上传大文件
 */
async function uploadInChunks(filePath, cloudPath, fileName, fileContent, resolve, reject) {
  try {
    // 分片大小：2MB（二进制）
    // Base64 编码后约为 2.67MB，加上 JSON 字段（缩短字段名），总大小约 2.7MB
    // 云函数限制：文本类型请求体 100KB，其他类型请求体 6MB
    // 但 JSON 格式可能被识别为文本类型，实际限制可能更严格（约 3-4MB）
    // 使用 2MB 分片确保在限制内
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB 每片
    const totalChunks = Math.ceil(fileContent.length / CHUNK_SIZE);
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`   分片数量: ${totalChunks} 个，每片 ${(CHUNK_SIZE / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   注意: Base64 编码后每片约 ${((CHUNK_SIZE * 4 / 3) / 1024 / 1024).toFixed(2)} MB`);

    // 上传所有分片，并收集 fileID
    const chunkFileIDs = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileContent.length);
      const chunk = fileContent.slice(start, end);
      const chunkBase64 = chunk.toString('base64');

      // 优化：只发送必要的数据，减少 JSON 大小
      const chunkData = {
        u: uploadId,        // 缩短字段名
        i: i,              // chunkIndex
        t: totalChunks,    // totalChunks
        p: cloudPath,      // filePath
        d: chunkBase64,    // chunkData（最大部分）
      };

      // 计算实际请求体大小（用于调试）
      const requestSize = Buffer.byteLength(JSON.stringify(chunkData));
      if (i === 0) {
        console.log(`   实际请求体大小: ${(requestSize / 1024 / 1024).toFixed(2)} MB`);
      }

      const chunkResult = await uploadChunk(chunkData);
      // 收集 fileID（如果返回了）
      if (chunkResult && chunkResult.fileID) {
        chunkFileIDs.push(chunkResult.fileID);
      }

      const progress = ((i + 1) / totalChunks * 100).toFixed(1);
      process.stdout.write(`\r   进度: ${progress}% (${i + 1}/${totalChunks})`);
    }
    console.log(''); // 换行

    // 完成分片上传
    console.log('   合并分片...');
    const completeData = {
      u: uploadId,        // 缩短字段名
      t: totalChunks,     // totalChunks
      p: cloudPath,       // filePath
      n: fileName,        // fileName
    };
    
    // 如果收集到了 fileID，传递给合并接口
    if (chunkFileIDs.length > 0) {
      console.log(`   使用 ${chunkFileIDs.length} 个 fileID 进行合并`);
      completeData.fids = chunkFileIDs; // 缩短字段名
    }
    
    const result = await completeChunkUpload(completeData);

    console.log(`✅ 上传成功！`);
    console.log(`   文件 URL: ${result.fileUrl}`);
    resolve(result);
  } catch (error) {
    reject(error);
  }
}

/**
 * 上传单个分片
 */
function uploadChunk(chunkData) {
  return new Promise((resolve, reject) => {
    // 使用紧凑的 JSON 格式（无空格）
    const postData = JSON.stringify(chunkData);
    const url = new URL(`${API_BASE_URL}/storage/upload-chunk`);
    
    // 检查请求体大小（调试用）
    const requestSize = Buffer.byteLength(postData);
    if (requestSize > 5.5 * 1024 * 1024) {
      console.warn(`   警告: 请求体大小 ${(requestSize / 1024 / 1024).toFixed(2)} MB，接近 6MB 限制`);
    }

    const options = {
      method: 'POST',
      headers: {
        // 使用 application/octet-stream 避免被识别为文本类型（限制 100KB）
        // 云函数限制：文本类型请求体 100KB，其他类型请求体 6MB
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(postData),
        // 添加自定义头标识这是 JSON 数据
        'X-Content-Format': 'json',
      },
      timeout: 300000,
    };

    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 0) {
            resolve(result.data);
          } else {
            reject(new Error(result.message || '分片上传失败'));
          }
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('分片上传超时'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 完成分片上传
 */
function completeChunkUpload(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const url = new URL(`${API_BASE_URL}/storage/complete-chunk`);

    const options = {
      method: 'POST',
      headers: {
        // 使用 application/octet-stream 避免被识别为文本类型（限制 100KB）
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(postData),
        // 添加自定义头标识这是 JSON 数据
        'X-Content-Format': 'json',
      },
      timeout: 600000,
    };

    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 0) {
            resolve(result.data);
          } else {
            reject(new Error(result.message || '完成分片上传失败'));
          }
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('完成分片上传超时'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 直接上传小文件
 */
function uploadDirectly(filePath, cloudPath, fileName, fileContent, resolve, reject) {
  const fileBase64 = fileContent.toString('base64');
  const uploadData = {
    fileName: fileName,
    filePath: cloudPath,
    fileContent: fileBase64,
    contentType: 'application/octet-stream',
  };

  const postData = JSON.stringify(uploadData);
  const url = new URL(`${API_BASE_URL}/storage/upload`);

    const options = {
      method: 'POST',
      headers: {
        // 使用 application/octet-stream 避免被识别为文本类型（限制 100KB）
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(postData),
        // 添加自定义头标识这是 JSON 数据
        'X-Content-Format': 'json',
      },
      timeout: 300000,
    };

  const req = https.request(url, options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (result.code === 0) {
          console.log(`✅ 上传成功！`);
          console.log(`   文件 URL: ${result.data.fileUrl}`);
          resolve(result.data);
        } else {
          reject(new Error(result.message || '上传失败'));
        }
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
}

/**
 * 从云存储下载文件
 */
function downloadFile(downloadUrl, outputPath) {
  return new Promise((resolve, reject) => {
    console.log(`\n📥 开始下载文件...`);
    console.log(`   下载 URL: ${downloadUrl}`);
    console.log(`   保存路径: ${outputPath}`);

    const url = new URL(downloadUrl);
    const options = {
      method: 'GET',
      timeout: 300000, // 5 分钟超时
    };

    const req = https.request(url, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`下载失败: HTTP ${res.statusCode}`));
        return;
      }

      const chunks = [];
      let downloadedSize = 0;
      const totalSize = parseInt(res.headers['content-length'] || '0', 10);

      res.on('data', (chunk) => {
        chunks.push(chunk);
        downloadedSize += chunk.length;
        
        if (totalSize > 0) {
          const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
          process.stdout.write(`\r   进度: ${progress}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
        }
      });

      res.on('end', () => {
        console.log(''); // 换行
        const fileBuffer = Buffer.concat(chunks);
        fs.writeFileSync(outputPath, fileBuffer);
        
        console.log(`✅ 下载成功！`);
        console.log(`   文件大小: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
        resolve(fileBuffer);
      });

      res.on('error', (error) => {
        reject(error);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('下载超时'));
    });

    req.end();
  });
}

/**
 * 计算文件 MD5
 */
function calculateMD5(filePath) {
  const fileContent = fs.readFileSync(filePath);
  const hash = crypto.createHash('md5');
  hash.update(fileContent);
  return hash.digest('hex');
}

/**
 * 清理测试文件
 */
function cleanup() {
  try {
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.unlinkSync(TEST_FILE_PATH);
      console.log(`\n🧹 已清理测试文件: ${TEST_FILE_PATH}`);
    }
    
    const downloadedPath = path.join(__dirname, '..', 'test-downloaded.bin');
    if (fs.existsSync(downloadedPath)) {
      fs.unlinkSync(downloadedPath);
      console.log(`   已清理下载文件: ${downloadedPath}`);
    }
  } catch (error) {
    console.warn('清理文件失败:', error.message);
  }
}

/**
 * 主测试函数
 */
async function runTest() {
  console.log('🧪 开始测试云存储上传和下载功能\n');
  console.log('='.repeat(60));

  // 检查 API Key
  if (!API_KEY) {
    console.error('❌ 错误: 未配置 API_KEY');
    console.log('请设置环境变量: EXPO_PUBLIC_API_KEY 或 API_KEY');
    process.exit(1);
  }

  let originalMD5 = null;
  let uploadedFileUrl = null;
  const downloadedPath = path.join(__dirname, '..', 'test-downloaded.bin');

  try {
    // 步骤 1: 准备测试文件
    console.log('\n📋 步骤 1: 准备测试文件');
    console.log('-'.repeat(60));
    
    let md5;
    if (CUSTOM_TEST_FILE) {
      // 使用指定的文件
      if (!fs.existsSync(TEST_FILE_PATH)) {
        throw new Error(`测试文件不存在: ${TEST_FILE_PATH}`);
      }
      
      const fileStats = fs.statSync(TEST_FILE_PATH);
      console.log(`✅ 使用指定的测试文件: ${TEST_FILE_PATH}`);
      console.log(`   大小: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // 计算 MD5
      md5 = calculateMD5(TEST_FILE_PATH);
      console.log(`   MD5: ${md5}`);
    } else {
      // 生成测试文件
      const result = generateTestFile();
      md5 = result.md5;
    }
    originalMD5 = md5;

    // 步骤 2: 上传文件
    console.log('\n📋 步骤 2: 上传文件到云存储');
    console.log('-'.repeat(60));
    const uploadResult = await uploadFile(TEST_FILE_PATH, TEST_CLOUD_PATH);
    uploadedFileUrl = uploadResult.fileUrl;

    // 步骤 3: 下载文件
    console.log('\n📋 步骤 3: 从云存储下载文件');
    console.log('-'.repeat(60));
    await downloadFile(uploadedFileUrl, downloadedPath);

    // 步骤 4: 验证文件
    console.log('\n📋 步骤 4: 验证文件完整性');
    console.log('-'.repeat(60));
    const downloadedMD5 = calculateMD5(downloadedPath);
    
    console.log(`原始文件 MD5: ${originalMD5}`);
    console.log(`下载文件 MD5: ${downloadedMD5}`);
    
    if (originalMD5 === downloadedMD5) {
      console.log('✅ 文件完整性验证通过！MD5 值匹配');
    } else {
      console.log('❌ 文件完整性验证失败！MD5 值不匹配');
      process.exit(1);
    }

    // 步骤 5: 验证文件大小
    const originalSize = fs.statSync(TEST_FILE_PATH).size;
    const downloadedSize = fs.statSync(downloadedPath).size;
    
    console.log(`\n原始文件大小: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`下载文件大小: ${(downloadedSize / 1024 / 1024).toFixed(2)} MB`);
    
    if (originalSize === downloadedSize) {
      console.log('✅ 文件大小验证通过！');
    } else {
      console.log('❌ 文件大小验证失败！');
      process.exit(1);
    }

    // 测试总结
    console.log('\n' + '='.repeat(60));
    console.log('🎉 所有测试通过！');
    console.log('='.repeat(60));
    console.log('\n测试结果:');
    console.log(`  ✅ 文件上传: 成功`);
    console.log(`  ✅ 文件下载: 成功`);
    console.log(`  ✅ 文件完整性: 通过`);
    console.log(`  ✅ 文件大小: 匹配`);
    console.log(`\n上传的文件 URL: ${uploadedFileUrl}`);

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ 测试失败！');
    console.error('='.repeat(60));
    console.error(`错误: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // 询问是否清理测试文件
    console.log('\n提示: 测试文件已保留，可以手动检查');
    console.log(`  - 原始文件: ${TEST_FILE_PATH}`);
    console.log(`  - 下载文件: ${downloadedPath}`);
    console.log(`  - 云存储路径: ${TEST_CLOUD_PATH}`);
  }
}

// 运行测试
if (require.main === module) {
  runTest().catch((error) => {
    console.error('测试异常:', error);
    process.exit(1);
  });
}

module.exports = { runTest, uploadFile, downloadFile };

