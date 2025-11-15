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
  // ✅ 标志：是否正在从云端同步任务（防止同步过程中触发不必要的同步）
  private isSyncingFromCloud = false;

  /**
   * 获取本地时区的日期字符串 (YYYY-MM-DD)
   */
  private getLocalDateString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

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
    
    // 异步同步到云端（不阻塞主流程）
    this.syncPresetTaskToCloud(newTask).catch(error => {
      console.error('同步预设任务到云端失败:', error);
    });
    
    // 如果预设任务已启用，且今天还没有对应的今日任务，则异步创建并同步到今日任务
    if (newTask.enabled) {
      // 异步执行，不阻塞主流程
      (async () => {
        try {
          const today = this.getLocalDateString();
          const todayTasks = await this.getDailyTasks(today);
          const hasTodayTask = todayTasks.some(t => t.presetTaskId === newTask.id);
          
          if (!hasTodayTask) {
            const dailyTask = await this.addDailyTask({
              presetTaskId: newTask.id,
              name: newTask.name,
              description: newTask.description,
              date: today,
              completed: false,
            });
            console.log('已自动为新增的预设任务创建今日任务:', newTask.name);
            
            // ✅ 确保今日任务已同步到云端（标记为新任务，直接创建而不先尝试更新）
            this.syncDailyTaskToCloud(dailyTask, true).catch(error => {
              console.error('同步新创建的今日任务到云端失败:', error);
            });
          }
        } catch (error) {
          console.error('自动创建今日任务失败:', error);
        }
      })();
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
    
    // 异步同步到云端（不阻塞主流程）
    this.syncPresetTaskToCloud(tasks[index]).catch(error => {
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
   * 删除指定日期的所有每日任务
   * @param date 日期字符串 (YYYY-MM-DD)
   * @param includeCloud 是否同时从云端删除（默认 true）
   */
  private async deleteDailyTasksByDate(date: string, includeCloud: boolean = true): Promise<void> {
    const allTasksJson = await AsyncStorage.getItem(DAILY_TASKS_KEY);
    if (!allTasksJson) {
      return;
    }
    
    const allTasks: DailyTask[] = JSON.parse(allTasksJson);
    const tasksToDelete = allTasks.filter(t => t.date === date);
    const remainingTasks = allTasks.filter(t => t.date !== date);
    
    // 更新本地存储
    await AsyncStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(remainingTasks));
    console.log(`已删除 ${date} 的 ${tasksToDelete.length} 个任务（本地）`);
    
    // 从云端删除
    if (includeCloud && API_CONFIG.API_KEY && tasksToDelete.length > 0) {
      for (const task of tasksToDelete) {
        try {
          await apiService.deleteTaskListDailyTask(task.id);
        } catch (error) {
          console.error(`从云端删除每日任务失败 (${task.id}):`, error);
          // 继续删除其他任务，不因为单个任务失败而中断
        }
      }
      console.log(`已从云端删除 ${date} 的 ${tasksToDelete.length} 个任务`);
    }
  }

  /**
   * 检查是否是新的一天
   * @returns 如果是新的一天返回 true，否则返回 false
   */
  async checkIfNewDay(): Promise<boolean> {
    const today = this.getLocalDateString();
    const lastInitDate = await AsyncStorage.getItem(LAST_INIT_DATE_KEY);
    return lastInitDate !== today;
  }

  /**
   * 强制重新初始化今日任务（清除今日任务并从预设任务重新生成）
   * 用于修复同步问题，确保所有启用的预设任务都被同步
   */
  async forceReinitializeTodayTasks(): Promise<DailyTask[]> {
    const today = this.getLocalDateString();
    console.log(`强制重新初始化今日任务（${today}）`);
    
    // 先同步预设任务，确保获取所有云端任务
    try {
      await this.syncPresetTasksBidirectional();
      console.log('预设任务同步完成');
    } catch (error) {
      console.error('同步预设任务失败:', error);
      // 继续执行，使用本地预设任务
    }
    
    // 删除今日的所有任务（包括云端）
    try {
      await this.deleteDailyTasksByDate(today, true);
    } catch (error) {
      console.error('删除今日旧任务失败:', error);
      // 继续执行，即使删除失败也要重新生成任务
    }

    // 获取启用的预设任务（重新从本地读取，确保使用最新数据）
    const presetTasks = await this.getPresetTasks();
    console.log('获取到预设任务数量:', presetTasks.length);
    const enabledPresets = presetTasks.filter(t => t.enabled);
    console.log('启用的预设任务数量:', enabledPresets.length);

    // 为每个启用的预设任务创建今日任务（全部重新生成，状态初始化为未完成）
    const newTasks: DailyTask[] = [];
    const baseTime = Date.now();
    for (let i = 0; i < enabledPresets.length; i++) {
      const preset = enabledPresets[i];
      // 使用基础时间 + 索引 + 随机字符串确保 ID 唯一性
      const dailyTask: DailyTask = {
        id: `daily_${baseTime}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        presetTaskId: preset.id,
        name: preset.name,
        description: preset.description,
        date: today,
        completed: false, // 状态初始化为未完成
        syncedToCollection: false, // 同步状态初始化为未同步
        completedAt: undefined, // 清除完成时间
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newTasks.push(dailyTask);
    }

    // 保存新任务
    if (newTasks.length > 0) {
      const allTasksJson = await AsyncStorage.getItem(DAILY_TASKS_KEY);
      const allTasks: DailyTask[] = allTasksJson ? JSON.parse(allTasksJson) : [];
      allTasks.push(...newTasks);
      await AsyncStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(allTasks));
      
      // ✅ 同步新创建的任务到云端（标记为新任务，直接创建而不先尝试更新）
      for (const newTask of newTasks) {
        try {
          await this.syncDailyTaskToCloud(newTask, true); // true 表示是新任务
        } catch (error) {
          console.error(`同步新创建的今日任务到云端失败 (${newTask.id}):`, error);
        }
      }
      
      console.log(`已强制重新创建 ${newTasks.length} 个今日任务并同步到云端（状态已初始化）`);
    } else {
      console.log('没有启用的预设任务，今日任务列表为空');
    }

    // 更新初始化日期
    await AsyncStorage.setItem(LAST_INIT_DATE_KEY, today);

    return await this.getDailyTasks(today);
  }

  /**
   * 初始化今日任务（从预设任务生成）
   * ⚠️ 只在确定需要创建新任务时调用，不要频繁调用
   * 调用前应先检查：
   * 1. 本地是否有今日任务
   * 2. 云端是否有今日任务
   * 3. 是否是新的一天
   */
  async initializeTodayTasks(): Promise<DailyTask[]> {
    const today = this.getLocalDateString();
    const lastInitDate = await AsyncStorage.getItem(LAST_INIT_DATE_KEY);
    
    // ✅ 再次检查是否已有今日任务（避免重复创建）
    const existingTasks = await this.getDailyTasks(today);
    if (existingTasks.length > 0) {
      console.log(`今日已有 ${existingTasks.length} 个任务，跳过初始化`);
      return existingTasks;
    }
    
    // 如果是新的一天，需要清除今日的旧任务并重新生成
    const isNewDay = lastInitDate !== today;
    
    if (isNewDay) {
      console.log(`检测到新的一天（上次初始化日期: ${lastInitDate || '无'}，今天: ${today}），清除今日旧任务并重新生成`);
      
      // 删除今日的所有任务（包括云端）
      try {
        await this.deleteDailyTasksByDate(today, true);
      } catch (error) {
        console.error('删除今日旧任务失败:', error);
        // 继续执行，即使删除失败也要重新生成任务
      }
    } else {
      console.log('今天已经初始化过，但没有任务，从预设任务创建');
    }

    // 获取启用的预设任务（重新从本地读取，确保使用最新数据）
    const presetTasks = await this.getPresetTasks();
    console.log('获取到预设任务数量:', presetTasks.length);
    const enabledPresets = presetTasks.filter(t => t.enabled);
    console.log('启用的预设任务数量:', enabledPresets.length);

    // 为每个启用的预设任务创建今日任务（全部重新生成，状态初始化为未完成）
    const newTasks: DailyTask[] = [];
    const baseTime = Date.now();
    for (let i = 0; i < enabledPresets.length; i++) {
      const preset = enabledPresets[i];
      // 使用基础时间 + 索引 + 随机字符串确保 ID 唯一性
      const dailyTask: DailyTask = {
        id: `daily_${baseTime}_${i}_${Math.random().toString(36).substr(2, 9)}`,
        presetTaskId: preset.id,
        name: preset.name,
        description: preset.description,
        date: today,
        completed: false, // 状态初始化为未完成
        syncedToCollection: false, // 同步状态初始化为未同步
        completedAt: undefined, // 清除完成时间
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newTasks.push(dailyTask);
    }

    // 保存新任务
    if (newTasks.length > 0) {
      const allTasksJson = await AsyncStorage.getItem(DAILY_TASKS_KEY);
      const allTasks: DailyTask[] = allTasksJson ? JSON.parse(allTasksJson) : [];
      allTasks.push(...newTasks);
      await AsyncStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(allTasks));
      
      // ✅ 同步新创建的任务到云端（标记为新任务，直接创建而不先尝试更新）
      for (const newTask of newTasks) {
        try {
          await this.syncDailyTaskToCloud(newTask, true); // true 表示是新任务
        } catch (error) {
          console.error(`同步新创建的今日任务到云端失败 (${newTask.id}):`, error);
        }
      }
      
      console.log(`已创建 ${newTasks.length} 个今日任务并同步到云端（状态已初始化）`);
    } else {
      console.log('没有启用的预设任务，今日任务列表为空');
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
    
    // ✅ 同步到云端（标记为新任务，直接创建而不先尝试更新）
    await this.syncDailyTaskToCloud(newTask, true).catch(error => {
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

    // 如果任务被标记为完成，设置完成时间
    if (updates.completed === true) {
      updatedTask.completedAt = new Date().toISOString();
    }

    allTasks[index] = updatedTask;
    await AsyncStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(allTasks));
    
    // 异步同步到任务收集模块和云端（不阻塞主流程）
    if (updates.completed === true && !updatedTask.syncedToCollection) {
      // 异步同步到任务收集模块
      this.syncToTaskCollection(updatedTask).then(async () => {
        // 同步成功后，更新本地标记
        try {
          const allTasksJson = await AsyncStorage.getItem(DAILY_TASKS_KEY);
          if (allTasksJson) {
            const allTasks: DailyTask[] = JSON.parse(allTasksJson);
            const taskIndex = allTasks.findIndex(t => t.id === id);
            if (taskIndex !== -1) {
              allTasks[taskIndex].syncedToCollection = true;
              await AsyncStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(allTasks));
            }
          }
        } catch (error) {
          console.error('更新同步标记失败:', error);
        }
      }).catch(error => {
        console.error('同步到任务收集模块失败:', error);
        // 同步失败不影响任务完成状态
      });
    }
    
    // ✅ 异步同步到云端（只更新，不创建新任务）
    this.syncUpdateDailyTaskToCloud(updatedTask).catch(error => {
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
   * 同步更新每日任务到云端（只更新，不创建）
   * 用于完成任务等更新操作，避免创建重复任务
   */
  private async syncUpdateDailyTaskToCloud(task: DailyTask): Promise<void> {
    // ✅ 如果正在从云端同步，跳过同步到云端（避免循环同步）
    if (this.isSyncingFromCloud) {
      console.log(`[syncUpdateDailyTaskToCloud] 正在从云端同步中，跳过同步任务 ${task.id} 到云端`);
      return;
    }

    if (!API_CONFIG.API_KEY) {
      return; // 未配置 API Key，跳过云端同步
    }
    
    try {
      // ✅ 只更新，不创建新任务（避免重复任务）
      await apiService.updateTaskListDailyTask(task.id, task);
      console.log(`[syncUpdateDailyTaskToCloud] 任务 ${task.id} 更新成功`);
    } catch (error: any) {
      const errorMessage = error?.message || '';
      console.warn(`[syncUpdateDailyTaskToCloud] 更新任务 ${task.id} 失败:`, errorMessage);
      // 不抛出错误，避免影响主流程
      // 也不尝试创建新任务，因为更新操作不应该创建新数据
    }
  }

  /**
   * 同步每日任务到云端
   * 优化：对于新任务直接创建，对于已存在的任务先尝试更新
   * @param task 要同步的任务
   * @param isNewTask 是否是新任务（如果为 true，直接创建而不先尝试更新）
   */
  private async syncDailyTaskToCloud(task: DailyTask, isNewTask: boolean = false): Promise<void> {
    // ✅ 如果正在从云端同步，跳过同步到云端（避免循环同步）
    if (this.isSyncingFromCloud) {
      console.log(`[syncDailyTaskToCloud] 正在从云端同步中，跳过同步任务 ${task.id} 到云端`);
      return;
    }

    if (!API_CONFIG.API_KEY) {
      return; // 未配置 API Key，跳过云端同步
    }
    
    try {
      // ✅ 如果是新任务，直接创建（避免先尝试更新导致大量 PUT 请求失败）
      if (isNewTask) {
        try {
          await apiService.createTaskListDailyTask(task);
          console.log(`[syncDailyTaskToCloud] 新任务 ${task.id} 已创建`);
          return;
        } catch (createError: any) {
          // 如果创建失败（可能是任务已存在），尝试更新
          const errorMessage = createError?.message || '';
          if (errorMessage.includes('已存在') || errorMessage.includes('409')) {
            try {
              await apiService.updateTaskListDailyTask(task.id, task);
              console.log(`[syncDailyTaskToCloud] 任务 ${task.id} 已存在，已更新`);
            } catch (updateError: any) {
              console.warn(`[syncDailyTaskToCloud] 更新任务 ${task.id} 失败:`, updateError?.message || updateError);
            }
          } else {
            console.warn(`[syncDailyTaskToCloud] 创建新任务 ${task.id} 失败:`, errorMessage);
          }
        }
        return;
      }

      // ✅ 对于已存在的任务，先尝试更新（大多数情况下任务已存在）
      try {
        await apiService.updateTaskListDailyTask(task.id, task);
        return; // 更新成功，直接返回
      } catch (updateError: any) {
        // 如果更新失败，可能是任务不存在，尝试创建
        // 检查错误信息，如果是404或任务不存在，则创建
        const errorMessage = updateError?.message || '';
        const statusCode = updateError?.status || 0;
        
        // ✅ 如果是500错误且提示"不存在"，说明任务确实不存在，尝试创建
        // ✅ 如果是404错误，也尝试创建
        if (errorMessage.includes('不存在') || 
            errorMessage.includes('not found') || 
            statusCode === 404) {
          // 任务不存在，创建新任务
          try {
            await apiService.createTaskListDailyTask(task);
            console.log(`[syncDailyTaskToCloud] 任务 ${task.id} 不存在，已创建`);
          } catch (createError: any) {
            // 如果创建也失败（可能是任务已存在但用户ID不匹配），记录警告但不抛出错误
            console.warn(`[syncDailyTaskToCloud] 创建任务 ${task.id} 失败:`, createError?.message || createError);
            // 不抛出错误，避免影响主流程
          }
        } else {
          // 其他错误，记录但不抛出（避免影响主流程）
          console.warn(`[syncDailyTaskToCloud] 更新任务 ${task.id} 失败:`, errorMessage);
        }
      }
    } catch (error) {
      console.error('同步每日任务到云端失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 同步预设任务（取本地和云端的并集，先更新本地，后更新云端）
   * 每次进入预设任务界面时调用，每日只同步一次（除非强制同步）
   */
  async syncPresetTasksBidirectional(forceSync: boolean = false): Promise<void> {
    if (!API_CONFIG.API_KEY) {
      console.log('未配置 API Key，跳过双向同步');
      return;
    }
    
    // ✅ 额外检查：确保用户已登录（避免未登录时发送请求）
    // 注意：这里不能直接导入 authService，因为会造成循环依赖
    // 调用方应该已经检查了登录状态，这里作为双重保险
    // 如果 API_KEY 存在但用户未登录，说明可能是环境变量配置了 API_KEY
    // 这种情况下，我们仍然跳过同步，因为用户数据应该是隔离的
    
    // 检查今天是否已经同步过（除非强制同步）
    const today = this.getLocalDateString();
    if (!forceSync) {
      const lastSyncDate = await AsyncStorage.getItem(PRESET_SYNC_DATE_KEY);
      
      if (lastSyncDate === today) {
        console.log('今天已经同步过预设任务，跳过同步');
        return;
      }
    } else {
      console.log('强制同步预设任务');
    }
    
    try {
      console.log('开始双向同步预设任务（并集）...');
      
      // 获取本地和云端数据
      const localTasks = await this.getPresetTasks();
      console.log('本地预设任务数量:', localTasks.length);
      
      let cloudTasks: PresetTask[] = [];
      try {
        console.log('准备调用 apiService.getTaskListPresets()...');
        console.log('当前登录状态检查:', {
          hasApiKey: !!API_CONFIG.API_KEY,
          // 动态检查 authService 状态
        });
        
        // 动态检查登录状态
        try {
          const { authService } = await import('./auth.service');
          const isLoggedIn = authService.isLoggedIn();
          console.log('authService.isLoggedIn():', isLoggedIn);
          if (!isLoggedIn) {
            console.error('❌ 用户未登录，无法获取云端预设任务');
            throw new Error('用户未登录，无法获取云端预设任务');
          }
        } catch (authError) {
          console.error('检查登录状态失败:', authError);
          throw authError;
        }
        
        const callStartTime = Date.now();
        (globalThis as any).__lastCallStartTime = callStartTime;
        console.log(`[TaskListService] 开始调用 apiService.getTaskListPresets()，时间: ${callStartTime}`);
        
        cloudTasks = await apiService.getTaskListPresets();
        
        const callEndTime = Date.now();
        console.log(`[TaskListService] apiService.getTaskListPresets() 调用完成，耗时: ${callEndTime - callStartTime}ms`);
        console.log('✅ 云端预设任务获取成功，数量:', cloudTasks.length);
      } catch (error: any) {
        const callEndTime = Date.now();
        const callStartTime = (globalThis as any).__lastCallStartTime || Date.now();
        console.error(`[TaskListService] ❌ 获取云端预设任务失败，耗时: ${callEndTime - callStartTime}ms`);
        console.error('❌ 获取云端预设任务失败:', error);
        console.error('错误详情:', {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
          constructor: error?.constructor?.name,
        });
        // 如果获取云端任务失败，只使用本地任务
        console.log('使用本地预设任务');
      }
      
      // 创建ID映射
      const localTaskMap = new Map(localTasks.map(t => [t.id, t]));
      const cloudTaskMap = new Map(cloudTasks.map(t => [t.id, t]));
      
      console.log('本地任务ID:', Array.from(localTaskMap.keys()));
      console.log('云端任务ID:', Array.from(cloudTaskMap.keys()));
      
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
      console.log('启用的预设任务数量:', mergedTasks.filter(t => t.enabled).length);
      
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
      
      // ❌ 移除批量初始化历史任务的逻辑
      // 过去的日期应该直接从云端拉取，不需要创建
      // 只有今天（新的一天）才需要从预设任务初始化
      // this.batchInitializeMissingDailyTasks().catch(error => {
      //   console.error('批量初始化缺失的每日任务失败:', error);
      // });
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
      const today = this.getLocalDateString();
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
      const today = this.getLocalDateString();
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
    // ✅ 设置同步标志，防止同步过程中触发不必要的同步
    if (this.isSyncingFromCloud) {
      console.log('[syncDailyTasksFromCloud] 正在同步中，跳过重复同步');
      return;
    }

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
    
    // ✅ 设置同步标志
    this.isSyncingFromCloud = true;
    
    try {
      console.log('开始从云端同步每日任务...', date ? `日期: ${date}` : '');
      const cloudTasks = date 
        ? await apiService.getTaskListDailyTasks(date)
        : await apiService.getTaskListDailyTasks();
      
      console.log(`从云端获取到 ${cloudTasks.length} 个任务`);
      
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
      
      // ✅ 在同步标志保护下保存任务（不会触发同步到云端）
      await AsyncStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(mergedTasks));
      
      // ✅ 如果同步的是今天的任务，且云端有任务，更新 LAST_INIT_DATE_KEY
      // 这样可以避免安装新APK后误判为新的一天而重新初始化
      if (date) {
        const today = this.getLocalDateString();
        if (date === today && cloudTasks.length > 0) {
          const lastInitDate = await AsyncStorage.getItem(LAST_INIT_DATE_KEY);
          if (lastInitDate !== today) {
            console.log(`✅ 从云端同步到今日任务，更新初始化日期为: ${today}`);
            await AsyncStorage.setItem(LAST_INIT_DATE_KEY, today);
          }
        }
      }
      
      console.log('每日任务同步完成，共', mergedTasks.length, '个任务');
    } catch (error) {
      console.error('从云端同步每日任务失败:', error);
      // 如果云端同步失败，但本地有数据，继续使用本地数据
      if (localTasks.length > 0) {
        console.log('云端同步失败，使用本地数据');
        return;
      }
      throw error;
    } finally {
      // ✅ 清除同步标志
      this.isSyncingFromCloud = false;
    }
  }

  /**
   * 批量初始化缺失的每日任务
   * 检查最近一段时间（默认30天）哪些日期缺少每日任务，然后为这些日期批量创建任务
   * @param daysBack 检查多少天前的日期，默认30天
   */
  async batchInitializeMissingDailyTasks(daysBack: number = 30): Promise<void> {
    if (!API_CONFIG.API_KEY) {
      console.log('未配置 API Key，跳过批量初始化每日任务');
      return;
    }

    try {
      console.log(`开始批量初始化缺失的每日任务（检查最近 ${daysBack} 天）...`);
      
      // 获取启用的预设任务
      const presetTasks = await this.getPresetTasks();
      const enabledPresets = presetTasks.filter(t => t.enabled);
      
      if (enabledPresets.length === 0) {
        console.log('没有启用的预设任务，跳过批量初始化');
        return;
      }
      
      // 获取今天和最近 daysBack 天的日期列表
      const today = new Date();
      const datesToCheck: string[] = [];
      for (let i = 0; i <= daysBack; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        datesToCheck.push(this.getLocalDateString(date));
      }
      
      console.log(`需要检查 ${datesToCheck.length} 个日期`);
      
      // 从云端获取所有每日任务，按日期分组
      let cloudTasks: DailyTask[] = [];
      try {
        cloudTasks = await apiService.getTaskListDailyTasks();
      } catch (error) {
        console.warn('获取云端每日任务失败，将只检查本地任务:', error);
      }
      
      // 获取本地所有每日任务
      const allTasksJson = await AsyncStorage.getItem(DAILY_TASKS_KEY);
      const localTasks: DailyTask[] = allTasksJson ? JSON.parse(allTasksJson) : [];
      
      // 合并本地和云端任务，按日期分组
      const tasksByDate = new Map<string, Set<string>>();
      [...localTasks, ...cloudTasks].forEach(task => {
        if (!tasksByDate.has(task.date)) {
          tasksByDate.set(task.date, new Set());
        }
        if (task.presetTaskId) {
          tasksByDate.get(task.date)!.add(task.presetTaskId);
        }
      });
      
      // 找出缺失任务的日期
      const missingDates: string[] = [];
      for (const date of datesToCheck) {
        const datePresetIds = tasksByDate.get(date) || new Set();
        // 检查该日期是否缺少任何启用的预设任务
        const hasAllPresets = enabledPresets.every(preset => datePresetIds.has(preset.id));
        if (!hasAllPresets) {
          missingDates.push(date);
        }
      }
      
      if (missingDates.length === 0) {
        console.log('所有日期都有完整的每日任务，无需批量初始化');
        return;
      }
      
      console.log(`发现 ${missingDates.length} 个日期缺少每日任务:`, missingDates.slice(0, 10).join(', '), missingDates.length > 10 ? '...' : '');
      
      // 为每个缺失的日期创建每日任务
      let totalCreated = 0;
      const baseTime = Date.now();
      let allTasks: DailyTask[] = localTasks.length > 0 ? [...localTasks] : [];
      
      for (const date of missingDates) {
        const datePresetIds = tasksByDate.get(date) || new Set();
        const missingPresets = enabledPresets.filter(preset => !datePresetIds.has(preset.id));
        
        if (missingPresets.length === 0) {
          continue;
        }
        
        // 为该日期创建缺失的每日任务
        const newTasks: DailyTask[] = [];
        for (let i = 0; i < missingPresets.length; i++) {
          const preset = missingPresets[i];
          const dailyTask: DailyTask = {
            id: `daily_${baseTime}_${date}_${i}_${Math.random().toString(36).substr(2, 9)}`,
            presetTaskId: preset.id,
            name: preset.name,
            description: preset.description,
            date: date,
            completed: false,
            syncedToCollection: false,
            completedAt: undefined,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          newTasks.push(dailyTask);
        }
        
        // 添加到任务列表
        allTasks.push(...newTasks);
        
        // ✅ 同步到云端（标记为新任务，直接创建而不先尝试更新）
        for (const newTask of newTasks) {
          try {
            await this.syncDailyTaskToCloud(newTask, true); // true 表示是新任务
            totalCreated++;
          } catch (error) {
            console.error(`同步每日任务到云端失败 (${newTask.id}):`, error);
          }
        }
        
        console.log(`已为 ${date} 创建 ${newTasks.length} 个每日任务`);
      }
      
      // 最后统一保存到本地
      if (totalCreated > 0) {
        await AsyncStorage.setItem(DAILY_TASKS_KEY, JSON.stringify(allTasks));
      }
      
      console.log(`✅ 批量初始化完成，共为 ${missingDates.length} 个日期创建了 ${totalCreated} 个每日任务`);
    } catch (error) {
      console.error('批量初始化缺失的每日任务失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }
}

export const taskListService = new TaskListService();

