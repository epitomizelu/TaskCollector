/**
 * 应用更新服务云函数
 * 提供 JS Bundle OTA 更新相关的所有功能
 */

const cloudbase = require('@cloudbase/node-sdk');
const https = require('https');
const path = require('path');

// 初始化云开发环境
const app = cloudbase.init({
  env: process.env.TCB_ENV || 'cloud1-4gee45pq61cd6f19',
});

// 获取数据库引用
const db = app.database();

// 检查 app 对象是否支持存储相关方法
function checkStorageSupport() {
  const hasUploadFile = typeof app.uploadFile === 'function';
  const hasGetTempFileURL = typeof app.getTempFileURL === 'function';
  const hasDeleteFile = typeof app.deleteFile === 'function';
  
  if (!hasUploadFile) {
    throw new Error('app.uploadFile 不是函数。请检查 @cloudbase/node-sdk 版本和初始化方式');
  }
  
  return {
    uploadFile: app.uploadFile.bind(app),
    getTempFileURL: hasGetTempFileURL ? app.getTempFileURL.bind(app) : null,
    deleteFile: hasDeleteFile ? app.deleteFile.bind(app) : null,
  };
}

/**
 * 从 URL 下载文件
 */
function downloadFileFromUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`下载失败: HTTP ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * 解析请求体（支持多种格式）
 */
function parseBody(body, headers) {
  const contentType = headers?.['content-type'] || headers?.['Content-Type'] || '';
  const contentFormat = headers?.['x-content-format'] || headers?.['X-Content-Format'] || '';
  
  // 如果 Content-Type 是 application/octet-stream 且 X-Content-Format 是 json，需要解析 body
  if (contentType.includes('application/octet-stream') && contentFormat === 'json') {
    if (typeof body === 'string' && body) {
      try {
        return JSON.parse(body);
      } catch (e) {
        // 尝试 Base64 解码
        try {
          const decoded = Buffer.from(body, 'base64').toString('utf8');
          return JSON.parse(decoded);
        } catch (e2) {
          console.log('Body Base64 解码后解析失败:', e2.message);
        }
      }
    }
    
    if (Buffer.isBuffer(body)) {
      try {
        return JSON.parse(body.toString('utf8'));
      } catch (e) {
        try {
          const decoded = Buffer.from(body.toString('base64'), 'base64').toString('utf8');
          return JSON.parse(decoded);
        } catch (e2) {
          console.log('Body Buffer 解析失败:', e2.message);
        }
      }
    }
  } else if (typeof body === 'string' && body) {
    try {
      return JSON.parse(body);
    } catch (e) {
      console.log('Body 字符串解析失败:', e.message);
    }
  }
  
  return body;
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  // 兼容不同的路径格式
  let { method, path, headers, body } = event;

  // 如果 method 未定义，尝试从其他字段获取
  if (!method) {
    method = event.httpMethod || event.method || 'GET';
  }
  method = method.toUpperCase();
  
  // 如果 event 中没有 path，尝试从其他字段获取
  if (!path) {
    path = event.pathname || event.requestContext?.path || event.path || '/';
  }
  
  // ✅ 处理查询参数：如果 path 不包含查询参数，尝试从 event 中获取
  let queryString = '';
  if (path.includes('?')) {
    // path 中已包含查询参数
    const parts = path.split('?');
    path = parts[0];
    queryString = '?' + parts.slice(1).join('?');
  } else if (event.queryStringParameters || event.query) {
    // 从 event 中获取查询参数
    const queryParams = event.queryStringParameters || event.query || {};
    const queryPairs = Object.entries(queryParams).map(([key, value]) => 
      `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    );
    if (queryPairs.length > 0) {
      queryString = '?' + queryPairs.join('&');
    }
  }
  
  // ✅ 移除函数名前缀（函数名是 app-update-api）
  const functionName = 'app-update-api';
  if (path && path.startsWith(`/${functionName}`)) {
    path = path.replace(`/${functionName}`, '') || '/';
  }
  
  // ✅ 处理路径中可能出现的 -api 后缀（从 URL 中移除）
  // 例如：/-api/storage/upload-chunk -> /storage/upload-chunk
  if (path.startsWith('/-api/')) {
    path = path.replace('/-api/', '/');
  } else if (path === '/-api') {
    path = '/';
  }
  
  // ✅ 额外处理：如果路径包含 -api/，也移除
  if (path.includes('-api/')) {
    path = path.replace(/-api\//g, '/');
  }
  
  // 确保 path 以 / 开头
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  // ✅ 将查询参数重新附加到 path
  path = path + queryString;
  
  // 处理 body
  if (typeof body === 'string' && body) {
    try {
      body = JSON.parse(body);
    } catch (e) {
      // 保持原样
    }
  }
  
  // 标准化 headers
  const normalizedHeaders = {};
  if (headers) {
    for (const key in headers) {
      normalizedHeaders[key.toLowerCase()] = headers[key];
    }
  }
  
  let result;
  
  try {
    // 路由分发
    if (path === '/storage/init-upload' || path.startsWith('/storage/init-upload')) {
      result = await handleStorageUploadInit(method, path, body, normalizedHeaders);
    } else if (path === '/storage/finish-upload' || path.startsWith('/storage/finish-upload')) {
      result = await handleStorageUploadFinish(method, path, body, normalizedHeaders);
    } else if (path === '/storage/upload-chunk' || path.startsWith('/storage/upload-chunk')) {
      result = await handleChunkUpload(method, path, body, normalizedHeaders);
    } else if (path === '/storage/complete-chunk' || path.startsWith('/storage/complete-chunk')) {
      result = await handleCompleteChunkUpload(method, path, body, normalizedHeaders);
    } else if (path === '/storage/merge-task-status' || path.startsWith('/storage/merge-task-status')) {
      result = await handleMergeTaskStatus(method, path, body, normalizedHeaders);
    } else if (path === '/storage/process-merge-task' || path.startsWith('/storage/process-merge-task')) {
      result = await handleProcessMergeTask(method, path, body, normalizedHeaders);
    } else if (path === '/app/js-bundle-versions' || path.startsWith('/app/js-bundle-versions')) {
      result = await handleJSBundleVersions(method, path, body, normalizedHeaders);
    } else if (path === '/app/check-js-bundle-update' || path.startsWith('/app/check-js-bundle-update')) {
      result = await handleJSBundleCheckUpdate(method, path, body, normalizedHeaders);
    } else {
      throw new Error(`未知路径: ${path}`);
    }
    
    return result;
  } catch (error) {
    console.error('云函数执行失败:', error);
    return {
      code: -1,
      message: error.message || '服务器错误',
      data: null,
    };
  }
};

