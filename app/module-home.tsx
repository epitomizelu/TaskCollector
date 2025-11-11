/**
 * 模块化首页 - 显示所有激活的模块
 * 用户可以在这里选择要使用的功能模块
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { moduleManager } from '../core/module-manager';
import { ModuleInstance } from '../types/module.types';
import { userService } from '../services/user.service';
import { Sidebar, MenuItem } from '../components/Sidebar';

const ModuleHome: React.FC = () => {
  const router = useRouter();
  const [modules, setModules] = useState<ModuleInstance[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [userNickname, setUserNickname] = useState<string>('');
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // 页面获取焦点时刷新模块列表
  useFocusEffect(
    React.useCallback(() => {
      loadModules();
    }, [])
  );

  useEffect(() => {
    loadModules();
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    await userService.initialize();
    const user = userService.getCurrentUser();
    if (user) {
      setUserNickname(user.nickname || user.phone || '用户');
    }
  };

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

  const handleLogout = () => {
    setIsLogoutModalVisible(true);
  };

  const handleLogoutConfirm = async () => {
    try {
      await userService.logout();
      setIsLogoutModalVisible(false);
      router.replace('/p-login-phone');
    } catch (error: any) {
      console.error('退出登录失败:', error);
      Alert.alert('错误', '退出登录失败，请重试');
    }
  };

  const handleLogoutCancel = () => {
    setIsLogoutModalVisible(false);
  };

  // 侧边栏菜单项
  const menuItems: MenuItem[] = [
    {
      id: 'app-update',
      label: '检查更新',
      icon: 'arrow-rotate-right',
      path: '/app-update',
    },
    {
      id: 'logout',
      label: '退出登录',
      icon: 'right-from-bracket',
      onPress: handleLogout,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setSidebarVisible(true)}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="bars" size={20} color="#6366f1" />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>功能模块</Text>
              <Text style={styles.subtitle}>
                {userNickname ? `欢迎，${userNickname}` : '选择要使用的功能'}
              </Text>
            </View>
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
        {modules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="inbox" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>暂无可用模块</Text>
          </View>
        ) : (
          <View style={styles.gridContainer}>
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
                ['#ec4899', '#f43f5e'], // 粉红
                ['#14b8a6', '#06b6d4'], // 青绿
                ['#a855f7', '#8b5cf6'], // 紫蓝
                ['#f97316', '#f59e0b'], // 橙色
              ];
              const colors = gradientColors[index % gradientColors.length];

              return (
                <TouchableOpacity
                  key={metadata.id}
                  style={styles.gridItem}
                  onPress={() => handleModulePress(moduleInstance)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gridCardGradient}
                  >
                    <View style={styles.gridCardContent}>
                      <View style={styles.gridIconContainer}>
                        <FontAwesome6 
                          name={navItem?.icon as any || 'circle'} 
                          size={32} 
                          color="#ffffff" 
                        />
                      </View>
                      <Text style={styles.gridModuleName} numberOfLines={2}>
                        {metadata.displayName}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 退出登录确认对话框 */}
      <Modal
        visible={isLogoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleLogoutCancel}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={handleLogoutCancel}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>退出登录</Text>
              <Text style={styles.modalMessage}>
                确定要退出当前账户吗？退出后需要重新登录才能继续使用应用。
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={handleLogoutCancel}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleLogoutConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalConfirmButtonText}>确认</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 侧边栏 */}
      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        menuItems={menuItems}
        moduleName="功能模块"
        moduleIcon="house"
      />
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
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '80%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '31%', // 3列布局，每列约31%宽度，留出间距
    aspectRatio: 1, // 保持正方形
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  gridCardGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridCardContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  gridIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridModuleName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 20,
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

