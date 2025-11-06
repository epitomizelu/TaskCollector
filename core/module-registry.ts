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
   * 通过配置控制哪些模块启用
   */
  async registerAllModules(): Promise<void> {
    // 动态导入所有模块定义
    const moduleDefinitions: ModuleDefinition[] = [];

    // 注册任务收集模块
    try {
      const taskModule = await import('../modules/task-collection/module.definition');
      console.log('任务收集模块导入结果:', taskModule);
      
      if (taskModule.taskCollectionModule) {
        const moduleDef = taskModule.taskCollectionModule;
        console.log('任务收集模块定义:', {
          id: moduleDef.metadata?.id,
          name: moduleDef.metadata?.name,
          enabled: moduleDef.metadata?.enabled,
          status: moduleDef.metadata?.status,
        });
        
        moduleDefinitions.push(moduleDef);
        this.registeredModuleIds.add('task-collection');
      } else {
        console.error('任务收集模块未找到: taskCollectionModule 不存在');
        console.log('可用导出:', Object.keys(taskModule));
      }
    } catch (error) {
      console.error('加载任务收集模块失败:', error);
      throw error; // 重新抛出错误以便看到完整堆栈
    }

    // 注册我爱背书模块
    try {
      const iloveRecitingModule = await import('../modules/ilove-reciting/module.definition');
      console.log('我爱背书模块导入结果:', iloveRecitingModule);
      
      if (iloveRecitingModule.iloveRecitingModule) {
        const moduleDef = iloveRecitingModule.iloveRecitingModule;
        console.log('我爱背书模块定义:', {
          id: moduleDef.metadata?.id,
          name: moduleDef.metadata?.name,
          enabled: moduleDef.metadata?.enabled,
          status: moduleDef.metadata?.status,
        });
        
        moduleDefinitions.push(moduleDef);
        this.registeredModuleIds.add('ilove-reciting');
      } else {
        console.error('我爱背书模块未找到: iloveRecitingModule 不存在');
        console.log('可用导出:', Object.keys(iloveRecitingModule));
      }
    } catch (error) {
      console.error('加载我爱背书模块失败:', error);
      // 不抛出错误，允许其他模块继续加载
    }

    // 批量注册所有模块
    await moduleManager.registerModules(moduleDefinitions);
    
    console.log(`已注册 ${moduleDefinitions.length} 个模块`);
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

