/**
 * 应用外壳组件 - 管理模块化应用的核心逻辑
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { moduleRegistry } from './module-registry';
import { moduleManager } from './module-manager';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * 应用外壳组件
 * 负责初始化模块系统并管理模块生命周期
 */
export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    initializeModules();
  }, []);

  /**
   * 初始化所有模块
   */
  const initializeModules = async () => {
    try {
      console.log('开始初始化模块系统...');
      
      // 注册所有模块
      await moduleRegistry.registerAllModules();
      
      // 激活所有已启用的模块
      const activeModules = moduleManager.getActiveModules();
      console.log(`已激活 ${activeModules.length} 个模块`);
      
      // 如果没有激活的模块，记录警告但不抛出错误
      if (activeModules.length === 0) {
        console.warn('没有激活的模块，应用将显示模块选择页面');
      }
      
      setIsInitializing(false);
      console.log('模块系统初始化完成');
    } catch (error) {
      console.error('模块系统初始化失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setInitError(new Error(errorMessage));
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={{ marginTop: 16, color: '#6b7280' }}>正在初始化应用...</Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', padding: 20 }}>
        <Text style={{ color: '#ef4444', fontSize: 16, marginBottom: 8 }}>初始化失败</Text>
        <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
          {initError.message}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

