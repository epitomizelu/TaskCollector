
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { Sidebar, MenuItem } from '../../../components/Sidebar';
import styles from './styles';

const HomeScreen = () => {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // 模拟刷新数据
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUserAvatarPress = () => {
    router.push('/ilove-reciting-profile' as any);
  };

  const handleNotificationPress = () => {
    console.log('通知功能暂未实现');
  };

  const handleStartLearningPress = () => {
    router.push('/ilove-reciting-home' as any);
  };

  const handleCreatePlanPress = () => {
    router.push('/ilove-reciting-plan-create' as any);
  };

  const handleUploadContentPress = () => {
    router.push('/ilove-reciting-content-manage' as any);
  };

  const handleReviewPlanPress = () => {
    router.push('/ilove-reciting-profile' as any);
  };

  const handleViewAllPress = () => {
    router.push('/ilove-reciting-plan-list' as any);
  };

  const handleTodayTasksPress = () => {
    router.push('/ilove-reciting-home' as any);
  };

  const handleRecentItemPress = () => {
    router.push('/ilove-reciting-task-detail' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* 顶部导航栏 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setSidebarVisible(true)}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="bars" size={20} color="#6366f1" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <View style={styles.userInfo}>
              <TouchableOpacity onPress={handleUserAvatarPress}>
                <Image
                  source={{ uri: 'https://s.coze.cn/image/QNj7CdLeSXw/' }}
                  style={styles.userAvatar}
                />
              </TouchableOpacity>
              <View style={styles.userGreeting}>
                <Text style={styles.greetingText}>早上好，小明</Text>
                <Text style={styles.subtitleText}>继续你的学习之旅</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.notificationButton} onPress={handleNotificationPress}>
              <FontAwesome6 name="bell" size={20} color="#6B7280" />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 学习数据概览 */}
        <View style={styles.learningOverview}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statContent}>
                <View>
                  <Text style={styles.statLabel}>总学习时长</Text>
                  <Text style={styles.statValue}>128</Text>
                  <Text style={styles.statUnit}>小时</Text>
                </View>
                <View style={[styles.statIcon, styles.primaryIconBg]}>
                  <FontAwesome6 name="clock" size={20} color="#4F46E5" />
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statContent}>
                <View>
                  <Text style={styles.statLabel}>已完成任务</Text>
                  <Text style={[styles.statValue, styles.tertiaryValue]}>246</Text>
                  <Text style={styles.statUnit}>个</Text>
                </View>
                <View style={[styles.statIcon, styles.tertiaryIconBg]}>
                  <FontAwesome6 name="circle-check" size={20} color="#10B981" />
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statContent}>
                <View>
                  <Text style={styles.statLabel}>连续学习</Text>
                  <Text style={[styles.statValue, styles.secondaryValue]}>15</Text>
                  <Text style={styles.statUnit}>天</Text>
                </View>
                <View style={[styles.statIcon, styles.secondaryIconBg]}>
                  <FontAwesome6 name="fire" size={20} color="#06B6D4" />
                </View>
              </View>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statContent}>
                <View>
                  <Text style={styles.statLabel}>记忆内容</Text>
                  <Text style={[styles.statValue, styles.warningValue]}>12</Text>
                  <Text style={styles.statUnit}>个</Text>
                </View>
                <View style={[styles.statIcon, styles.warningIconBg]}>
                  <FontAwesome6 name="book" size={20} color="#F59E0B" />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 今日任务概览 */}
        <View style={styles.todayTasksSection}>
          <TouchableOpacity style={styles.todayTasksCard} onPress={handleTodayTasksPress}>
            <View style={styles.todayTasksHeader}>
              <Text style={styles.todayTasksTitle}>今日任务</Text>
              <Text style={styles.todayDate}>12月28日</Text>
            </View>

            <View style={styles.taskProgress}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>完成进度</Text>
                <Text style={styles.progressValue}>3/8 已完成</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar} />
              </View>
            </View>

            <View style={styles.taskStats}>
              <View style={styles.taskStatItem}>
                <Text style={styles.taskStatNumber}>8</Text>
                <Text style={styles.taskStatLabel}>总任务</Text>
              </View>
              <View style={styles.taskStatItem}>
                <Text style={[styles.taskStatNumber, styles.tertiaryValue]}>3</Text>
                <Text style={styles.taskStatLabel}>已完成</Text>
              </View>
              <View style={styles.taskStatItem}>
                <Text style={[styles.taskStatNumber, styles.warningValue]}>5</Text>
                <Text style={styles.taskStatLabel}>待完成</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* 快捷入口 */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>快捷操作</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionCard} onPress={handleStartLearningPress}>
              <View style={[styles.quickActionIcon, styles.primaryIconBg]}>
                <FontAwesome6 name="play" size={20} color="#4F46E5" />
              </View>
              <Text style={styles.quickActionTitle}>开始学习</Text>
              <Text style={styles.quickActionSubtitle}>继续今日任务</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleCreatePlanPress}>
              <View style={[styles.quickActionIcon, styles.secondaryIconBg]}>
                <FontAwesome6 name="calendar-plus" size={20} color="#06B6D4" />
              </View>
              <Text style={styles.quickActionTitle}>制定计划</Text>
              <Text style={styles.quickActionSubtitle}>创建新的背诵计划</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleUploadContentPress}>
              <View style={[styles.quickActionIcon, styles.tertiaryIconBg]}>
                <FontAwesome6 name="upload" size={20} color="#10B981" />
              </View>
              <Text style={styles.quickActionTitle}>上传内容</Text>
              <Text style={styles.quickActionSubtitle}>添加音频或文档</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionCard} onPress={handleReviewPlanPress}>
              <View style={[styles.quickActionIcon, styles.warningIconBg]}>
                <FontAwesome6 name="chart-line" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.quickActionTitle}>学习统计</Text>
              <Text style={styles.quickActionSubtitle}>查看学习数据</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 最近学习 */}
        <View style={styles.recentLearningSection}>
          <View style={styles.recentLearningHeader}>
            <Text style={styles.sectionTitle}>最近学习</Text>
            <TouchableOpacity onPress={handleViewAllPress}>
              <Text style={styles.viewAllButton}>查看全部</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recentItems}>
            <TouchableOpacity style={styles.recentItem} onPress={handleRecentItemPress}>
              <View style={styles.recentItemContent}>
                <View style={[styles.recentItemIcon, styles.primaryIconBg]}>
                  <FontAwesome6 name="file-audio" size={16} color="#4F46E5" />
                </View>
                <View style={styles.recentItemInfo}>
                  <Text style={styles.recentItemTitle}>英语单词 - 第3单元</Text>
                  <Text style={styles.recentItemSubtitle}>已完成 15/20 个单词</Text>
                </View>
              </View>
              <View style={styles.recentItemRight}>
                <Text style={styles.recentItemDate}>昨天</Text>
                <View style={[styles.recentItemStatus, styles.completedStatus]}>
                  <FontAwesome6 name="check" size={10} color="#10B981" />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.recentItem} onPress={handleRecentItemPress}>
              <View style={styles.recentItemContent}>
                <View style={[styles.recentItemIcon, styles.secondaryIconBg]}>
                  <FontAwesome6 name="file-lines" size={16} color="#06B6D4" />
                </View>
                <View style={styles.recentItemInfo}>
                  <Text style={styles.recentItemTitle}>古文背诵 - 出师表</Text>
                  <Text style={styles.recentItemSubtitle}>已完成 3/8 段</Text>
                </View>
              </View>
              <View style={styles.recentItemRight}>
                <Text style={styles.recentItemDate}>2天前</Text>
                <View style={[styles.recentItemStatus, styles.pendingStatus]}>
                  <FontAwesome6 name="clock" size={10} color="#F59E0B" />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 底部间距 */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* 侧边栏 */}
      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        menuItems={[
          {
            id: 'app-home',
            label: '回到APP首页',
            icon: 'grid',
            path: '/module-home',
          },
          {
            id: 'core-function',
            label: '我的计划',
            icon: 'calendar-days',
            path: '/ilove-reciting-plan-list',
          },
          {
            id: 'full-home',
            label: '完整首页',
            icon: 'house',
            path: '/ilove-reciting-full-home',
          },
        ]}
        moduleName="我爱背书"
        moduleIcon="book"
      />
    </SafeAreaView>
  );
};

export default HomeScreen;
