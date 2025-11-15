/**
 * 模块注册表 - 集中管理所有模块的注册
 */

import { ModuleDefinition } from '../types/module.types';
import { moduleManager } from './module-manager';

/**
 * 模块注册表
 * 在这里添加或移除模块来决定哪些功能可用
 */
class ModuleRegistry {
  private registeredModuleIds: Set<string> = new Set();

  /**
   * 注册所有可用模块
   * ✅ 优化：并行导入和注册，大幅提升速度
   */
  async registerAllModules(): Promise<void> {
    const startTime = Date.now();
    console.log('[ModuleRegistry] 开始注册模块...');

    // ✅ 定义所有模块的导入任务（并行执行）
    const moduleImportTasks = [
      {
        id: 'task-collection',
        name: '任务收集',
        importFn: () => import('../modules/task-collection/module.definition'),
        exportName: 'taskCollectionModule',
      },
      {
        id: 'ilove-reciting',
        name: '我爱背书',
        importFn: () => import('../modules/ilove-reciting/module.definition'),
        exportName: 'iloveRecitingModule',
      },
      {
        id: 'task-list',
        name: '任务清单',
        importFn: () => import('../modules/task-list/module.definition'),
        exportName: 'taskListModule',
      },
      {
        id: 'idea-collector',
        name: '想法收集器',
        importFn: () => import('../modules/idea-collector/module.definition'),
        exportName: 'ideaCollectorModule',
      },
      {
        id: 'self-awareness',
        name: '认识自己',
        importFn: () => import('../modules/self-awareness/module.definition'),
        exportName: 'selfAwarenessModule',
      },
      {
        id: 'review',
        name: '复盘',
        importFn: () => import('../modules/review/module.definition'),
        exportName: 'reviewModule',
      },
    ];

    // ✅ 并行导入所有模块
    const importResults = await Promise.allSettled(
      moduleImportTasks.map(async (task) => {
        try {
          const module = await task.importFn();
          const moduleDef = module[task.exportName];
          
          if (!moduleDef) {
            throw new Error(`${task.name}模块导出 ${task.exportName} 不存在`);
          }
          
          return { task, moduleDef };
        } catch (error) {
          console.error(`[ModuleRegistry] 加载${task.name}模块失败:`, error);
          throw error;
        }
      })
    );

    // ✅ 收集成功导入的模块定义
    const moduleDefinitions: ModuleDefinition[] = [];
    let successCount = 0;
    let failCount = 0;

    importResults.forEach((result, index) => {
      const task = moduleImportTasks[index];
      if (result.status === 'fulfilled') {
        const { moduleDef } = result.value;
        moduleDefinitions.push(moduleDef);
        this.registeredModuleIds.add(task.id);
        successCount++;
        console.log(`[ModuleRegistry] ✅ ${task.name}模块导入成功`);
      } else {
        failCount++;
        console.error(`[ModuleRegistry] ❌ ${task.name}模块导入失败:`, result.reason);
      }
    });

    // ✅ 并行注册所有模块
    if (moduleDefinitions.length > 0) {
      await moduleManager.registerModules(moduleDefinitions);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[ModuleRegistry] 模块注册完成: ${successCount} 成功, ${failCount} 失败, 耗时: ${duration}ms`);
  }

  /**
   * 获取已注册的模块ID列表
   */
  getRegisteredModuleIds(): string[] {
    return Array.from(this.registeredModuleIds);
  }

  /**
   * 检查模块是否已注册
   */
  isModuleRegistered(id: string): boolean {
    return this.registeredModuleIds.has(id);
  }
}

// 导出单例
export const moduleRegistry = new ModuleRegistry();