// ========== 存储上传相关 ==========

/**
 * 获取 JS Bundle 上传凭证
 * POST /storage/init-upload
 * 请求体: { fileName, version }
 * 返回: { uploadUrl, authorization, token, fileId, cosPath }
 */
async function handleStorageUploadInit(method, path, body, headers) {
  if (method !== 'POST') {
    throw new Error('只支持 POST 请求');
  }

  try {
    const storage = checkStorageSupport();
    body = parseBody(body, headers);

    const { fileName, version } = body || {};
    if (!fileName || !version) {
      throw new Error('缺少必要参数: fileName 或 version');
    }

    const cosPath = `js_bundles/v${version}/${fileName}`;

    // 使用 cloudbase 的 getUploadMetadata 获取临时凭证
    const uploadMeta = await app.getUploadMetadata({
      cloudPath: cosPath,
    });

    console.log('生成上传凭证成功:', {
      cosPath,
      fileId: uploadMeta.data.file_id,
    });

    return {
      code: 0,
      message: 'ok',
      data: {
        uploadUrl: uploadMeta.data.url,
        authorization: uploadMeta.data.authorization,
        token: uploadMeta.data.token,
        fileId: uploadMeta.data.file_id,
        cosPath,
      },
    };
  } catch (error) {
    console.error('生成上传凭证失败:', error);
    throw new Error(`生成上传凭证失败: ${error.message}`);
  }
}

/**
 * 上传完成后保存版本信息
 * POST /storage/finish-upload
 */
async function handleStorageUploadFinish(method, path, body, headers) {
  if (method !== 'POST') {
    throw new Error('只支持 POST 请求');
  }

  try {
    body = parseBody(body, headers);
    const collection = db.collection('js_bundle_versions');

    const {
      version,
      platform = 'android',
      bundleType = 'js',
      downloadUrl,
      filePath,
      fileSize,
    } = body || {};

    if (!version || !downloadUrl || !filePath) {
      throw new Error('缺少必要字段: version, downloadUrl, filePath');
    }

    // ✅ 自动递增 jsVersionCode：查询当前平台的最大 jsVersionCode，然后加 1
    console.log(`[保存版本] 查询当前平台 ${platform} 的最大 jsVersionCode...`);
    const existingVersions = await collection
      .where({ platform: platform })
      .orderBy('jsVersionCode', 'desc')
      .limit(1)
      .get();
    
    let jsVersionCode = 1; // 默认从 1 开始
    if (existingVersions.data && existingVersions.data.length > 0) {
      const maxVersion = existingVersions.data[0];
      const maxJsVersionCode = typeof maxVersion.jsVersionCode === 'number' 
        ? maxVersion.jsVersionCode 
        : parseInt(maxVersion.jsVersionCode || '0', 10);
      jsVersionCode = maxJsVersionCode + 1;
      console.log(`[保存版本] 当前最大 jsVersionCode: ${maxJsVersionCode}，新版本: ${jsVersionCode}`);
    } else {
      console.log(`[保存版本] 没有找到已有版本，使用初始 jsVersionCode: ${jsVersionCode}`);
    }

    const now = new Date().toISOString();
    const doc = {
      version,
      jsVersionCode, // ✅ 使用自动生成的 jsVersionCode
      platform,
      bundleType,
      downloadUrl,
      filePath,
      fileSize,
      releaseDate: now,
      createdAt: now,
      updatedAt: now,
    };

    // 插入数据库
    const res = await collection.add(doc);
    console.log('✅ 版本信息保存成功:', res);

    return {
      code: 0,
      message: '版本信息保存成功',
      data: { _id: res.id, ...doc },
    };
  } catch (error) {
    console.error('❌ 保存版本信息失败:', error);
    throw new Error(`保存版本信息失败: ${error.message}`);
  }
}

