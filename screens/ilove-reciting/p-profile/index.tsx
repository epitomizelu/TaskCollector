

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
import styles from './styles';

const ProfileScreen = () => {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // 模拟刷新数据
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEditProfile = () => {
    console.log('需要实现个人资料编辑功能');
    // 注释：此功能需要个人资料编辑页面，在原型阶段仅做UI展示
  };

  const handleMyPlans = () => {
    router.push('/p-plan_list');
  };

  const handleSettings = () => {
    router.push('/p-settings');
  };

  const handleAboutUs = () => {
    router.push('/p-about_us');
  };

  const handleViewAll = () => {
    router.push('/p-plan_list');
  };

  const handleRecentItemPress = () => {
    router.push('/p-task_detail');
  };

  const memoryCurveData = [
    { day: '周一', height: 60 },
    { day: '周二', height: 80 },
    { day: '周三', height: 45 },
    { day: '周四', height: 90 },
    { day: '周五', height: 70 },
    { day: '周六', height: 55 },
    { day: '今天', height: 85 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* 顶部用户信息 */}
        <View style={styles.header}>
          <View style={styles.userProfile}>
            <TouchableOpacity onPress={handleEditProfile}>
              <Image
                source={{ uri: 'https://s.coze.cn/image/dQAMPR8dWlU/' }}
                style={styles.userAvatar}
              />
            </TouchableOpacity>
            <View style={styles.userInfo}>
              <TouchableOpacity onPress={handleEditProfile}>
                <Text style={styles.userName}>小明</Text>
              </TouchableOpacity>
              <Text style={styles.userLevel}>学习达人 Lv.5</Text>
              <View style={styles.experienceContainer}>
                <View style={styles.experienceBar}>
                  <View style={styles.experienceProgress} />
                </View>
                <Text style={styles.experienceText}>750/1000经验</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <FontAwesome6 name="pen" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 学习数据概览 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>学习数据</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statContent}>
                <View>
                  <Text style={styles.statLabel}>总学习时长</Text>
                  <Text style={styles.statValue}>128</Text>
                  <Text style={styles.statUnit}>小时</Text>
                </View>
                <View style={[styles.statIcon, styles.primaryIcon]}>
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
                <View style={[styles.statIcon, styles.tertiaryIcon]}>
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
                <View style={[styles.statIcon, styles.secondaryIcon]}>
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
                <View style={[styles.statIcon, styles.warningIcon]}>
                  <FontAwesome6 name="book" size={20} color="#F59E0B" />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 记忆曲线概览 */}
        <View style={styles.section}>
          <View style={styles.memoryCurveCard}>
            <View style={styles.memoryCurveHeader}>
              <Text style={styles.memoryCurveTitle}>记忆曲线概览</Text>
              <Text style={styles.curveDate}>最近7天</Text>
            </View>

            <View style={styles.memoryCurveChart}>
              <View style={styles.chartContainer}>
                {memoryCurveData.map((item, index) => (
                  <View key={index} style={styles.chartBarContainer}>
                    <View
                      style={[
                        styles.chartBar,
                        { height: `${item.height}%` }
                      ]}
                    />
                    <Text style={styles.chartLabel}>{item.day}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.memoryInsights}>
              <View style={styles.insightItem}>
                <Text style={[styles.insightValue, styles.primaryValue]}>85%</Text>
                <Text style={styles.insightLabel}>平均记忆率</Text>
              </View>
              <View style={styles.insightItem}>
                <Text style={[styles.insightValue, styles.tertiaryValue]}>12</Text>
                <Text style={styles.insightLabel}>复习次数</Text>
              </View>
              <View style={styles.insightItem}>
                <Text style={[styles.insightValue, styles.secondaryValue]}>7</Text>
                <Text style={styles.insightLabel}>记忆内容</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 功能列表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>功能中心</Text>
          <View style={styles.functionList}>
            <TouchableOpacity style={styles.functionItem} onPress={handleMyPlans}>
              <View style={styles.functionContent}>
                <View style={styles.functionLeft}>
                  <View style={[styles.functionIcon, styles.primaryIcon]}>
                    <FontAwesome6 name="calendar-days" size={18} color="#4F46E5" />
                  </View>
                  <View style={styles.functionText}>
                    <Text style={styles.functionTitle}>我的计划</Text>
                    <Text style={styles.functionSubtitle}>查看和管理背诵计划</Text>
                  </View>
                </View>
                <FontAwesome6 name="chevron-right" size={14} color="#6B7280" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.functionItem} onPress={handleSettings}>
              <View style={styles.functionContent}>
                <View style={styles.functionLeft}>
                  <View style={[styles.functionIcon, styles.secondaryIcon]}>
                    <FontAwesome6 name="gear" size={18} color="#06B6D4" />
                  </View>
                  <View style={styles.functionText}>
                    <Text style={styles.functionTitle}>设置</Text>
                    <Text style={styles.functionSubtitle}>应用设置和偏好</Text>
                  </View>
                </View>
                <FontAwesome6 name="chevron-right" size={14} color="#6B7280" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.functionItem} onPress={handleAboutUs}>
              <View style={styles.functionContent}>
                <View style={styles.functionLeft}>
                  <View style={[styles.functionIcon, styles.tertiaryIcon]}>
                    <FontAwesome6 name="circle-info" size={18} color="#10B981" />
                  </View>
                  <View style={styles.functionText}>
                    <Text style={styles.functionTitle}>关于我们</Text>
                    <Text style={styles.functionSubtitle}>版本信息和帮助</Text>
                  </View>
                </View>
                <FontAwesome6 name="chevron-right" size={14} color="#6B7280" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 最近学习 */}
        <View style={styles.section}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>最近学习</Text>
            <TouchableOpacity onPress={handleViewAll}>
              <Text style={styles.viewAllButton}>查看全部</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recentList}>
            <TouchableOpacity style={styles.recentItem} onPress={handleRecentItemPress}>
              <View style={styles.recentContent}>
                <View style={styles.recentLeft}>
                  <View style={[styles.recentIcon, styles.primaryIcon]}>
                    <FontAwesome6 name="file-audio" size={18} color="#4F46E5" />
                  </View>
                  <View style={styles.recentText}>
                    <Text style={styles.recentTitle}>英语单词 - 第3单元</Text>
                    <Text style={styles.recentSubtitle}>已完成 15/20 个单词</Text>
                  </View>
                </View>
                <View style={styles.recentRight}>
                  <Text style={styles.recentDate}>昨天</Text>
                  <View style={[styles.recentStatus, styles.completedStatus]}>
                    <FontAwesome6 name="check" size={10} color="#10B981" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.recentItem} onPress={handleRecentItemPress}>
              <View style={styles.recentContent}>
                <View style={styles.recentLeft}>
                  <View style={[styles.recentIcon, styles.secondaryIcon]}>
                    <FontAwesome6 name="file-lines" size={18} color="#06B6D4" />
                  </View>
                  <View style={styles.recentText}>
                    <Text style={styles.recentTitle}>古文背诵 - 出师表</Text>
                    <Text style={styles.recentSubtitle}>已完成 3/8 段</Text>
                  </View>
                </View>
                <View style={styles.recentRight}>
                  <Text style={styles.recentDate}>2天前</Text>
                  <View style={[styles.recentStatus, styles.pendingStatus]}>
                    <FontAwesome6 name="clock" size={10} color="#F59E0B" />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

