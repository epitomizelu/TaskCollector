/**
 * 我爱背书模块生命周期钩子
 */

import { ModuleLifecycle } from '../../types/module.types';

export const iloveRecitingLifecycle: ModuleLifecycle = {
  async onInit() {
    console.log('我爱背书模块初始化');
  },

  async onActivate() {
    console.log('我爱背书模块激活');
  },

  async onDeactivate() {
    console.log('我爱背书模块停用');
  },

  async onUnload() {
    console.log('我爱背书模块卸载');
  },
};

