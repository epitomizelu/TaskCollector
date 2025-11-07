/**
 * 任务清单模块生命周期钩子
 */

import { ModuleLifecycle } from '../../types/module.types';

export const taskListLifecycle: ModuleLifecycle = {
  /**
   * 模块初始化
   */
  async onInit() {
    console.log('任务清单模块初始化');
  },

  /**
   * 模块激活
   */
  async onActivate() {
    console.log('任务清单模块激活');
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

