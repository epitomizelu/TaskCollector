/**
 * 背书计划模块生命周期钩子
 */

import { ModuleLifecycle } from '../../types/module.types';

export const recitationPlanLifecycle: ModuleLifecycle = {
  async onInit() {
    console.log('背书计划模块初始化');
    // 初始化逻辑
  },

  async onActivate() {
    console.log('背书计划模块激活');
    // 激活后的逻辑
  },

  async onDeactivate() {
    console.log('背书计划模块停用');
    // 停用时的清理逻辑
  },

  async onUnload() {
    console.log('背书计划模块卸载');
    // 卸载时的清理逻辑
  },
};

