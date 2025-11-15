/**
 * 任务清单模块生命周期钩子
 */

import { ModuleLifecycle } from '../../types/module.types';
import { taskListService } from '../../services/task-list.service';
import { API_CONFIG } from '../../config/api.config';
import { authService } from '../../services/auth.service';

export const taskListLifecycle: ModuleLifecycle = {
  /**
   * 模块初始化
   */
  async onInit() {
    console.log('任务清单模块初始化');
  },

  /**
   * 模块激活
   * 每次进入模块时同步预设任务和今日任务
   * 注意：只有在配置了 API_KEY 且用户已登录时才进行云端同步，避免未登录时发送请求
   */
  async onActivate() {
    console.log('任务清单模块激活');
    
    // ✅ 检查是否配置了 API_KEY 且用户已登录，如果任一条件不满足则跳过云端同步
    if (!API_CONFIG.API_KEY || !authService.isLoggedIn()) {
      console.log('未配置 API Key 或用户未登录，跳过云端同步，仅使用本地数据');
      return;
    }
    
    try {
      // ✅ 先同步预设任务（确保预设任务是最新的）
      // 使用双向同步，合并本地和云端的所有预设任务
      // 模块激活时强制同步，确保登录后数据是最新的
      try {
        await taskListService.syncPresetTasksBidirectional(true); // 强制同步
        console.log('预设任务同步完成');
      } catch (error) {
        console.error('同步预设任务失败:', error);
        // 同步失败不影响继续执行，使用本地预设任务
      }
      
      // ✅ 检查今日任务：先从云端同步，如果都没有才从预设任务创建
      const today = new Date().toISOString().split('T')[0];
      
      try {
        // 1. 先尝试从云端同步今日任务（不强制，如果本地有就用本地的）
        await taskListService.syncDailyTasksFromCloud(today, false);
        console.log('今日任务同步完成');
        
        // 2. 检查是否有今日任务
        const todayTasks = await taskListService.getDailyTasks(today);
        console.log(`今日任务数量: ${todayTasks.length}`);
        
        // 3. 只有在没有今日任务时，才检查是否需要从预设任务创建
        if (todayTasks.length === 0) {
          const isNewDay = await taskListService.checkIfNewDay();
          console.log(`是否是新的一天: ${isNewDay}`);
          
          if (isNewDay) {
            console.log('检测到新的一天且没有任务，从预设任务初始化');
            await taskListService.initializeTodayTasks();
            console.log('今日任务初始化完成');
          } else {
            console.log('今天已初始化过但没有任务，可能预设任务为空');
          }
        }
      } catch (error) {
        console.error('同步今日任务失败:', error);
        // 同步失败不影响继续执行
      }
    } catch (error) {
      console.error('任务清单模块激活时出错:', error);
      // 不抛出错误，避免影响模块激活
    }
  },

  /**
   * 模块停用
   */
  async onDeactivate() {
    console.log('任务清单模块停用');
  },

  /**
   * 模块卸载
   */
  async onUnload() {
    console.log('任务清单模块卸载');
  },
};

