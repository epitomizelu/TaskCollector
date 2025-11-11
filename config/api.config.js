/**
 * 腾讯云云函数 API 配置（Node.js 版本）
 */

require('dotenv').config(); // 支持从 .env 读取环境变量
const __DEV__ = process.env.NODE_ENV !== 'production';

const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api'
    : 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api',

  // ✅ 新增：应用更新服务云函数 URL（独立云函数）
  UPDATE_SERVICE_URL: __DEV__
    ? process.env.UPDATE_SERVICE_URL || 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/app-update-api'
    : process.env.UPDATE_SERVICE_URL || 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/app-update-api',

  API_KEY:
    process.env.EXPO_PUBLIC_API_KEY ||
    process.env.API_KEY ||
    '',
};

/**
 * 获取请求头
 */
function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (API_CONFIG.API_KEY) {
    headers['Authorization'] = `Bearer ${API_CONFIG.API_KEY}`;
  }
  return headers;
}

module.exports = { API_CONFIG, getHeaders };
