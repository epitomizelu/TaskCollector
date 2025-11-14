/**
 * 保存 Codemagic 构建的 APK 版本信息到数据库
 * 使用方法: node scripts/save-codemagic-apk-version.js <download-url> [apk-path]
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 从环境变量或命令行参数获取配置
const API_BASE_URL = process.env.API_BASE_URL || 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/app-update-api';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

// 获取版本信息
function getVersionInfo() {
  const appJson = require('../app.json');
  return {
    version: appJson.expo.version,
    versionCode: appJson.expo.android.versionCode,
  };
}

// 获取 APK 文件大小
function getApkFileSize(apkPath) {
  if (apkPath && fs.existsSync(apkPath)) {
    const stats = fs.statSync(apkPath);
    return stats.size;
  }
  return 0;
}

/**
 * 保存版本信息到数据库（通过云函数 API）
 */
async function saveVersionInfo(version, versionCode, downloadUrl, easDownloadUrl = null, apkPath = null) {
  try {
    console.log('保存版本信息到数据库...');
    console.log(`  版本: ${version} (Build ${versionCode})`);
    console.log(`  下载地址: ${downloadUrl || '未提供'}`);
    if (easDownloadUrl) {
      console.log(`  EAS 下载地址: ${easDownloadUrl}`);
    }
    
    // 获取文件大小（如果提供了 APK 路径）
    const fileSize = apkPath ? getApkFileSize(apkPath) : 0;
    if (fileSize > 0) {
      console.log(`  文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // 构造版本信息
    const versionInfo = {
      version: version,
      versionCode: versionCode,
      platform: 'android',
      // EAS Build 下载地址（主要下载源，如果提供）
      easDownloadUrl: easDownloadUrl || downloadUrl,
      // 腾讯云存储下载地址（如果提供了 downloadUrl 且不是 EAS URL）
      downloadUrl: easDownloadUrl ? downloadUrl : (downloadUrl || null),
      filePath: null,
      fileSize: fileSize,
      forceUpdate: false,
      updateLog: 'Codemagic 自动构建版本',
      releaseDate: new Date().toISOString(),
    };
    
    // 调用云函数 API 保存版本信息（强制更新接口）
    try {
      const url = new URL(API_BASE_URL + '/app/force-update');
      const postData = JSON.stringify(versionInfo);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'Authorization': `Bearer ${API_KEY}`,
        },
      };
      
      return new Promise((resolve, reject) => {
        const protocol = url.protocol === 'https:' ? https : http;
        const req = protocol.request(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            try {
              const result = JSON.parse(data);
              if (result.code === 0) {
                console.log('✅ 版本信息已成功保存到数据库');
                console.log(`   版本ID: ${result.data._id || 'N/A'}`);
                resolve(result);
              } else {
                reject(new Error(`保存失败: ${result.message || '未知错误'}`));
              }
            } catch (parseError) {
              reject(new Error(`解析响应失败: ${parseError.message}`));
            }
          });
        });
        
        req.on('error', (error) => {
          reject(new Error(`请求失败: ${error.message}`));
        });
        
        req.write(postData);
        req.end();
      });
    } catch (error) {
      console.error('❌ 保存版本信息失败:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ 保存版本信息失败:', error);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 检查 API Key
    if (!API_KEY) {
      console.error('❌ 错误: EXPO_PUBLIC_API_KEY 环境变量未设置');
      console.error('   请设置环境变量: export EXPO_PUBLIC_API_KEY=your_api_key');
      process.exit(1);
    }
    
    // 获取命令行参数
    const downloadUrl = process.argv[2];
    const easDownloadUrl = process.argv[3] || null;
    const apkPath = process.argv[4] || null;
    
    if (!downloadUrl) {
      console.error('❌ 错误: 未提供下载 URL');
      console.error('   使用方法: node scripts/save-codemagic-apk-version.js <download-url> [eas-download-url] [apk-path]');
      console.error('   示例: node scripts/save-codemagic-apk-version.js https://codemagic.io/artifacts/app.apk');
      process.exit(1);
    }
    
    // 获取版本信息
    const { version, versionCode } = getVersionInfo();
    
    // 保存版本信息
    await saveVersionInfo(version, versionCode, downloadUrl, easDownloadUrl, apkPath);
    
    console.log('');
    console.log('==========================================');
    console.log('  ✅ APK 版本信息保存完成');
    console.log('==========================================');
  } catch (error) {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}

module.exports = { saveVersionInfo, getVersionInfo };

