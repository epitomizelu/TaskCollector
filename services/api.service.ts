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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Request Error:', error);
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
}

// 导出单例
export const apiService = new ApiService();

