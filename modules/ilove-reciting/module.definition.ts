/**
 * 我爱背书模块定义
 */

import { ModuleDefinition, ModuleStatus } from '../../types/module.types';
import { iloveRecitingLifecycle } from './module.lifecycle';

/**
 * 我爱背书模块定义
 */
export const iloveRecitingModule: ModuleDefinition = {
  metadata: {
    id: 'ilove-reciting',
    name: 'ilove-reciting',
    displayName: '我爱背书',
    version: '1.0.0',
    description: '制定和管理背书计划，帮助高效记忆和学习',
    icon: 'book',
    author: 'System',
    status: ModuleStatus.ACTIVE,
    permission: {
      requiresAuth: false,
      requiresMembership: false,
    },
    enabled: true,
    order: 2,
    category: 'learning',
    tags: ['学习', '记忆', '背书', '计划'],
  },
  routes: [
    {
      path: '/ilove-reciting-home',
      component: () => null,
      options: { title: '我爱背书' },
      title: '我爱背书',
    },
    {
      path: '/ilove-reciting-plan-list',
      component: () => null,
      options: { title: '计划列表' },
      title: '计划列表',
    },
    {
      path: '/ilove-reciting-plan-create',
      component: () => null,
      options: { title: '创建计划' },
      title: '创建计划',
    },
    {
      path: '/ilove-reciting-task-list',
      component: () => null,
      options: { title: '任务列表' },
      title: '任务列表',
    },
    {
      path: '/ilove-reciting-task-detail',
      component: () => null,
      options: { title: '任务详情' },
      title: '任务详情',
    },
    {
      path: '/ilove-reciting-content-manage',
      component: () => null,
      options: { title: '内容管理' },
      title: '内容管理',
    },
    {
      path: '/ilove-reciting-profile',
      component: () => null,
      options: { title: '个人资料' },
      title: '个人资料',
    },
    {
      path: '/ilove-reciting-settings',
      component: () => null,
      options: { title: '设置' },
      title: '设置',
    },
    {
      path: '/ilove-reciting-about-us',
      component: () => null,
      options: { title: '关于我们' },
      title: '关于我们',
    },
    {
      path: '/ilove-reciting-upload-audio',
      component: () => null,
      options: { title: '上传音频' },
      title: '上传音频',
    },
    {
      path: '/ilove-reciting-upload-document',
      component: () => null,
      options: { title: '上传文档' },
      title: '上传文档',
    },
  ],
  services: {},
  config: {
    storageKey: '@iloveReciting',
    apiEndpoint: '/api/reciting',
    features: {
      planManagement: true,
      taskTracking: true,
      contentUpload: true,
      statistics: true,
    },
  },
  lifecycle: iloveRecitingLifecycle,
  getNavigationItem: () => ({
    icon: 'book',
    label: '我爱背书',
    path: '/ilove-reciting-home', // 现在指向任务列表页面
  }),
};

