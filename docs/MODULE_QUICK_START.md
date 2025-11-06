# 模块化架构快速开始指南

## 重构完成 ✅

你的应用已经成功重构为模块化架构！现在可以轻松地添加、移除和管理功能模块。

## 当前状态

### 已实现的核心功能

1. **模块管理系统**
   - ✅ 模块注册和发现
   - ✅ 模块激活/停用
   - ✅ 模块生命周期管理
   - ✅ 模块路由管理

2. **已注册的模块**
   - ✅ **任务收集模块** (`task-collection`) - 已激活
   - 📝 **背书计划模块** (`recitation-plan`) - 模板（未激活）

3. **应用入口**
   - ✅ 模块化首页 (`/module-home`) - 显示所有可用模块
   - ✅ 智能路由 - 根据模块数量自动跳转

## 如何使用

### 查看可用模块

启动应用后：
- 如果只有一个模块：直接进入该模块
- 如果有多个模块：显示模块选择页面
- 如果没有模块：显示模块首页

### 激活/停用模块

#### 方法 1: 修改模块定义（推荐）

编辑模块定义文件，例如 `modules/recitation-plan/module.definition.ts`:

```typescript
metadata: {
  // ...
  status: ModuleStatus.ACTIVE,  // 改为 ACTIVE
  enabled: true,                 // 改为 true
  // ...
}
```

#### 方法 2: 运行时控制

```typescript
import { moduleManager } from './core/module-manager';

// 激活模块
await moduleManager.activateModule('recitation-plan');

// 停用模块
await moduleManager.deactivateModule('recitation-plan');
```

### 添加新模块

参考 `docs/MODULE_ARCHITECTURE.md` 中的详细步骤，或直接复制 `modules/recitation-plan/` 作为模板。

## 文件结构

```
项目根目录/
├── core/                    # 核心框架
│   ├── module-manager.ts    # 模块管理器
│   ├── module-registry.ts   # 模块注册表
│   └── app-shell.tsx        # 应用外壳
├── modules/                 # 功能模块
│   ├── task-collection/     # 任务收集模块
│   │   ├── module.definition.ts
│   │   └── module.lifecycle.ts
│   └── recitation-plan/     # 背书计划模块（模板）
│       ├── module.definition.ts
│       └── module.lifecycle.ts
├── types/
│   └── module.types.ts       # 模块类型定义
├── app/
│   ├── _layout.tsx          # 根布局（已集成 AppShell）
│   ├── index.tsx            # 入口（智能路由）
│   └── module-home.tsx      # 模块选择页面
└── docs/
    ├── MODULE_ARCHITECTURE.md    # 架构文档
    └── MODULE_QUICK_START.md     # 本文件
```

## 下一步

### 1. 激活背书计划模块（示例）

编辑 `modules/recitation-plan/module.definition.ts`:

```typescript
status: ModuleStatus.ACTIVE,
enabled: true,
```

然后在 `core/module-registry.ts` 中取消注释注册代码。

### 2. 创建背书计划的页面

在 `app/` 目录下创建路由文件，例如：
- `app/recitation-plan/home.tsx`

### 3. 实现背书计划功能

参考任务收集模块的实现，创建：
- 服务层
- 页面组件
- 业务逻辑

## 注意事项

1. **模块独立性**：每个模块应该是独立的，不直接依赖其他模块
2. **路由冲突**：确保模块路由路径不冲突
3. **存储隔离**：每个模块使用独立的存储键前缀
4. **服务共享**：通过全局服务层（`services/`）共享功能

## 常见操作

### 查看所有模块

```typescript
import { moduleManager } from './core/module-manager';

const allModules = moduleManager.getAllModules();
const activeModules = moduleManager.getActiveModules();
```

### 检查模块状态

```typescript
const isActive = moduleManager.isModuleActive('task-collection');
```

### 获取模块路由

```typescript
const routes = moduleManager.getAllRoutes();
```

## 问题反馈

如果遇到问题，请检查：
1. 模块是否正确注册（查看 `core/module-registry.ts`）
2. 模块状态是否为 `ACTIVE` 和 `enabled: true`
3. 路由路径是否正确配置
4. 控制台是否有错误信息

## 更多信息

- 详细架构文档：`docs/MODULE_ARCHITECTURE.md`
- 模块定义示例：`modules/task-collection/module.definition.ts`
- 模块模板：`modules/recitation-plan/`

