/**
 * 任务清单模块定义
 */

import { ModuleDefinition, ModuleStatus, ModulePermission } from '../../types/module.types';
import { taskListLifecycle } from './module.lifecycle';

/**
 * 任务清单模块定义
 */
export const taskListModule: ModuleDefinition = {
  metadata: {
    id: 'task-list',
    name: 'task-list',
    displayName: '任务清单',
    version: '1.0.0',
    description: '管理每日任务清单，支持预设常规任务和今日任务管理',
    icon: 'list-check',
    author: 'System',
    status: ModuleStatus.ACTIVE,
    permission: {
      requiresAuth: false,
      requiresMembership: false,
    },
    enabled: true,
    order: 2,
    category: 'productivity',
    tags: ['任务', '清单', '日常'],
  },
  routes: [
    {
      path: '/task-list-today',
      component: () => null,
      options: { title: '今日任务' },
      title: '今日任务',
    },
    {
      path: '/task-list-preset',
      component: () => null,
      options: { title: '预设任务' },
      title: '预设任务',
    },
  ],
  services: {},
  config: {
    storageKey: '@taskList',
    apiEndpoint: '/api/task-list',
    features: {
      cloudSync: true,
      presetTasks: true,
      dailyTasks: true,
    },
  },
  lifecycle: taskListLifecycle,
  getNavigationItem: () => ({
    icon: 'list-check',
    label: '任务清单',
    path: '/task-list-today',
  }),
};

