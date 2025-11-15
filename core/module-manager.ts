/**
 * 模块管理器 - 负责模块的注册、加载、激活和卸载
 */

import { ModuleDefinition, ModuleInstance, ModuleStatus } from '../types/module.types';

class ModuleManager {
  private modules: Map<string, ModuleInstance> = new Map();
  private activeModules: Set<string> = new Set();

  /**
   * 注册模块
   */
  async registerModule(definition: ModuleDefinition): Promise<void> {
    // 验证定义结构
    if (!definition) {
      throw new Error('模块定义不能为空');
    }
    
    if (!definition.metadata) {
      throw new Error('模块定义缺少 metadata');
    }

    const { metadata } = definition;
    const id = metadata.id;

    // 检查模块ID是否有效
    if (!id) {
      console.error('模块定义结构:', JSON.stringify(definition, null, 2));
      throw new Error(`模块定义缺少 id（metadata.id）。当前 metadata: ${JSON.stringify(metadata)}`);
    }

    // 检查模块是否已注册
    if (this.modules.has(id)) {
      console.warn(`模块 ${id} 已注册，跳过重复注册`);
      return;
    }

    // 验证模块定义
    this.validateModuleDefinition(definition);

    // 创建模块实例
    const instance: ModuleInstance = {
      definition,
      loaded: false,
      initialized: false,
    };

    // 先保存模块实例到 Map 中
    this.modules.set(id, instance);
    console.log(`模块 ${id} 注册成功`);

    // 如果模块已启用，立即激活（必须在 set 之后调用）
    if (metadata.enabled && metadata.status === ModuleStatus.ACTIVE) {
      try {
        await this.activateModule(id);
      } catch (error) {
        console.error(`模块 ${id} 激活失败，但已注册:`, error);
        // 不抛出错误，允许模块注册但未激活
      }
    }
  }

  /**
   * 批量注册模块
   * ✅ 优化：并行注册，提升速度
   */
  async registerModules(definitions: ModuleDefinition[]): Promise<void> {
    // ✅ 并行注册所有模块（注册本身很快，主要是激活可能慢）
    await Promise.all(
      definitions.map(definition => this.registerModule(definition))
    );
  }

  /**
   * 获取模块实例
   */
  getModule(id: string): ModuleInstance | undefined {
    return this.modules.get(id);
  }

  /**
   * 获取所有模块
   */
  getAllModules(): ModuleInstance[] {
    return Array.from(this.modules.values());
  }

  /**
   * 获取所有激活的模块
   */
  getActiveModules(): ModuleInstance[] {
    return Array.from(this.activeModules)
      .map(id => this.modules.get(id))
      .filter((module): module is ModuleInstance => module !== undefined);
  }

  /**
   * 获取按顺序排序的激活模块
   */
  getOrderedActiveModules(): ModuleInstance[] {
    return this.getActiveModules()
      .sort((a, b) => {
        const orderA = a.definition.metadata.order || 999;
        const orderB = b.definition.metadata.order || 999;
        return orderA - orderB;
      });
  }

  /**
   * 激活模块
   * ✅ 优化：onActivate 异步执行，不阻塞激活流程
   */
  async activateModule(id: string): Promise<void> {
    if (!id) {
      throw new Error('模块 ID 不能为空');
    }

    const instance = this.modules.get(id);
    if (!instance) {
      throw new Error(`模块 ${id} 不存在`);
    }

    if (this.activeModules.has(id)) {
      console.log(`模块 ${id} 已经激活`);
      return;
    }

    try {
      // ✅ 调用 onInit（快速初始化，等待完成）
      if (instance.definition.lifecycle?.onInit) {
        await instance.definition.lifecycle.onInit();
      }

      // ✅ 先标记为激活状态（快速完成）
      instance.initialized = true;
      instance.loaded = true;
      this.activeModules.add(id);
      
      // 更新模块状态
      instance.definition.metadata.status = ModuleStatus.ACTIVE;
      instance.definition.metadata.enabled = true;

      console.log(`模块 ${id} 激活成功`);

      // ✅ onActivate 异步执行（不阻塞，后台执行）
      if (instance.definition.lifecycle?.onActivate) {
        // 不使用 await，让 onActivate 在后台异步执行
        instance.definition.lifecycle.onActivate()
          .then(() => {
            console.log(`模块 ${id} 的 onActivate 完成`);
          })
          .catch((error) => {
            console.error(`模块 ${id} 的 onActivate 失败:`, error);
            // 不影响模块激活状态，只记录错误
          });
      }
    } catch (error) {
      instance.lastError = error as Error;
      console.error(`模块 ${id} 激活失败:`, error);
      throw error;
    }
  }

  /**
   * 停用模块
   */
  async deactivateModule(id: string): Promise<void> {
    const instance = this.modules.get(id);
    if (!instance) {
      throw new Error(`模块 ${id} 不存在`);
    }

    if (!this.activeModules.has(id)) {
      console.log(`模块 ${id} 未激活`);
      return;
    }

    try {
      // 调用生命周期钩子
      if (instance.definition.lifecycle?.onDeactivate) {
        await instance.definition.lifecycle.onDeactivate();
      }

      this.activeModules.delete(id);
      
      // 更新模块状态
      instance.definition.metadata.status = ModuleStatus.INACTIVE;
      instance.definition.metadata.enabled = false;

      console.log(`模块 ${id} 停用成功`);
    } catch (error) {
      console.error(`模块 ${id} 停用失败:`, error);
      throw error;
    }
  }

  /**
   * 卸载模块
   */
  async unloadModule(id: string): Promise<void> {
    const instance = this.modules.get(id);
    if (!instance) {
      return;
    }

    // 先停用
    if (this.activeModules.has(id)) {
      await this.deactivateModule(id);
    }

    try {
      // 调用卸载钩子
      if (instance.definition.lifecycle?.onUnload) {
        await instance.definition.lifecycle.onUnload();
      }

      this.modules.delete(id);
      console.log(`模块 ${id} 卸载成功`);
    } catch (error) {
      console.error(`模块 ${id} 卸载失败:`, error);
      throw error;
    }
  }

  /**
   * 检查模块是否激活
   */
  isModuleActive(id: string): boolean {
    return this.activeModules.has(id);
  }

  /**
   * 验证模块定义
   */
  private validateModuleDefinition(definition: ModuleDefinition): void {
    const { metadata, routes } = definition;

    if (!metadata.id || !metadata.name) {
      throw new Error('模块必须包含 id 和 name');
    }

    if (!routes || routes.length === 0) {
      throw new Error('模块必须至少定义一个路由');
    }

    // 验证路由路径唯一性
    const paths = routes.map(r => r.path);
    const uniquePaths = new Set(paths);
    if (paths.length !== uniquePaths.size) {
      throw new Error('模块路由路径必须唯一');
    }
  }

  /**
   * 获取模块的所有路由
   */
  getAllRoutes(): Array<{ moduleId: string; route: any }> {
    const routes: Array<{ moduleId: string; route: any }> = [];
    
    for (const [id, instance] of this.modules.entries()) {
      if (this.activeModules.has(id)) {
        for (const route of instance.definition.routes) {
          routes.push({ moduleId: id, route });
        }
      }
    }

    return routes;
  }
}

// 导出单例
export const moduleManager = new ModuleManager();

