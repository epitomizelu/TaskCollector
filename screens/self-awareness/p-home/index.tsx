/**
 * 认识自己模块主页
 * 显示三个清单的入口
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { Sidebar, MenuItem } from '../../../components/Sidebar';
import styles from './styles';

const SelfAwarenessHomeScreen = () => {
  const router = useRouter();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const menuItems: MenuItem[] = [
    {
      id: 'app-home',
      label: '回到APP首页',
      icon: 'grid',
      path: '/module-home',
    },
    {
      id: 'teachers',
      label: '老师清单',
      icon: 'user-graduate',
      path: '/self-awareness-teachers',
    },
    {
      id: 'goals',
      label: '人生目标',
      icon: 'bullseye',
      path: '/self-awareness-goals',
    },
    {
      id: 'values',
      label: '价值观和原则',
      icon: 'heart',
      path: '/self-awareness-values',
    },
  ];

  const handleMenuItemPress = (path: string) => {
    setSidebarVisible(false);
    router.push(path as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setSidebarVisible(true)}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="bars" size={20} color="#6366f1" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <FontAwesome6 name="user-circle" size={24} color="#6366f1" />
          <Text style={styles.headerTitle}>认识自己</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* 主要内容区域 */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.description}>
            记录你的老师、目标和价值观，更好地认识自己
          </Text>

          {/* 三个清单卡片 */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/self-awareness-teachers' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.cardIconContainer}>
              <FontAwesome6 name="user-graduate" size={32} color="#6366f1" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>老师清单</Text>
              <Text style={styles.cardDescription}>
                记录你想学习和模仿的老师，包括他们的品质、领域和学习要点
              </Text>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/self-awareness-goals' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.cardIconContainer, styles.cardIconContainerGoals]}>
              <FontAwesome6 name="bullseye" size={32} color="#10b981" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>人生目标</Text>
              <Text style={styles.cardDescription}>
                记录你的人生目标，包括分类、优先级、状态和里程碑
              </Text>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/self-awareness-values' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.cardIconContainer, styles.cardIconContainerValues]}>
              <FontAwesome6 name="heart" size={32} color="#f59e0b" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>价值观和原则</Text>
              <Text style={styles.cardDescription}>
                记录你的价值观和原则，包括重要性、实例和应用场景
              </Text>
            </View>
            <FontAwesome6 name="chevron-right" size={16} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 侧边栏 */}
      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        menuItems={menuItems}
        moduleName="认识自己"
        moduleIcon="user-circle"
      />
    </SafeAreaView>
  );
};

export default SelfAwarenessHomeScreen;

