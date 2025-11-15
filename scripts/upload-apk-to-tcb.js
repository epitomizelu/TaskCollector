/**
 * 上传 APK 到腾讯云开发（TCB）存储
 * 使用云函数 API 上传文件
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 配置信息
const TCB_STORAGE_DOMAIN = '636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la';
const STORAGE_FOLDER = 'task_collection_apks';
// 默认使用 task-collection-api（用于存储上传等）
const DEFAULT_API_BASE_URL = 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api';
// 强制更新 API 使用 app-update-api
const FORCE_UPDATE_API_BASE_URL = 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/app-update-api';
const API_BASE_URL = process.env.API_BASE_URL || DEFAULT_API_BASE_URL;
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || process.env.API_KEY;

/**
 * 读取 app.json 获取版本信息
 */
function getVersionInfo() {
  const appJsonPath = path.join(__dirname, '..', 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  return {
    version: appJson.expo.version,
    versionCode: appJson.expo.android.versionCode,
  };
}

/**
 * 上传文件到 TCB 存储（通过云函数）
 * 对于大文件（> 10MB），使用分片上传
 */
async function uploadToTCB(filePath, cloudPath) {
  return new Promise(async (resolve, reject) => {
    try {
      const fileContent = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const fileSize = fileContent.length;
      const fileSizeMB = fileSize / 1024 / 1024;

      console.log(`文件大小: ${fileSizeMB.toFixed(2)} MB`);

      // 对于大文件（> 10MB），使用分片上传
      if (fileSizeMB > 10) {
        console.log('文件较大，使用分片上传...');
        return await uploadInChunks(filePath, cloudPath, fileName, fileContent, resolve, reject);
      }

      // 小文件使用直接上传
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

    console.log(`开始分片上传: ${totalChunks} 个分片，每片 ${(CHUNK_SIZE / 1024 / 1024).toFixed(2)} MB`);
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
      };

      await uploadChunk(chunkData);

      const progress = ((i + 1) / totalChunks * 100).toFixed(1);
      console.log(`进度: ${progress}%`);
    }

    // 完成分片上传
    console.log('所有分片上传完成，获取分片 URL 列表...');
    const result = await completeChunkUpload({
      u: uploadId,        // uploadId
      t: totalChunks,     // totalChunks
      p: cloudPath,       // filePath
      n: fileName,        // fileName
    });

    // 如果返回了 chunkUrls，说明需要客户端合并
    if (result.chunkUrls && result.chunkUrls.length > 0) {
      console.log('✅ 分片上传成功（需要客户端合并）！');
      console.log(`分片数量: ${result.chunkUrls.length}`);
      console.log(`目标文件路径: ${result.targetFilePath}`);
      console.log(`提示: 使用脚本 download-and-merge-chunks.js 下载并合并分片`);
    } else {
      console.log('✅ 分片上传成功！');
      console.log(`文件 URL: ${result.fileUrl || 'N/A'}`);
      console.log(`文件大小: ${result.fileSize ? (result.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);
    }
    
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
    const postData = JSON.stringify(chunkData);
    const url = new URL(`${API_BASE_URL}/storage/upload-chunk`);

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
 * 直接上传小文件
 */
function uploadDirectly(filePath, cloudPath, fileName, fileContent, resolve, reject) {
  const fileBase64 = fileContent.toString('base64');
  const uploadData = {
    fileName: fileName,
    filePath: cloudPath,
    fileContent: fileBase64,
    contentType: 'application/vnd.android.package-archive',
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
          console.log('✅ 上传成功！');
          console.log(`文件 URL: ${result.data.fileUrl}`);
          resolve(result.data);
        } else {
          reject(new Error(result.message || '上传失败'));
        }
      } catch (error) {
        console.error('响应数据:', data.substring(0, 500));
        reject(new Error(`解析响应失败: ${error.message}`));
      }
    });
  });

  req.on('error', (error) => {
    reject(error);
  });

  req.on('timeout', () => {
    req.destroy();
    reject(new Error('请求超时'));
  });

  req.write(postData);
  req.end();
}

/**
 * 直接上传大文件到 TCB 存储
 * 注意：TCB 存储通常不支持直接 HTTP PUT，需要先获取上传 URL
 */
async function uploadDirectlyToTCB(filePath, cloudPath, resolve, reject) {
  try {
    // 由于 TCB 存储的限制，大文件上传需要特殊处理
    // 这里我们仍然尝试通过云函数上传，但使用流式上传
    // 如果云函数支持，可以分块上传
    
    console.log('⚠️  大文件上传功能需要云函数支持流式上传或分片上传');
    console.log('⚠️  当前方案：尝试直接上传到 TCB 存储（可能需要配置 CORS 和权限）');
    
    // 尝试直接上传（需要 TCB 存储配置允许）
    const fileContent = fs.readFileSync(filePath);
    const uploadUrl = `https://636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la/${cloudPath}`;
    
    const url = new URL(uploadUrl);
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': fileContent.length,
      },
      timeout: 600000, // 10 分钟超时
    };

    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✅ 直接上传成功！');
          resolve({
            fileUrl: uploadUrl,
            filePath: cloudPath,
          });
        } else {
          console.error(`HTTP ${res.statusCode}:`, data.substring(0, 500));
          reject(new Error(`上传失败: HTTP ${res.statusCode}。TCB 存储可能需要配置权限或使用云函数上传`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`上传失败: ${error.message}。建议：1. 检查 TCB 存储权限配置 2. 使用云函数分片上传`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('上传超时'));
    });

    req.write(fileContent);
    req.end();
  } catch (error) {
    reject(error);
  }
}

