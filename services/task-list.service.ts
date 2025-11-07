/**
 * 任务清单数据服务
 * 
 * 功能：
 * - 管理预设任务（每日常规任务）
 * - 管理每日任务（基于预设任务生成）
 * - 完成任务时同步到任务收集模块
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { taskService } from './task.service';
import { apiService } from './api.service';
import { API_CONFIG } from '../config/api.config';

const PRESET_TASKS_KEY = '@taskListPreset';
const DAILY_TASKS_KEY = '@taskListDaily';
const LAST_INIT_DATE_KEY = '@taskListLastInitDate';
const LAST_SYNC_DATE_KEY = '@taskListLastSyncDate';
const PRESET_SYNC_DATE_KEY = '@taskListPresetSyncDate';

export interface PresetTask {
  id: string;
  name: string;
  description?: string;
  order: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTask {
  id: string;
  presetTaskId?: string; // 如果来自预设任务，记录预设任务ID
  name: string;
  description?: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  completedAt?: string;
  syncedToCollection: boolean; // 是否已同步到任务收集模块
  createdAt: string;
  updatedAt: string;
}

class TaskListService {
  /**
   * 获取所有预设任务
   */
  async getPresetTasks(): Promise<PresetTask[]> {
    try {
      const tasksJson = await AsyncStorage.getItem(PRESET_TASKS_KEY);
      if (tasksJson) {
        const tasks = JSON.parse(tasksJson);
        return tasks.sort((a: PresetTask, b: PresetTask) => a.order - b.order);
      }
      return [];
    } catch (error) {
      console.error('获取预设任务失败:', error);
      return [];
    }
  }

  /**
   * 保存预设任务
   */
  async savePresetTask(task: Omit<PresetTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<PresetTask> {
    const tasks = await this.getPresetTasks();
    const newTask: PresetTask = {
      ...task,
      id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    tasks.push(newTask);
    await AsyncStorage.setItem(PRESET_TASKS_KEY, JSON.stringify(tasks));
    
    // 同步到云端
    await this.syncPresetTaskToCloud(newTask).catch(error => {
      console.error('同步预设任务到云端失败:', error);
    });
    
    // 如果预设任务已启用，且今天还没有对应的今日任务，则自动创建并同步到今日任务
    if (newTask.enabled) {
      const today = new Date().toISOString().split('T')[0];
      const todayTasks = await this.getDailyTasks(today);
      const hasTodayTask = todayTasks.some(t => t.presetTaskId === newTask.id);
      
      if (!hasTodayTask) {
        try {
          const dailyTask = await this.addDailyTask({
            presetTaskId: newTask.id,
            name: newTask.name,
            description: newTask.description,
            date: today,
            completed: false,
          });
          console.log('已自动为新增的预设任务创建今日任务:', newTask.name);
          
          // 确保今日任务已同步到云端（addDailyTask 内部会同步，这里确保完成）
          await this.syncDailyTaskToCloud(dailyTask).catch(error => {
            console.error('同步新创建的今日任务到云端失败:', error);
          });
        } catch (error) {
          console.error('自动创建今日任务失败:', error);
        }
      }
    }
    
    return newTask;
  }

  /**
   * 更新预设任务
   */
  async updatePresetTask(id: string, updates: Partial<PresetTask>): Promise<PresetTask> {
    const tasks = await this.getPresetTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('预设任务不存在');
    }
    tasks[index] = {
      ...tasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(PRESET_TASKS_KEY, JSON.stringify(tasks));
    
    // 同步到云端
    await this.syncPresetTaskToCloud(tasks[index]).catch(error => {
      console.error('同步预设任务到云端失败:', error);
    });
    
    return tasks[index];
  }

  /**
   * 删除预设任务
   */
  async deletePresetTask(id: string): Promise<void> {
    const tasks = await this.getPresetTasks();
    const filtered = tasks.filter(t => t.id !== id);
    await AsyncStorage.setItem(PRESET_TASKS_KEY, JSON.stringify(filtered));
    
    // 从云端删除
    if (API_CONFIG.API_KEY) {
      try {
        await apiService.deleteTaskListPreset(id);
      } catch (error) {
        console.error('从云端删除预设任务失败:', error);
      }
    }
  }

  /**
   * 获取指定日期的任务
   */
  async getDailyTasks(date: string): Promise<DailyTask[]> {
    try {
      const allTasksJson = await AsyncStorage.getItem(DAILY_TASKS_KEY);
      if (allTasksJson) {
        const allTasks: DailyTask[] = JSON.parse(allTasksJson);
        return allTasks
          .filter(task => task.date === date)
          .sort((a, b) => {
            // 未完成的在前，已完成的在后
            if (a.completed !== b.completed) {
              return a.completed ? 1 : -1;
            }
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
      }
      return [];
    } catch (error) {
      console.error('获取每日任务失败:', error);
      return [];
    }
  }

  /**
   * 初始化今日任务（从预设任务生成）
   */
  async initializeTodayTasks(): Promise<DailyTask[]> {
    const today = new Date().toISOString().split('T')[0];
    const lastInitDate = await AsyncStorage.getItem(LAST_INIT_DATE_KEY);
    
    // 如果今天已经初始化过，不再重复初始化
    if (lastInitDate === today) {
      console.log('今天已经初始化过，跳过初始化');
      return await this.getDailyTasks(today);
    }

    // 获取启用的预设任务（重新从本地读取，确保使用最新数据）
    const presetTasks = await this.getPresetTasks();
    console.log('获取到预设任务数量:', presetTasks.length);
    const enabledPresets = presetTasks.filter(t => t.enabled);
    console.log('启用的预设任务数量:', enabledPresets.length);

    // 获取今日已有任务
    const existingTasks = await this.getDailyTasks(today);
    const existingPresetIds = new Set(
      existingTasks
        .filter(t => t.presetTaskId)
        .map(t => t.presetTaskId!)
    );

    // 为每个启用的预设任务创建今日任务（如果还没有）
    const newTasks: DailyTask[] = [];
    for (const preset of enabledPresets) {
      if (!existingPresetIds.has(preset.id)) {
        const dailyTask: DailyTask = {
          id: `daily_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          presetTaskId: preset.id,
          name: preset.name,
          description: preset.description,
          date: today,
          completed: false,
          syncedToCollection: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        newTasks.push(dailyTask);
      }
    }

    // 保存新任务
    if (newTasks.length > 0) {
      const allTasksJson = await AsyncStorage.getItem(DAILY_TASKS_KEY);
      const allTasks: DailyTask[] = allTasksJson ? JSON.parse(allTasksJson) : [];
      allTasks.push(...newTasks);
      await AsyncStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(allTasks));
      
      // 同步新创建的任务到云端
      for (const newTask of newTasks) {
        try {
          await this.syncDailyTaskToCloud(newTask);
        } catch (error) {
          console.error(`同步新创建的今日任务到云端失败 (${newTask.id}):`, error);
        }
      }
      
      console.log(`已创建 ${newTasks.length} 个今日任务并同步到云端`);
    }

    // 更新初始化日期
    await AsyncStorage.setItem(LAST_INIT_DATE_KEY, today);

    return await this.getDailyTasks(today);
  }

  /**
   * 添加每日任务
   */
  async addDailyTask(task: Omit<DailyTask, 'id' | 'createdAt' | 'updatedAt' | 'syncedToCollection'>): Promise<DailyTask> {
    const allTasksJson = await AsyncStorage.getItem(DAILY_TASKS_KEY);
    const allTasks: DailyTask[] = allTasksJson ? JSON.parse(allTasksJson) : [];
    
    const newTask: DailyTask = {
      ...task,
      id: `daily_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      syncedToCollection: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    allTasks.push(newTask);
    await AsyncStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(allTasks));
    
    // 同步到云端
    await this.syncDailyTaskToCloud(newTask).catch(error => {
      console.error('同步每日任务到云端失败:', error);
    });
    
    return newTask;
  }

  /**
   * 更新每日任务
   */
  async updateDailyTask(id: string, updates: Partial<DailyTask>): Promise<DailyTask> {
    const allTasksJson = await AsyncStorage.getItem(DAILY_TASKS_KEY);
    if (!allTasksJson) {
      throw new Error('任务不存在');
    }
    
    const allTasks: DailyTask[] = JSON.parse(allTasksJson);
    const index = allTasks.findIndex(t => t.id === id);
    if (index === -1) {
      throw new Error('任务不存在');
    }

    const updatedTask = {
      ...allTasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // 如果任务被标记为完成，且还未同步到任务收集模块，则同步
    if (updates.completed === true && !updatedTask.syncedToCollection) {
      try {
        await this.syncToTaskCollection(updatedTask);
        updatedTask.syncedToCollection = true;
        updatedTask.completedAt = new Date().toISOString();
      } catch (error) {
        console.error('同步到任务收集模块失败，但任务仍会标记为完成:', error);
        // 即使同步失败，也标记为完成
        updatedTask.completedAt = new Date().toISOString();
      }
    }

    allTasks[index] = updatedTask;
    await AsyncStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(allTasks));
    
    // 同步到云端
    await this.syncDailyTaskToCloud(updatedTask).catch(error => {
      console.error('同步每日任务到云端失败:', error);
    });
    
    return updatedTask;
  }

  /**
   * 删除每日任务
   */
  async deleteDailyTask(id: string): Promise<void> {
    const allTasksJson = await AsyncStorage.getItem(DAILY_TASKS_KEY);
    if (!allTasksJson) {
      return;
    }
    
    const allTasks: DailyTask[] = JSON.parse(allTasksJson);
    const task = allTasks.find(t => t.id === id);
    
    // 如果任务已同步到任务收集模块，不允许删除
    if (task?.syncedToCollection) {
      throw new Error('已同步到任务收集模块的任务不允许删除');
    }

    const filtered = allTasks.filter(t => t.id !== id);
    await AsyncStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(filtered));
    
    // 从云端删除
    if (API_CONFIG.API_KEY) {
      try {
        await apiService.deleteTaskListDailyTask(id);
      } catch (error) {
        console.error('从云端删除每日任务失败:', error);
      }
    }
  }

  /**
   * 同步任务到任务收集模块
   */
  private async syncToTaskCollection(dailyTask: DailyTask): Promise<void> {
    try {
      const completionTime = dailyTask.completedAt || new Date().toISOString();
      const date = dailyTask.date;
      const [year, month] = date.split('-');
      
      await taskService.createTask({
        rawText: dailyTask.name,
        taskName: dailyTask.name,
        completionTime: completionTime,
        quantity: {},
        recordDate: date,
        recordMonth: `${year}-${month}`,
        recordYear: year,
      });
      
      console.log('任务已同步到任务收集模块:', dailyTask.name);
    } catch (error) {
      console.error('同步任务到任务收集模块失败:', error);
      // 不抛出错误，允许任务完成操作继续
      // 用户可以在任务收集模块中手动添加
    }
  }

  /**
   * 完成任务
   */
  async completeTask(id: string): Promise<DailyTask> {
    return await this.updateDailyTask(id, { completed: true });
  }

  /**
   * 取消完成任务
   */
  async uncompleteTask(id: string): Promise<DailyTask> {
    // 注意：已同步的任务不能取消完成
    const allTasksJson = await AsyncStorage.getItem(DAILY_TASKS_KEY);
    if (allTasksJson) {
      const allTasks: DailyTask[] = JSON.parse(allTasksJson);
      const task = allTasks.find(t => t.id === id);
      if (task?.syncedToCollection) {
        throw new Error('已同步到任务收集模块的任务不能取消完成');
      }
    }
    return await this.updateDailyTask(id, { 
      completed: false,
      completedAt: undefined,
    });
  }

  /**
   * 同步预设任务到云端
   */
  private async syncPresetTaskToCloud(task: PresetTask): Promise<void> {
    if (!API_CONFIG.API_KEY) {
      return; // 未配置 API Key，跳过云端同步
    }
    
    try {
      // 检查是否已存在（通过 ID 查询）
      const existingTasks = await apiService.getTaskListPresets();
      const existingTask = existingTasks.find(t => t.id === task.id);
      
      if (existingTask) {
        // 更新
        await apiService.updateTaskListPreset(task.id, task);
      } else {
        // 创建
        await apiService.createTaskListPreset(task);
      }
    } catch (error) {
      console.error('同步预设任务到云端失败:', error);
      throw error;
    }
  }

  /**
   * 同步每日任务到云端
   */
  private async syncDailyTaskToCloud(task: DailyTask): Promise<void> {
    if (!API_CONFIG.API_KEY) {
      return; // 未配置 API Key，跳过云端同步
    }
    
    try {
      // 检查是否已存在（通过 ID 查询）
      const existingTasks = await apiService.getTaskListDailyTasks(task.date);
      const existingTask = existingTasks.find(t => t.id === task.id);
      
      if (existingTask) {
        // 更新
        await apiService.updateTaskListDailyTask(task.id, task);
      } else {
        // 创建
        await apiService.createTaskListDailyTask(task);
      }
    } catch (error) {
      console.error('同步每日任务到云端失败:', error);
      throw error;
    }
  }

  /**
   * 同步预设任务（取本地和云端的并集，先更新本地，后更新云端）
   * 每次进入预设任务界面时调用，每日只同步一次
   */
  async syncPresetTasksBidirectional(): Promise<void> {
    if (!API_CONFIG.API_KEY) {
      console.log('未配置 API Key，跳过双向同步');
      return;
    }
    
    // 检查今天是否已经同步过
    const today = new Date().toISOString().split('T')[0];
    const lastSyncDate = await AsyncStorage.getItem(PRESET_SYNC_DATE_KEY);
    
    if (lastSyncDate === today) {
      console.log('今天已经同步过预设任务，跳过同步');
      return;
    }
    
    try {
      console.log('开始双向同步预设任务（并集）...');
      
      // 获取本地和云端数据
      const localTasks = await this.getPresetTasks();
      const cloudTasks = await apiService.getTaskListPresets();
      
      // 创建ID映射
      const localTaskMap = new Map(localTasks.map(t => [t.id, t]));
      const cloudTaskMap = new Map(cloudTasks.map(t => [t.id, t]));
      
      // 取并集：合并本地和云端的所有任务
      const mergedTasks: PresetTask[] = [];
      const tasksToUpdateInCloud: PresetTask[] = [];
      const processedIds = new Set<string>();
      
      // 处理本地和云端都有的任务（比较更新时间，使用较新的版本）
      for (const localTask of localTasks) {
        if (cloudTaskMap.has(localTask.id)) {
          const cloudTask = cloudTaskMap.get(localTask.id)!;
          const localUpdated = new Date(localTask.updatedAt).getTime();
          const cloudUpdated = new Date(cloudTask.updatedAt).getTime();
          
          if (localUpdated > cloudUpdated) {
            // 本地更新，使用本地数据，稍后更新云端
            mergedTasks.push(localTask);
            tasksToUpdateInCloud.push(localTask);
          } else {
            // 云端更新，使用云端数据，更新本地
            mergedTasks.push(cloudTask);
          }
          processedIds.add(localTask.id);
        }
      }
      
      // 添加只在本地存在的任务（全部保留，不限制时间）
      for (const localTask of localTasks) {
        if (!processedIds.has(localTask.id)) {
          mergedTasks.push(localTask);
          // 如果任务创建时间在 1 小时内，认为是新任务，同步到云端
          const now = Date.now();
          const taskAge = now - new Date(localTask.createdAt).getTime();
          if (taskAge < 3600000) {
            tasksToUpdateInCloud.push(localTask);
          }
        }
      }
      
      // 添加只在云端存在的任务（全部保留）
      for (const cloudTask of cloudTasks) {
        if (!processedIds.has(cloudTask.id)) {
          mergedTasks.push(cloudTask);
        }
      }
      
      // 先更新本地
      await AsyncStorage.setItem(PRESET_TASKS_KEY, JSON.stringify(mergedTasks));
      console.log('本地预设任务已更新（并集），共', mergedTasks.length, '个任务');
      
      // 后更新云端（批量更新）
      for (const task of tasksToUpdateInCloud) {
        try {
          await this.syncPresetTaskToCloud(task);
        } catch (error) {
          console.error(`更新预设任务到云端失败 (${task.id}):`, error);
        }
      }
      
      if (tasksToUpdateInCloud.length > 0) {
        console.log('已更新', tasksToUpdateInCloud.length, '个预设任务到云端');
      }
      
      // 更新同步日期
      await AsyncStorage.setItem(PRESET_SYNC_DATE_KEY, today);
      console.log('预设任务双向同步完成（并集）');
    } catch (error) {
      console.error('双向同步预设任务失败:', error);
      throw error;
    }
  }

  /**
   * 同步预设任务（优先使用本地，本地没有则从云端同步）
   * @param forceSync 是否强制从云端同步（忽略本地数据）
   */
  async syncPresetTasksFromCloud(forceSync: boolean = false): Promise<void> {
    // 先检查本地是否有预设任务
    const localTasks = await this.getPresetTasks();
    
    // 如果本地有数据且不强制同步，直接返回
    if (localTasks.length > 0 && !forceSync) {
      console.log('本地已有预设任务，使用本地数据');
      return;
    }
    
    // 如果本地没有数据，或者强制同步，则从云端同步
    if (!API_CONFIG.API_KEY) {
      console.log('未配置 API Key，无法从云端同步');
      return;
    }
    
    // 检查今天是否已经同步过（避免频繁同步）
    if (!forceSync) {
      const today = new Date().toISOString().split('T')[0];
      const lastSyncDate = await AsyncStorage.getItem(LAST_SYNC_DATE_KEY);
      
      if (lastSyncDate === today && localTasks.length > 0) {
        console.log('今天已经同步过预设任务，跳过同步');
        return;
      }
    }
    
    try {
      console.log('开始从云端同步预设任务...');
      const cloudTasks = await apiService.getTaskListPresets();
      
      // 合并策略：以云端数据为主，但保留本地新增的任务（本地有但云端没有的）
      const localTaskMap = new Map(localTasks.map(t => [t.id, t]));
      const cloudTaskMap = new Map(cloudTasks.map(t => [t.id, t]));
      
      // 添加云端任务（覆盖本地）
      for (const cloudTask of cloudTasks) {
        localTaskMap.set(cloudTask.id, cloudTask);
      }
      
      // 保留本地新增的任务（如果本地任务不在云端，且创建时间较新，则保留）
      const now = Date.now();
      for (const localTask of localTasks) {
        if (!cloudTaskMap.has(localTask.id)) {
          const taskAge = now - new Date(localTask.createdAt).getTime();
          // 如果任务创建时间在 1 小时内，认为是新任务，保留
          if (taskAge < 3600000) {
            localTaskMap.set(localTask.id, localTask);
          }
        }
      }
      
      const mergedTasks = Array.from(localTaskMap.values());
      await AsyncStorage.setItem(PRESET_TASKS_KEY, JSON.stringify(mergedTasks));
      
      // 更新同步日期
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(LAST_SYNC_DATE_KEY, today);
      
      console.log('预设任务同步完成，共', mergedTasks.length, '个任务');
    } catch (error) {
      console.error('从云端同步预设任务失败:', error);
      // 如果云端同步失败，但本地有数据，继续使用本地数据
      if (localTasks.length > 0) {
        console.log('云端同步失败，使用本地数据');
        return;
      }
      throw error;
    }
  }

  /**
   * 同步每日任务（优先使用本地，本地没有则从云端同步）
   * @param date 日期（可选，如果指定则只同步该日期的任务）
   * @param forceSync 是否强制从云端同步（忽略本地数据）
   */
  async syncDailyTasksFromCloud(date?: string, forceSync: boolean = false): Promise<void> {
    // 先检查本地是否有每日任务
    const allTasksJson = await AsyncStorage.getItem(DAILY_TASKS_KEY);
    const localTasks: DailyTask[] = allTasksJson ? JSON.parse(allTasksJson) : [];
    
    // 如果指定了日期，检查该日期是否有任务
    if (date) {
      const dateTasks = localTasks.filter(t => t.date === date);
      if (dateTasks.length > 0 && !forceSync) {
        console.log(`本地已有 ${date} 的每日任务，使用本地数据`);
        return;
      }
    } else {
      // 如果没有指定日期，检查是否有任何任务
      if (localTasks.length > 0 && !forceSync) {
        console.log('本地已有每日任务，使用本地数据');
        return;
      }
    }
    
    // 如果本地没有数据，或者强制同步，则从云端同步
    if (!API_CONFIG.API_KEY) {
      console.log('未配置 API Key，无法从云端同步');
      return;
    }
    
    try {
      console.log('开始从云端同步每日任务...', date ? `日期: ${date}` : '');
      const cloudTasks = date 
        ? await apiService.getTaskListDailyTasks(date)
        : await apiService.getTaskListDailyTasks();
      
      // 合并策略：以云端数据为主，但保留本地新增的任务
      const localTaskMap = new Map(localTasks.map(t => [t.id, t]));
      const cloudTaskMap = new Map(cloudTasks.map(t => [t.id, t]));
      
      // 添加云端任务（覆盖本地）
      for (const cloudTask of cloudTasks) {
        localTaskMap.set(cloudTask.id, cloudTask);
      }
      
      // 保留本地新增的任务（如果本地任务不在云端，且创建时间较新，则保留）
      const now = Date.now();
      for (const localTask of localTasks) {
        if (!cloudTaskMap.has(localTask.id)) {
          const taskAge = now - new Date(localTask.createdAt).getTime();
          // 如果任务创建时间在 1 小时内，认为是新任务，保留
          if (taskAge < 3600000) {
            localTaskMap.set(localTask.id, localTask);
          }
        }
      }
      
      const mergedTasks = Array.from(localTaskMap.values());
      await AsyncStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(mergedTasks));
      
      console.log('每日任务同步完成，共', mergedTasks.length, '个任务');
    } catch (error) {
      console.error('从云端同步每日任务失败:', error);
      // 如果云端同步失败，但本地有数据，继续使用本地数据
      if (localTasks.length > 0) {
        console.log('云端同步失败，使用本地数据');
        return;
      }
      throw error;
    }
  }
}

export const taskListService = new TaskListService();

