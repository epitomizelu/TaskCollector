/**
 * 下载并合并分片脚本
 * 使用方法: node scripts/download-and-merge-chunks.js <uploadId> [totalChunks] [filePath] [outputPath]
 * 
 * 示例:
 *   node scripts/download-and-merge-chunks.js upload_1762556904994_oggjndlfv 56 test_files/my-file.apk ./merged-file.apk
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 配置信息
const API_BASE_URL = process.env.API_BASE_URL || 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || process.env.API_KEY;

// 从命令行参数获取配置
const args = process.argv.slice(2);
const UPLOAD_ID = args[0];
const TOTAL_CHUNKS = args[1] ? parseInt(args[1], 10) : null;
const FILE_PATH = args[2] || `test_files/my-file.apk`;
const OUTPUT_PATH = args[3] || `./merged-${Date.now()}.apk`;

if (!UPLOAD_ID) {
  console.error('❌ 错误: 请提供 uploadId');
  console.error('使用方法: node scripts/download-and-merge-chunks.js <uploadId> [totalChunks] [filePath] [outputPath]');
  console.error('示例: node scripts/download-and-merge-chunks.js upload_1762556904994_oggjndlfv 56 test_files/my-file.apk ./merged-file.apk');
  process.exit(1);
}

if (!API_KEY) {
  console.error('❌ 错误: 未设置 API_KEY 环境变量');
  console.error('请设置: export EXPO_PUBLIC_API_KEY=your_api_key');
  process.exit(1);
}

console.log('============================================================');
console.log('📥 下载并合并分片');
console.log('============================================================');
console.log(`📋 配置信息:`);
console.log(`   UploadId: ${UPLOAD_ID}`);
console.log(`   TotalChunks: ${TOTAL_CHUNKS || '从服务器获取'}`);
console.log(`   目标文件路径: ${FILE_PATH}`);
console.log(`   输出文件路径: ${OUTPUT_PATH}`);
console.log(`   API Base URL: ${API_BASE_URL}`);
console.log('============================================================\n');

/**
 * 发送 HTTP 请求
 */
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    try {
      // 确保 url 是字符串
      let urlString;
      if (typeof url === 'string') {
        urlString = url;
      } else if (url instanceof URL) {
        urlString = url.toString();
      } else {
        urlString = String(url);
      }
      
      // 解析 URL 以便正确设置 options
      const urlObj = new URL(urlString);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      // 合并 URL 信息到 options
      const requestOptions = {
        ...options,
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
      };
      
      const req = protocol.request(requestOptions, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          let result;
          try {
            result = JSON.parse(responseData);
          } catch (e) {
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

    req.on('error', (error) => {
      reject(new Error(`请求失败: ${error.message}`));
    });
    
    if (options.timeout) {
      req.setTimeout(options.timeout, () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
    }

    if (data) {
      req.write(data);
    }
    req.end();
    } catch (error) {
      reject(new Error(`构建请求失败: ${error.message}`));
    }
  });
}

/**
 * 调用完成分片上传接口，获取分片URL列表
 */
