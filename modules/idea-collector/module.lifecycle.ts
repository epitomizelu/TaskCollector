/**
 * 想法收集器模块生命周期钩子
 */

import { ModuleLifecycle } from '../../types/module.types';
import { ideaService } from '../../services/idea.service';

export const ideaCollectorLifecycle: ModuleLifecycle = {
  /**
   * 模块初始化
   */
  async onInit() {
    console.log('想法收集器模块初始化');
    // 可以在这里做一些初始化工作，比如检查数据迁移等
  },

  /**
   * 模块激活
   */
  async onActivate() {
    console.log('想法收集器模块激活');
    // 可以在这里做一些激活后的工作，比如同步数据等
    try {
      // 检查存储类型并显示提示
      const storageType = ideaService.getStorageType();
      console.log(`当前存储类型: ${storageType}`);
    } catch (error) {
      console.error('激活想法收集器模块时出错:', error);
    }
  },

  /**
   * 模块停用
   */
  async onDeactivate() {
    console.log('想法收集器模块停用');
    // 可以在这里做一些清理工作
  },

  /**
   * 模块卸载
   */
  async onUnload() {
    console.log('想法收集器模块卸载');
    // 可以在这里做一些最终清理工作
  },
};

