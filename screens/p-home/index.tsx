

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from './styles';

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

interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  completionRate: string;
}

const HomeScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const textInputRef = useRef<TextInput>(null);
  
  const [taskInputText, setTaskInputText] = useState<string>('');
  const [taskStats, setTaskStats] = useState<TaskStats>({
    totalTasks: 8,
    completedTasks: 6,
    completionRate: '75%'
  });
  const [recentTasks, setRecentTasks] = useState<TaskData[]>([]);
  const [isToastVisible, setIsToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // 初始化数据
  useEffect(() => {
    initializeData();
  }, []);

  // 监听 URL 参数变化，显示操作成功的提示
  useEffect(() => {
    const message = params.message as string | undefined;
    if (message === 'today_cleared') {
      showToast('今日任务已清空');
    } else if (message === 'all_cleared') {
      showToast('所有数据已清空');
    }
  }, [params.message]);

  // 使用useFocusEffect监听页面焦点变化，当从其他页面返回时刷新数据
  useFocusEffect(
    React.useCallback(() => {
      initializeData();
    }, [])
  );

  const initializeData = async () => {
    try {
      const tasksJson = await AsyncStorage.getItem('@taskCollection');
      if (!tasksJson) {
        // 添加示例数据
        const sampleTasks: TaskData[] = [
          {
            taskId: 'task_1',
            rawText: '我完成了晨跑5公里，用时28分钟',
            taskName: '晨跑锻炼',
            completionTime: '2025-11-02 07:30',
            quantity: { '公里': 5 },
            recordDate: '2025-11-02',
            recordMonth: '2025-11',
            recordYear: '2025'
          },
          {
            taskId: 'task_2',
            rawText: '完成了《产品设计》第3章的阅读，收获很多',
            taskName: '阅读学习',
            completionTime: '2025-11-02 09:15',
            quantity: { '分钟': 45 },
            recordDate: '2025-11-02',
            recordMonth: '2025-11',
            recordYear: '2025'
          },
          {
            taskId: 'task_3',
            rawText: '我完成了俯卧撑45个，分3组完成',
            taskName: '俯卧撑训练',
            completionTime: '2025-11-02 12:30',
            quantity: { '个': 45 },
            recordDate: '2025-11-02',
            recordMonth: '2025-11',
            recordYear: '2025'
          }
        ];
        
        await AsyncStorage.setItem('@taskCollection', JSON.stringify(sampleTasks));
        setRecentTasks(sampleTasks.slice(0, 3));
        updateTaskStats(sampleTasks);
      } else {
        const tasks = JSON.parse(tasksJson);
        setRecentTasks(tasks.slice(0, 3));
        updateTaskStats(tasks);
      }
    } catch (error) {
      console.error('初始化数据失败:', error);
    }
  };

  const updateTaskStats = (tasks: TaskData[]) => {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(task => task.recordDate === today);
    
    setTaskStats({
      totalTasks: todayTasks.length,
      completedTasks: todayTasks.length,
      completionRate: todayTasks.length > 0 ? '100%' : '0%'
    });
  };

  const handleTaskFormSubmit = async () => {
    const trimmedText = taskInputText.trim();
    
    if (trimmedText) {
      await processUserInput(trimmedText);
      setTaskInputText('');
      textInputRef.current?.blur();
    }
  };

  const processUserInput = async (text: string) => {
    const lowerText = text.toLowerCase();
    
    // 检查是否为指令
    if (lowerText.includes('生成今日报表') || lowerText.includes('日报')) {
      router.push('/p-report_view?type=today');
      return;
    } else if (lowerText.includes('生成月度报表') || lowerText.includes('月报')) {
      router.push('/p-report_view?type=month');
      return;
    } else if (lowerText.includes('生成年度报表') || lowerText.includes('年报')) {
      router.push('/p-report_view?type=year');
      return;
    } else if (lowerText.includes('生成ascii报表')) {
      router.push('/p-report_view?type=ascii');
      return;
    } else if (lowerText.includes('查看最近任务')) {
      router.push('/p-data_view');
      return;
    } else if (lowerText.includes('清空今日任务')) {
      router.push('/p-confirm_dialog?action=clear_today');
      return;
    } else if (lowerText.includes('清空所有数据')) {
      router.push('/p-confirm_dialog?action=clear_all');
      return;
    } else if (lowerText.includes('导出数据')) {
      router.push('/p-export_success');
      return;
    }
    
    // 如果不是指令，视为任务记录
    await recordTask(text);
  };

  const recordTask = async (text: string) => {
    try {
      const taskData = parseTaskText(text);
      
      // 保存任务到本地存储
      await saveTaskToStorage(taskData);
      
      // 更新UI显示
      await updateTaskStatsFromStorage();
      addTaskToRecentList(taskData);
      
      // 显示成功提示
      showToast('任务已记录 ✅');
    } catch (error) {
      console.error('记录任务失败:', error);
      showToast('记录失败，请重试');
    }
  };

  const parseTaskText = (text: string): TaskData => {
    const now = new Date();
    const taskName = extractTaskName(text);
    const quantity = extractQuantity(text);
    
    return {
      taskId: 'task_' + Date.now(),
      rawText: text,
      taskName: taskName,
      completionTime: now.toLocaleString('zh-CN'),
      quantity: quantity,
      recordDate: now.toISOString().split('T')[0],
      recordMonth: now.toISOString().slice(0, 7),
      recordYear: now.toISOString().slice(0, 4)
    };
  };

  const extractTaskName = (text: string): string => {
    const patterns = [
      /我完成了(.*?)(?:[\d个只条本]|$)/i,
      /完成了(.*?)(?:[\d个只条本]|$)/i,
      /做了(.*?)(?:[\d个只条本]|$)/i,
      /完成(.*?)(?:[\d个只条本]|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim() || '未命名任务';
      }
    }
    
    return text.length > 10 ? text.substring(0, 10) + '...' : text;
  };

  const extractQuantity = (text: string): { [key: string]: number } => {
    const quantityPattern = /(\d+)\s*(个|只|条|本|公里|分钟|次)/i;
    const match = text.match(quantityPattern);
    if (match) {
      return { [match[2]]: parseInt(match[1]) };
    }
    return {};
  };

  const saveTaskToStorage = async (taskData: TaskData) => {
    try {
      const tasksJson = await AsyncStorage.getItem('@taskCollection');
      let tasks: TaskData[] = tasksJson ? JSON.parse(tasksJson) : [];
      tasks.unshift(taskData); // 添加到开头
      await AsyncStorage.setItem('@taskCollection', JSON.stringify(tasks));
    } catch (error) {
      console.error('保存任务失败:', error);
      throw error;
    }
  };

  const updateTaskStatsFromStorage = async () => {
    try {
      const tasksJson = await AsyncStorage.getItem('@taskCollection');
      const tasks: TaskData[] = tasksJson ? JSON.parse(tasksJson) : [];
      updateTaskStats(tasks);
    } catch (error) {
      console.error('更新统计失败:', error);
    }
  };

  const addTaskToRecentList = (taskData: TaskData) => {
    setRecentTasks(prevTasks => {
      const newTasks = [taskData, ...prevTasks];
      return newTasks.slice(0, 3); // 保持最多3个最近任务
    });
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
    
    setTimeout(() => {
      setIsToastVisible(false);
    }, 3000);
  };

  const handleQuickTodayReport = () => {
    router.push('/p-report_view?type=today');
  };

  const handleQuickMonthReport = () => {
    router.push('/p-report_view?type=month');
  };

  const handleQuickRecentTasks = () => {
    router.push('/p-data_view');
  };

  const handleQuickExportData = () => {
    router.push('/p-export_success');
  };

  const handleViewAllTasks = () => {
    router.push('/p-data_view');
  };

  const formatQuantity = (quantity: { [key: string]: number }): string => {
    if (Object.keys(quantity).length === 0) {
      return '';
    }
    const key = Object.keys(quantity)[0];
    return `${quantity[key]}${key}`;
  };


  const formatTime = (timeString: string): string => {
    const timePart = timeString.split(' ')[1];
    return `今天 ${timePart}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 顶部导航栏 */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>任务收集助手</Text>
          <Text style={styles.appSubtitle}>记录每一个成就的瞬间 ✨</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 今日概览卡片 */}
          <LinearGradient
            colors={['#4f46e5', '#7c3aed']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.overviewCard}
          >
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewTitle}>今日概览</Text>
              <View style={styles.overviewIcon}>
                <FontAwesome6 name="chart-line" size={24} color="#ffffff" />
              </View>
            </View>
            <View style={styles.overviewStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{taskStats.totalTasks}</Text>
                <Text style={styles.statLabel}>总任务</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{taskStats.completedTasks}</Text>
                <Text style={styles.statLabel}>已完成</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{taskStats.completionRate}</Text>
                <Text style={styles.statLabel}>完成率</Text>
              </View>
            </View>
          </LinearGradient>

          {/* 输入区域 */}
          <View style={styles.inputSection}>
            <View style={styles.inputCard}>
              <Text style={styles.inputTitle}>记录你的任务</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={textInputRef}
                  style={styles.textInput}
                  placeholder="输入你完成的任务，例如：我完成了俯卧撑45个"
                  placeholderTextColor="#6b7280"
                  value={taskInputText}
                  onChangeText={setTaskInputText}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleTaskFormSubmit}
                  activeOpacity={0.7}
                >
                  <FontAwesome6 name="paper-plane" size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.inputHint}>
                💡 提示：输入"生成今日报表"可查看今日成果
              </Text>
            </View>
          </View>

          {/* 快速操作按钮 */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.quickActionsTitle}>快速操作</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handleQuickTodayReport}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionContent}>
                  <View style={[styles.quickActionIcon, styles.primaryIconBg]}>
                    <FontAwesome6 name="calendar-day" size={16} color="#6366f1" />
                  </View>
                  <View style={styles.quickActionText}>
                    <Text style={styles.quickActionTitle}>今日报表</Text>
                    <Text style={styles.quickActionSubtitle}>查看今日成果</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handleQuickMonthReport}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionContent}>
                  <View style={[styles.quickActionIcon, styles.secondaryIconBg]}>
                    <FontAwesome6 name="calendar" size={16} color="#8b5cf6" />
                  </View>
                  <View style={styles.quickActionText}>
                    <Text style={styles.quickActionTitle}>月度报表</Text>
                    <Text style={styles.quickActionSubtitle}>月度总结回顾</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handleQuickRecentTasks}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionContent}>
                  <View style={[styles.quickActionIcon, styles.infoIconBg]}>
                    <FontAwesome6 name="list" size={16} color="#3b82f6" />
                  </View>
                  <View style={styles.quickActionText}>
                    <Text style={styles.quickActionTitle}>最近任务</Text>
                    <Text style={styles.quickActionSubtitle}>查看任务历史</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handleQuickExportData}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionContent}>
                  <View style={[styles.quickActionIcon, styles.tertiaryIconBg]}>
                    <FontAwesome6 name="download" size={16} color="#06b6d4" />
                  </View>
                  <View style={styles.quickActionText}>
                    <Text style={styles.quickActionTitle}>导出数据</Text>
                    <Text style={styles.quickActionSubtitle}>备份你的数据</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* 最近任务列表 */}
          <View style={styles.recentTasksSection}>
            <View style={styles.recentTasksHeader}>
              <Text style={styles.recentTasksTitle}>最近任务</Text>
              <TouchableOpacity onPress={handleViewAllTasks} activeOpacity={0.7}>
                <View style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>查看全部</Text>
                  <FontAwesome6 name="chevron-right" size={10} color="#6366f1" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.recentTasksList}>
              {recentTasks.map((task) => (
                <TouchableOpacity 
                  key={task.taskId} 
                  style={styles.taskCard}
                  onPress={handleViewAllTasks}
                  activeOpacity={0.7}
                >
                  <View style={styles.taskContent}>
                    <View style={styles.taskLeft}>
                      <View style={styles.taskStatusIcon}>
                        <FontAwesome6 name="check" size={12} color="#ffffff" />
                      </View>
                      <View style={styles.taskInfo}>
                        <Text style={styles.taskName}>{task.taskName}</Text>
                        <Text style={styles.taskTime}>{formatTime(task.completionTime)}</Text>
                      </View>
                    </View>
                    {formatQuantity(task.quantity) ? (
                      <Text style={styles.taskQuantity}>{formatQuantity(task.quantity)}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Toast提示框 */}
        {isToastVisible && (
          <View style={styles.toastContainer}>
            <View style={styles.toast}>
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default HomeScreen;

