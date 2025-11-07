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
      const fileBase64 = fileContent.toString('base64');
      const fileName = path.basename(filePath);
      const fileSize = fileContent.length;

      console.log(`文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

      // 通过云函数上传（需要云函数支持文件上传接口）
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
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 300000, // 5 分钟超时（大文件需要更长时间）
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
    } catch (error) {
      reject(error);
    }
  });
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
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const apkPath = args[0];

  if (!apkPath) {
    console.error('错误: 请提供 APK 文件路径');
    console.log('用法: node upload-apk-to-tcb.js <apk-file-path>');
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

    // 尝试通过云函数上传（推荐）
    try {
      const result = await uploadToTCB(apkPath, cloudPath);
      console.log('✅ 上传成功！');
      console.log(`文件 URL: ${result.fileUrl || `https://${TCB_STORAGE_DOMAIN}/${cloudPath}`}`);
    } catch (error) {
      console.warn('通过云函数上传失败，尝试直接上传...');
      console.warn(`错误: ${error.message}`);
      
      // 如果云函数上传失败，尝试直接上传
      try {
        const result = await uploadDirectly(apkPath, cloudPath);
        console.log('✅ 直接上传成功！');
        console.log(`文件 URL: ${result.fileUrl}`);
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