/**
 * 直接上传到 TCB 存储（使用 HTTP PUT）
 * 注意：这需要 TCB 存储支持直接 HTTP 上传
 */
async function uploadDirectly(filePath, cloudPath) {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const uploadUrl = `https://${TCB_STORAGE_DOMAIN}/${cloudPath}`;

    const url = new URL(uploadUrl);
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': fileContent.length,
      },
    };

    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve({
            fileUrl: uploadUrl,
            filePath: cloudPath,
          });
        } else {
          reject(new Error(`上传失败: HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(fileContent);
    req.end();
  });
}

/**
 * 保存版本信息到数据库（通过云函数 API）
 * 注意：此函数会更新已存在的版本信息（添加腾讯云下载地址）
 * @param {boolean} isForceUpdate - 是否保存为强制更新（保存到 force_update_versions 集合）
 */
async function saveVersionInfo(version, versionCode, filePath, uploadResult, easDownloadUrl = null, isForceUpdate = false) {
  try {
    const updateType = isForceUpdate ? '强制更新' : '普通版本';
    console.log(`保存版本信息到数据库（${updateType}）...`);
    
    // 获取下载 URL（优先使用腾讯云存储的 URL）
    const downloadUrl = uploadResult.fileUrl || `https://${TCB_STORAGE_DOMAIN}/${filePath}`;
    
    // 构造版本信息
    const versionInfo = {
      version: version,
      versionCode: versionCode,
      platform: 'android',
      // 腾讯云存储下载地址（主要下载源）
      downloadUrl: downloadUrl,
      // EAS Build 下载地址（备用，如果提供）
      easDownloadUrl: easDownloadUrl || null,
      filePath: filePath,
      fileSize: uploadResult.fileSize || 0,
      updateLog: isForceUpdate ? 'Codemagic 自动构建版本（强制更新）' : '自动构建版本',
      releaseDate: new Date().toISOString(),
      // 分片下载相关（如果使用分片上传）
      uploadId: uploadResult.uploadId || null,
      totalChunks: uploadResult.totalChunks || null,
      useChunkedDownload: !!(uploadResult.chunkUrls && uploadResult.chunkUrls.length > 0),
    };
    
    // 如果是强制更新，添加 downloadStatus 字段
    if (isForceUpdate) {
      versionInfo.downloadStatus = 'not_downloaded';
    }
    
    // 调用云函数 API 保存版本信息
    try {
      const postData = JSON.stringify(versionInfo);
      // 根据 isForceUpdate 选择不同的 API 端点和基础 URL
      const apiEndpoint = isForceUpdate ? '/app/force-update' : '/app/versions';
      const baseUrl = isForceUpdate ? FORCE_UPDATE_API_BASE_URL : API_BASE_URL;
      const url = new URL(`${baseUrl}${apiEndpoint}`);
      
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 30000,
      };
      
      const response = await new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              const result = JSON.parse(data);
              resolve({ statusCode: res.statusCode, data: result });
            } catch (e) {
              reject(new Error(`解析响应失败: ${e.message}`));
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
      
      if (response.statusCode === 200 && response.data.code === 0) {
        console.log(`✅ 版本信息保存成功（${updateType}）`);
        if (easDownloadUrl) {
          console.log(`   EAS 下载地址: ${easDownloadUrl}`);
        }
        console.log(`   腾讯云下载地址: ${downloadUrl}`);
        if (isForceUpdate) {
          console.log(`   下载状态: ${versionInfo.downloadStatus}`);
        }
      } else {
        console.warn(`⚠️  保存版本信息失败（${updateType}）:`, response.data.message || '未知错误');
        console.log('版本信息:', JSON.stringify(versionInfo, null, 2));
      }
    } catch (apiError) {
      console.warn(`⚠️  调用云函数 API 保存版本信息失败（${updateType}）:`, apiError.message);
      console.log('版本信息:', JSON.stringify(versionInfo, null, 2));
      console.log('提示: 需要在云函数中添加保存版本信息的接口');
    }
    
  } catch (error) {
    console.warn('保存版本信息失败:', error.message);
    // 不影响上传流程，只打印警告
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const apkPath = args[0];
  // 从环境变量或命令行参数获取 EAS 下载地址
  const easDownloadUrl = process.env.EAS_DOWNLOAD_URL || args[1] || null;

  if (!apkPath) {
    console.error('错误: 请提供 APK 文件路径');
    console.log('用法: node upload-apk-to-tcb.js <apk-file-path> [eas-download-url]');
    console.log('或者设置环境变量: EAS_DOWNLOAD_URL=https://expo.dev/artifacts/...');
    process.exit(1);
  }

  if (!fs.existsSync(apkPath)) {
    console.error(`错误: APK 文件不存在: ${apkPath}`);
    process.exit(1);
  }

  if (!API_KEY) {
    console.error('错误: 未配置 API_KEY');
    console.log('请设置环境变量: EXPO_PUBLIC_API_KEY 或 API_KEY');
    process.exit(1);
  }

  try {
    const { version, versionCode } = getVersionInfo();
    const fileName = `app-release-v${version}.apk`;
    const cloudPath = `${STORAGE_FOLDER}/v${version}/${fileName}`;

    console.log('开始上传 APK...');
    console.log(`版本: v${version} (Build ${versionCode})`);
    console.log(`文件: ${apkPath}`);
    console.log(`目标路径: ${cloudPath}`);
    if (easDownloadUrl) {
      console.log(`EAS 下载地址: ${easDownloadUrl}`);
    }

    // 尝试通过云函数上传（推荐）
    let uploadResult;
    try {
      uploadResult = await uploadToTCB(apkPath, cloudPath);
      console.log('✅ 上传成功！');
      
      // 如果返回了 chunkUrls，说明需要客户端合并
      if (uploadResult.chunkUrls && uploadResult.chunkUrls.length > 0) {
        console.log(`分片数量: ${uploadResult.chunkUrls.length}`);
        console.log(`目标文件路径: ${uploadResult.targetFilePath}`);
        console.log(`提示: 使用脚本 download-and-merge-chunks.js 下载并合并分片`);
      } else {
        console.log(`文件 URL: ${uploadResult.fileUrl || `https://${TCB_STORAGE_DOMAIN}/${cloudPath}`}`);
        console.log(`文件大小: ${uploadResult.fileSize ? (uploadResult.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}`);
      }
      
      // 检查是否保存为强制更新（从环境变量或命令行参数）
      const isForceUpdate = process.env.FORCE_UPDATE === 'true' || process.env.FORCE_UPDATE === '1' || args.includes('--force-update');
      
      // 保存版本信息到数据库（包含 EAS 下载地址）
      await saveVersionInfo(version, versionCode, cloudPath, uploadResult, easDownloadUrl, isForceUpdate);
      
    } catch (error) {
      console.warn('通过云函数上传失败，尝试直接上传...');
      console.warn(`错误: ${error.message}`);
      
      // 如果云函数上传失败，尝试直接上传
      try {
        uploadResult = await uploadDirectly(apkPath, cloudPath);
        console.log('✅ 直接上传成功！');
        console.log(`文件 URL: ${uploadResult.fileUrl}`);
        
        // 检查是否保存为强制更新
        const isForceUpdate = process.env.FORCE_UPDATE === 'true' || process.env.FORCE_UPDATE === '1' || args.includes('--force-update');
        
        // 保存版本信息到数据库（包含 EAS 下载地址）
        await saveVersionInfo(version, versionCode, cloudPath, uploadResult, easDownloadUrl, isForceUpdate);
      } catch (directError) {
        console.error('❌ 直接上传也失败:', directError.message);
        throw directError;
      }
    }
  } catch (error) {
    console.error('❌ 上传失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { uploadToTCB, uploadDirectly };

