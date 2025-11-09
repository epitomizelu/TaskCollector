/**
 * 保存 OTA 更新版本信息到数据库
 * 用于记录 OTA 更新的版本号，不包含 APK 文件信息
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
 * 保存 OTA 更新版本信息到数据库（通过云函数 API）
 */
async function saveOtaVersionInfo(version, versionCode, updateType = 'ota', updateMessage = '') {
  try {
    console.log('保存 OTA 更新版本信息到数据库...');
    console.log(`  版本: ${version} (Build ${versionCode})`);
    console.log(`  更新类型: ${updateType}`);
    if (updateMessage) {
      console.log(`  更新说明: ${updateMessage}`);
    }
    
    // 构造版本信息（OTA 更新不包含 APK 文件信息）
    const versionInfo = {
      version: version,
      versionCode: versionCode,
      platform: 'android',
      updateType: updateType, // 'ota' 或 'apk'
      updateMessage: updateMessage,
      // OTA 更新不包含下载地址
      easDownloadUrl: null,
      downloadUrl: null,
      filePath: null,
      fileSize: 0,
      releaseDate: new Date().toISOString(),
      // 分片下载相关（OTA 更新不需要）
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
        console.log('✅ OTA 更新版本信息保存成功');
        console.log(`   版本: v${version} (Build ${versionCode})`);
        return true;
      } else {
        throw new Error(response.data.message || `HTTP ${response.statusCode}`);
      }
    } catch (apiError) {
      console.error('❌ 保存 OTA 更新版本信息失败:', apiError.message);
      throw apiError;
    }
  } catch (error) {
    console.error('❌ 保存 OTA 更新版本信息失败:', error);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    // 从命令行参数获取更新说明（可选）
    const updateMessage = process.argv[2] || '';
    
    // 获取版本信息
    const { version, versionCode } = getVersionInfo();
    
    // 保存版本信息
    await saveOtaVersionInfo(version, versionCode, 'ota', updateMessage);
    
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

module.exports = { saveOtaVersionInfo, getVersionInfo };

