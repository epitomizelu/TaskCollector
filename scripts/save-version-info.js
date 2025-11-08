/**
 * 保存版本信息到数据库（仅保存 EAS 下载 URL）
 * 在从 EAS 下载 APK 后立即调用，即使后续上传失败也能从 EAS 下载
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 配置信息
const API_BASE_URL = process.env.API_BASE_URL || 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api';
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
 * 获取 APK 文件大小
 */
function getApkFileSize(apkPath) {
  try {
    if (fs.existsSync(apkPath)) {
      const stats = fs.statSync(apkPath);
      return stats.size;
    }
  } catch (error) {
    console.warn('无法获取 APK 文件大小:', error.message);
  }
  return 0;
}

/**
 * 保存版本信息到数据库（通过云函数 API）
 */
async function saveVersionInfo(version, versionCode, easDownloadUrl, apkPath = null) {
  try {
    console.log('保存版本信息到数据库（仅 EAS URL）...');
    console.log(`  版本: ${version} (Build ${versionCode})`);
    console.log(`  EAS 下载地址: ${easDownloadUrl}`);
    
    // 获取文件大小（如果提供了 APK 路径）
    const fileSize = apkPath ? getApkFileSize(apkPath) : 0;
    
    // 构造版本信息（仅包含 EAS URL）
    const versionInfo = {
      version: version,
      versionCode: versionCode,
      platform: 'android',
      // EAS Build 下载地址（主要下载源）
      easDownloadUrl: easDownloadUrl,
      // 腾讯云存储下载地址（暂时为空，上传成功后会更新）
      downloadUrl: null,
      filePath: null,
      fileSize: fileSize,
      releaseDate: new Date().toISOString(),
      // 分片下载相关（暂时为空）
      uploadId: null,
      totalChunks: null,
      useChunkedDownload: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // 调用云函数 API 保存版本信息
    try {
      const postData = JSON.stringify(versionInfo);
      const url = new URL(`${API_BASE_URL}/app/versions`);
      
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
        console.log('✅ 版本信息保存成功（EAS URL）');
        console.log(`   EAS 下载地址: ${easDownloadUrl}`);
        if (fileSize > 0) {
          console.log(`   文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
        }
        return true;
      } else {
        throw new Error(response.data.message || `HTTP ${response.statusCode}`);
      }
    } catch (apiError) {
      console.error('❌ 保存版本信息失败:', apiError.message);
      throw apiError;
    }
  } catch (error) {
    console.error('❌ 保存版本信息失败:', error);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    // 从命令行参数获取 EAS 下载 URL
    const easDownloadUrl = process.argv[2];
    const apkPath = process.argv[3] || null;
    
    if (!easDownloadUrl) {
      console.error('❌ 错误: 请提供 EAS 下载 URL');
      console.log('使用方法: node scripts/save-version-info.js <EAS_DOWNLOAD_URL> [APK_PATH]');
      process.exit(1);
    }
    
    // 获取版本信息
    const { version, versionCode } = getVersionInfo();
    
    // 保存版本信息
    await saveVersionInfo(version, versionCode, easDownloadUrl, apkPath);
    
    console.log('✅ 完成');
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { saveVersionInfo, getVersionInfo };

