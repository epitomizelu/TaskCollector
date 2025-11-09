/**
 * 腾讯云云函数 API 配置
 */

import Constants from 'expo-constants';

// 云函数环境配置
export const API_CONFIG = {
  // 腾讯云云函数的访问地址
  // 格式: https://<region>.apigw.tencentcs.com/release/<function-name>
  // 或者使用 API 网关地址
  BASE_URL: __DEV__
    ? 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api' // 开发环境
    : 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api', // 生产环境（使用相同的云函数地址）
  
  // 想法收集器云函数地址（独立云函数）
  IDEA_COLLECTOR_BASE_URL: __DEV__
    ? 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/idea-collector-api' // 开发环境
    : 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/idea-collector-api', // 生产环境
  
  // 请求超时时间（毫秒）
  TIMEOUT: 10000,
  
  // API 版本
  VERSION: 'v1',
  
  // API Key 配置（用于 Bearer Token 认证）
  // 优先级：1. process.env.EXPO_PUBLIC_API_KEY (运行时环境变量)
  //         2. Constants.expoConfig.extra.apiKey (构建时注入的配置)
  //         3. 空字符串
  // 格式: Authorization: Bearer YOUR_API_KEY
  API_KEY: (() => {
    // 首先尝试从运行时环境变量读取
    const envApiKey = process.env.EXPO_PUBLIC_API_KEY;
    if (envApiKey && envApiKey !== '${EXPO_PUBLIC_API_KEY}' && envApiKey.trim() !== '') {
      return envApiKey;
    }
    
    // 如果环境变量不存在或未正确设置，尝试从 app.json 的 extra 字段读取
    const extraApiKey = Constants.expoConfig?.extra?.apiKey;
    if (extraApiKey && typeof extraApiKey === 'string' && extraApiKey.trim() !== '') {
      return extraApiKey;
    }
    
    // 如果都不可用，返回空字符串
    return '';
  })(),
};

// 调试：检查 API Key 是否正确读取（始终输出，包括生产环境）
console.log('[API_CONFIG] 环境变量检查:', {
  hasApiKey: !!API_CONFIG.API_KEY,
  apiKeyLength: API_CONFIG.API_KEY.length,
  apiKeyPrefix: API_CONFIG.API_KEY ? API_CONFIG.API_KEY.substring(0, 8) + '...' : '空',
  apiKeySuffix: API_CONFIG.API_KEY ? '...' + API_CONFIG.API_KEY.substring(API_CONFIG.API_KEY.length - 4) : '空',
  allEnvKeys: Object.keys(process.env).filter(key => key.includes('API') || key.includes('KEY')),
  isDev: __DEV__,
});

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
  
  // 任务清单相关
  TASK_LIST_PRESET: '/task-list/preset',
  TASK_LIST_PRESET_BY_ID: (id: string) => `/task-list/preset/${id}`,
  TASK_LIST_DAILY: '/task-list/daily',
  TASK_LIST_DAILY_BY_ID: (id: string) => `/task-list/daily/${id}`,
  TASK_LIST_DAILY_BY_DATE: (date: string) => `/task-list/daily?date=${date}`,
  
  // 应用更新相关
  APP_CHECK_UPDATE: (currentVersion: string, versionCode: number, platform: string = 'android') => 
    `/app/check-update?currentVersion=${currentVersion}&versionCode=${versionCode}&platform=${platform}`,
  
  // 站内信相关
  MESSAGES: '/messages',
  MESSAGE_BY_ID: (id: string) => `/messages/${id}`,
  MESSAGE_MARK_READ: (id: string) => `/messages/${id}/read`,
  MESSAGE_READ_ALL: '/messages/read-all',
  
  // 音频处理相关
  AUDIO_UPLOAD: '/reciting/audio/upload',
  AUDIO_STATUS: (contentId: string) => `/reciting/audio/status/${contentId}`,
  AUDIO_PROCESS: '/reciting/audio/process',
  
  // 想法收集器相关
  IDEAS: '/ideas',
  IDEA_BY_ID: (id: string) => `/ideas/${id}`,
  IDEAS_BY_DATE: (date: string) => `/ideas?date=${date}`,
  IDEAS_BY_MONTH: (month: string) => `/ideas?month=${month}`,
  IDEA_ANALYZE: '/ideas/analyze',
};

// 请求头配置
export const getHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // 优先使用环境变量中的 API_KEY（用于云函数认证）
  // 只有在没有配置 API_KEY 时，才使用传入的 token（用于向后兼容）
  // 注意：API_KEY 应该始终从环境变量读取，不应该被 JWT Token 覆盖
  const apiKey = API_CONFIG.API_KEY || token;
  
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  return headers;
};

