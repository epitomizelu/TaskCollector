/**
 * API 服务层 - 处理与腾讯云云函数的通信
 */

import { API_CONFIG, API_ENDPOINTS, getHeaders } from '../config/api.config';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface TaskData {
  taskId: string;
  rawText: string;
  taskName: string;
  completionTime: string;
  quantity: { [key: string]: number };
  recordDate: string;
  recordMonth: string;
  recordYear: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

class ApiService {
  private baseUrl: string;
  private token?: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  /**
   * 设置认证 Token
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * 清除 Token
   */
  clearToken() {
    this.token = undefined;
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    customBaseUrl?: string
  ): Promise<ApiResponse<T>> {
    const baseUrl = customBaseUrl || this.baseUrl;
    const url = `${baseUrl}${endpoint}`;
    const isLoginRequest = endpoint.includes('/auth/login');
    
    const addRequestLog = (message: string) => {
      if (isLoginRequest) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[ApiService.request ${timestamp}] ${message}`);
      }
    };
    
    if (isLoginRequest) {
      addRequestLog(`=== 开始HTTP请求 ===`);
      addRequestLog(`URL: ${url}`);
      addRequestLog(`Method: ${options.method || 'GET'}`);
      addRequestLog(`BaseURL: ${this.baseUrl}`);
      addRequestLog(`Endpoint: ${endpoint}`);
      addRequestLog(`API_KEY配置: ${API_CONFIG.API_KEY ? '已配置' : '未配置'}`);
      if (API_CONFIG.API_KEY) {
        addRequestLog(`API_KEY前缀: ${API_CONFIG.API_KEY.substring(0, 8)}...`);
      }
      addRequestLog(`Token: ${this.token ? '已设置' : '未设置'}`);
    }
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...getHeaders(this.token),
        ...options.headers,
      },
    };

    if (isLoginRequest) {
      addRequestLog(`请求头: ${JSON.stringify(Object.keys(config.headers || {}))}`);
      if (config.body) {
        try {
          const bodyStr = typeof config.body === 'string' ? config.body : JSON.stringify(config.body);
          addRequestLog(`请求体: ${bodyStr.substring(0, 200)}`);
        } catch (e) {
          addRequestLog(`请求体: [无法序列化]`);
        }
      }
    }

    // 创建 AbortController 用于超时控制（兼容 React Native）
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const requestStartTime = Date.now();

    try {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, API_CONFIG.TIMEOUT);

      if (isLoginRequest) {
        addRequestLog(`发送fetch请求 (超时: ${API_CONFIG.TIMEOUT}ms)`);
      }

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      const requestDuration = Date.now() - requestStartTime;

      // 清除超时定时器
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (isLoginRequest) {
        addRequestLog(`收到响应 (耗时: ${requestDuration}ms)`);
        addRequestLog(`状态码: ${response.status} ${response.statusText}`);
        addRequestLog(`响应头: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
      }

      if (!response.ok) {
        // 尝试读取错误响应体
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorData: any = null;
        try {
          errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          if (isLoginRequest) {
            addRequestLog(`错误响应体: ${JSON.stringify(errorData)}`);
          }
        } catch {
          // 如果无法解析 JSON，尝试读取文本
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
              if (isLoginRequest) {
                addRequestLog(`错误响应文本: ${errorText.substring(0, 200)}`);
              }
            }
          } catch {
            // 忽略文本读取错误
          }
        }
        
        const error = new Error(errorMessage) as any;
        error.status = response.status;
        error.statusText = response.statusText;
        error.response = errorData;
        if (isLoginRequest) {
          addRequestLog(`抛出错误: ${errorMessage}`);
        }
        throw error;
      }

      const data = await response.json();
      if (isLoginRequest) {
        addRequestLog(`响应数据解析成功`);
        addRequestLog(`响应code: ${data.code || 'N/A'}`);
        addRequestLog(`响应message: ${data.message || 'N/A'}`);
        addRequestLog(`响应data: ${data.data ? '存在' : '不存在'}`);
      }
      return data;
    } catch (error: any) {
      const requestDuration = Date.now() - requestStartTime;
      
      // 清除超时定时器（如果请求失败）
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // 检查是否是超时错误
      if (error.name === 'AbortError' || error.message?.includes('aborted')) {
        if (isLoginRequest) {
          addRequestLog(`请求超时 (耗时: ${requestDuration}ms, 超时限制: ${API_CONFIG.TIMEOUT}ms)`);
        }
        const timeoutError = new Error('请求超时，请检查网络连接') as any;
        timeoutError.status = 408;
        timeoutError.statusText = 'Request Timeout';
        throw timeoutError;
      }

      // 检查是否是网络连接错误
      const isNetworkError = 
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.name === 'TypeError' ||
        !error.status;

      if (isNetworkError) {
        const networkError = new Error(
          `网络请求失败: ${error.message || '无法连接到服务器'}\n\n` +
          `可能的原因：\n` +
          `1. 网络连接不可用\n` +
          `2. 服务器地址配置错误\n` +
          `3. API Key 未正确配置\n` +
          `4. 防火墙或代理阻止了请求\n\n` +
          `服务器地址: ${this.baseUrl}\n` +
          `API Key: ${API_CONFIG.API_KEY ? '已配置' : '未配置'}`
        ) as any;
        networkError.status = 0;
        networkError.statusText = 'Network Error';
        networkError.originalError = error;
        
        if (isLoginRequest) {
          addRequestLog(`网络错误: ${error.message || 'N/A'}`);
          addRequestLog(`BASE_URL: ${this.baseUrl}`);
          addRequestLog(`API_KEY: ${API_CONFIG.API_KEY ? '已配置' : '未配置'}`);
        }
        
        throw networkError;
      }

      if (isLoginRequest) {
        addRequestLog(`请求失败 (耗时: ${requestDuration}ms)`);
        addRequestLog(`错误名称: ${error.name || 'N/A'}`);
        addRequestLog(`错误消息: ${error.message || 'N/A'}`);
        addRequestLog(`HTTP状态: ${error.status || 'N/A'}`);
        addRequestLog(`错误堆栈: ${error.stack?.substring(0, 300) || 'N/A'}`);
      }

      console.error('API Request Error:', {
        url,
        method: options.method || 'GET',
        status: error.status,
        message: error.message,
        hasApiKey: !!API_CONFIG.API_KEY,
        apiKeyPrefix: API_CONFIG.API_KEY ? API_CONFIG.API_KEY.substring(0, 8) + '...' : '未配置',
        baseUrl: this.baseUrl,
      });
      throw error;
    }
  }

  /**
   * GET 请求
   */
  private async get<T>(endpoint: string, customBaseUrl?: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
    }, customBaseUrl);
  }

  /**
   * POST 请求
   */
  private async post<T>(endpoint: string, body?: any, customBaseUrl?: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }, customBaseUrl);
  }

  /**
   * PUT 请求
   */
  private async put<T>(endpoint: string, body?: any, customBaseUrl?: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    }, customBaseUrl);
  }

  /**
   * DELETE 请求
   */
  private async delete<T>(endpoint: string, customBaseUrl?: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    }, customBaseUrl);
  }

  // ========== 任务相关 API ==========

  /**
   * 获取所有任务
   */
  async getAllTasks(): Promise<TaskData[]> {
    const response = await this.get<TaskData[]>(API_ENDPOINTS.TASKS);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '获取任务列表失败');
  }

  /**
   * 根据日期获取任务
   */
  async getTasksByDate(date: string): Promise<TaskData[]> {
    const response = await this.get<TaskData[]>(API_ENDPOINTS.TASKS_BY_DATE(date));
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '获取任务列表失败');
  }

  /**
   * 根据月份获取任务
   */
  async getTasksByMonth(month: string): Promise<TaskData[]> {
    const response = await this.get<TaskData[]>(API_ENDPOINTS.TASKS_BY_MONTH(month));
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '获取任务列表失败');
  }

  /**
   * 根据 ID 获取任务
   */
  async getTaskById(taskId: string): Promise<TaskData> {
    const response = await this.get<TaskData>(API_ENDPOINTS.TASK_BY_ID(taskId));
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '获取任务详情失败');
  }

  /**
   * 创建任务
   */
  async createTask(task: Omit<TaskData, 'taskId' | 'createdAt' | 'updatedAt'>): Promise<TaskData> {
    const response = await this.post<TaskData>(API_ENDPOINTS.TASKS, task);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '创建任务失败');
  }

  /**
   * 更新任务
   */
  async updateTask(taskId: string, task: Partial<TaskData>): Promise<TaskData> {
    const response = await this.put<TaskData>(API_ENDPOINTS.TASK_BY_ID(taskId), task);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '更新任务失败');
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<void> {
    const response = await this.delete<void>(API_ENDPOINTS.TASK_BY_ID(taskId));
    if (response.code !== 0) {
      throw new Error(response.message || '删除任务失败');
    }
  }

  /**
   * 批量删除任务（根据日期）
   */
  async deleteTasksByDate(date: string): Promise<void> {
    const response = await this.delete<void>(`${API_ENDPOINTS.TASKS}?date=${date}`);
    if (response.code !== 0) {
      throw new Error(response.message || '删除任务失败');
    }
  }

  /**
   * 删除所有任务
   */
  async deleteAllTasks(): Promise<void> {
    const response = await this.delete<void>(API_ENDPOINTS.TASKS);
    if (response.code !== 0) {
      throw new Error(response.message || '删除所有任务失败');
    }
  }

  // ========== 统计相关 API ==========

  /**
   * 获取今日统计
   */
  async getTodayStats(): Promise<{
    totalTasks: number;
    completedTasks: number;
    completionRate: string;
  }> {
    const response = await this.get<{
      totalTasks: number;
      completedTasks: number;
      completionRate: string;
    }>(API_ENDPOINTS.STATS_TODAY);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '获取今日统计失败');
  }

  /**
   * 获取月度统计
   */
  async getMonthStats(month: string): Promise<{
    totalTasks: number;
    completedDays: number;
    averageTasksPerDay: number;
  }> {
    const response = await this.get<{
      totalTasks: number;
      completedDays: number;
      averageTasksPerDay: number;
    }>(API_ENDPOINTS.STATS_MONTH(month));
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '获取月度统计失败');
  }

  // ========== 我爱背书模块 API ==========

  /**
   * 获取所有计划
   */
  async getRecitingPlans(): Promise<any[]> {
    const response = await this.get<any[]>('/reciting/plans');
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '获取计划列表失败');
  }

  /**
   * 创建计划
   */
  async createRecitingPlan(plan: any): Promise<any> {
    const response = await this.post<any>('/reciting/plans', plan);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '创建计划失败');
  }

  /**
   * 更新计划
   */
  async updateRecitingPlan(planId: string, plan: any): Promise<any> {
    const response = await this.put<any>(`/reciting/plans/${planId}`, plan);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '更新计划失败');
  }

  /**
   * 删除计划
   */
  async deleteRecitingPlan(planId: string): Promise<void> {
    const response = await this.delete<void>(`/reciting/plans/${planId}`);
    if (response.code !== 0) {
      throw new Error(response.message || '删除计划失败');
    }
  }

  /**
   * 获取所有任务
   */
  async getRecitingTasks(date?: string): Promise<any[]> {
    const endpoint = date ? `/reciting/tasks?date=${date}` : '/reciting/tasks';
    const response = await this.get<any[]>(endpoint);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '获取任务列表失败');
  }

  /**
   * 创建任务
   */
  async createRecitingTask(task: any): Promise<any> {
    const response = await this.post<any>('/reciting/tasks', task);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '创建任务失败');
  }

  /**
   * 更新任务
   */
  async updateRecitingTask(taskId: string, task: any): Promise<any> {
    const response = await this.put<any>(`/reciting/tasks/${taskId}`, task);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '更新任务失败');
  }

  /**
   * 删除任务
   */
  async deleteRecitingTask(taskId: string): Promise<void> {
    const response = await this.delete<void>(`/reciting/tasks/${taskId}`);
    if (response.code !== 0) {
      throw new Error(response.message || '删除任务失败');
    }
  }

  /**
   * 获取所有内容
   */
  async getRecitingContents(type?: 'audio' | 'document'): Promise<any[]> {
    const endpoint = type ? `/reciting/contents?type=${type}` : '/reciting/contents';
    const response = await this.get<any[]>(endpoint);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '获取内容列表失败');
  }

  /**
   * 创建内容
   */
  async createRecitingContent(content: any): Promise<any> {
    const response = await this.post<any>('/reciting/contents', content);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '创建内容失败');
  }

  /**
   * 删除内容
   */
  async deleteRecitingContent(contentId: string): Promise<void> {
    const response = await this.delete<void>(`/reciting/contents/${contentId}`);
    if (response.code !== 0) {
      throw new Error(response.message || '删除内容失败');
    }
  }

  // ========== 任务清单相关 API ==========

  /**
   * 获取所有预设任务
   */
  async getTaskListPresets(): Promise<any[]> {
    const response = await this.get<any[]>(API_ENDPOINTS.TASK_LIST_PRESET);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '获取预设任务列表失败');
  }

  /**
   * 创建预设任务
   */
  async createTaskListPreset(preset: any): Promise<any> {
    const response = await this.post<any>(API_ENDPOINTS.TASK_LIST_PRESET, preset);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '创建预设任务失败');
  }

  /**
   * 更新预设任务
   */
  async updateTaskListPreset(presetId: string, preset: any): Promise<any> {
    const response = await this.put<any>(API_ENDPOINTS.TASK_LIST_PRESET_BY_ID(presetId), preset);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '更新预设任务失败');
  }

  /**
   * 删除预设任务
   */
  async deleteTaskListPreset(presetId: string): Promise<void> {
    const response = await this.delete<void>(API_ENDPOINTS.TASK_LIST_PRESET_BY_ID(presetId));
    if (response.code !== 0) {
      throw new Error(response.message || '删除预设任务失败');
    }
  }

  /**
   * 获取每日任务（可按日期筛选）
   */
  async getTaskListDailyTasks(date?: string): Promise<any[]> {
    const endpoint = date 
      ? API_ENDPOINTS.TASK_LIST_DAILY_BY_DATE(date)
      : API_ENDPOINTS.TASK_LIST_DAILY;
    const response = await this.get<any[]>(endpoint);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '获取每日任务列表失败');
  }

  /**
   * 创建每日任务
   */
  async createTaskListDailyTask(dailyTask: any): Promise<any> {
    const response = await this.post<any>(API_ENDPOINTS.TASK_LIST_DAILY, dailyTask);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '创建每日任务失败');
  }

  /**
   * 更新每日任务
   */
  async updateTaskListDailyTask(dailyTaskId: string, dailyTask: any): Promise<any> {
    const response = await this.put<any>(API_ENDPOINTS.TASK_LIST_DAILY_BY_ID(dailyTaskId), dailyTask);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '更新每日任务失败');
  }

  /**
   * 删除每日任务
   */
  async deleteTaskListDailyTask(dailyTaskId: string): Promise<void> {
    const response = await this.delete<void>(API_ENDPOINTS.TASK_LIST_DAILY_BY_ID(dailyTaskId));
    if (response.code !== 0) {
      throw new Error(response.message || '删除每日任务失败');
    }
  }

  // ========== 用户认证相关 API ==========

  /**
   * 用户注册
   */
  async register(data: {
    phone: string;
    nickname: string;
    [key: string]: any;
  }): Promise<{
    token: string;
    userInfo: any;
    expiresIn: number;
  }> {
    const response = await this.post<{
      token: string;
      userInfo: any;
      expiresIn: number;
    }>('/auth/register', data);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '注册失败');
  }

  /**
   * 用户登录
   */
  async login(phone: string): Promise<{
    token: string;
    userInfo: any;
    expiresIn: number;
  }> {
    const logs: string[] = [];
    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      const logMessage = `[ApiService ${timestamp}] ${message}`;
      logs.push(logMessage);
      console.log(logMessage);
    };

    try {
      addLog(`开始登录API调用，手机号: ${phone}`);
      addLog(`API配置: BASE_URL=${API_CONFIG.BASE_URL}, API_KEY=${API_CONFIG.API_KEY ? '已配置' : '未配置'}`);
      if (API_CONFIG.API_KEY) {
        addLog(`API_KEY长度: ${API_CONFIG.API_KEY.length}, 前缀: ${API_CONFIG.API_KEY.substring(0, 8)}...`);
      } else {
        addLog(`⚠️ 警告: API_KEY 未配置！请检查环境变量 EXPO_PUBLIC_API_KEY`);
        addLog(`环境变量检查: process.env.EXPO_PUBLIC_API_KEY=${process.env.EXPO_PUBLIC_API_KEY ? '存在' : '不存在'}`);
      }
      
      const startTime = Date.now();
      const response = await this.post<{
        token: string;
        userInfo: any;
        expiresIn: number;
      }>('/auth/login', { phone });
      const duration = Date.now() - startTime;
      
      addLog(`API请求完成 (耗时: ${duration}ms)`);
      addLog(`响应状态: code=${response.code}, message=${response.message || 'N/A'}`);
      addLog(`响应数据: ${response.data ? '存在' : '不存在'}`);
      
      if (response.code === 0) {
        if (response.data) {
          addLog(`登录成功: token=${response.data.token ? '存在' : '不存在'}, userInfo=${response.data.userInfo ? '存在' : '不存在'}`);
          if (response.data.userInfo) {
            addLog(`用户详情: userId=${response.data.userInfo.userId || 'N/A'}, phone=${response.data.userInfo.phone || 'N/A'}, nickname=${response.data.userInfo.nickname || 'N/A'}`);
          }
        }
        return response.data;
      }
      
      const errorMsg = response.message || '登录失败';
      addLog(`登录失败: ${errorMsg}`);
      throw new Error(errorMsg);
    } catch (error: any) {
      const errorMsg = `ApiService.login 失败: ${error?.message || '未知错误'}`;
      addLog(errorMsg);
      addLog(`错误类型: ${error?.constructor?.name || 'Unknown'}`);
      if (error?.response) {
        addLog(`HTTP响应: status=${error.response.status || 'N/A'}, statusText=${error.response.statusText || 'N/A'}`);
      }
      if (error?.request) {
        addLog(`请求对象: ${error.request ? '存在' : '不存在'}`);
      }
      console.error('ApiService.login 错误:', error);
      console.error('ApiService 日志:', logs.join('\n'));
      throw error;
    }
  }

  /**
   * 获取用户信息
   */
  async getUserInfo(): Promise<any> {
    const response = await this.get<any>('/auth/user-info');
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '获取用户信息失败');
  }

  // ========== 应用更新 API ==========

  /**
   * 检查应用更新
   */
  async checkAppUpdate(currentVersion: string, versionCode: number, platform: string = 'android'): Promise<{
    hasUpdate: boolean;
    latestVersion: string;
    latestVersionCode: number;
    downloadUrl: string;
    easDownloadUrl?: string;
    forceUpdate: boolean;
    updateLog: string;
    fileSize: number;
    releaseDate: string;
    // 分片下载相关字段
    uploadId?: string;
    totalChunks?: number;
    chunkUrls?: string[];
    filePath?: string;
    useChunkedDownload?: boolean;
  }> {
    const response = await this.get<{
      hasUpdate: boolean;
      latestVersion: string;
      latestVersionCode: number;
      downloadUrl: string;
      easDownloadUrl?: string;
      forceUpdate: boolean;
      updateLog: string;
      fileSize: number;
      releaseDate: string;
      uploadId?: string;
      totalChunks?: number;
      chunkUrls?: string[];
      filePath?: string;
      useChunkedDownload?: boolean;
    }>(API_ENDPOINTS.APP_CHECK_UPDATE(currentVersion, versionCode, platform));
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '检查更新失败');
  }

  /**
   * 获取分片 URL 列表（用于分片下载）
   */
  async getChunkUrls(uploadId: string, totalChunks: number, filePath: string): Promise<{
    uploadId: string;
    totalChunks: number;
    chunkUrls: string[];
    targetFilePath: string;
  }> {
    const response = await this.post<{
      uploadId: string;
      totalChunks: number;
      chunkUrls: string[];
      targetFilePath: string;
    }>('/storage/complete-chunk', {
      u: uploadId,
      t: totalChunks,
      p: filePath,
    });
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '获取分片 URL 失败');
  }

  // ========== 站内信相关 API ==========

  /**
   * 获取所有消息
   */
  async getMessages(): Promise<any[]> {
    const response = await this.get<any[]>('/messages');
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '获取消息列表失败');
  }

  /**
   * 标记消息为已读
   */
  async markMessageAsRead(messageId: string): Promise<void> {
    const response = await this.put<void>(`/messages/${messageId}/read`, {});
    if (response.code !== 0) {
      throw new Error(response.message || '标记消息已读失败');
    }
  }

  /**
   * 标记所有消息为已读
   */
  async markAllMessagesAsRead(): Promise<void> {
    const response = await this.put<void>('/messages/read-all', {});
    if (response.code !== 0) {
      throw new Error(response.message || '标记所有消息已读失败');
    }
  }

  /**
   * 删除消息
   */
  async deleteMessage(messageId: string): Promise<void> {
    const response = await this.delete<void>(`/messages/${messageId}`);
    if (response.code !== 0) {
      throw new Error(response.message || '删除消息失败');
    }
  }

  // ========== 音频处理相关 API ==========

  /**
   * 上传音频文件（分片上传）
   */
  async uploadAudioFile(
    fileUri: string,
    fileName: string,
    onProgress?: (progress: number) => void
  ): Promise<{
    contentId: string;
    audioUrl: string;
    taskId: string;
  }> {
    // 使用分片上传接口
    const response = await this.post<{
      contentId: string;
      audioUrl: string;
      taskId: string;
    }>('/reciting/audio/upload', {
      fileName,
      fileUri, // 前端需要先读取文件并转换为base64或分片
    });
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '上传音频文件失败');
  }

  /**
   * 查询音频处理状态
   */
  async getAudioProcessingStatus(contentId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    sentences?: any[];
    errorMessage?: string;
  }> {
    const response = await this.get<{
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress?: number;
      sentences?: any[];
      errorMessage?: string;
    }>(`/reciting/audio/status/${contentId}`);
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '查询处理状态失败');
  }

  // ========== 想法收集器相关 API ==========
  // 注意：想法收集器使用独立的云函数地址

  /**
   * 获取所有想法
   */
  async getIdeas(date?: string, month?: string): Promise<any[]> {
    let endpoint = API_ENDPOINTS.IDEAS;
    const params: string[] = [];
    if (date) {
      params.push(`date=${encodeURIComponent(date)}`);
    }
    if (month) {
      params.push(`month=${encodeURIComponent(month)}`);
    }
    if (params.length > 0) {
      endpoint += '?' + params.join('&');
    }
    
    const response = await this.get<any[]>(endpoint, API_CONFIG.IDEA_COLLECTOR_BASE_URL);
    if (response.code === 200 || response.code === 0) {
      return response.data || [];
    }
    throw new Error(response.message || '获取想法失败');
  }

  /**
   * 根据ID获取想法
   */
  async getIdeaById(ideaId: string): Promise<any> {
    const response = await this.get<any>(API_ENDPOINTS.IDEA_BY_ID(ideaId), API_CONFIG.IDEA_COLLECTOR_BASE_URL);
    if (response.code === 200 || response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '获取想法失败');
  }

  /**
   * 创建想法
   */
  async createIdea(idea: any, autoAnalyze: boolean = true): Promise<any> {
    const response = await this.post<any>(API_ENDPOINTS.IDEAS, {
      ...idea,
      autoAnalyze,
    }, API_CONFIG.IDEA_COLLECTOR_BASE_URL);
    if (response.code === 200 || response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '创建想法失败');
  }

  /**
   * 更新想法
   */
  async updateIdea(ideaId: string, updates: any, autoAnalyze: boolean = true): Promise<any> {
    const response = await this.put<any>(API_ENDPOINTS.IDEA_BY_ID(ideaId), {
      ...updates,
      autoAnalyze,
    }, API_CONFIG.IDEA_COLLECTOR_BASE_URL);
    if (response.code === 200 || response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '更新想法失败');
  }

  /**
   * 删除想法
   */
  async deleteIdea(ideaId: string): Promise<void> {
    const response = await this.delete(API_ENDPOINTS.IDEA_BY_ID(ideaId), API_CONFIG.IDEA_COLLECTOR_BASE_URL);
    if (response.code === 200 || response.code === 0) {
      return;
    }
    throw new Error(response.message || '删除想法失败');
  }

  /**
   * AI分析想法
   */
  async analyzeIdea(content: string): Promise<{
    insights: string[];
    emotions: string[];
    themes: string[];
    suggestions: string[];
    truth: string;
  }> {
    const response = await this.post<{
      insights: string[];
      emotions: string[];
      themes: string[];
      suggestions: string[];
      truth: string;
    }>(API_ENDPOINTS.IDEA_ANALYZE, {
      content,
    }, API_CONFIG.IDEA_COLLECTOR_BASE_URL);
    if (response.code === 200 || response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || 'AI分析失败');
  }
}

// 导出单例
export const apiService = new ApiService();

