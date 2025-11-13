/**
 * 任务清单模块生命周期钩子
 */

import { ModuleLifecycle } from '../../types/module.types';
import { taskListService } from '../../services/task-list.service';

export const taskListLifecycle: ModuleLifecycle = {
  /**
   * 模块初始化
   */
  async onInit() {
    console.log('任务清单模块初始化');
  },

  /**
   * 模块激活
   * 每次进入模块时检查是否是新的一天，如果是则同步预设任务并初始化今日任务
   */
  async onActivate() {
    console.log('任务清单模块激活');
    try {
      // 检查是否是新的一天
      const isNewDay = await taskListService.checkIfNewDay();
      
      if (isNewDay) {
        console.log('检测到新的一天，开始同步预设任务和初始化今日任务');
        
        // 先同步预设任务（确保预设任务是最新的）
        // 使用双向同步，合并本地和云端的所有预设任务
        try {
          await taskListService.syncPresetTasksBidirectional();
          console.log('预设任务同步完成');
        } catch (error) {
          console.error('同步预设任务失败:', error);
          // 同步失败不影响继续执行，使用本地预设任务
        }
        
        // 初始化今日任务（如果是新的一天，会清除今日任务并从预设任务重新生成，状态初始化）
        await taskListService.initializeTodayTasks();
        console.log('今日任务初始化完成');
      } else {
        console.log('今天已经初始化过，跳过初始化');
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

