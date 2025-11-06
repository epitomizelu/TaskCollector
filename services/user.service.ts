/**
 * 用户服务 - 处理用户注册、登录和数据同步
 * 
 * 功能：
 * 1. 手机号+昵称注册/登录（无密码，无短信验证）
 * 2. 用户数据同步（云端和本地数据求并集，不删除本地数据）
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api.service';
import { UserInfo } from '../types/user.types';
import { taskService } from './task.service';
import { recitingService } from './reciting.service';

const STORAGE_KEYS = {
  USER_TOKEN: '@userToken',
  USER_INFO: '@userInfo',
  SYNC_TIMESTAMP: '@syncTimestamp', // 最后同步时间
};

interface RegisterRequest {
  phone: string;
  nickname: string;
  [key: string]: any; // 扩展字段
}

interface LoginRequest {
  phone: string;
}

interface LoginResponse {
  token: string;
  userInfo: UserInfo;
  expiresIn: number;
}

class UserService {
  private currentUser: UserInfo | null = null;
  private token: string | null = null;

  /**
   * 初始化 - 从本地存储加载用户信息
   */
  async initialize(): Promise<void> {
    try {
      const [token, userInfoJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER_INFO),
      ]);

      if (token && userInfoJson) {
        this.token = token;
        this.currentUser = JSON.parse(userInfoJson);
      }
    } catch (error) {
      console.error('初始化用户服务失败:', error);
    }
  }

  /**
   * 注册 - 手机号+昵称
   */
  async register(data: RegisterRequest): Promise<UserInfo> {
    try {
      // 调用云端API注册（使用 apiService.register 方法，已处理响应结构）
      const response = await apiService.register({
        phone: data.phone,
        nickname: data.nickname,
        ...data, // 包含所有扩展字段
      });

      // 检查响应数据
      if (!response || !response.userInfo) {
        throw new Error('注册响应数据格式错误');
      }

      // 保存用户信息和Token
      await this.setAuthData(response.token, response.userInfo);

      // 注册成功后，同步本地数据到云端
      await this.syncLocalDataToCloud();

      return response.userInfo;
    } catch (error: any) {
      console.error('注册失败:', error);
      throw new Error(error.message || '注册失败');
    }
  }

  /**
   * 登录 - 使用手机号
   */
  async login(phone: string): Promise<UserInfo> {
    try {
      // 调用云端API登录（使用 apiService.login 方法，已处理响应结构）
      const response = await apiService.login(phone);

      // 检查响应数据
      if (!response || !response.userInfo) {
        throw new Error('登录响应数据格式错误');
      }

      // 保存用户信息和Token
      await this.setAuthData(response.token, response.userInfo);

      // 登录成功后，同步云端数据到本地（并集）
      await this.syncCloudDataToLocal();

      return response.userInfo;
    } catch (error: any) {
      console.error('登录失败:', error);
      throw new Error(error.message || '登录失败');
    }
  }

  /**
   * 设置认证数据
   */
  private async setAuthData(token: string, userInfo: UserInfo): Promise<void> {
    this.token = token;
    this.currentUser = userInfo;

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, token),
      AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo)),
    ]);
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    this.token = null;
    this.currentUser = null;

    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_INFO),
      AsyncStorage.removeItem(STORAGE_KEYS.SYNC_TIMESTAMP),
    ]);
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): UserInfo | null {
    return this.currentUser;
  }

  /**
   * 获取Token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * 是否已登录
   */
  isLoggedIn(): boolean {
    return this.token !== null && this.currentUser !== null;
  }

  /**
   * 同步云端数据到本地（并集，不删除本地数据）
   * 
   * 策略：
   * 1. 从云端获取所有数据
   * 2. 从本地获取所有数据
   * 3. 合并数据（以云端数据为准，但保留本地独有的数据）
   * 4. 保存合并后的数据到本地
   */
  async syncCloudDataToLocal(): Promise<void> {
    if (!this.isLoggedIn()) {
      console.warn('未登录，跳过数据同步');
      return;
    }

    try {
      console.log('开始同步云端数据到本地...');

      // 同步任务收集数据
      await this.syncTasksFromCloud();

      // 同步我爱背书数据
      await this.syncRecitingDataFromCloud();

      // 更新同步时间戳
      await AsyncStorage.setItem(STORAGE_KEYS.SYNC_TIMESTAMP, new Date().toISOString());

      console.log('云端数据同步完成');
    } catch (error) {
      console.error('同步云端数据失败:', error);
      // 同步失败不影响本地数据
    }
  }

  /**
   * 同步本地数据到云端
   * 
   * 策略：
   * 1. 从本地获取所有数据
   * 2. 上传到云端
   * 3. 云端会自动处理（如果已存在则更新，不存在则创建）
   */
  async syncLocalDataToCloud(): Promise<void> {
    if (!this.isLoggedIn()) {
      console.warn('未登录，跳过数据上传');
      return;
    }

    try {
      console.log('开始同步本地数据到云端...');

      // 同步任务收集数据
      await this.syncTasksToCloud();

      // 同步我爱背书数据
      await this.syncRecitingDataToCloud();

      console.log('本地数据同步完成');
    } catch (error) {
      console.error('同步本地数据失败:', error);
      // 上传失败不影响本地数据
    }
  }

  /**
   * 从云端同步任务数据到本地
   */
  private async syncTasksFromCloud(): Promise<void> {
    try {
      // 从云端获取所有任务
      const cloudTasks = await apiService.getAllTasks();

      // 从本地获取所有任务
      const localTasks = await taskService.getAllTasks();

      // 合并数据：以云端数据为准，但保留本地独有的数据
      const mergedTasks = [...cloudTasks];

      // 添加本地独有的任务
      localTasks.forEach(localTask => {
        if (!cloudTasks.find(cloudTask => cloudTask.taskId === localTask.taskId)) {
          mergedTasks.push(localTask);
        }
      });

      // 保存合并后的数据到本地（直接操作 AsyncStorage，避免触发 taskService 的同步逻辑）
      const STORAGE_KEY = '@taskCollection';
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mergedTasks));

      console.log(`任务数据同步完成: 云端 ${cloudTasks.length} 条, 本地 ${localTasks.length} 条, 合并后 ${mergedTasks.length} 条`);
    } catch (error) {
      console.error('同步任务数据失败:', error);
    }
  }

  /**
   * 同步本地任务数据到云端
   */
  private async syncTasksToCloud(): Promise<void> {
    try {
      const localTasks = await taskService.getAllTasks();

      // 逐个上传到云端
      for (const task of localTasks) {
        try {
          // 直接调用 API，避免触发 taskService 的本地保存逻辑
          await apiService.createTask(task);
        } catch (error: any) {
          // 如果已存在，尝试更新
          if (error.message?.includes('已存在') || error.message?.includes('409')) {
            try {
              await apiService.updateTask(task.taskId, task);
            } catch (updateError) {
              console.error(`更新任务 ${task.taskId} 失败:`, updateError);
            }
          } else {
            console.error(`同步任务 ${task.taskId} 失败:`, error);
          }
        }
      }

      console.log(`任务数据上传完成: ${localTasks.length} 条`);
    } catch (error) {
      console.error('上传任务数据失败:', error);
    }
  }

  /**
   * 从云端同步我爱背书数据到本地
   */
  private async syncRecitingDataFromCloud(): Promise<void> {
    try {
      // 同步计划
      const cloudPlans = await apiService.getRecitingPlans();
      const localPlans = await recitingService.getAllPlans();
      const localPlanMap = new Map(localPlans.map(plan => [plan.id, plan]));
      const mergedPlans = [...cloudPlans];
      localPlans.forEach(localPlan => {
        if (!cloudPlans.find(cloudPlan => cloudPlan.id === localPlan.id)) {
          mergedPlans.push(localPlan);
        }
      });
      const PLANS_KEY = '@iloveReciting:plans';
      await AsyncStorage.setItem(PLANS_KEY, JSON.stringify(mergedPlans));

      // 同步任务
      const cloudTasks = await apiService.getRecitingTasks();
      const localTasks = await recitingService.getAllTasks();
      const localTaskMap = new Map(localTasks.map(task => [task.id, task]));
      const mergedTasks = [...cloudTasks];
      localTasks.forEach(localTask => {
        if (!cloudTasks.find(cloudTask => cloudTask.id === localTask.id)) {
          mergedTasks.push(localTask);
        }
      });
      const TASKS_KEY = '@iloveReciting:tasks';
      await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(mergedTasks));

      // 同步内容
      const cloudContents = await apiService.getRecitingContents();
      const localContents = await recitingService.getAllContents();
      const mergedContents = [...cloudContents];
      localContents.forEach(localContent => {
        if (!cloudContents.find(cloudContent => cloudContent.id === localContent.id)) {
          mergedContents.push(localContent);
        }
      });
      const CONTENTS_KEY = '@iloveReciting:contents';
      await AsyncStorage.setItem(CONTENTS_KEY, JSON.stringify(mergedContents));

      console.log(`我爱背书数据同步完成: 计划 ${mergedPlans.length} 条, 任务 ${mergedTasks.length} 条, 内容 ${mergedContents.length} 条`);
    } catch (error) {
      console.error('同步我爱背书数据失败:', error);
    }
  }

  /**
   * 同步本地我爱背书数据到云端
   */
  private async syncRecitingDataToCloud(): Promise<void> {
    try {
      // 同步计划
      const localPlans = await recitingService.getAllPlans();
      for (const plan of localPlans) {
        try {
          await recitingService.createPlan(plan);
        } catch (error) {
          // 如果已存在，尝试更新
          try {
            await recitingService.updatePlan(plan.id, plan);
          } catch (updateError) {
            console.error(`同步计划 ${plan.id} 失败:`, updateError);
          }
        }
      }

      // 同步任务
      const localTasks = await recitingService.getAllTasks();
      for (const task of localTasks) {
        try {
          await recitingService.createTask(task);
        } catch (error) {
          try {
            await recitingService.updateTask(task.id, task);
          } catch (updateError) {
            console.error(`同步任务 ${task.id} 失败:`, updateError);
          }
        }
      }

      // 同步内容
      const localContents = await recitingService.getAllContents();
      for (const content of localContents) {
        try {
          await recitingService.createContent(content);
        } catch (error) {
          console.error(`同步内容 ${content.id} 失败:`, error);
        }
      }

      console.log(`我爱背书数据上传完成: 计划 ${localPlans.length} 条, 任务 ${localTasks.length} 条, 内容 ${localContents.length} 条`);
    } catch (error) {
      console.error('上传我爱背书数据失败:', error);
    }
  }
}

// 导出单例
export const userService = new UserService();

