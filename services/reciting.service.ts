/**
 * 我爱背书模块数据服务层 - 整合本地存储和云端同步
 * 
 * 存储策略：
 * - 所有操作都先保存到本地存储（确保离线可用）
 * - 文本数据直接存储到数据库
 * - 音频文件上传到云存储，保存文件 URL 到数据库
 * - 如果启用云端存储，再异步同步到云端
 * - 云端同步失败不影响本地操作，保证数据不丢失
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api.service';
import { API_CONFIG } from '../config/api.config';

const STORAGE_KEY = '@iloveReciting';
const PLANS_KEY = `${STORAGE_KEY}:plans`;
const TASKS_KEY = `${STORAGE_KEY}:tasks`;
const CONTENTS_KEY = `${STORAGE_KEY}:contents`;

// 数据类型定义
export interface RecitingPlan {
  id: string;
  title: string;
  content: string;
  contentId: string; // 关联的内容 ID
  period: number; // 天数
  startDate: string; // ISO 格式
  completedDate?: string;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  totalDays: number;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecitingTask {
  id: string;
  planId: string; // 关联的计划 ID
  title: string;
  description: string;
  type: 'recite' | 'review';
  date: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string;
  estimatedTime?: string;
  icon?: string;
  iconColor?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecitingContent {
  id: string;
  title: string;
  type: 'audio' | 'document';
  audioUrl?: string; // 音频文件 URL（云存储地址）
  documentUrl?: string; // 文档文件 URL（云存储地址）
  textContent?: string; // 文本内容（如果是文档）
  sentenceCount: number;
  uploadDate: string; // ISO 格式
  status: 'completed' | 'learning' | 'not_started';
  fileSize?: number; // 文件大小（字节）
  mimeType?: string; // MIME 类型
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

class RecitingService {
  /**
   * 是否应该使用云端存储
   * 基于 API Key 配置判断
   */
  private shouldUseCloud(): boolean {
    const hasApiKey = !!API_CONFIG.API_KEY;
    return hasApiKey;
  }

  // ========== 计划相关 ==========

  /**
   * 从本地获取所有计划
   */
  private async getPlansFromLocal(): Promise<RecitingPlan[]> {
    try {
      const plansJson = await AsyncStorage.getItem(PLANS_KEY);
      return plansJson ? JSON.parse(plansJson) : [];
    } catch (error) {
      console.error('从本地获取计划失败:', error);
      return [];
    }
  }

  /**
   * 保存计划到本地
   */
  private async savePlansToLocal(plans: RecitingPlan[]): Promise<void> {
    try {
      await AsyncStorage.setItem(PLANS_KEY, JSON.stringify(plans));
    } catch (error) {
      console.error('保存计划到本地失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有计划
   */
  async getAllPlans(): Promise<RecitingPlan[]> {
    if (this.shouldUseCloud()) {
      try {
        const cloudPlans = await apiService.getRecitingPlans();
        await this.savePlansToLocal(cloudPlans);
        return cloudPlans;
      } catch (error) {
        console.error('从云端获取计划失败:', error);
      }
    }
    return await this.getPlansFromLocal();
  }

  /**
   * 创建计划
   */
  async createPlan(plan: Omit<RecitingPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecitingPlan> {
    const planData: RecitingPlan = {
      ...plan,
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 先保存到本地
    const localPlans = await this.getPlansFromLocal();
    localPlans.unshift(planData);
    await this.savePlansToLocal(localPlans);

    // 异步同步到云端
    if (this.shouldUseCloud()) {
      this.syncPlanToCloud(planData).catch(error => {
        console.error('异步同步计划到云端失败:', error);
      });
    }

    return planData;
  }

  /**
   * 更新计划
   */
  async updatePlan(planId: string, updates: Partial<RecitingPlan>): Promise<RecitingPlan> {
    const localPlans = await this.getPlansFromLocal();
    const planIndex = localPlans.findIndex(p => p.id === planId);

    if (planIndex === -1) {
      throw new Error('计划不存在');
    }

    const updatedPlan: RecitingPlan = {
      ...localPlans[planIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    localPlans[planIndex] = updatedPlan;
    await this.savePlansToLocal(localPlans);

    // 异步同步到云端
    if (this.shouldUseCloud()) {
      this.syncPlanToCloud(updatedPlan).catch(error => {
        console.error('异步更新计划到云端失败:', error);
      });
    }

    return updatedPlan;
  }

  /**
   * 删除计划
   */
  async deletePlan(planId: string): Promise<void> {
    const localPlans = await this.getPlansFromLocal();
    const filteredPlans = localPlans.filter(p => p.id !== planId);
    await this.savePlansToLocal(filteredPlans);

    // 异步删除云端数据
    if (this.shouldUseCloud()) {
      apiService.deleteRecitingPlan(planId).catch(error => {
        console.error('异步删除计划失败:', error);
      });
    }
  }

  /**
   * 同步计划到云端
   */
  private async syncPlanToCloud(plan: RecitingPlan): Promise<void> {
    try {
      await apiService.createRecitingPlan(plan);
    } catch (error) {
      // 如果已存在，尝试更新
      try {
        await apiService.updateRecitingPlan(plan.id, plan);
      } catch (updateError) {
        console.error('同步计划到云端失败:', plan.id, updateError);
      }
    }
  }

  // ========== 任务相关 ==========

  /**
   * 从本地获取任务
   */
  private async getTasksFromLocal(): Promise<RecitingTask[]> {
    try {
      const tasksJson = await AsyncStorage.getItem(TASKS_KEY);
      return tasksJson ? JSON.parse(tasksJson) : [];
    } catch (error) {
      console.error('从本地获取任务失败:', error);
      return [];
    }
  }

  /**
   * 保存任务到本地
   */
  private async saveTasksToLocal(tasks: RecitingTask[]): Promise<void> {
    try {
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('保存任务到本地失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有任务
   */
  async getAllTasks(): Promise<RecitingTask[]> {
    if (this.shouldUseCloud()) {
      try {
        const cloudTasks = await apiService.getRecitingTasks();
        await this.saveTasksToLocal(cloudTasks);
        return cloudTasks;
      } catch (error) {
        console.error('从云端获取任务失败:', error);
      }
    }
    return await this.getTasksFromLocal();
  }

  /**
   * 根据日期获取任务
   */
  async getTasksByDate(date: string): Promise<RecitingTask[]> {
    const allTasks = await this.getAllTasks();
    return allTasks.filter(task => task.date === date);
  }

  /**
   * 创建任务
   */
  async createTask(task: Omit<RecitingTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<RecitingTask> {
    const taskData: RecitingTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 先保存到本地
    const localTasks = await this.getTasksFromLocal();
    localTasks.unshift(taskData);
    await this.saveTasksToLocal(localTasks);

    // 异步同步到云端
    if (this.shouldUseCloud()) {
      this.syncTaskToCloud(taskData).catch(error => {
        console.error('异步同步任务到云端失败:', error);
      });
    }

    return taskData;
  }

  /**
   * 更新任务
   */
  async updateTask(taskId: string, updates: Partial<RecitingTask>): Promise<RecitingTask> {
    const localTasks = await this.getTasksFromLocal();
    const taskIndex = localTasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      throw new Error('任务不存在');
    }

    const updatedTask: RecitingTask = {
      ...localTasks[taskIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    localTasks[taskIndex] = updatedTask;
    await this.saveTasksToLocal(localTasks);

    // 异步同步到云端
    if (this.shouldUseCloud()) {
      this.syncTaskToCloud(updatedTask).catch(error => {
        console.error('异步更新任务到云端失败:', error);
      });
    }

    return updatedTask;
  }

  /**
   * 同步任务到云端
   */
  private async syncTaskToCloud(task: RecitingTask): Promise<void> {
    try {
      await apiService.createRecitingTask(task);
    } catch (error) {
      try {
        await apiService.updateRecitingTask(task.id, task);
      } catch (updateError) {
        console.error('同步任务到云端失败:', task.id, updateError);
      }
    }
  }

  // ========== 内容相关（音频和文档）==========

  /**
   * 从本地获取所有内容
   */
  private async getContentsFromLocal(): Promise<RecitingContent[]> {
    try {
      const contentsJson = await AsyncStorage.getItem(CONTENTS_KEY);
      return contentsJson ? JSON.parse(contentsJson) : [];
    } catch (error) {
      console.error('从本地获取内容失败:', error);
      return [];
    }
  }

  /**
   * 保存内容到本地
   */
  private async saveContentsToLocal(contents: RecitingContent[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CONTENTS_KEY, JSON.stringify(contents));
    } catch (error) {
      console.error('保存内容到本地失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有内容
   */
  async getAllContents(): Promise<RecitingContent[]> {
    if (this.shouldUseCloud()) {
      try {
        const cloudContents = await apiService.getRecitingContents();
        await this.saveContentsToLocal(cloudContents);
        return cloudContents;
      } catch (error) {
        console.error('从云端获取内容失败:', error);
      }
    }
    return await this.getContentsFromLocal();
  }

  /**
   * 根据类型获取内容
   */
  async getContentsByType(type: 'audio' | 'document'): Promise<RecitingContent[]> {
    const allContents = await this.getAllContents();
    return allContents.filter(content => content.type === type);
  }

  /**
   * 创建内容（包括上传音频/文档文件）
   */
  async createContent(
    content: Omit<RecitingContent, 'id' | 'uploadDate' | 'createdAt' | 'updatedAt'>,
    fileUri?: string // 音频或文档文件的本地 URI
  ): Promise<RecitingContent> {
    let audioUrl: string | undefined;
    let documentUrl: string | undefined;

    // 如果提供了文件 URI，需要上传到云存储
    if (fileUri && this.shouldUseCloud()) {
      try {
        if (content.type === 'audio') {
          // 上传音频文件到云存储
          audioUrl = await this.uploadAudioFile(fileUri, content.title);
        } else if (content.type === 'document') {
          // 上传文档文件到云存储
          documentUrl = await this.uploadDocumentFile(fileUri, content.title);
        }
      } catch (error) {
        console.error('上传文件失败:', error);
        // 上传失败不影响本地保存
      }
    }

    const contentData: RecitingContent = {
      ...content,
      id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      audioUrl: content.type === 'audio' ? audioUrl : content.audioUrl,
      documentUrl: content.type === 'document' ? documentUrl : content.documentUrl,
      uploadDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 先保存到本地
    const localContents = await this.getContentsFromLocal();
    localContents.unshift(contentData);
    await this.saveContentsToLocal(localContents);

    // 异步同步到云端
    if (this.shouldUseCloud()) {
      this.syncContentToCloud(contentData).catch(error => {
        console.error('异步同步内容到云端失败:', error);
      });
    }

    return contentData;
  }

  /**
   * 上传音频文件到云存储
   */
  private async uploadAudioFile(fileUri: string, fileName: string): Promise<string> {
    // TODO: 实现音频文件上传到腾讯云存储
    // 使用腾讯云存储 SDK 上传文件
    // 返回文件的 URL
    
    // 临时实现：返回一个占位符 URL
    // 实际应该使用 @cloudbase/storage 或类似 SDK
    throw new Error('音频文件上传功能待实现');
  }

  /**
   * 上传文档文件到云存储
   */
  private async uploadDocumentFile(fileUri: string, fileName: string): Promise<string> {
    // TODO: 实现文档文件上传到腾讯云存储
    // 使用腾讯云存储 SDK 上传文件
    // 返回文件的 URL
    
    // 临时实现：返回一个占位符 URL
    throw new Error('文档文件上传功能待实现');
  }

  /**
   * 同步内容到云端
   */
  private async syncContentToCloud(content: RecitingContent): Promise<void> {
    try {
      await apiService.createRecitingContent(content);
    } catch (error) {
      // 内容通常不需要更新，如果创建失败记录错误即可
      console.error('同步内容到云端失败:', content.id, error);
    }
  }

  /**
   * 删除内容
   */
  async deleteContent(contentId: string): Promise<void> {
    const localContents = await this.getContentsFromLocal();
    const filteredContents = localContents.filter(c => c.id !== contentId);
    await this.saveContentsToLocal(filteredContents);

    // 异步删除云端数据和文件
    if (this.shouldUseCloud()) {
      apiService.deleteRecitingContent(contentId).catch(error => {
        console.error('异步删除内容失败:', error);
      });
    }
  }

  /**
   * 检查存储类型
   */
  getStorageType(): 'local' | 'cloud' {
    return this.shouldUseCloud() ? 'cloud' : 'local';
  }
}

// 导出单例
export const recitingService = new RecitingService();

