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
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...getHeaders(this.token),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, {
        ...config,
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      if (!response.ok) {
        // 尝试读取错误响应体
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // 如果无法解析 JSON，尝试读取文本
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch {
            // 忽略文本读取错误
          }
        }
        
        const error = new Error(errorMessage) as any;
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('API Request Error:', {
        url,
        method: options.method || 'GET',
        status: error.status,
        message: error.message,
        hasApiKey: !!API_CONFIG.API_KEY,
        apiKeyPrefix: API_CONFIG.API_KEY ? API_CONFIG.API_KEY.substring(0, 8) + '...' : '未配置',
      });
      throw error;
    }
  }

  /**
   * GET 请求
   */
  private async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'GET',
    });
  }

  /**
   * POST 请求
   */
  private async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT 请求
   */
  private async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE 请求
   */
  private async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
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
    const response = await this.post<{
      token: string;
      userInfo: any;
      expiresIn: number;
    }>('/auth/login', { phone });
    if (response.code === 0) {
      return response.data;
    }
    throw new Error(response.message || '登录失败');
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
}

// 导出单例
export const apiService = new ApiService();