async function getChunkUrls(uploadId, totalChunks, filePath) {
  console.log(`\n📤 步骤 1: 获取分片URL列表...`);
  console.log(`   UploadId: ${uploadId}`);
  console.log(`   TotalChunks: ${totalChunks}`);
  console.log(`   FilePath: ${filePath}`);

  const data = {
    u: uploadId,
    t: totalChunks,
    p: filePath,
  };

  const postData = JSON.stringify(data);
  const urlString = `${API_BASE_URL}/storage/complete-chunk`;

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Length': Buffer.byteLength(postData),
      'X-Content-Format': 'json',
    },
    timeout: 60000, // 60秒超时
  };

  try {
    const response = await makeRequest(urlString, options, postData);
    
    console.log(`📥 响应状态码: ${response.statusCode}`);
    
    if (response.statusCode === 200 && response.data.code === 0) {
      const result = response.data.data;
      
      // 检查返回的数据格式
      if (result.chunkUrls && Array.isArray(result.chunkUrls) && result.chunkUrls.length > 0) {
        console.log(`✅ 成功获取 ${result.chunkUrls.length} 个分片的URL`);
        return {
          chunkUrls: result.chunkUrls,
          uploadId: result.uploadId,
          totalChunks: result.totalChunks || result.chunkUrls.length,
          targetFilePath: result.targetFilePath,
          completed: false,
        };
      } else if (result.taskId) {
        // 如果是异步任务，需要查询任务状态
        console.log(`⚠️  返回了任务ID，需要查询任务状态: ${result.taskId}`);
        console.log(`   状态URL: ${result.statusUrl}`);
        console.log(`   提示: 如果需要客户端合并，请修改云函数返回 chunkUrls`);
        
        // 等待一段时间后查询任务状态
        console.log(`   等待5秒后查询任务状态...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        return await getChunkUrlsFromTask(result.taskId);
      } else {
        console.error(`响应数据:`, JSON.stringify(result, null, 2));
        throw new Error('响应数据格式不正确，未找到 chunkUrls 或 taskId');
      }
    } else {
      throw new Error(response.data.message || '获取分片URL失败');
    }
  } catch (error) {
    console.error(`❌ 获取分片URL失败: ${error.message}`);
    throw error;
  }
}

/**
 * 从任务状态获取分片URL
 */
async function getChunkUrlsFromTask(taskId) {
  console.log(`\n📤 查询任务状态: ${taskId}`);
  
  const urlString = `${API_BASE_URL}/storage/merge-task-status?taskId=${taskId}`;
  
  const options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
    timeout: 30000,
  };
  
  const response = await makeRequest(urlString, options);
  
  if (response.statusCode === 200 && response.data.code === 0) {
    const task = response.data.data;
    console.log(`   任务状态: ${task.status}`);
    console.log(`   进度: ${task.progress}%`);
    
    if (task.status === 'completed') {
      console.log(`✅ 任务已完成！`);
      console.log(`   文件路径: ${task.filePath}`);
      console.log(`   文件URL: ${task.fileUrl}`);
      console.log(`   文件大小: ${task.fileSize ? (task.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);
      return {
        completed: true,
        fileUrl: task.fileUrl,
        filePath: task.filePath,
        fileSize: task.fileSize,
      };
    } else if (task.status === 'failed') {
      throw new Error(`任务失败: ${task.error || '未知错误'}`);
    } else {
      // 如果任务还在处理中，继续等待
      console.log(`   任务处理中，继续等待...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return await getChunkUrlsFromTask(taskId);
    }
  } else {
    throw new Error(response.data.message || '查询任务状态失败');
  }
}

/**
 * 下载文件
 */
function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    // 确保 url 是字符串
    const urlString = typeof url === 'string' ? url : url.toString();
    const protocol = urlString.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);
    
    protocol.get(urlString, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath);
        reject(new Error(`下载失败: HTTP ${res.statusCode}`));
        return;
      }
      
      let downloaded = 0;
      const totalSize = parseInt(res.headers['content-length'] || '0', 10);
      
      res.on('data', (chunk) => {
        downloaded += chunk.length;
        file.write(chunk);
      });
      
      res.on('end', () => {
        file.end();
        resolve({
          path: outputPath,
          size: downloaded,
          totalSize: totalSize,
        });
      });
      
      res.on('error', (error) => {
        file.close();
        fs.unlinkSync(outputPath);
        reject(error);
      });
    }).on('error', (error) => {
      file.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      reject(error);
    });
  });
}

/**
 * 下载所有分片
 */
async function downloadAllChunks(chunkUrls, outputDir) {
  console.log(`\n📥 步骤 2: 下载所有分片...`);
  console.log(`   分片数量: ${chunkUrls.length}`);
  console.log(`   输出目录: ${outputDir}`);
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const chunkFiles = [];
  const CONCURRENT_DOWNLOADS = 5; // 并发下载数量
  
  for (let i = 0; i < chunkUrls.length; i += CONCURRENT_DOWNLOADS) {
    const batch = chunkUrls.slice(i, i + CONCURRENT_DOWNLOADS);
    const batchIndex = Math.floor(i / CONCURRENT_DOWNLOADS) + 1;
    const totalBatches = Math.ceil(chunkUrls.length / CONCURRENT_DOWNLOADS);
    
    console.log(`   下载批次 ${batchIndex}/${totalBatches}: 分片 ${i + 1}-${Math.min(i + CONCURRENT_DOWNLOADS, chunkUrls.length)}`);
    
    const downloadPromises = batch.map(async (url, index) => {
      const chunkIndex = i + index;
      const chunkPath = path.join(outputDir, `chunk_${chunkIndex}.tmp`);
      
      try {
        const result = await downloadFile(url, chunkPath);
        console.log(`     ✅ 分片 ${chunkIndex + 1}/${chunkUrls.length} 下载成功: ${(result.size / 1024).toFixed(2)} KB`);
        return {
          index: chunkIndex,
          path: chunkPath,
          size: result.size,
        };
      } catch (error) {
        console.error(`     ❌ 分片 ${chunkIndex + 1} 下载失败: ${error.message}`);
        throw error;
      }
    });
    
    const batchResults = await Promise.all(downloadPromises);
    chunkFiles.push(...batchResults);
  }
  
  // 按索引排序
  chunkFiles.sort((a, b) => a.index - b.index);
  
  console.log(`✅ 所有分片下载完成！`);
  console.log(`   总共下载: ${chunkFiles.length} 个分片`);
  console.log(`   总大小: ${(chunkFiles.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)} MB`);
  
  return chunkFiles;
}

/**
 * 合并分片
 */
async function mergeChunks(chunkFiles, outputPath) {
  console.log(`\n🔗 步骤 3: 合并分片...`);
  console.log(`   分片数量: ${chunkFiles.length}`);
  console.log(`   输出文件: ${outputPath}`);
  
  // 确保输出目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const writeStream = fs.createWriteStream(outputPath);
  let totalSize = 0;
  
  for (let i = 0; i < chunkFiles.length; i++) {
    const chunkFile = chunkFiles[i];
    console.log(`   合并分片 ${i + 1}/${chunkFiles.length}: ${path.basename(chunkFile.path)}`);
    
    const chunkData = fs.readFileSync(chunkFile.path);
    writeStream.write(chunkData);
    totalSize += chunkData.length;
  }
  
  writeStream.end();
  
  // 等待写入完成
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
  
  console.log(`✅ 合并完成！`);
  console.log(`   输出文件: ${outputPath}`);
  console.log(`   文件大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  // 清理临时分片文件
  console.log(`\n🧹 清理临时文件...`);
  for (const chunkFile of chunkFiles) {
    try {
      fs.unlinkSync(chunkFile.path);
    } catch (error) {
      console.warn(`   警告: 删除临时文件失败 ${chunkFile.path}: ${error.message}`);
    }
  }
  
  // 清理临时目录（如果为空）
  try {
    const tempDir = path.dirname(chunkFiles[0].path);
    const files = fs.readdirSync(tempDir);
    if (files.length === 0) {
      fs.rmdirSync(tempDir);
    }
  } catch (error) {
    // 忽略错误
  }
  
  return {
    path: outputPath,
    size: totalSize,
  };
}

/**
 * 主函数
 */
async function main() {
  try {
    // 步骤1: 获取分片URL列表
    const chunkInfo = await getChunkUrls(UPLOAD_ID, TOTAL_CHUNKS, FILE_PATH);
    
    // 如果任务已完成，直接返回
    if (chunkInfo.completed) {
      console.log('\n============================================================');
      console.log('✅ 合并已完成（由服务器完成）');
      console.log('============================================================');
      console.log(`📁 文件路径: ${chunkInfo.filePath}`);
      console.log(`🔗 文件 URL: ${chunkInfo.fileUrl}`);
      console.log(`📦 文件大小: ${chunkInfo.fileSize ? (chunkInfo.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);
      console.log('============================================================');
      return;
    }
    
    // 步骤2: 下载所有分片
    const tempDir = path.join(__dirname, '..', 'temp_chunks_download', UPLOAD_ID);
    const chunkFiles = await downloadAllChunks(chunkInfo.chunkUrls, tempDir);
    
    // 步骤3: 合并分片
    const mergedFile = await mergeChunks(chunkFiles, OUTPUT_PATH);
    
    // 完成
    console.log('\n============================================================');
    console.log('✅ 下载并合并成功！');
    console.log('============================================================');
    console.log(`📁 输出文件: ${mergedFile.path}`);
    console.log(`📦 文件大小: ${(mergedFile.size / 1024 / 1024).toFixed(2)} MB`);
    console.log('============================================================');
    
  } catch (error) {
    console.error('\n============================================================');
    console.error('❌ 下载并合并失败！');
    console.error('============================================================');
    console.error(`错误信息: ${error.message}`);
    if (error.stack) {
      console.error(`堆栈信息:`, error.stack);
    }
    console.error('============================================================');
    process.exit(1);
  }
}

// 运行主函数
main();

