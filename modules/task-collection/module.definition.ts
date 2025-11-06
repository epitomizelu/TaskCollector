/**
 * 任务收集模块定义
 */

import { ModuleDefinition, ModuleStatus, ModulePermission } from '../../types/module.types';
import { taskCollectionLifecycle } from './module.lifecycle';

// 路由组件引用（实际组件在 app 目录中，这里只定义路径）
// Expo Router 会自动处理路由，这里只需要定义路径和元数据

/**
 * 任务收集模块定义
 */
export const taskCollectionModule: ModuleDefinition = {
  metadata: {
    id: 'task-collection',
    name: 'task-collection',
    displayName: '任务收集',
    version: '1.0.0',
    description: '帮助用户记录和管理日常任务完成情况',
    icon: 'check-circle',
    author: 'System',
    status: ModuleStatus.ACTIVE,
    permission: {
      requiresAuth: false, // 无需登录即可使用
      requiresMembership: false,
    },
    enabled: true,
    order: 1,
    category: 'productivity',
    tags: ['任务', '记录', '统计'],
  },
  routes: [
    {
      path: '/p-home',
      component: () => null, // Expo Router 会自动处理路由
      options: { title: '首页' },
      title: '任务收集助手',
    },
    {
      path: '/p-data_view',
      component: () => null,
      options: { title: '数据查看页' },
      title: '任务数据',
    },
    {
      path: '/p-report_view',
      component: () => null,
      options: { title: '报表查看页' },
      title: '任务报表',
    },
    {
      path: '/p-confirm_dialog',
      component: () => null,
      options: { title: '确认弹窗' },
      title: '确认操作',
    },
    {
      path: '/p-export_success',
      component: () => null,
      options: { title: '导出成功提示页' },
      title: '导出成功',
    },
  ],
  services: {
    // 任务服务已在全局服务层定义，这里可以扩展模块特定的服务
  },
  config: {
    storageKey: '@taskCollection',
    apiEndpoint: '/api/tasks',
    features: {
      cloudSync: true,
      export: true,
      statistics: true,
    },
  },
  lifecycle: taskCollectionLifecycle,
  getNavigationItem: () => ({
    icon: 'check-circle',
    label: '任务收集',
    path: '/p-home',
  }),
};

