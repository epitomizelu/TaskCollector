/**
 * 复盘模块定义
 */

import { ModuleDefinition, ModuleStatus, ModulePermission } from '../../types/module.types';
import { reviewLifecycle } from './module.lifecycle';

/**
 * 复盘模块定义
 */
export const reviewModule: ModuleDefinition = {
  metadata: {
    id: 'review',
    name: 'review',
    displayName: '复盘',
    version: '1.0.0',
    description: '日复盘、周复盘、月复盘、年复盘，记录成长轨迹',
    icon: 'rotate-right',
    author: 'System',
    status: ModuleStatus.ACTIVE,
    permission: {
      requiresAuth: false, // 无需登录即可使用
      requiresMembership: false,
    },
    enabled: true,
    order: 3,
    category: 'productivity',
    tags: ['复盘', '反思', '成长', '记录'],
  },
  routes: [
    {
      path: '/review-home',
      component: () => null, // Expo Router 会自动处理路由
      options: { title: '复盘' },
      title: '复盘',
    },
    {
      path: '/review-daily',
      component: () => null,
      options: { title: '日复盘' },
      title: '日复盘',
    },
    {
      path: '/review-weekly',
      component: () => null,
      options: { title: '周复盘' },
      title: '周复盘',
    },
    {
      path: '/review-monthly',
      component: () => null,
      options: { title: '月复盘' },
      title: '月复盘',
    },
    {
      path: '/review-yearly',
      component: () => null,
      options: { title: '年复盘' },
      title: '年复盘',
    },
  ],
  services: {
    // 复盘服务已在全局服务层定义
  },
  config: {
    storageKey: '@review',
    apiEndpoint: '/api/reviews',
    features: {
      cloudSync: true,
      export: true,
    },
  },
  lifecycle: reviewLifecycle,
  getNavigationItem: () => ({
    icon: 'rotate-right',
    label: '复盘',
    path: '/review-home',
  }),
};

