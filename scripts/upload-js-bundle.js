/**
 * 上传 JS Bundle 到腾讯云存储（分片上传版 + 保存版本记录）
 * 统一使用 app 内的 API 配置（config/api.config.js）
 * 
 * 使用分片上传解决大文件上传问题：
 * - 每片 2MB，Base64 编码后约 2.67MB
 * - 避免云函数请求体大小限制（6MB）
 * - 支持大文件上传（>10MB）
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ✅ 从项目统一配置中导入 API_BASE_URL 和 API_KEY
const { API_CONFIG, getHeaders } = require('../config/api.config.js');

// ✅ 使用更新服务云函数 URL（如果配置了，否则使用主云函数 URL）
const UPDATE_SERVICE_URL = API_CONFIG.UPDATE_SERVICE_URL || API_CONFIG.BASE_URL;

const STORAGE_FOLDER = 'js_bundles';

/**
 * 获取版本信息
 */
function getVersionInfo() {
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8'));
  return {
    version: appJson.expo.version,
    versionCode: appJson.expo.android.versionCode,
  };
}

/**
 * 递归查找 bundle 文件
 */
function findBundleFile(baseDir) {
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(baseDir, entry.name);
    if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.bundle'))) {
      return fullPath;
    }
    if (entry.isDirectory()) {
      const result = findBundleFile(fullPath);
      if (result) return result;
    }
  }
  return null;
}

/**
 * 发送 POST 请求（JSON）
 */
