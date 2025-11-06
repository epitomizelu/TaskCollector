/**
 * 模块化首页 - 显示所有激活的模块
 * 用户可以在这里选择要使用的功能模块
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moduleManager } from '../core/module-manager';
import { ModuleInstance } from '../types/module.types';

const ModuleHome: React.FC = () => {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleInstance[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // 页面获取焦点时刷新模块列表
  useFocusEffect(
    React.useCallback(() => {
      loadModules();
    }, [])
  );

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = () => {
    const activeModules = moduleManager.getOrderedActiveModules();
    setModules(activeModules);
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadModules();
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);

  const handleModulePress = (moduleInstance: ModuleInstance) => {
    const navigationItem = moduleInstance.definition.getNavigationItem?.();
    if (navigationItem) {
      router.push(navigationItem.path as any);
    } else {
      // 如果没有导航项，跳转到第一个路由
      const firstRoute = moduleInstance.definition.routes[0];
      if (firstRoute) {
        router.push(firstRoute.path as any);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>功能模块</Text>
            <Text style={styles.subtitle}>选择要使用的功能</Text>
          </View>
          <View style={styles.headerIcon}>
            <FontAwesome6 name="grid" size={24} color="#6366f1" />
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {modules.map((moduleInstance, index) => {
          const { metadata, getNavigationItem } = moduleInstance.definition;
          const navItem = getNavigationItem?.();
          
          // 为不同模块使用不同的渐变色
          const gradientColors = [
            ['#4f46e5', '#7c3aed'], // 紫色
            ['#06b6d4', '#3b82f6'], // 蓝色
            ['#10b981', '#059669'], // 绿色
            ['#f59e0b', '#ef4444'], // 橙红
            ['#8b5cf6', '#ec4899'], // 粉紫
          ];
          const colors = gradientColors[index % gradientColors.length];

          return (
            <TouchableOpacity
              key={metadata.id}
              style={styles.moduleCard}
              onPress={() => handleModulePress(moduleInstance)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.cardContent}>
                  <View style={styles.iconContainer}>
                    <FontAwesome6 
                      name={navItem?.icon as any || 'circle'} 
                      size={28} 
                      color="#ffffff" 
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <View style={styles.moduleHeader}>
                      <Text style={styles.moduleName}>{metadata.displayName}</Text>
                      {metadata.tags && metadata.tags.length > 0 && (
                        <View style={styles.tagContainer}>
                          <Text style={styles.tagText}>{metadata.tags[0]}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.moduleDescription} numberOfLines={2}>
                      {metadata.description}
                    </Text>
                    {metadata.version && (
                      <Text style={styles.moduleVersion}>v{metadata.version}</Text>
                    )}
                  </View>
                  <View style={styles.arrowContainer}>
                    <FontAwesome6 name="chevron-right" size={16} color="#ffffff" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}

        {modules.length === 0 && (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="inbox" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>暂无可用模块</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  moduleCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardGradient: {
    padding: 20,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  moduleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  tagContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
  },
  moduleDescription: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
    marginBottom: 4,
  },
  moduleVersion: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  arrowContainer: {
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9ca3af',
  },
});

export default ModuleHome;

