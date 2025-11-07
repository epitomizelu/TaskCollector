/**
 * 任务数据服务层 - 整合本地存储和云端同步
 * 
 * 存储策略：
 * - 所有操作都先保存到本地存储（确保离线可用）
 * - 如果启用云端存储，再异步同步到云端
 * - 云端同步失败不影响本地操作，保证数据不丢失
 * 
 * 根据 API Key 配置自动判断是否启用云端同步：
 * - 如果配置了 API Key（EXPO_PUBLIC_API_KEY），自动启用云端同步
 * - 如果未配置 API Key，仅使用本地存储
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, TaskData } from './api.service';
import { authService } from './auth.service';
import { Platform } from 'react-native';
import { API_CONFIG } from '../config/api.config';

const STORAGE_KEY = '@taskCollection';
const SYNC_KEY = '@lastSyncTime';
const USE_CLOUD_KEY = '@useCloudStorage';

class TaskService {
  /**
   * 是否应该使用云端存储
   * 基于 API Key 配置判断：如果配置了 API Key，则启用云端存储
   */
  private shouldUseCloud(): boolean {
    // 检查是否配置了 API Key（从环境变量读取）
    // 如果配置了 API Key，说明云函数已配置好，可以使用云端存储
    const hasApiKey = !!API_CONFIG.API_KEY;
    
    if (!hasApiKey) {
      return false;
    }

    // 如果配置了 API Key，允许使用云端存储
    // 注意：可以根据需要添加其他条件，比如用户登录状态等
    return true;
  }

  /**
   * 从本地存储获取任务
   */
  private async getTasksFromLocal(): Promise<TaskData[]> {
    try {
      const tasksJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (tasksJson) {
        return JSON.parse(tasksJson);
      }
      return [];
    } catch (error) {
      console.error('从本地获取任务失败:', error);
      return [];
    }
  }

  /**
   * 保存任务到本地存储
   */
  private async saveTasksToLocal(tasks: TaskData[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('保存任务到本地失败:', error);
      throw error;
    }
  }

  /**
   * 同步任务到云端
   */
  private async syncToCloud(tasks: TaskData[]): Promise<void> {
    if (!this.shouldUseCloud()) return;

    try {
      // 批量上传所有任务（实际应该用更智能的同步策略）
      for (const task of tasks) {
        try {
          await apiService.createTask(task);
        } catch (error) {
          // 如果任务已存在，尝试更新
          try {
            await apiService.updateTask(task.taskId, task);
          } catch (updateError) {
            console.error('同步任务失败:', task.taskId, updateError);
          }
        }
      }
      
      await AsyncStorage.setItem(SYNC_KEY, Date.now().toString());
    } catch (error) {
      console.error('同步到云端失败:', error);
      // 不抛出错误，允许离线使用
    }
  }

  /**
   * 从云端同步任务
   */
  private async syncFromCloud(): Promise<TaskData[]> {
    if (!this.shouldUseCloud()) {
      return await this.getTasksFromLocal();
    }

    try {
      const cloudTasks = await apiService.getAllTasks();
      await this.saveTasksToLocal(cloudTasks);
      await AsyncStorage.setItem(SYNC_KEY, Date.now().toString());
      return cloudTasks;
    } catch (error) {
      console.error('从云端同步失败:', error);
      // 如果云端同步失败，返回本地数据
      return await this.getTasksFromLocal();
    }
  }

  /**
   * 获取所有任务
   */
  async getAllTasks(): Promise<TaskData[]> {
    if (this.shouldUseCloud()) {
      try {
        return await this.syncFromCloud();
      } catch (error) {
        // 云端失败时使用本地数据
        return await this.getTasksFromLocal();
      }
    }
    return await this.getTasksFromLocal();
  }

  /**
   * 根据日期获取任务
   */
  async getTasksByDate(date: string): Promise<TaskData[]> {
    const allTasks = await this.getAllTasks();
    return allTasks.filter(task => task.recordDate === date);
  }

  /**
   * 根据月份获取任务
   */
  async getTasksByMonth(month: string): Promise<TaskData[]> {
    const allTasks = await this.getAllTasks();
    return allTasks.filter(task => task.recordMonth === month);
  }

  /**
   * 创建任务
   * 策略：先保存到本地存储，再异步同步到云端（如果启用）
   */
  async createTask(task: Omit<TaskData, 'taskId' | 'createdAt' | 'updatedAt'>): Promise<TaskData> {
    const user = authService.getCurrentUser();
    const taskData: TaskData = {
      ...task,
      taskId: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user?.userId || 'anonymous', // 关联用户ID
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 第一步：先保存到本地存储（确保数据不丢失）
    const localTasks = await this.getTasksFromLocal();
    localTasks.unshift(taskData);
    await this.saveTasksToLocal(localTasks);

    // 第二步：如果启用云端存储，异步同步到云端（失败不影响本地）
    if (this.shouldUseCloud()) {
      // 异步执行，不阻塞主流程
      this.syncTaskToCloud(taskData).catch(error => {
        console.error('异步同步任务到云端失败:', error);
        // 云端同步失败不影响本地数据，已保存成功
      });
    }

    return taskData;
  }

  /**
   * 异步同步单个任务到云端
   */
  private async syncTaskToCloud(taskData: TaskData): Promise<void> {
    try {
      await apiService.createTask(taskData);
    } catch (error) {
      // 如果任务已存在，尝试更新
      try {
        await apiService.updateTask(taskData.taskId, taskData);
      } catch (updateError) {
        console.error('同步任务到云端失败:', taskData.taskId, updateError);
        throw updateError;
      }
    }
  }

  /**
   * 更新任务
   * 策略：先更新本地存储，再异步同步到云端（如果启用）
   */
  async updateTask(taskId: string, updates: Partial<TaskData>): Promise<TaskData> {
    const localTasks = await this.getTasksFromLocal();
    const taskIndex = localTasks.findIndex(t => t.taskId === taskId);
    
    if (taskIndex === -1) {
      throw new Error('任务不存在');
    }

    const updatedTask: TaskData = {
      ...localTasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // 第一步：先更新本地存储
    localTasks[taskIndex] = updatedTask;
    await this.saveTasksToLocal(localTasks);

    // 第二步：如果启用云端存储，异步同步到云端（失败不影响本地）
    if (this.shouldUseCloud()) {
      // 异步执行，不阻塞主流程
      apiService.updateTask(taskId, updatedTask).catch(error => {
        console.error('异步更新任务到云端失败:', error);
        // 云端更新失败不影响本地数据，已更新成功
      });
    }

    return updatedTask;
  }

  /**
   * 删除任务
   * 策略：先删除本地存储，再异步同步删除到云端（如果启用）
   */
  async deleteTask(taskId: string): Promise<void> {
    // 第一步：先删除本地存储
    const localTasks = await this.getTasksFromLocal();
    const filteredTasks = localTasks.filter(t => t.taskId !== taskId);
    await this.saveTasksToLocal(filteredTasks);

    // 第二步：如果启用云端存储，异步同步删除到云端（失败不影响本地）
    if (this.shouldUseCloud()) {
      // 异步执行，不阻塞主流程
      apiService.deleteTask(taskId).catch(error => {
        console.error('异步从云端删除任务失败:', error);
        // 云端删除失败不影响本地数据，已删除成功
      });
    }
  }

  /**
   * 删除指定日期的所有任务
   * 策略：先删除本地存储，再异步同步删除到云端（如果启用）
   */
  async deleteTasksByDate(date: string): Promise<void> {
    // 第一步：先删除本地存储
    const localTasks = await this.getTasksFromLocal();
    const filteredTasks = localTasks.filter(t => t.recordDate !== date);
    await this.saveTasksToLocal(filteredTasks);

    // 第二步：如果启用云端存储，异步同步删除到云端（失败不影响本地）
    if (this.shouldUseCloud()) {
      // 异步执行，不阻塞主流程
      apiService.deleteTasksByDate(date).catch(error => {
        console.error('异步从云端删除任务失败:', error);
        // 云端删除失败不影响本地数据，已删除成功
      });
    }
  }

  /**
   * 删除所有任务
   * 策略：先删除本地存储，再异步同步删除到云端（如果启用）
   */
  async deleteAllTasks(): Promise<void> {
    // 第一步：先删除本地存储
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(SYNC_KEY);

    // 第二步：如果启用云端存储，异步同步删除到云端（失败不影响本地）
    if (this.shouldUseCloud()) {
      // 异步执行，不阻塞主流程
      apiService.deleteAllTasks().catch(error => {
        console.error('异步从云端删除所有任务失败:', error);
        // 云端删除失败不影响本地数据，已删除成功
      });
    }
  }

  /**
   * 手动同步（需要配置 API Key）
   */
  async manualSync(): Promise<void> {
    if (!this.shouldUseCloud()) {
      throw new Error('未配置 API Key，无法使用云端同步。请在 .env 文件中配置 EXPO_PUBLIC_API_KEY');
    }

    const localTasks = await this.getTasksFromLocal();
    await this.syncToCloud(localTasks);
    await this.syncFromCloud();
  }

  /**
   * 检查存储类型
   */
  getStorageType(): 'local' | 'cloud' {
    return this.shouldUseCloud() ? 'cloud' : 'local';
  }
}

// 导出单例
export const taskService = new TaskService();

