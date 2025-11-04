

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, Platform, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from './styles';

interface Task {
  id: string;
  title: string;
  time: string;
  status: 'completed' | 'in-progress';
  details: {
    originalRecord: string;
    metrics: string;
  };
}

interface StatCardProps {
  value: string;
  label: string;
}

interface TaskCardProps {
  task: Task;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

interface AchievementCardProps {
  icon: string;
  title: string;
  subtitle: string;
  backgroundColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ value, label }) => {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
};

const TaskCard: React.FC<TaskCardProps> = ({ task, isExpanded, onToggleExpand }) => {
  return (
    <View style={[styles.taskCard, isExpanded && styles.taskCardExpanded]}>
      <View style={styles.taskCardHeader}>
        <View style={styles.taskInfo}>
          <View style={[
            styles.taskStatusIcon,
            task.status === 'completed' ? styles.taskStatusCompleted : styles.taskStatusInProgress
          ]}>
            <FontAwesome6
              name={task.status === 'completed' ? 'check' : 'clock'}
              size={14}
              color="#ffffff"
            />
          </View>
          <View style={styles.taskDetails}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskTime}>{task.time}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.expandButton}
          onPress={onToggleExpand}
          activeOpacity={0.7}
        >
          <FontAwesome6
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="#6b7280"
          />
        </TouchableOpacity>
      </View>
      {isExpanded && (
        <View style={styles.taskDetailsExpanded}>
          <Text style={styles.taskDetailText}>
            <Text style={styles.taskDetailLabel}>原始记录：</Text>
            {task.details.originalRecord}
          </Text>
          <Text style={styles.taskDetailText}>
            <Text style={styles.taskDetailLabel}>
              {task.title.includes('阅读') ? '时长：' : 
               task.title.includes('晨跑') || task.title.includes('俯卧撑') ? '数量：' : 
               task.title.includes('午餐') ? '营养：' : '预计时长：'}
            </Text>
            {task.details.metrics}
          </Text>
        </View>
      )}
    </View>
  );
};

const AchievementCard: React.FC<AchievementCardProps> = ({
  icon,
  title,
  subtitle,
  backgroundColor,
}) => {
  return (
    <View style={styles.achievementCard}>
      <View style={[styles.achievementIcon, { backgroundColor }]}>
        <FontAwesome6 name={icon} size={18} color="#ffffff" />
      </View>
      <Text style={styles.achievementTitle}>{title}</Text>
      <Text style={styles.achievementSubtitle}>{subtitle}</Text>
    </View>
  );
};

interface TaskData {
  taskId: string;
  rawText: string;
  taskName: string;
  completionTime: string;
  quantity: { [key: string]: number };
  recordDate: string;
  recordMonth: string;
  recordYear: string;
}

const ReportViewScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const reportType = (params.type as string) || 'today';

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [todayStats, setTodayStats] = useState({ total: 0, completed: 0, rate: '0%' });

  // 从 AsyncStorage 加载今日任务数据
  const loadTodayTasks = async () => {
    try {
      const tasksJson = await AsyncStorage.getItem('@taskCollection');
      if (tasksJson) {
        const allTasks: TaskData[] = JSON.parse(tasksJson);
        const today = new Date().toISOString().split('T')[0];
        const todayTasksData = allTasks.filter(task => task.recordDate === today);

        // 转换为 Task 格式
        const convertedTasks: Task[] = todayTasksData.map(task => {
          const timePart = task.completionTime.includes(' ') 
            ? task.completionTime.split(' ')[1] 
            : task.completionTime;
          
          // 格式化数量信息
          const quantityKeys = Object.keys(task.quantity);
          const metrics = quantityKeys.length > 0
            ? `${task.quantity[quantityKeys[0]]}${quantityKeys[0]}`
            : '';

          return {
            id: task.taskId,
            title: task.taskName,
            time: `${timePart} 完成`,
            status: 'completed' as const,
            details: {
              originalRecord: task.rawText,
              metrics: metrics,
            },
          };
        });

        setTodayTasks(convertedTasks);
        setTodayStats({
          total: convertedTasks.length,
          completed: convertedTasks.length,
          rate: convertedTasks.length > 0 ? '100%' : '0%'
        });
      } else {
        setTodayTasks([]);
        setTodayStats({ total: 0, completed: 0, rate: '0%' });
      }
    } catch (error) {
      console.error('加载今日任务失败:', error);
      setTodayTasks([]);
      setTodayStats({ total: 0, completed: 0, rate: '0%' });
    }
  };

  useEffect(() => {
    if (reportType === 'today') {
      loadTodayTasks();
    }
  }, [reportType]);

  useFocusEffect(
    React.useCallback(() => {
      if (reportType === 'today') {
        loadTodayTasks();
      }
    }, [reportType])
  );

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleToggleTaskExpand = (taskId: string) => {
    const newExpandedTasks = new Set(expandedTasks);
    if (newExpandedTasks.has(taskId)) {
      newExpandedTasks.delete(taskId);
    } else {
      newExpandedTasks.add(taskId);
    }
    setExpandedTasks(newExpandedTasks);
  };

  const handleSharePress = () => {
    setIsShareModalVisible(true);
  };

  const handleShareOptionPress = (shareType: string) => {
    let message = '';
    switch (shareType) {
      case 'wechat':
        message = '已分享到微信';
        break;
      case 'moments':
        message = '已分享到朋友圈';
        break;
      case 'qq':
        message = '已分享到QQ';
        break;
      case 'copy':
        message = '链接已复制到剪贴板';
        break;
    }
    Alert.alert('分享成功', message);
    setIsShareModalVisible(false);
  };

  const handleCopyAsciiReport = async () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const taskListText = todayTasks.length > 0
      ? todayTasks.map(task => `│ [✓] ${task.title} - ${task.time}`).join('\n')
      : '│ 今天还没有任务记录';
    
    const asciiText = `┌─────────────────────────────────────────────────────────────┐
│                      ${todayStr} 任务打卡                      │
├─────────────────────────────────────────────────────────────┤
│ 今日概览：                                                  │
│ 总任务：${todayStats.total} 个 | 已完成：${todayStats.completed} 个 | 完成率：${todayStats.rate}                  │
├─────────────────────────────────────────────────────────────┤
│ 任务列表：                                                  │
${taskListText}
├─────────────────────────────────────────────────────────────┤
│ 今日成就：                                                  │
│ 连续打卡：7天 | 本月最佳：25个任务                         │
└─────────────────────────────────────────────────────────────┘`;
    
    try {
      await Clipboard.setStringAsync(asciiText);
      Alert.alert('复制成功', 'ASCII报表已复制到剪贴板');
    } catch (error) {
      Alert.alert('复制失败', '请重试');
    }
  };

  const getPageTitle = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    
    switch (reportType) {
      case 'today':
        return `${todayStr} 任务打卡 ✨`;
      case 'month':
        return `${year}年${month}月月度报表 📊`;
      case 'year':
        return `${year}年度报表 🎯`;
      case 'ascii':
        return 'ASCII 任务报表 📋';
      default:
        return `${todayStr} 任务打卡 ✨`;
    }
  };

  const getShareButtonText = () => {
    switch (reportType) {
      case 'today':
        return '分享今日成果';
      case 'month':
        return '分享月度成果';
      case 'year':
        return '分享年度成果';
      case 'ascii':
        return '分享ASCII报表';
      default:
        return '分享成果';
    }
  };

  const renderTodayReport = () => (
    <View style={styles.reportContent}>
      {/* 今日概览卡片 */}
      <LinearGradient
        colors={['#4f46e5', '#7c3aed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.overviewCard}
      >
        <View style={styles.overviewHeader}>
          <Text style={styles.overviewTitle}>今日概览</Text>
          <View style={styles.floatingIcon}>
            <FontAwesome6 name="chart-line" size={24} color="rgba(255, 255, 255, 0.8)" />
          </View>
        </View>
        <View style={styles.overviewStats}>
          <StatCard value={todayStats.total.toString()} label="总任务" />
          <StatCard value={todayStats.completed.toString()} label="已完成" />
          <StatCard value={todayStats.rate} label="完成率" />
        </View>
      </LinearGradient>

      {/* 任务列表 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>今日任务</Text>
          <Text style={styles.taskCount}>共{todayTasks.length}个任务</Text>
        </View>
        {todayTasks.length > 0 ? (
          <View style={styles.taskList}>
            {todayTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isExpanded={expandedTasks.has(task.id)}
                onToggleExpand={() => handleToggleTaskExpand(task.id)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>今天还没有任务记录</Text>
            <Text style={styles.emptyStateSubtext}>去首页添加一些任务吧 ✨</Text>
          </View>
        )}
      </View>

      {/* 成就展示 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>今日成就</Text>
        <View style={styles.achievementsGrid}>
          <AchievementCard
            icon="fire"
            title="连续打卡"
            subtitle="7天"
            backgroundColor="#6366f1"
          />
          <AchievementCard
            icon="trophy"
            title="本月最佳"
            subtitle="25个任务"
            backgroundColor="#8b5cf6"
          />
        </View>
      </View>
    </View>
  );

  const renderMonthReport = () => (
    <View style={styles.reportContent}>
      {/* 月度概览卡片 */}
      <LinearGradient
        colors={['#4f46e5', '#7c3aed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.overviewCard}
      >
        <View style={styles.overviewHeader}>
          <Text style={styles.overviewTitle}>2025年11月概览</Text>
          <View style={styles.floatingIcon}>
            <FontAwesome5 name="calendar-alt" size={24} color="rgba(255, 255, 255, 0.8)" />
          </View>
        </View>
        <View style={styles.overviewStats}>
          <StatCard value="156" label="总任务" />
          <StatCard value="28" label="完成天数" />
          <StatCard value="+12%" label="环比增长" />
        </View>
      </LinearGradient>

      {/* 月度统计 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>月度统计</Text>
        <View style={styles.monthStatsGrid}>
          <View style={styles.monthStatCard}>
            <Text style={styles.monthStatValue}>5.6</Text>
            <Text style={styles.monthStatLabel}>日均任务</Text>
          </View>
          <View style={styles.monthStatCard}>
            <Text style={[styles.monthStatValue, { color: '#10b981' }]}>89%</Text>
            <Text style={styles.monthStatLabel}>完成率</Text>
          </View>
        </View>
      </View>

      {/* 月度成就 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>本月成就</Text>
        <View style={styles.monthAchievementsList}>
          <View style={styles.monthAchievementCard}>
            <View style={[styles.monthAchievementIcon, { backgroundColor: '#f59e0b' }]}>
              <FontAwesome6 name="medal" size={16} color="#ffffff" />
            </View>
            <View style={styles.monthAchievementText}>
              <Text style={styles.monthAchievementTitle}>全勤达人</Text>
              <Text style={styles.monthAchievementSubtitle}>连续30天打卡</Text>
            </View>
          </View>
          <View style={styles.monthAchievementCard}>
            <View style={[styles.monthAchievementIcon, { backgroundColor: '#3b82f6' }]}>
              <FontAwesome6 name="rocket" size={16} color="#ffffff" />
            </View>
            <View style={styles.monthAchievementText}>
              <Text style={styles.monthAchievementTitle}>效率之星</Text>
              <Text style={styles.monthAchievementSubtitle}>单日完成12个任务</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderYearReport = () => (
    <View style={styles.reportContent}>
      {/* 年度概览卡片 */}
      <LinearGradient
        colors={['#4f46e5', '#7c3aed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.overviewCard}
      >
        <View style={styles.overviewHeader}>
          <Text style={styles.overviewTitle}>2025年度概览</Text>
          <View style={styles.floatingIcon}>
            <FontAwesome6 name="chart-bar" size={24} color="rgba(255, 255, 255, 0.8)" />
          </View>
        </View>
        <View style={styles.overviewStats}>
          <StatCard value="1,825" label="总任务" />
          <StatCard value="342" label="完成天数" />
          <StatCard value="+18%" label="同比增长" />
        </View>
      </LinearGradient>

      {/* 年度统计 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>年度统计</Text>
        <View style={styles.yearStatsGrid}>
          <View style={styles.yearStatCard}>
            <Text style={styles.yearStatValue}>5.0</Text>
            <Text style={styles.yearStatLabel}>日均任务</Text>
          </View>
          <View style={styles.yearStatCard}>
            <Text style={[styles.yearStatValue, { color: '#10b981' }]}>94%</Text>
            <Text style={styles.yearStatLabel}>完成率</Text>
          </View>
        </View>
      </View>

      {/* 年度里程碑 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>年度里程碑</Text>
        <View style={styles.yearMilestonesList}>
          <View style={styles.yearMilestoneCard}>
            <View style={[styles.yearMilestoneIcon, { backgroundColor: '#ef4444' }]}>
              <FontAwesome6 name="crown" size={16} color="#ffffff" />
            </View>
            <View style={styles.yearMilestoneText}>
              <Text style={styles.yearMilestoneTitle}>千级成就</Text>
              <Text style={styles.yearMilestoneSubtitle}>累计完成1000个任务</Text>
            </View>
          </View>
          <View style={styles.yearMilestoneCard}>
            <View style={[styles.yearMilestoneIcon, { backgroundColor: '#8b5cf6' }]}>
              <FontAwesome6 name="calendar-check" size={16} color="#ffffff" />
            </View>
            <View style={styles.yearMilestoneText}>
              <Text style={styles.yearMilestoneTitle}>百日坚持</Text>
              <Text style={styles.yearMilestoneSubtitle}>连续100天打卡</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderAsciiReport = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const taskListText = todayTasks.length > 0
      ? todayTasks.map(task => `│ [✓] ${task.title} - ${task.time}`).join('\n')
      : '│ 今天还没有任务记录';
    
    const asciiText = `┌─────────────────────────────────────────────────────────────┐
│                      ${todayStr} 任务打卡                      │
├─────────────────────────────────────────────────────────────┤
│ 今日概览：                                                  │
│ 总任务：${todayStats.total} 个 | 已完成：${todayStats.completed} 个 | 完成率：${todayStats.rate}                  │
├─────────────────────────────────────────────────────────────┤
│ 任务列表：                                                  │
${taskListText}
├─────────────────────────────────────────────────────────────┤
│ 今日成就：                                                  │
│ 连续打卡：7天 | 本月最佳：25个任务                         │
└─────────────────────────────────────────────────────────────┘`;

    return (
      <View style={styles.reportContent}>
        <View style={styles.asciiCard}>
          <Text style={styles.asciiTitle}>ASCII 任务报表</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text style={styles.asciiText}>
              {asciiText}
            </Text>
          </ScrollView>
          <View style={styles.asciiButtonContainer}>
            <TouchableOpacity
              style={styles.copyAsciiButton}
              onPress={handleCopyAsciiReport}
              activeOpacity={0.8}
            >
              <FontAwesome6 name="copy" size={14} color="#ffffff" style={styles.copyIcon} />
              <Text style={styles.copyAsciiButtonText}>复制ASCII报表</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderReportContent = () => {
    switch (reportType) {
      case 'today':
        return renderTodayReport();
      case 'month':
        return renderMonthReport();
      case 'year':
        return renderYearReport();
      case 'ascii':
        return renderAsciiReport();
      default:
        return renderTodayReport();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="arrow-left" size={16} color="#6b7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getPageTitle()}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* 主要内容区域 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderReportContent()}
      </ScrollView>

      {/* 底部分享按钮 */}
      <View style={styles.bottomShareContainer}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleSharePress}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="share-alt" size={18} color="#ffffff" style={styles.shareIcon} />
          <Text style={styles.shareButtonText}>{getShareButtonText()}</Text>
        </TouchableOpacity>
      </View>

      {/* 分享弹窗 */}
      <Modal
        visible={isShareModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsShareModalVisible(false)}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModalContent}>
            <View style={styles.shareModalHandle} />
            <Text style={styles.shareModalTitle}>分享到</Text>
            <View style={styles.shareOptionsGrid}>
              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShareOptionPress('wechat')}
                activeOpacity={0.7}
              >
                <View style={[styles.shareOptionIcon, { backgroundColor: '#10b981' }]}>
                  <FontAwesome6 name="weixin" size={20} color="#ffffff" />
                </View>
                <Text style={styles.shareOptionText}>微信</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShareOptionPress('moments')}
                activeOpacity={0.7}
              >
                <View style={[styles.shareOptionIcon, { backgroundColor: '#059669' }]}>
                  <FontAwesome6 name="users" size={20} color="#ffffff" />
                </View>
                <Text style={styles.shareOptionText}>朋友圈</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShareOptionPress('qq')}
                activeOpacity={0.7}
              >
                <View style={[styles.shareOptionIcon, { backgroundColor: '#3b82f6' }]}>
                  <FontAwesome6 name="qq" size={20} color="#ffffff" />
                </View>
                <Text style={styles.shareOptionText}>QQ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.shareOption}
                onPress={() => handleShareOptionPress('copy')}
                activeOpacity={0.7}
              >
                <View style={[styles.shareOptionIcon, { backgroundColor: '#6b7280' }]}>
                  <FontAwesome6 name="copy" size={20} color="#ffffff" />
                </View>
                <Text style={styles.shareOptionText}>复制</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.shareModalCancelButton}
              onPress={() => setIsShareModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.shareModalCancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ReportViewScreen;

