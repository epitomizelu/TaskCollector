/**
 * 任务数据服务层 - 整合本地存储和云端同步
 * 根据用户会员类型自动选择存储位置：
 * - 付费用户：云端同步
 * - 免费用户：仅本地存储
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, TaskData } from './api.service';
import { authService } from './auth.service';
import { Platform } from 'react-native';

const STORAGE_KEY = '@taskCollection';
const SYNC_KEY = '@lastSyncTime';
const USE_CLOUD_KEY = '@useCloudStorage';

class TaskService {
  /**
   * 是否应该使用云端存储
   * 基于用户会员类型自动判断
   */
  private shouldUseCloud(): boolean {
    // 如果用户未登录，使用本地存储
    if (!authService.isLoggedIn()) {
      return false;
    }

    // 付费用户使用云端存储
    return authService.isPaidUser();
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
    if (this.useCloud) {
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

    // 先保存到本地
    const localTasks = await this.getTasksFromLocal();
    localTasks.unshift(taskData);
    await this.saveTasksToLocal(localTasks);

    // 如果是付费用户，同步到云端
    if (this.shouldUseCloud()) {
      try {
        await apiService.createTask(taskData);
      } catch (error) {
        console.error('创建任务到云端失败:', error);
        // 不抛出错误，本地已保存成功
      }
    }

    return taskData;
  }

  /**
   * 更新任务
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

    localTasks[taskIndex] = updatedTask;
    await this.saveTasksToLocal(localTasks);

    // 如果是付费用户，同步到云端
    if (this.shouldUseCloud()) {
      try {
        await apiService.updateTask(taskId, updatedTask);
      } catch (error) {
        console.error('更新任务到云端失败:', error);
      }
    }

    return updatedTask;
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<void> {
    const localTasks = await this.getTasksFromLocal();
    const filteredTasks = localTasks.filter(t => t.taskId !== taskId);
    await this.saveTasksToLocal(filteredTasks);

    // 如果是付费用户，同步删除到云端
    if (this.shouldUseCloud()) {
      try {
        await apiService.deleteTask(taskId);
      } catch (error) {
        console.error('从云端删除任务失败:', error);
        // 不抛出错误，本地已删除成功
      }
    }
  }

  /**
   * 删除指定日期的所有任务
   */
  async deleteTasksByDate(date: string): Promise<void> {
    const localTasks = await this.getTasksFromLocal();
    const filteredTasks = localTasks.filter(t => t.recordDate !== date);
    await this.saveTasksToLocal(filteredTasks);

    // 如果是付费用户，同步删除到云端
    if (this.shouldUseCloud()) {
      try {
        await apiService.deleteTasksByDate(date);
      } catch (error) {
        console.error('从云端删除任务失败:', error);
      }
    }
  }

  /**
   * 删除所有任务
   */
  async deleteAllTasks(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(SYNC_KEY);

    // 如果是付费用户，同步删除到云端
    if (this.shouldUseCloud()) {
      try {
        await apiService.deleteAllTasks();
      } catch (error) {
        console.error('从云端删除所有任务失败:', error);
      }
    }
  }

  /**
   * 手动同步（仅付费用户可用）
   */
  async manualSync(): Promise<void> {
    if (!this.shouldUseCloud()) {
      throw new Error('只有付费用户可以使用云端同步');
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

