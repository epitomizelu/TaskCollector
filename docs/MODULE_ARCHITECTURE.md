# 模块化架构文档

## 概述

本项目已重构为模块化架构，支持功能模块的插拔式管理。每个功能都是一个独立的模块，可以动态上架或下架。

## 架构设计

### 核心组件

1. **模块类型系统** (`types/module.types.ts`)
   - 定义了模块的接口和类型
   - 包括模块元数据、路由、服务、生命周期等

2. **模块管理器** (`core/module-manager.ts`)
   - 负责模块的注册、激活、停用、卸载
   - 管理模块生命周期
   - 提供模块查询接口

3. **模块注册表** (`core/module-registry.ts`)
   - 集中管理所有模块的注册
   - 控制哪些模块启用

4. **应用外壳** (`core/app-shell.tsx`)
   - 应用启动时初始化模块系统
   - 管理模块生命周期

### 模块结构

每个模块应该包含以下文件：

```
modules/
  {module-name}/
    module.definition.ts    # 模块定义（必需）
    module.lifecycle.ts     # 生命周期钩子（可选）
    services/               # 模块服务（可选）
    components/             # 模块组件（可选）
    screens/                # 模块页面（可选）
```

## 创建新模块

### 步骤 1: 创建模块目录结构

```bash
mkdir -p modules/your-module-name
```

### 步骤 2: 创建模块定义文件

创建 `modules/your-module-name/module.definition.ts`:

```typescript
import { ModuleDefinition, ModuleStatus } from '../../types/module.types';
import { yourModuleLifecycle } from './module.lifecycle';

export const yourModuleDefinition: ModuleDefinition = {
  metadata: {
    id: 'your-module-id',
    name: 'your-module-name',
    displayName: '你的模块名称',
    version: '1.0.0',
    description: '模块描述',
    icon: 'icon-name',
    status: ModuleStatus.ACTIVE,
    permission: {
      requiresAuth: false,
      requiresMembership: false,
    },
    enabled: true,
    order: 3,
    category: 'category-name',
    tags: ['标签1', '标签2'],
  },
  routes: [
    {
      path: '/your-module/home',
      component: () => null,
      options: { title: '你的模块' },
      title: '你的模块',
    },
  ],
  services: {},
  config: {
    storageKey: '@yourModule',
    apiEndpoint: '/api/your-module',
  },
  lifecycle: yourModuleLifecycle,
  getNavigationItem: () => ({
    icon: 'icon-name',
    label: '你的模块',
    path: '/your-module/home',
  }),
};
```

### 步骤 3: 创建生命周期文件（可选）

创建 `modules/your-module-name/module.lifecycle.ts`:

```typescript
import { ModuleLifecycle } from '../../types/module.types';

export const yourModuleLifecycle: ModuleLifecycle = {
  async onInit() {
    console.log('模块初始化');
  },
  async onActivate() {
    console.log('模块激活');
  },
  async onDeactivate() {
    console.log('模块停用');
  },
  async onUnload() {
    console.log('模块卸载');
  },
};
```

### 步骤 4: 在注册表中注册模块

编辑 `core/module-registry.ts`，添加模块导入和注册：

```typescript
// 注册你的模块
try {
  const yourModule = await import('../modules/your-module-name/module.definition');
  if (yourModule.yourModuleDefinition) {
    moduleDefinitions.push(yourModule.yourModuleDefinition);
    this.registeredModuleIds.add('your-module-id');
  }
} catch (error) {
  console.error('加载你的模块失败:', error);
}
```

### 步骤 5: 创建路由页面

在 `app/` 目录下创建对应的路由文件，例如 `app/your-module/home.tsx`

## 模块管理

### 激活模块

模块默认状态由 `metadata.enabled` 和 `metadata.status` 控制。要激活模块：

1. 在模块定义中设置 `enabled: true` 和 `status: ModuleStatus.ACTIVE`
2. 或者在运行时调用：
   ```typescript
   await moduleManager.activateModule('module-id');
   ```

### 停用模块

```typescript
await moduleManager.deactivateModule('module-id');
```

### 卸载模块

```typescript
await moduleManager.unloadModule('module-id');
```

## 模块配置

### 权限控制

在模块定义中可以设置权限要求：

```typescript
permission: {
  requiresAuth: true,        // 需要登录
  requiresMembership: true,  // 需要会员
  membershipTypes: ['monthly', 'yearly'], // 需要的会员类型
}
```

### 功能开关

在模块配置中可以定义功能开关：

```typescript
config: {
  features: {
    feature1: true,
    feature2: false,
  },
}
```

## 模块间通信

模块之间应该通过全局服务层进行通信，而不是直接依赖。共享服务包括：

- `authService` - 认证服务
- `apiService` - API 服务
- `membershipService` - 会员服务

## 最佳实践

1. **模块独立性**：每个模块应该是独立的，不直接依赖其他模块
2. **服务共享**：通过全局服务层共享功能
3. **路由管理**：使用 Expo Router 管理路由，模块只定义路由路径
4. **生命周期管理**：合理使用生命周期钩子进行初始化和清理
5. **错误处理**：模块加载失败不应影响其他模块
6. **版本管理**：每个模块应该有自己的版本号

## 示例模块

参考以下模块作为示例：

- `modules/task-collection/` - 任务收集模块（已实现）
- `modules/recitation-plan/` - 背书计划模块（模板）

## 常见问题

### Q: 如何让模块在首页显示？

A: 实现 `getNavigationItem()` 方法，返回模块的导航信息。

### Q: 如何控制模块的显示顺序？

A: 在模块元数据中设置 `order` 属性，数字越小越靠前。

### Q: 模块可以访问其他模块的数据吗？

A: 不建议直接访问。应该通过全局服务层或事件系统进行通信。

### Q: 如何动态加载模块？

A: 目前模块在应用启动时加载。未来可以支持动态加载（需要实现模块下载机制）。

## 未来扩展

- [ ] 支持模块的动态下载和安装
- [ ] 模块市场/插件系统
- [ ] 模块间的消息传递机制
- [ ] 模块依赖管理
- [ ] 模块版本升级机制

