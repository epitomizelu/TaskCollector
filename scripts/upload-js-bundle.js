/**
 * 上传 JS Bundle 到腾讯云开发（TCB）存储
 * 使用云函数 API 上传文件
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// 配置信息
const TCB_STORAGE_DOMAIN = '636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la';
const STORAGE_FOLDER = 'js_bundles';
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
 * 上传文件到 TCB 存储（通过云函数）
 */
async function uploadToTCB(filePath, cloudPath) {
  return new Promise((resolve, reject) => {
    try {
      const fileContent = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const fileSize = fileContent.length;
      const fileSizeMB = fileSize / 1024 / 1024;

      console.log(`文件大小: ${fileSizeMB.toFixed(2)} MB`);

      // 将文件内容转换为 Base64
      const fileBase64 = fileContent.toString('base64');

      // 构造上传数据
      const uploadData = {
        fileName: fileName,
        filePath: cloudPath,
        fileContent: fileBase64,
        contentType: 'application/javascript',
      };

      const postData = JSON.stringify(uploadData);
      const url = new URL(`${API_BASE_URL}/storage/upload`);

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 300000, // 5 分钟超时
      };

      console.log('开始上传文件...');
      console.log(`  文件路径: ${filePath}`);
      console.log(`  云端路径: ${cloudPath}`);

      const req = https.request(url, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            
            if (res.statusCode === 200 && result.code === 0) {
              console.log('✅ 文件上传成功！');
              console.log(`  文件 URL: ${result.data.fileUrl}`);
              console.log(`  文件大小: ${(result.data.fileSize / 1024 / 1024).toFixed(2)} MB`);
              resolve(result.data);
            } else {
              reject(new Error(result.message || `HTTP ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`解析响应失败: ${e.message}`));
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
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * 保存版本信息到数据库
 */
async function saveVersionInfo(version, versionCode, bundleUrl, bundlePath, fileSize) {
  try {
    console.log('保存版本信息到数据库...');
    
    const versionInfo = {
      version: version,
      versionCode: versionCode,
      platform: 'android',
      bundleType: 'js', // 标识这是 JS bundle
      downloadUrl: bundleUrl,
      filePath: bundlePath,
      fileSize: fileSize,
      releaseDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const postData = JSON.stringify(versionInfo);
    const url = new URL(`${API_BASE_URL}/app/js-bundle-versions`);

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
      console.log('✅ 版本信息保存成功');
      return true;
    } else {
      throw new Error(response.data.message || `HTTP ${response.statusCode}`);
    }
  } catch (error) {
    console.error('❌ 保存版本信息失败:', error.message);
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
      console.error('❌ 错误: 未设置 API_KEY');
      console.log('请设置环境变量: EXPO_PUBLIC_API_KEY 或 API_KEY');
      process.exit(1);
    }

    // 获取版本信息
    const { version, versionCode } = getVersionInfo();

    // 查找 bundle 文件
    const bundlePath = path.join(__dirname, '..', 'js-bundles', 'index.android.bundle');
    
    if (!fs.existsSync(bundlePath)) {
      console.error('❌ 错误: Bundle 文件不存在');
      console.log(`请先运行构建脚本: node scripts/build-js-bundle.js`);
      process.exit(1);
    }

    // 构造云端路径
    const cloudPath = `${STORAGE_FOLDER}/v${version}/index.android.bundle`;

    console.log('========================================');
    console.log('  上传 JS Bundle');
    console.log('========================================');
    console.log(`版本: ${version} (Build ${versionCode})`);
    console.log(`本地文件: ${bundlePath}`);
    console.log(`云端路径: ${cloudPath}`);
    console.log('');

    // 上传文件
    const uploadResult = await uploadToTCB(bundlePath, cloudPath);

    // 保存版本信息
    await saveVersionInfo(
      version,
      versionCode,
      uploadResult.fileUrl,
      cloudPath,
      uploadResult.fileSize
    );

    console.log('');
    console.log('========================================');
    console.log('  上传完成');
    console.log('========================================');
    console.log(`版本: ${version} (Build ${versionCode})`);
    console.log(`Bundle URL: ${uploadResult.fileUrl}`);
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { uploadToTCB, saveVersionInfo, getVersionInfo };