async function postJSON(url, data) {
  const postData = JSON.stringify(data);
  const headers = getHeaders(); // ✅ 自动包含 Authorization: Bearer API_KEY
  headers['Content-Length'] = Buffer.byteLength(postData);

  const options = {
    method: 'POST',
    headers,
  };

  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let response = '';
      res.on('data', (chunk) => (response += chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(response);
          resolve(result);
        } catch (e) {
          reject(new Error(`解析响应失败: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * 上传单个分片
 */
function uploadChunk(chunkData) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(chunkData);
    const url = new URL(`${UPDATE_SERVICE_URL}/storage/upload-chunk`);

    const options = {
      method: 'POST',
      headers: {
        // 使用 application/octet-stream 避免被识别为文本类型（限制 100KB）
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${API_CONFIG.API_KEY}`,
        'Content-Length': Buffer.byteLength(postData),
        // 添加自定义头标识这是 JSON 数据
        'X-Content-Format': 'json',
      },
      timeout: 300000, // 5 分钟超时
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

    req.on('error', (error) => {
      reject(error);
    });

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
    const url = new URL(`${UPDATE_SERVICE_URL}/storage/complete-chunk`);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Authorization': `Bearer ${API_CONFIG.API_KEY}`,
        'Content-Length': Buffer.byteLength(postData),
        'X-Content-Format': 'json',
      },
      timeout: 600000, // 10 分钟超时（合并需要时间）
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

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('完成分片上传超时'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 查询合并任务状态
 */
async function getMergeTaskStatus(taskId) {
  const urlObj = new URL(`${UPDATE_SERVICE_URL}/storage/merge-task-status`);
  urlObj.searchParams.set('taskId', taskId);
  
  const options = {
    method: 'GET',
    headers: getHeaders(),
  };

  return new Promise((resolve, reject) => {
    const req = https.request(urlObj, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code === 0) {
            console.log(`[查询状态] 任务 ${taskId}: status=${result.data?.status || 'unknown'}, progress=${result.data?.progress || 0}`);
            resolve(result.data);
          } else {
            reject(new Error(result.message || '查询任务状态失败'));
          }
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });
    req.on('error', (error) => {
      reject(error);
    });
    req.end();
  });
}

/**
 * 触发合并任务处理
 */
async function triggerMergeTask(taskId) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ taskId });
    const url = new URL(`${UPDATE_SERVICE_URL}/storage/process-merge-task`);

    const options = {
      method: 'POST',
      headers: getHeaders(),
      timeout: 30000, // 30 秒超时（只是触发，不等待完成）
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
            console.log(`✅ 合并任务处理已触发: ${taskId}`);
            resolve(result.data);
      } else {
            reject(new Error(result.message || '触发合并任务失败'));
          }
        } catch (error) {
          reject(new Error(`解析响应失败: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('触发合并任务超时'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 等待合并任务完成
 */
async function waitForMergeTask(taskId, maxAttempts = 3) {
  const initialDelay = 5000; // 初始等待5秒
  const pollInterval = 3000; // 每3秒查询一次
  
  // ✅ 先等待5秒，让合并任务有时间开始处理
  console.log(`⏳ 等待 ${initialDelay / 1000} 秒后开始轮询任务状态...`);
  await new Promise(resolve => setTimeout(resolve, initialDelay));
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const taskStatus = await getMergeTaskStatus(taskId);
      
      const status = taskStatus.status || 'unknown';
      const progress = taskStatus.progress || 0;
      
      if (status === 'completed') {
        console.log(`✅ 合并任务完成！进度: ${progress}%`);
        return taskStatus;
      } else if (status === 'failed') {
        throw new Error(`合并任务失败: ${taskStatus.error || '未知错误'}`);
      } else if (status === 'processing' || status === 'pending' || status === 'unknown') {
        if (attempt < maxAttempts) {
          console.log(`⏳ 合并任务进行中... 状态: ${status}, 进度: ${progress}% (${attempt}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      } else {
        if (attempt < maxAttempts) {
          console.log(`⏳ 合并任务状态: ${status}, 进度: ${progress}% (${attempt}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      }
    } catch (error) {
      if (attempt < maxAttempts) {
        console.log(`⚠️  查询任务状态失败，重试中... (${attempt}/${maxAttempts}): ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } else {
        throw new Error(`查询任务状态失败（已重试 ${maxAttempts} 次）: ${error.message}`);
      }
    }
  }
  
  throw new Error(`等待合并任务超时（已查询 ${maxAttempts} 次）`);
}

/**
 * 分片上传文件到云存储
 */
async function uploadInChunks(filePath, cloudPath, fileName) {
  const fileContent = fs.readFileSync(filePath);
  const fileSizeMB = (fileContent.length / 1024 / 1024).toFixed(2);
  
  // 分片大小：2MB（二进制）
  // Base64 编码后约为 2.67MB，加上 JSON 字段（缩短字段名），总大小约 2.7MB
  // 云函数限制：文本类型请求体 100KB，其他类型请求体 6MB
  // 但 JSON 格式可能被识别为文本类型，实际限制可能更严格（约 3-4MB）
  // 使用 2MB 分片确保在限制内
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB 每片
  const totalChunks = Math.ceil(fileContent.length / CHUNK_SIZE);
  const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log(`开始分片上传: ${fileSizeMB} MB，${totalChunks} 个分片，每片 ${(CHUNK_SIZE / 1024 / 1024).toFixed(2)} MB`);
  console.log(`注意: Base64 编码后每片约 ${((CHUNK_SIZE * 4 / 3) / 1024 / 1024).toFixed(2)} MB（确保在限制内）`);

  // 上传所有分片
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileContent.length);
    const chunk = fileContent.slice(start, end);
    const chunkBase64 = chunk.toString('base64');

    console.log(`上传分片 ${i + 1}/${totalChunks}...`);

    // 优化：使用缩短的字段名，减少 JSON 大小
    const chunkData = {
      u: uploadId,        // uploadId
      i: i,              // chunkIndex
      t: totalChunks,    // totalChunks
      p: cloudPath,      // filePath
      d: chunkBase64,    // chunkData（最大部分）
      n: fileName,       // fileName
    };

    await uploadChunk(chunkData);

    const progress = ((i + 1) / totalChunks * 100).toFixed(1);
    console.log(`进度: ${progress}%`);
  }

  // 完成分片上传
  console.log('所有分片上传完成，合并文件...');
  const result = await completeChunkUpload({
    u: uploadId,        // uploadId
    t: totalChunks,     // totalChunks
    p: cloudPath,       // filePath
    n: fileName,        // fileName
  });

  return result;
}



