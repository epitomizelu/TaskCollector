
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert, Modal, Platform, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { Sidebar, MenuItem } from '../../../components/Sidebar';
import styles from './styles';
import TaskItem from './components/TaskItem';
import { Task, TaskType } from './types';

const TaskListScreen = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TaskType>('recite');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  // 模拟任务数据 - 按日期存储
  const [tasksByDate, setTasksByDate] = useState<Record<string, { recite: Task[]; review: Task[] }>>({
    [new Date().toISOString().split('T')[0]]: {
      recite: [
        {
          id: 'task_001',
          title: '英语单词 - 第3单元',
          description: '背诵 5 个新单词',
          icon: 'check',
          iconColor: '#22C55E',
          completed: true,
          completedAt: '09:30',
          estimatedTime: null,
        },
        {
          id: 'task_002',
          title: '古文背诵 - 出师表',
          description: '背诵第2段，共8句话',
          icon: 'file-lines',
          iconColor: '#22C55E',
          completed: true,
          completedAt: '10:15',
          estimatedTime: null,
        },
        {
          id: 'task_003',
          title: '英语口语 - 日常对话',
          description: '练习购物场景对话',
          icon: 'file-audio',
          iconColor: '#4F46E5',
          completed: false,
          completedAt: null,
          estimatedTime: '15 分钟',
        },
        {
          id: 'task_004',
          title: '法语单词 - 第1课',
          description: '背诵 8 个基础词汇',
          icon: 'language',
          iconColor: '#06B6D4',
          completed: false,
          completedAt: null,
          estimatedTime: '10 分钟',
        },
        {
          id: 'task_005',
          title: '普通话练习 - 绕口令',
          description: '练习"四是四，十是十"',
          icon: 'microphone',
          iconColor: '#F59E0B',
          completed: false,
          completedAt: null,
          estimatedTime: '8 分钟',
        },
      ],
      review: [
        {
          id: 'review_001',
          title: '英语单词 - 第2单元',
          description: '复习 10 个单词',
          icon: 'rotate-right',
          iconColor: '#22C55E',
          completed: true,
          completedAt: '14:20',
          estimatedTime: null,
        },
        {
          id: 'review_002',
          title: '古文背诵 - 岳阳楼记',
          description: '复习第3-4段',
          icon: 'rotate-right',
          iconColor: '#3B82F6',
          completed: false,
          completedAt: null,
          estimatedTime: '12 分钟',
        },
        {
          id: 'review_003',
          title: '英语口语 - 问候语',
          description: '复习日常问候对话',
          icon: 'rotate-right',
          iconColor: '#10B981',
          completed: false,
          completedAt: null,
          estimatedTime: '8 分钟',
        },
      ],
    },
  });

  // 获取当前日期字符串
  const getDateString = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // 获取当前选中日期的任务
  const getCurrentTasks = (): Task[] => {
    const dateKey = getDateString(selectedDate);
    const tasks = tasksByDate[dateKey];
    if (!tasks) return [];
    return activeTab === 'recite' ? tasks.recite : tasks.review;
  };

  // 格式化日期显示
  const formatDateDisplay = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    }
  };

  // 获取当前日期显示文本
  const getCurrentDateText = (): string => {
    return formatDateDisplay(selectedDate);
  };

  useEffect(() => {
    // 初始化时可以加载数据
  }, [selectedDate, activeTab]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // 模拟刷新数据
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      Alert.alert('刷新失败', '请检查网络连接后重试');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTabPress = (tab: TaskType) => {
    setActiveTab(tab);
  };

  const handleCalendarPress = () => {
    setIsDatePickerVisible(true);
  };

  const handleDateSelect = (dateType: 'today' | 'yesterday' | 'custom') => {
    const today = new Date();
    let newDate: Date;

    switch (dateType) {
      case 'today':
        newDate = today;
        break;
      case 'yesterday':
        newDate = new Date(today);
        newDate.setDate(today.getDate() - 1);
        break;
      case 'custom':
        // 这里可以添加自定义日期选择器
        // 暂时使用昨天作为示例
        newDate = new Date(today);
        newDate.setDate(today.getDate() - 1);
        break;
      default:
        newDate = today;
    }

    setSelectedDate(newDate);
    setIsDatePickerVisible(false);
  };

  const handleTaskPress = (taskId: string) => {
    router.push(`/ilove-reciting-task-detail?taskId=${taskId}` as any);
  };

  const handleCreatePlanPress = () => {
    router.push('/ilove-reciting-plan-create' as any);
  };

  const getCompletedCount = () => {
    const tasks = getCurrentTasks();
    return tasks.filter(task => task.completed).length;
  };

  const getTotalCount = () => {
    return getCurrentTasks().length;
  };

  const getSectionTitle = () => {
    return activeTab === 'recite' ? '背诵任务' : '复习任务';
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateIconContainer}>
        <FontAwesome6 name="list-check" size={48} color="#6B7280" />
      </View>
      <Text style={styles.emptyStateTitle}>
        {getDateString(selectedDate) === getDateString(new Date()) ? '今日暂无任务' : '该日期暂无任务'}
      </Text>
      <Text style={styles.emptyStateDescription}>快去制定学习计划吧</Text>
      <TouchableOpacity
        style={styles.createPlanButton}
        onPress={handleCreatePlanPress}
        activeOpacity={0.8}
      >
        <Text style={styles.createPlanButtonText}>制定计划</Text>
      </TouchableOpacity>
    </View>
  );

  const currentTasks = getCurrentTasks();

  // 侧边栏菜单项 - 只保留三个
  const menuItems: MenuItem[] = [
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
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }
      >
        {/* 顶部导航 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setSidebarVisible(true)}
            activeOpacity={0.7}
          >
            <FontAwesome6 name="bars" size={20} color="#6366f1" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>每日任务</Text>
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={handleCalendarPress}
            activeOpacity={0.8}
          >
            <FontAwesome6 name="calendar-days" size={16} color="#6B7280" />
            <Text style={styles.currentDate}>{getCurrentDateText()}</Text>
          </TouchableOpacity>
        </View>

        {/* 任务分类Tab */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'recite' ? styles.tabButtonActive : styles.tabButtonInactive,
            ]}
            onPress={() => handleTabPress('recite')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'recite' ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
              ]}
            >
              背诵任务
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'review' ? styles.tabButtonActive : styles.tabButtonInactive,
            ]}
            onPress={() => handleTabPress('review')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'review' ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
              ]}
            >
              复习任务
            </Text>
          </TouchableOpacity>
        </View>

        {/* 任务列表 */}
        {currentTasks.length > 0 ? (
          <View style={styles.taskListContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{getSectionTitle()}</Text>
              <Text style={styles.progressText}>
                {getCompletedCount()}/{getTotalCount()} 已完成
              </Text>
            </View>

            <View style={styles.taskList}>
              {currentTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onPress={() => handleTaskPress(task.id)}
                />
              ))}
            </View>
          </View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      {/* 日期选择器模态框 */}
      <Modal
        visible={isDatePickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsDatePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            onPress={() => setIsDatePickerVisible(false)}
            activeOpacity={1}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>选择日期</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsDatePickerVisible(false)}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="xmark" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateOptions}>
              <TouchableOpacity
                style={[
                  styles.dateOption,
                  getDateString(selectedDate) === getDateString(new Date()) && styles.dateOptionSelected,
                ]}
                onPress={() => handleDateSelect('today')}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="calendar-day" size={16} color="#4F46E5" />
                <View style={styles.dateOptionContent}>
                  <Text style={styles.dateOptionText}>今天</Text>
                  <Text style={styles.dateOptionSubtext}>
                    {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dateOption,
                  getDateString(selectedDate) === getDateString((() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    return yesterday;
                  })()) && styles.dateOptionSelected,
                ]}
                onPress={() => handleDateSelect('yesterday')}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="calendar-day" size={16} color="#4F46E5" />
                <View style={styles.dateOptionContent}>
                  <Text style={styles.dateOptionText}>昨天</Text>
                  <Text style={styles.dateOptionSubtext}>
                    {(() => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      return yesterday.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
                    })()}
                  </Text>
                </View>
              </TouchableOpacity>

              {Platform.OS === 'web' && (
                <View style={styles.datePickerContainer}>
                  <Text style={styles.datePickerLabel}>选择其他日期</Text>
                  <input
                    type="date"
                    value={getDateString(selectedDate)}
                    onChange={(e: any) => {
                      if (e.target.value) {
                        setSelectedDate(new Date(e.target.value));
                        setIsDatePickerVisible(false);
                      }
                    }}
                    style={styles.datePickerInput}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* 侧边栏 */}
      <Sidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        menuItems={menuItems}
        moduleName="我爱背书"
        moduleIcon="book"
      />
    </SafeAreaView>
  );
};

export default TaskListScreen;
