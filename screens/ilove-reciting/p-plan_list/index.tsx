

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import styles from './styles';
import PlanStatsCard from './components/PlanStatsCard';
import PlanItem from './components/PlanItem';

interface PlanData {
  id: string;
  title: string;
  content: string;
  period: number;
  startDate: string;
  completedDate?: string;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  totalDays: number;
  todayTask: string;
  todayStatus: 'completed' | 'pending' | 'expired';
  memoryEffect?: string;
}

const PlanListScreen: React.FC = () => {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const planStatsData = {
    totalPlans: 5,
    activePlans: 2,
    completedPlans: 3,
  };

  const planListData: PlanData[] = [
    {
      id: 'plan-001',
      title: '英语单词背诵计划',
      content: '大学英语四级词汇 - 第3单元',
      period: 30,
      startDate: '12月15日',
      status: 'active',
      progress: 13,
      totalDays: 30,
      todayTask: '3个单词',
      todayStatus: 'pending',
    },
    {
      id: 'plan-002',
      title: '古文背诵 - 出师表',
      content: '诸葛亮《出师表》全文',
      period: 15,
      startDate: '12月20日',
      status: 'active',
      progress: 8,
      totalDays: 15,
      todayTask: '1段背诵',
      todayStatus: 'completed',
    },
    {
      id: 'plan-003',
      title: '唐诗三百首 - 精选',
      content: '唐诗三百首精选50首',
      period: 50,
      startDate: '11月1日',
      completedDate: '12月10日',
      status: 'completed',
      progress: 50,
      totalDays: 50,
      todayTask: '',
      todayStatus: 'completed',
      memoryEffect: '优秀',
    },
    {
      id: 'plan-004',
      title: '商务英语口语',
      content: '商务英语900句 - 第1部分',
      period: 45,
      startDate: '10月10日',
      completedDate: '11月25日',
      status: 'completed',
      progress: 45,
      totalDays: 45,
      todayTask: '',
      todayStatus: 'completed',
      memoryEffect: '良好',
    },
    {
      id: 'plan-005',
      title: '高中文言文 - 必修一',
      content: '高中语文必修一文言文',
      period: 30,
      startDate: '10月10日',
      completedDate: '11月10日',
      status: 'completed',
      progress: 30,
      totalDays: 30,
      todayTask: '',
      todayStatus: 'completed',
      memoryEffect: '优秀',
    },
  ];

  const handleBackPress = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

  const handleCreatePlanPress = useCallback(() => {
    router.push('/ilove-reciting-plan-create' as any);
  }, [router]);

  const handlePlanItemPress = useCallback((planId: string) => {
    console.log('点击计划项:', planId);
    // 计划详情页暂不在本次PRD范围内，仅做UI展示
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 模拟刷新数据
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('刷新失败:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const renderPlanProgressBar = useCallback((progress: number, total: number, status: string) => {
    const progressPercentage = (progress / total) * 100;
    
    if (status === 'completed') {
      return (
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarCompleted, { width: `${progressPercentage}%` }]} />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <LinearGradient
            colors={['#4F46E5', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBarActive, { width: `${progressPercentage}%` }]}
          />
        </View>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="arrow-left" size={18} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>我的计划</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 计划统计概览 */}
        <View style={styles.statsSection}>
          <PlanStatsCard
            totalPlans={planStatsData.totalPlans}
            activePlans={planStatsData.activePlans}
            completedPlans={planStatsData.completedPlans}
          />
        </View>

        {/* 计划列表 */}
        <View style={styles.planListSection}>
          <View style={styles.planListHeader}>
            <Text style={styles.planListTitle}>我的背诵计划</Text>
            <Text style={styles.planCount}>共{planStatsData.totalPlans}个计划</Text>
          </View>

          <View style={styles.planList}>
            {planListData.map((plan) => (
              <PlanItem
                key={plan.id}
                plan={plan}
                onPress={() => handlePlanItemPress(plan.id)}
                renderProgressBar={renderPlanProgressBar}
              />
            ))}
          </View>
        </View>

        {/* 制定新计划按钮 */}
        <View style={styles.createPlanSection}>
          <TouchableOpacity
            style={styles.createPlanButton}
            onPress={handleCreatePlanPress}
            activeOpacity={0.8}
          >
            <FontAwesome6 name="plus" size={16} color="#FFFFFF" style={styles.createPlanIcon} />
            <Text style={styles.createPlanText}>制定新计划</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PlanListScreen;