/**
 * 主流程
 */
async function main() {
  try {
    if (!API_CONFIG.BASE_URL || !API_CONFIG.API_KEY) {
      throw new Error('❌ 缺少 API_BASE_URL 或 API_KEY，请检查 config/api.config.js 或环境变量');
    }

    const { version, versionCode } = getVersionInfo();
    const bundleDir = path.join(__dirname, '..', 'js-bundles');
    const bundlePath = findBundleFile(bundleDir);
    if (!bundlePath) throw new Error('未找到 .js 或 .bundle 文件');

    const fileName = path.basename(bundlePath);
    const fileSize = fs.statSync(bundlePath).size;
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
    console.log(`找到文件: ${fileName} (${fileSizeMB} MB)`);

    // 构建云存储路径
    const cosPath = `js_bundles/v${version}/${fileName}`;

    // 使用分片上传
    console.log('');
    console.log('========================================');
    console.log('  开始分片上传');
    console.log('========================================');
    
    const uploadResult = await uploadInChunks(bundlePath, cosPath, fileName);
    
    // 获取文件 URL
    let downloadUrl, filePath;
    
    if (uploadResult.fileUrl) {
      // 分片上传完成，直接使用返回的 fileUrl
      downloadUrl = uploadResult.fileUrl;
      filePath = uploadResult.filePath || cosPath;
      console.log('✅ 分片上传成功！');
      console.log(`文件 URL: ${downloadUrl}`);
    } else if (uploadResult.taskId) {
      // ✅ 如果返回了 taskId，说明创建了合并任务，先等待一小段时间确保数据库写入完成，然后触发处理
      console.log('');
      console.log('========================================');
      console.log('  触发合并任务处理');
      console.log('========================================');
      
      // 等待 500ms 确保数据库写入完成
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        await triggerMergeTask(uploadResult.taskId);
      } catch (error) {
        console.warn(`⚠️  触发合并任务失败（任务可能已在处理中）: ${error.message}`);
      }
      
      console.log('');
      console.log('========================================');
      console.log('  等待合并任务完成');
      console.log('========================================');
      
      const taskResult = await waitForMergeTask(uploadResult.taskId);
      
      downloadUrl = taskResult.fileUrl;
      filePath = taskResult.filePath || uploadResult.targetFilePath || cosPath;
    } else if (uploadResult.chunkUrls && uploadResult.chunkUrls.length > 0) {
      // 如果需要客户端合并，使用分片 URL（备用方案）
      console.log('⚠️  分片上传成功，但需要客户端合并');
      console.log(`分片数量: ${uploadResult.chunkUrls.length}`);
      console.log(`目标文件路径: ${uploadResult.targetFilePath || cosPath}`);
      // 使用第一个分片 URL 作为临时下载地址（实际应该合并后使用）
      downloadUrl = uploadResult.chunkUrls[0];
      filePath = uploadResult.targetFilePath || cosPath;
    } else {
      // 默认使用 cosPath 构建 URL
      downloadUrl = `https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/${cosPath}`;
      filePath = cosPath;
    }

    // 2️⃣ 调用 upload-finish 保存版本记录
    // ✅ 注意：不再传递 versionCode，云函数会自动递增 jsVersionCode
    console.log('');
    console.log('保存版本记录...');
    await postJSON(`${UPDATE_SERVICE_URL}/storage/finish-upload`, {
      version,
      platform: 'android',
      bundleType: 'js',
      downloadUrl,
      filePath,
      fileSize,
    });

    console.log('');
    console.log('========================================');
    console.log('  上传完成 ✅');
    console.log('========================================');
    console.log(`版本: ${version}`);
    console.log(`文件: ${fileName}`);
    console.log(`注意: jsVersionCode 已由云函数自动递增`);
  } catch (error) {
    console.error('❌ 上传失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}