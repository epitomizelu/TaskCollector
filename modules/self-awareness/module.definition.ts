/**
 * 认识自己模块定义
 */

import { ModuleDefinition, ModuleStatus, ModulePermission } from '../../types/module.types';
import { selfAwarenessLifecycle } from './module.lifecycle';

/**
 * 认识自己模块定义
 */
export const selfAwarenessModule: ModuleDefinition = {
  metadata: {
    id: 'self-awareness',
    name: 'self-awareness',
    displayName: '认识自己',
    version: '1.0.0',
    description: '记录你的老师、目标和价值观，更好地认识自己',
    icon: 'user-circle',
    author: 'System',
    status: ModuleStatus.ACTIVE,
    permission: {
      requiresAuth: false, // 无需登录即可使用
      requiresMembership: false,
    },
    enabled: true,
    order: 3,
    category: 'personal-growth',
    tags: ['自我认知', '成长', '目标', '价值观'],
  },
  routes: [
    {
      path: '/self-awareness-home',
      component: () => null, // Expo Router 会自动处理路由
      options: { title: '认识自己' },
      title: '认识自己',
    },
    {
      path: '/self-awareness-teachers',
      component: () => null,
      options: { title: '老师清单' },
      title: '老师清单',
    },
    {
      path: '/self-awareness-goals',
      component: () => null,
      options: { title: '人生目标' },
      title: '人生目标',
    },
    {
      path: '/self-awareness-values',
      component: () => null,
      options: { title: '价值观和原则' },
      title: '价值观和原则',
    },
  ],
  services: {
    // 认识自己服务已在全局服务层定义
  },
  config: {
    storageKey: '@selfAwareness',
    apiEndpoint: '/api/self-awareness',
    features: {
      cloudSync: true,
      export: true,
    },
  },
  lifecycle: selfAwarenessLifecycle,
  getNavigationItem: () => ({
    icon: 'user-circle',
    label: '认识自己',
    path: '/self-awareness-home',
  }),
};