// ========== 分片上传相关 ==========

/**
 * 分片上传接口
 * POST /storage/upload-chunk - 上传一个分片
 */
async function handleChunkUpload(method, path, body, headers) {
  if (method !== 'POST') {
    throw new Error('只支持 POST 请求');
  }

  body = parseBody(body, headers);

  // 支持完整字段名和缩短字段名
  const uploadId = body?.uploadId || body?.u;
  const chunkIndex = body?.chunkIndex !== undefined ? body.chunkIndex : body?.i;
  const totalChunks = body?.totalChunks || body?.t;
  const filePath = body?.filePath || body?.p;
  const chunkData = body?.chunkData || body?.d;
  const fileName = body?.fileName || body?.n;

  if (!uploadId || chunkIndex === undefined || !filePath || !chunkData) {
    throw new Error('缺少必要参数: uploadId(u), chunkIndex(i), filePath(p), chunkData(d)');
  }

  try {
    const storage = checkStorageSupport();
    const chunkBuffer = Buffer.from(chunkData, 'base64');
    const chunkPath = `temp_chunks/${uploadId}/chunk_${chunkIndex}`;
    
    console.log(`开始上传分片 ${chunkIndex + 1}/${totalChunks}，路径: ${chunkPath}，大小: ${(chunkBuffer.length / 1024).toFixed(2)} KB`);
    
    const uploadResult = await storage.uploadFile({
      cloudPath: chunkPath,
      fileContent: chunkBuffer,
    });
    
    const fileID = uploadResult?.fileID || uploadResult?.FileID || chunkPath;
    
    return {
      code: 0,
      message: '分片上传成功',
      data: {
        chunkIndex: chunkIndex,
        chunkPath: chunkPath,
        fileID: fileID,
      },
    };
  } catch (error) {
    console.error('分片上传失败:', error);
    throw new Error(`分片上传失败: ${error.message}`);
  }
}

/**
 * 完成分片上传并合并
 * POST /storage/complete-chunk
 */
