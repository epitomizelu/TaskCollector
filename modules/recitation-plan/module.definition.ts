/**
 * 背书计划模块定义（示例模板）
 * 
 * 这是一个模块模板，展示了如何创建一个新的功能模块
 * 你可以复制这个文件并修改来创建新的功能模块
 */

import { ModuleDefinition, ModuleStatus } from '../../types/module.types';
import { recitationPlanLifecycle } from './module.lifecycle';

/**
 * 背书计划模块定义
 * 注意：这个模块目前是示例，需要实现具体的功能
 */
export const recitationPlanModule: ModuleDefinition = {
  metadata: {
    id: 'recitation-plan',
    name: 'recitation-plan',
    displayName: '背书计划',
    version: '1.0.0',
    description: '制定和管理背书计划，帮助高效记忆',
    icon: 'book',
    author: 'System',
    status: ModuleStatus.INACTIVE, // 默认未激活，可以在 module-registry.ts 中激活
    permission: {
      requiresAuth: false,
      requiresMembership: false,
    },
    enabled: false, // 默认禁用
    order: 2,
    category: 'learning',
    tags: ['学习', '记忆', '计划'],
  },
  routes: [
    {
      path: '/recitation-plan/home',
      component: () => null,
      options: { title: '背书计划' },
      title: '背书计划',
    },
    // 可以添加更多路由
  ],
  services: {
    // 背书计划相关的服务可以在这里定义
  },
  config: {
    storageKey: '@recitationPlan',
    apiEndpoint: '/api/recitation',
    features: {
      planManagement: true,
      progressTracking: true,
      reminders: false, // 功能开关
    },
  },
  lifecycle: recitationPlanLifecycle,
  getNavigationItem: () => ({
    icon: 'book',
    label: '背书计划',
    path: '/recitation-plan/home',
  }),
};

