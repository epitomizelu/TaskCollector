/**
 * 腾讯云云函数 API 配置
 */

// 云函数环境配置
export const API_CONFIG = {
  // 腾讯云云函数的访问地址
  // 格式: https://<region>.apigw.tencentcs.com/release/<function-name>
  // 或者使用 API 网关地址
  BASE_URL: __DEV__
    ? 'https://your-region.apigw.tencentcs.com/release/task-collection-api' // 开发环境
    : 'https://your-region.apigw.tencentcs.com/release/task-collection-api', // 生产环境
  
  // 请求超时时间（毫秒）
  TIMEOUT: 10000,
  
  // API 版本
  VERSION: 'v1',
};

// API 端点
export const API_ENDPOINTS = {
  // 任务相关
  TASKS: '/tasks',
  TASK_BY_ID: (id: string) => `/tasks/${id}`,
  TASKS_BY_DATE: (date: string) => `/tasks?date=${date}`,
  TASKS_BY_MONTH: (month: string) => `/tasks?month=${month}`,
  
  // 统计相关
  STATS_TODAY: '/stats/today',
  STATS_MONTH: (month: string) => `/stats/month?month=${month}`,
};

// 请求头配置
export const getHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