async function handleCompleteChunkUpload(method, path, body, headers) {
  if (method !== 'POST') {
    throw new Error('只支持 POST 请求');
  }

  body = parseBody(body, headers);

  const uploadId = body?.uploadId || body?.u;
  const totalChunks = body?.totalChunks || body?.t;
  const filePath = body?.filePath || body?.p;
  const fileName = body?.fileName || body?.n;
  const chunkFileIDs = body?.chunkFileIDs || body?.fids || null;

  if (!uploadId || !totalChunks || !filePath) {
    throw new Error('缺少必要参数: uploadId(u), totalChunks(t), filePath(p)');
  }

  try {
    const storage = checkStorageSupport();
    const envId = process.env.TCB_ENV || 'cloud1-4gee45pq61cd6f19';
    const storageDomain = '636c-cloud1-4gee45pq61cd6f19-1259499058';
    const cloudPrefix = `${envId}.${storageDomain}`;
    
    function pathToCloudFileID(path) {
      if (path && path.startsWith('cloud://')) {
        return path;
      }
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      return `cloud://${cloudPrefix}/${cleanPath}`;
    }
    
    // 批量获取所有分片的 URL
    console.log(`步骤 1: 批量获取所有分片的 URL...`);
    const chunkUrlPromises = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = `temp_chunks/${uploadId}/chunk_${i}`;
      const fileIdentifier = (chunkFileIDs && chunkFileIDs.length > i && chunkFileIDs[i]) ? chunkFileIDs[i] : null;
      const cloudFileID = fileIdentifier ? fileIdentifier : pathToCloudFileID(chunkPath);
      
      chunkUrlPromises.push(
        storage.getTempFileURL({
          fileList: [cloudFileID],
        }).then(result => {
          if (result && result.fileList && result.fileList.length > 0 && result.fileList[0].tempFileURL) {
            return { index: i, url: result.fileList[0].tempFileURL, success: true };
          } else {
            throw new Error(`获取分片 ${i} URL 失败`);
          }
        }).catch(error => {
          return { index: i, url: null, success: false, error: error.message };
        })
      );
    }
    
    const chunkUrlResults = await Promise.all(chunkUrlPromises);
    const failedChunks = chunkUrlResults.filter(r => !r.success);
    if (failedChunks.length > 0) {
      throw new Error(`获取分片 URL 失败: ${failedChunks.map(f => `分片${f.index}: ${f.error}`).join(', ')}`);
    }
    
    chunkUrlResults.sort((a, b) => a.index - b.index);
    const chunkUrls = chunkUrlResults.map(result => result.url);
    
    console.log(`✅ 成功获取 ${chunkUrls.length} 个分片的URL`);
    console.log(`[创建任务] chunkUrls 数量: ${chunkUrls.length}`);
    console.log(`[创建任务] chunkUrls 前3个:`, chunkUrls.slice(0, 3));
    
    // ✅ 验证 chunkUrls 是否有效
    if (!chunkUrls || !Array.isArray(chunkUrls) || chunkUrls.length === 0) {
      throw new Error(`无法创建合并任务: chunkUrls 无效 (数量: ${chunkUrls?.length || 0})`);
    }
    
    // 创建合并任务
    const taskId = `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // ✅ 将 chunkUrls 数组转换为 JSON 字符串存储（避免数据库数组字段问题）
    const chunkUrlsJson = JSON.stringify(chunkUrls);
    console.log(`[创建任务] chunkUrls JSON 字符串长度: ${chunkUrlsJson.length}`);
    
    // ✅ 尝试使用不同的字段名，避免可能的字段名冲突
    const taskData = {
      taskId: taskId,
      uploadId: uploadId,
      totalChunks: totalChunks,
      filePath: filePath,
      fileName: fileName || path.basename(filePath),
      chunkUrlsJson: chunkUrlsJson, // 使用 chunkUrlsJson 作为字段名
      chunkUrls: chunkUrlsJson, // 同时保存两个字段名，确保兼容
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    console.log(`[创建任务] 准备保存任务数据，taskId: ${taskId}`);
    console.log(`[创建任务] taskData 字段:`, Object.keys(taskData));
    console.log(`[创建任务] taskData.chunkUrls 类型: ${typeof taskData.chunkUrls}, 长度: ${taskData.chunkUrls.length}`);
    console.log(`[创建任务] taskData.chunkUrlsJson 类型: ${typeof taskData.chunkUrlsJson}, 长度: ${taskData.chunkUrlsJson.length}`);
    
    // ✅ 使用 set 方法保存，确保所有字段都被保存
    const setResult = await db.collection('merge_tasks').doc(taskId).set(taskData);
    console.log(`[创建任务] set 操作完成`);
    console.log(`✅ 合并任务已创建: ${taskId}`);
    
    // ✅ 验证任务是否真的保存成功（只记录日志，不阻止继续）
    console.log(`[创建任务] 等待数据库写入完成...`);
    await new Promise(resolve => setTimeout(resolve, 300)); // 等待 300ms 确保写入完成
    
    try {
      const verifyDoc = await db.collection('merge_tasks').doc(taskId).get();
      if (verifyDoc.data) {
        const verifyData = verifyDoc.data;
        console.log(`[创建任务] 验证: 任务已保存`);
        console.log(`[创建任务] 验证数据的所有字段:`, Object.keys(verifyData));
        console.log(`[创建任务] 验证: chunkUrls 类型: ${typeof verifyData.chunkUrls}`);
        
        if (verifyData.chunkUrls) {
          if (typeof verifyData.chunkUrls === 'string') {
            try {
              const parsed = JSON.parse(verifyData.chunkUrls);
              console.log(`[创建任务] ✅ 验证通过: chunkUrls JSON 字符串已保存，解析后数量: ${parsed.length}`);
            } catch (e) {
              console.warn(`[创建任务] ⚠️  chunkUrls JSON 解析失败:`, e.message);
            }
          } else if (Array.isArray(verifyData.chunkUrls)) {
            console.log(`[创建任务] ✅ 验证通过: chunkUrls 数组已保存，数量: ${verifyData.chunkUrls.length}`);
          } else {
            console.warn(`[创建任务] ⚠️  chunkUrls 格式异常: ${typeof verifyData.chunkUrls}`);
          }
        } else {
          console.warn(`[创建任务] ⚠️  chunkUrls 字段不存在，但任务已创建，将在处理时检查`);
        }
      } else {
        console.warn(`[创建任务] ⚠️  无法立即读取任务，但任务可能已创建，将在处理时检查`);
      }
    } catch (verifyError) {
      console.warn(`[创建任务] ⚠️  验证失败，但任务可能已创建:`, verifyError.message);
    }
    
    // ✅ 注意：合并任务需要手动触发处理（通过 /storage/process-merge-task 端点）
    // 这样可以避免云函数超时，因为合并任务可能需要较长时间
    // 上传脚本会在创建任务后自动触发处理
    
    return {
      code: 0,
      message: '合并任务已创建，请调用 /storage/process-merge-task 触发处理',
      data: {
        taskId: taskId,
        uploadId: uploadId,
        totalChunks: totalChunks,
        targetFilePath: filePath,
        status: 'pending',
        chunkUrls: chunkUrls,
      },
    };
  } catch (error) {
    console.error('完成分片上传失败:', error);
    throw new Error(`完成分片上传失败: ${error.message}`);
  }
}

/**
 * 处理合并任务（实际的合并逻辑）
 */
async function processMergeTask(taskId) {
  console.log(`\n========== 开始处理合并任务: ${taskId} ==========`);
  
  try {
    console.log(`[处理任务] 查询任务: ${taskId}`);
    const taskDoc = await db.collection('merge_tasks').doc(taskId).get();

    console.log(`[处理任务] 查询结果DOC:`, JSON.stringify(taskDoc.data, null, 2));
    
    // ✅ 处理数据库返回的数据格式
    // 可能是数组 [{...}] 或单个对象 {...}
    let task;
    if (Array.isArray(taskDoc.data)) {
      if (taskDoc.data.length === 0) {
        throw new Error(`任务不存在: ${taskId}`);
      }
      task = taskDoc.data[0]; // 取第一个元素
      console.log(`[处理任务] 查询结果: 数组格式，取第一个元素`);
    } else if (taskDoc.data) {
      task = taskDoc.data; // 直接使用
      console.log(`[处理任务] 查询结果: 对象格式`);
    } else {
      // ✅ 尝试列出所有任务，看看是否有类似的任务ID
      console.error(`[处理任务] 错误: 任务不存在: ${taskId}`);
      try {
        const allTasks = await db.collection('merge_tasks').limit(5).get();
        console.error(`[处理任务] 数据库中的任务数量: ${allTasks.data?.length || 0}`);
        if (allTasks.data && allTasks.data.length > 0) {
          console.error(`[处理任务] 最近的任务ID:`, allTasks.data.map(t => t._id || t.taskId));
        }
      } catch (listError) {
        console.error(`[处理任务] 无法列出任务:`, listError);
      }
      throw new Error(`任务不存在: ${taskId}`);
    }
    
    console.log(`[处理任务] 查询结果:`, {
      exists: !!task,
      dataKeys: task ? Object.keys(task) : [],
    });
    
    // ✅ 验证任务数据
    console.log(`[合并任务] 任务数据字段:`, Object.keys(task));
    console.log(`[合并任务] chunkUrls 类型:`, typeof task.chunkUrls);
    
    // ✅ 检查 chunkUrls 字段是否存在
    if (!task.chunkUrls) {
      console.error(`[合并任务] 错误: chunkUrls 字段不存在`);
      console.error(`[合并任务] 任务所有字段:`, Object.keys(task));
      throw new Error(`任务数据无效: chunkUrls 不存在`);
    }
    
    // ✅ 解析 chunkUrls（可能是 JSON 字符串、数组、或对象）
    // 优先尝试 chunkUrlsJson 字段，如果没有则使用 chunkUrls
    let chunkUrlsData = task.chunkUrlsJson || task.chunkUrls;
    
    if (!chunkUrlsData) {
      console.error(`[合并任务] 错误: chunkUrls 和 chunkUrlsJson 字段都不存在`);
      console.error(`[合并任务] 任务所有字段:`, Object.keys(task));
      throw new Error(`任务数据无效: chunkUrls 不存在`);
    }
    
    let chunkUrls;
    try {
      if (typeof chunkUrlsData === 'string') {
        // JSON 字符串，需要解析
        chunkUrls = JSON.parse(chunkUrlsData);
        console.log(`[合并任务] 从 JSON 字符串解析 chunkUrls，数量: ${chunkUrls.length}`);
      } else if (Array.isArray(chunkUrlsData)) {
        // 已经是数组
        chunkUrls = chunkUrlsData;
        console.log(`[合并任务] chunkUrls 已经是数组，数量: ${chunkUrls.length}`);
      } else if (typeof chunkUrlsData === 'object' && chunkUrlsData !== null) {
        // ✅ 数据库将数组存储为对象（键为 "0", "1", "2" 等）
        // 需要将对象转换回数组
        console.log(`[合并任务] chunkUrls 是对象格式，转换为数组...`);
        const keys = Object.keys(chunkUrlsData).sort((a, b) => {
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return a.localeCompare(b);
        });
        chunkUrls = keys.map(key => chunkUrlsData[key]).filter(url => url != null);
        console.log(`[合并任务] 从对象转换的 chunkUrls，数量: ${chunkUrls.length}`);
      } else {
        throw new Error(`chunkUrls 格式无效: ${typeof chunkUrlsData}`);
      }
    } catch (parseError) {
      console.error(`[合并任务] 错误: 解析 chunkUrls 失败:`, parseError);
      if (typeof chunkUrlsData === 'string') {
        console.error(`[合并任务] chunkUrlsData 类型: string, 值: ${chunkUrlsData.substring(0, 200)}`);
      } else {
        console.error(`[合并任务] chunkUrlsData 类型: ${typeof chunkUrlsData}, 值:`, chunkUrlsData);
      }
      throw new Error(`任务数据无效: 无法解析 chunkUrls: ${parseError.message}`);
    }
    
    if (!Array.isArray(chunkUrls)) {
      console.error(`[合并任务] 错误: 解析后的 chunkUrls 不是数组`);
      throw new Error(`任务数据无效: chunkUrls 不是数组`);
    }
    
    if (chunkUrls.length === 0) {
      console.error(`[合并任务] 错误: chunkUrls 数组为空`);
      throw new Error(`任务数据无效: chunkUrls 为空`);
    }
    
    // ✅ 将解析后的 chunkUrls 赋值回 task 对象，供后续使用
    task.chunkUrls = chunkUrls;
    
    if (!task.filePath) {
      throw new Error(`任务数据无效: filePath 不存在`);
    }
    
    if (!task.uploadId) {
      throw new Error(`任务数据无效: uploadId 不存在`);
    }
    
    console.log(`[合并任务] 分片数量: ${chunkUrls.length}`);
    console.log(`[合并任务] 文件路径: ${task.filePath}`);
    
    // 更新任务状态为处理中
    await db.collection('merge_tasks').doc(taskId).update({
      status: 'processing',
      progress: 0,
      updatedAt: new Date().toISOString(),
    });
    
    const storage = checkStorageSupport();
    const envId = process.env.TCB_ENV || 'cloud1-4gee45pq61cd6f19';
    const storageDomain = '636c-cloud1-4gee45pq61cd6f19-1259499058';
    const cloudPrefix = `${envId}.${storageDomain}`;
    
    function pathToCloudFileID(path) {
      if (path && path.startsWith('cloud://')) {
        return path;
      }
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      return `cloud://${cloudPrefix}/${cleanPath}`;
    }
    
    // 步骤2: 下载所有分片
    console.log(`步骤 2: 下载所有分片...`);
    const CONCURRENT_DOWNLOADS = 10;
    const chunks = [];
    
    for (let i = 0; i < task.chunkUrls.length; i += CONCURRENT_DOWNLOADS) {
      const batch = task.chunkUrls.slice(i, i + CONCURRENT_DOWNLOADS);
      const progress = Math.floor((i / task.chunkUrls.length) * 80) + 10;
      
      const batchPromises = batch.map((url, idx) => 
        downloadFileFromUrl(url)
          .then(buffer => {
            if (!buffer || !Buffer.isBuffer(buffer)) {
              throw new Error(`下载分片失败: ${url} - 返回的数据不是有效的 Buffer`);
            }
            return {
              index: i + idx,
              buffer: buffer,
            };
          })
          .catch(error => {
            console.error(`下载分片失败 [${i + idx}]: ${url}`, error);
            throw new Error(`下载分片失败 [${i + idx}]: ${error.message}`);
          })
      );
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.sort((a, b) => a.index - b.index);
      for (const result of batchResults) {
        if (!result || !result.buffer) {
          throw new Error(`分片数据无效: index ${result?.index || 'unknown'}`);
        }
        chunks.push(result.buffer);
      }
      
      await db.collection('merge_tasks').doc(taskId).update({
        progress: progress,
        updatedAt: new Date().toISOString(),
      });
    }
    
    // 步骤3: 合并分片
    console.log(`步骤 3: 合并所有分片...`);
    console.log(`[合并任务] 已下载分片数量: ${chunks.length}`);
    
    if (chunks.length === 0) {
      throw new Error(`没有可合并的分片数据`);
    }
    
    // 验证所有分片都是有效的 Buffer
    for (let i = 0; i < chunks.length; i++) {
      if (!chunks[i] || !Buffer.isBuffer(chunks[i])) {
        throw new Error(`分片 ${i} 不是有效的 Buffer`);
      }
    }
    
    const fullFileBuffer = Buffer.concat(chunks);
    console.log(`合并完成，总大小: ${(fullFileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    await db.collection('merge_tasks').doc(taskId).update({
      progress: 90,
      updatedAt: new Date().toISOString(),
    });
    
    // 步骤4: 上传完整文件
    console.log(`步骤 4: 上传完整文件...`);
    const uploadResult = await storage.uploadFile({
      cloudPath: task.filePath,
      fileContent: fullFileBuffer,
    });
    
    console.log(`[合并任务] uploadFile 返回结果:`, JSON.stringify(uploadResult, null, 2));
    
    if (!uploadResult || !uploadResult.fileID) {
      throw new Error(`上传文件失败: uploadResult 无效或缺少 fileID`);
    }
    
    // 步骤5: 获取文件URL
    const finalFileCloudID = pathToCloudFileID(task.filePath);
    let fileUrl;
    
    try {
      const fileUrlResult = await storage.getTempFileURL({
        fileList: [finalFileCloudID],
      });
      
      console.log(`[合并任务] getTempFileURL 返回结果:`, JSON.stringify(fileUrlResult, null, 2));
      
      if (fileUrlResult && fileUrlResult.fileList && Array.isArray(fileUrlResult.fileList) && fileUrlResult.fileList.length > 0) {
        fileUrl = fileUrlResult.fileList[0]?.tempFileURL;
      }
      
      if (!fileUrl) {
        fileUrl = `https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/${task.filePath}`;
        console.log(`[合并任务] 使用默认文件URL: ${fileUrl}`);
      }
    } catch (urlError) {
      console.warn(`[合并任务] 获取文件URL失败，使用默认URL:`, urlError);
      fileUrl = `https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/${task.filePath}`;
    }
    
    // 步骤6: 清理临时分片
    console.log(`步骤 5: 清理临时分片...`);
    try {
      if (storage.deleteFile) {
        for (let i = 0; i < task.totalChunks; i++) {
          const chunkPath = `temp_chunks/${task.uploadId}/chunk_${i}`;
          const chunkCloudFileID = pathToCloudFileID(chunkPath);
          await storage.deleteFile({
            fileList: [chunkCloudFileID],
          });
        }
        console.log('临时分片已清理');
      }
    } catch (cleanupError) {
      console.warn('清理临时分片失败:', cleanupError);
    }
    
    // 更新任务状态为完成
    await db.collection('merge_tasks').doc(taskId).update({
      status: 'completed',
      progress: 100,
      fileId: uploadResult.fileID,
      fileUrl: fileUrl,
      fileSize: fullFileBuffer.length,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    console.log(`✅ 合并任务完成: ${taskId}`);
    console.log(`   文件路径: ${task.filePath}`);
    console.log(`   文件大小: ${(fullFileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   文件URL: ${fileUrl}`);
    
  } catch (error) {
    console.error(`❌ 处理合并任务失败: ${taskId}`, error);
    try {
      await db.collection('merge_tasks').doc(taskId).update({
        status: 'failed',
        error: error.message,
        updatedAt: new Date().toISOString(),
      });
    } catch (updateError) {
      console.error(`更新任务状态失败:`, updateError);
    }
    throw error;
  }
}

/**
 * 查询合并任务状态
 * GET /storage/merge-task-status?taskId=xxx
 */
async function handleMergeTaskStatus(method, path, body, headers) {
  if (method !== 'GET') {
    throw new Error('只支持 GET 请求');
  }
  
  try {
    const url = new URL(`http://example.com${path}`);
    const taskId = url.searchParams.get('taskId');
    
    if (!taskId) {
      throw new Error('缺少必要参数: taskId');
    }
    
    const taskDoc = await db.collection('merge_tasks').doc(taskId).get();
    
    // ✅ 处理数据库返回的数据格式
    // 可能是数组 [{...}] 或单个对象 {...}
    let task;
    if (Array.isArray(taskDoc.data)) {
      if (taskDoc.data.length === 0) {
        return {
          code: 404,
          message: '任务不存在',
          data: null,
        };
      }
      task = taskDoc.data[0]; // 取第一个元素
    } else if (taskDoc.data) {
      task = taskDoc.data; // 直接使用
    } else {
      return {
        code: 404,
        message: '任务不存在',
        data: null,
      };
    }
    
    return {
      code: 0,
      message: '查询成功',
      data: {
        taskId: task.taskId || taskId,
        status: task.status || 'pending', // 默认值
        progress: task.progress || 0,
        uploadId: task.uploadId,
        filePath: task.filePath,
        fileId: task.fileId,
        fileUrl: task.fileUrl,
        fileSize: task.fileSize,
        error: task.error,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        completedAt: task.completedAt,
      },
    };
  } catch (error) {
    console.error('查询任务状态失败:', error);
    throw new Error(`查询任务状态失败: ${error.message}`);
  }
}

/**
 * 处理合并任务（HTTP调用触发）
 * POST /storage/process-merge-task
 * 注意：此函数立即返回，合并任务在后台异步执行
 */
async function handleProcessMergeTask(method, path, body, headers) {
  if (method !== 'POST') {
    throw new Error('只支持 POST 请求');
  }
  
  try {
    body = parseBody(body, headers);
    const taskId = body.taskId || body.t;
    
    if (!taskId) {
      throw new Error('缺少必要参数: taskId');
    }
    
    // ✅ 检查任务状态，如果已经在处理中或已完成，直接返回
    try {
      const taskDoc = await db.collection('merge_tasks').doc(taskId).get();
      let task;
      if (Array.isArray(taskDoc.data)) {
        task = taskDoc.data[0];
      } else {
        task = taskDoc.data;
      }
      
      if (task && (task.status === 'processing' || task.status === 'completed' || task.status === 'failed')) {
        console.log(`[处理任务] 任务 ${taskId} 状态: ${task.status}，跳过处理`);
        return {
          code: 0,
          message: `任务已在处理中或已完成: ${task.status}`,
          data: {
            taskId: taskId,
            status: task.status,
          },
        };
      }
    } catch (checkError) {
      console.error(`[处理任务] 检查任务状态失败:`, checkError);
      // 继续执行，可能是任务不存在
    }
    
    // ✅ 异步处理合并任务，不等待完成
    // 使用 setTimeout 确保在云函数返回后继续执行
    processMergeTask(taskId).catch(error => {
      console.error(`[处理任务] 异步处理失败:`, error);
      // 更新任务状态为失败
      db.collection('merge_tasks').doc(taskId).update({
        status: 'failed',
        error: error.message,
        updatedAt: new Date().toISOString(),
      }).catch(updateError => {
        console.error(`[处理任务] 更新任务状态失败:`, updateError);
      });
    });
    
    // ✅ 立即返回，不等待合并任务完成
    return {
      code: 0,
      message: '合并任务处理已启动（异步执行）',
      data: {
        taskId: taskId,
      },
    };
  } catch (error) {
    console.error('处理合并任务失败:', error);
    throw new Error(`处理合并任务失败: ${error.message}`);
  }
}

// ========== JS Bundle 版本管理 ==========

/**
 * JS Bundle 版本管理接口
 * POST /app/js-bundle-versions - 保存版本信息
 * GET /app/js-bundle-versions - 获取版本列表
 */
async function handleJSBundleVersions(method, path, body, headers) {
  if (method === 'POST') {
    // 保存版本信息（已废弃，应使用 /storage/finish-upload）
    throw new Error('此接口已废弃，请使用 /storage/finish-upload 接口，会自动递增 jsVersionCode');
  } else if (method === 'GET') {
    // 获取版本信息
    try {
      const versionsCollection = db.collection('js_bundle_versions');
      
      const url = new URL(`http://example.com${path}`);
      const platform = url.searchParams.get('platform') || 'android';
      const jsVersionCode = url.searchParams.get('jsVersionCode');
      
      if (jsVersionCode) {
        // 获取指定版本（按 jsVersionCode）
        const versions = await versionsCollection
          .where({
            jsVersionCode: parseInt(jsVersionCode, 10),
            platform: platform,
          })
          .get();
        
        if (versions.data && versions.data.length > 0) {
          return {
            code: 0,
            message: '获取成功',
            data: versions.data[0],
          };
        } else {
          return {
            code: 404,
            message: '版本不存在',
            data: null,
          };
        }
      } else {
        // 获取所有版本（按 jsVersionCode 降序）
        const versions = await versionsCollection
          .where({ platform: platform })
          .orderBy('jsVersionCode', 'desc')
          .get();
        
        return {
          code: 0,
          message: '获取成功',
          data: versions.data || [],
        };
      }
    } catch (error) {
      console.error('获取 JS Bundle 版本信息失败:', error);
      throw new Error(`获取版本信息失败: ${error.message}`);
    }
  } else {
    throw new Error('不支持的请求方法');
  }
}

/**
 * JS Bundle 更新检查接口
 * GET /app/check-js-bundle-update?jsVersionCode=1&platform=android
 * 注意：JS Bundle 更新使用独立的 jsVersionCode，与 APK 的 versionCode 分离
 */
async function handleJSBundleCheckUpdate(method, path, body, headers) {
  if (method !== 'GET') {
    throw new Error('只支持 GET 请求');
  }

  const queryParams = new URLSearchParams(path.split('?')[1] || '');
  const currentJsVersionCode = parseInt(queryParams.get('jsVersionCode') || '0', 10);
  const platform = queryParams.get('platform') || 'android';

  console.log('检查 JS Bundle 更新:', { currentJsVersionCode, platform });

  try {
    const versionsCollection = db.collection('js_bundle_versions');
    const versions = await versionsCollection
      .where({ platform: platform })
      .orderBy('jsVersionCode', 'desc')
      .limit(1)
      .get();
    
    if (!versions.data || versions.data.length === 0) {
      return {
        code: 0,
        message: 'success',
        data: {
          hasUpdate: false,
          latestVersion: '',
          latestJsVersionCode: currentJsVersionCode,
          downloadUrl: null,
          filePath: null,
          fileSize: 0,
          releaseDate: null,
        },
      };
    }
    
    const latestVersion = versions.data[0];
    const latestJsVersionCode = typeof latestVersion.jsVersionCode === 'number' 
      ? latestVersion.jsVersionCode 
      : parseInt(latestVersion.jsVersionCode || '0', 10);
    
    // ✅ 使用 jsVersionCode 进行比较
    const hasUpdate = latestJsVersionCode > currentJsVersionCode;
    
    console.log('JS Bundle 版本比较:', {
      currentJsVersionCode,
      latestJsVersionCode,
      hasUpdate,
    });
    
    return {
      code: 0,
      message: 'success',
      data: {
        hasUpdate: hasUpdate,
        latestVersion: latestVersion.version || '',
        latestJsVersionCode: latestJsVersionCode,
        downloadUrl: latestVersion.downloadUrl || null,
        filePath: latestVersion.filePath || null,
        fileSize: latestVersion.fileSize || 0,
        releaseDate: latestVersion.releaseDate || latestVersion.createdAt || null,
      },
    };
  } catch (error) {
    console.error('检查 JS Bundle 更新失败:', error);
    throw new Error(`检查更新失败: ${error.message}`);
  }
}

