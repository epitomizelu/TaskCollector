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
import { ideaService, IdeaData } from '../../../services/idea.service';
import styles from './styles';

const IdeaCollectorHomeScreen = () => {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ideas, setIdeas] = useState<IdeaData[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisMonth: 0,
  });
  const isFirstLoad = useRef(true);

  // 每次页面获得焦点时刷新数据
  useFocusEffect(
    React.useCallback(() => {
      // 首次加载显示loading，后续刷新不显示loading（静默刷新）
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
      
      // 从本地快速读取数据（不等待云端同步）
      const allIdeas = await ideaService.getAllIdeas();
      
      // 立即更新UI，不等待任何异步操作
      setIdeas(allIdeas);

      // 计算统计
      const today = new Date().toISOString().split('T')[0];
      const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      
      setStats({
        total: allIdeas.length,
        today: allIdeas.filter(idea => idea.recordDate === today).length,
        thisMonth: allIdeas.filter(idea => idea.recordMonth === thisMonth).length,
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

  const handleCreateIdea = () => {
    router.push('/idea-collector-create' as any);
  };

  const handleViewAll = () => {
    router.push('/idea-collector-list' as any);
  };

  const handleIdeaPress = (idea: IdeaData) => {
    router.push({
      pathname: '/idea-collector-detail',
      params: { ideaId: idea.ideaId },
    } as any);
  };

  // 获取今日全部想法
  const today = new Date().toISOString().split('T')[0];
  const todayIdeas = ideas.filter(idea => idea.recordDate === today);

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
          <View>
            <Text style={styles.title}>想法收集器</Text>
            <Text style={styles.subtitle}>记录你的每一个想法</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateIdea}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* 统计卡片 */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, styles.primaryIconBg]}>
                <FontAwesome6 name="lightbulb" size={24} color="#6366f1" />
              </View>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>总想法</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, styles.secondaryIconBg]}>
                <FontAwesome6 name="calendar-day" size={24} color="#06B6D4" />
              </View>
              <Text style={styles.statValue}>{stats.today}</Text>
              <Text style={styles.statLabel}>今日想法</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, styles.tertiaryIconBg]}>
                <FontAwesome6 name="calendar" size={24} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{stats.thisMonth}</Text>
              <Text style={styles.statLabel}>本月想法</Text>
            </View>
          </View>
        </View>

        {/* 今日想法 */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>今日想法</Text>
            <TouchableOpacity onPress={handleViewAll}>
              <Text style={styles.viewAllText}>我的想法</Text>
            </TouchableOpacity>
          </View>

          {todayIdeas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="lightbulb" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>今天还没有想法记录</Text>
              <Text style={styles.emptySubtext}>点击右上角按钮开始记录</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={handleCreateIdea}
              >
                <Text style={styles.emptyButtonText}>记录第一个想法</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.ideasList}>
              {todayIdeas.map((idea) => (
                <TouchableOpacity
                  key={idea.ideaId}
                  style={styles.ideaCard}
                  onPress={() => handleIdeaPress(idea)}
                  activeOpacity={0.7}
                >
                  <View style={styles.ideaContent}>
                    <Text style={styles.ideaText} numberOfLines={2}>
                      {idea.content}
                    </Text>
                    <View style={styles.ideaMeta}>
                      {idea.analysis && (
                        <View style={styles.analysisBadge}>
                          <FontAwesome6 name="brain" size={12} color="#6366f1" />
                          <Text style={styles.analysisBadgeText}>已分析</Text>
                        </View>
                      )}
                      {idea.tags && idea.tags.length > 0 && (
                        <View style={styles.tagsContainer}>
                          {idea.tags.slice(0, 2).map((tag, index) => (
                            <View key={index} style={styles.tag}>
                              <Text style={styles.tagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                  <FontAwesome6 name="chevron-right" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default IdeaCollectorHomeScreen;

