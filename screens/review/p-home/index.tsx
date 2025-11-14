import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { Sidebar, MenuItem } from '../../../components/Sidebar';
import { reviewService, ReviewData, ReviewType } from '../../../services/review.service';
import styles from './styles';

const ReviewHomeScreen = () => {
  const router = useRouter();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [stats, setStats] = useState({
    daily: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
  });
  const isFirstLoad = useRef(true);

  useFocusEffect(
    React.useCallback(() => {
      const skipLoading = !isFirstLoad.current;
      if (isFirstLoad.current) {
        isFirstLoad.current = false;
      }
      loadData(skipLoading);
    }, [])
  );

  const loadData = async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setIsLoading(true);
      }

      const allReviews = await reviewService.getAllReviews();
      setReviews(allReviews);

      setStats({
        daily: allReviews.filter(r => r.type === 'daily').length,
        weekly: allReviews.filter(r => r.type === 'weekly').length,
        monthly: allReviews.filter(r => r.type === 'monthly').length,
        yearly: allReviews.filter(r => r.type === 'yearly').length,
      });
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      if (!skipLoading) {
        setIsLoading(false);
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleReviewTypePress = (type: ReviewType) => {
    switch (type) {
      case 'daily':
        router.push('/review-daily' as any);
        break;
      case 'weekly':
        router.push('/review-weekly' as any);
        break;
      case 'monthly':
        router.push('/review-monthly' as any);
        break;
      case 'yearly':
        router.push('/review-yearly' as any);
        break;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* 顶部标题 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setSidebarVisible(true)}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="bars" size={20} color="#6366f1" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>复盘</Text>
            <Text style={styles.subtitle}>记录成长轨迹</Text>
          </View>
        </View>

        {/* 统计卡片 */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => handleReviewTypePress('daily')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIcon, styles.primaryIconBg]}>
                <FontAwesome6 name="sun" size={24} color="#6366f1" />
              </View>
              <Text style={styles.statValue}>{stats.daily}</Text>
              <Text style={styles.statLabel}>日复盘</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => handleReviewTypePress('weekly')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIcon, styles.secondaryIconBg]}>
                <FontAwesome6 name="calendar-week" size={24} color="#06B6D4" />
              </View>
              <Text style={styles.statValue}>{stats.weekly}</Text>
              <Text style={styles.statLabel}>周复盘</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => handleReviewTypePress('monthly')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIcon, styles.tertiaryIconBg]}>
                <FontAwesome6 name="calendar" size={24} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{stats.monthly}</Text>
              <Text style={styles.statLabel}>月复盘</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => handleReviewTypePress('yearly')}
              activeOpacity={0.7}
            >
              <View style={[styles.statIcon, styles.quaternaryIconBg]}>
                <FontAwesome6 name="calendar-days" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{stats.yearly}</Text>
              <Text style={styles.statLabel}>年复盘</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 最近复盘 */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>最近复盘</Text>
          </View>

          {reviews.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="rotate-right" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>还没有复盘记录</Text>
              <Text style={styles.emptySubtext}>选择一个类型开始复盘</Text>
            </View>
          ) : (
            <View style={styles.reviewsList}>
              {reviews.slice(0, 5).map((review) => (
                <TouchableOpacity
                  key={review.reviewId}
                  style={styles.reviewCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.reviewContent}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewType}>
                        {review.type === 'daily' ? '日复盘' :
                         review.type === 'weekly' ? '周复盘' :
                         review.type === 'monthly' ? '月复盘' : '年复盘'}
                      </Text>
                      <Text style={styles.reviewDate}>{review.date}</Text>
                    </View>
                    {review.rating && (
                      <View style={styles.ratingContainer}>
                        <FontAwesome6 name="star" size={12} color="#F59E0B" />
                        <Text style={styles.ratingText}>{review.rating}/10</Text>
                      </View>
                    )}
                  </View>
                  <FontAwesome6 name="chevron-right" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

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
        ]}
        moduleName="复盘"
        moduleIcon="rotate-right"
      />
    </SafeAreaView>
  );
};

export default ReviewHomeScreen;

