/**
 * 云函数：上传文件到 TCB 存储
 * 这个函数可以添加到主云函数中，或者作为独立的云函数
 */

const cloudbase = require('@cloudbase/node-sdk');

// 初始化云开发环境
const app = cloudbase.init({
  env: process.env.TCB_ENV || 'your-env-id',
});

/**
 * 上传文件到 TCB 存储
 */
async function uploadFileToStorage(fileName, filePath, fileContent, contentType) {
  try {
    const storage = app.storage();
    
    // fileContent 是 Base64 编码的字符串
    const fileBuffer = Buffer.from(fileContent, 'base64');
    
    // 上传文件
    const result = await storage.uploadFile({
      cloudPath: filePath,
      fileContent: fileBuffer,
    });

    // 获取文件访问 URL
    const fileUrl = await storage.getTempFileURL({
      fileList: [filePath],
    });

    return {
      fileId: result.fileID,
      filePath: filePath,
      fileUrl: fileUrl.fileList[0]?.tempFileURL || `https://${process.env.TCB_STORAGE_DOMAIN || '636c-cloud1-4gee45pq61cd6f19-1259499058.tcb.qcloud.la'}/${filePath}`,
    };
  } catch (error) {
    console.error('上传文件到存储失败:', error);
    throw error;
  }
}

/**
 * 处理文件上传请求
 */
async function handleStorageUpload(body, headers) {
  const { fileName, filePath, fileContent, contentType } = body;

  if (!fileName || !filePath || !fileContent) {
    throw new Error('缺少必要参数: fileName, filePath, fileContent');
  }

  const result = await uploadFileToStorage(
    fileName,
    filePath,
    fileContent,
    contentType || 'application/octet-stream'
  );

  return {
    code: 0,
    message: '上传成功',
    data: result,
  };
}

module.exports = {
  uploadFileToStorage,
  handleStorageUpload,
};

