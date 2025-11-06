/**
 * 模块系统类型定义
 */

import { ReactNode } from 'react';
import { Route } from 'expo-router';

/**
 * 模块状态
 */
export enum ModuleStatus {
  ACTIVE = 'active',      // 激活状态，已上架
  INACTIVE = 'inactive', // 未激活状态，已下架
  DISABLED = 'disabled', // 已禁用
}

/**
 * 模块权限要求
 */
export interface ModulePermission {
  requiresAuth?: boolean;        // 是否需要登录
  requiresMembership?: boolean;   // 是否需要会员
  membershipTypes?: string[];    // 需要的会员类型列表
}

/**
 * 模块元数据
 */
export interface ModuleMetadata {
  id: string;                     // 模块唯一ID
  name: string;                   // 模块名称
  displayName: string;            // 显示名称
  version: string;                // 版本号
  description: string;            // 描述
  icon?: string;                  // 图标名称或路径
  author?: string;                // 作者
  status: ModuleStatus;           // 状态
  permission: ModulePermission;   // 权限要求
  enabled: boolean;               // 是否启用
  order?: number;                 // 显示顺序
  category?: string;              // 分类
  tags?: string[];                // 标签
}

/**
 * 模块路由定义
 */
export interface ModuleRoute {
  path: string;                   // 路由路径
  component: () => React.ComponentType<any> | Promise<React.ComponentType<any>>; // 组件或组件加载函数
  options?: any;                  // 路由选项
  title?: string;                 // 页面标题
}

/**
 * 模块服务接口
 */
export interface ModuleService {
  // 模块可以定义自己的服务
  [key: string]: any;
}

/**
 * 模块配置
 */
export interface ModuleConfig {
  storageKey?: string;            // 存储键前缀
  apiEndpoint?: string;            // API端点前缀
  features?: {                     // 功能开关
    [key: string]: boolean;
  };
  [key: string]: any;              // 其他配置
}

/**
 * 模块生命周期钩子
 */
export interface ModuleLifecycle {
  /**
   * 模块初始化时调用
   */
  onInit?: () => Promise<void> | void;
  
  /**
   * 模块激活时调用
   */
  onActivate?: () => Promise<void> | void;
  
  /**
   * 模块停用时调用
   */
  onDeactivate?: () => Promise<void> | void;
  
  /**
   * 模块卸载时调用
   */
  onUnload?: () => Promise<void> | void;
}

/**
 * 模块定义接口
 */
export interface ModuleDefinition {
  metadata: ModuleMetadata;
  routes: ModuleRoute[];
  services?: ModuleService;
  config?: ModuleConfig;
  lifecycle?: ModuleLifecycle;
  
  /**
   * 获取模块的主入口组件（可选，用于首页展示）
   */
  getHomeComponent?: () => React.ComponentType<any> | Promise<React.ComponentType<any>>;
  
  /**
   * 获取模块的导航项（可选，用于底部导航栏等）
   */
  getNavigationItem?: () => {
    icon: string;
    label: string;
    path: string;
  };
}

/**
 * 模块实例
 */
export interface ModuleInstance {
  definition: ModuleDefinition;
  loaded: boolean;
  initialized: boolean;
  lastError?: Error;
}

