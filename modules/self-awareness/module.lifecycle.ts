/**
 * 认识自己模块生命周期钩子
 */

import { ModuleLifecycle } from '../../types/module.types';

export const selfAwarenessLifecycle: ModuleLifecycle = {
  /**
   * 模块初始化
   */
  async onInit() {
    console.log('认识自己模块初始化');
    // 可以在这里做一些初始化工作，比如检查数据迁移等
  },

  /**
   * 模块激活
   */
  async onActivate() {
    console.log('认识自己模块激活');
    // 可以在这里做一些激活后的工作，比如同步数据等
  },

  /**
   * 模块停用
   */
  async onDeactivate() {
    console.log('认识自己模块停用');
    // 可以在这里做一些清理工作
  },

  /**
   * 模块卸载
   */
  async onUnload() {
    console.log('认识自己模块卸载');
    // 可以在这里做一些最终清理工作
  },
};

