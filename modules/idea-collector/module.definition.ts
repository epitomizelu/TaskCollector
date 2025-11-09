/**
 * 想法收集器模块定义
 */

import { ModuleDefinition, ModuleStatus, ModulePermission } from '../../types/module.types';
import { ideaCollectorLifecycle } from './module.lifecycle';

/**
 * 想法收集器模块定义
 */
export const ideaCollectorModule: ModuleDefinition = {
  metadata: {
    id: 'idea-collector',
    name: 'idea-collector',
    displayName: '想法收集器',
    version: '1.0.0',
    description: '记录日常的各种念头和想法，AI智能分析想法背后的真相',
    icon: 'lightbulb',
    author: 'System',
    status: ModuleStatus.ACTIVE,
    permission: {
      requiresAuth: false, // 无需登录即可使用
      requiresMembership: false,
    },
    enabled: true,
    order: 2,
    category: 'productivity',
    tags: ['想法', '记录', 'AI分析', '反思'],
  },
  routes: [
    {
      path: '/idea-collector-home',
      component: () => null, // Expo Router 会自动处理路由
      options: { title: '想法收集器' },
      title: '想法收集器',
    },
    {
      path: '/idea-collector-list',
      component: () => null,
      options: { title: '想法列表' },
      title: '我的想法',
    },
    {
      path: '/idea-collector-detail',
      component: () => null,
      options: { title: '想法详情' },
      title: '想法详情',
    },
  ],
  services: {
    // 想法服务已在全局服务层定义
  },
  config: {
    storageKey: '@ideaCollector',
    apiEndpoint: '/api/ideas',
    features: {
      cloudSync: true,
      aiAnalysis: true,
      export: true,
    },
  },
  lifecycle: ideaCollectorLifecycle,
  getNavigationItem: () => ({
    icon: 'lightbulb',
    label: '想法收集',
    path: '/idea-collector-home',
  }),
};

