

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import styles from './styles';
import TaskItem from './components/TaskItem';

interface Task {
  id: string;
  name: string;
  time: string;
  status: 'completed' | 'ongoing';
  completionTime?: string;
}

interface TaskData {
  [key: string]: Task[];
}

const DataViewScreen = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [taskData, setTaskData] = useState<TaskData>({});

  // 从AsyncStorage加载任务数据
  const loadTasksFromStorage = async () => {
    try {
      const tasksJson = await AsyncStorage.getItem('@taskCollection');
      if (tasksJson) {
        const tasks = JSON.parse(tasksJson);
        // 转换为按日期分组的格式
        const groupedTasks: TaskData = {};
        
        tasks.forEach((task: any) => {
          if (!groupedTasks[task.recordDate]) {
            groupedTasks[task.recordDate] = [];
          }
          groupedTasks[task.recordDate].push({
            id: task.taskId,
            name: task.taskName,
            time: task.completionTime.split(' ')[1],
            status: 'completed',
            completionTime: task.completionTime
          });
        });
        
        // 按日期排序
        const sortedDates = Object.keys(groupedTasks).sort((a, b) => 
          new Date(b).getTime() - new Date(a).getTime()
        );
        
        const sortedTasks: TaskData = {};
        sortedDates.forEach(date => {
          sortedTasks[date] = groupedTasks[date];
        });
        
        return sortedTasks;
      }
      return {};
    } catch (error) {
      console.error('加载任务数据失败:', error);
      return {};
    }
  };

  // 从存储加载任务数据
  const loadData = async () => {
    setIsLoading(true);
    try {
      const tasks = await loadTasksFromStorage();
      setTaskData(tasks);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);
  
  // 使用useFocusEffect替代router.addListener，当页面获得焦点时刷新数据
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleGoHomePress = () => {
    router.push('/p-home');
  };

  const handleTaskPress = (taskId: string) => {
    console.log('点击了任务项:', taskId);
    // 这里可以添加任务详情查看功能
  };

  const handleEditTask = (taskId: string, date: string) => {
    // 在实际应用中，这里可以导航到编辑页面
    // 为了简化，我们使用Alert来模拟编辑功能
    const task = taskData[date].find(t => t.id === taskId);
    if (task) {
      Alert.alert(
        '编辑任务',
        `编辑任务: ${task.name}`,
        [
          {
            text: '取消',
            style: 'cancel',
          },
          {
            text: '保存',
            onPress: () => {
              // 实际应用中这里会有更新任务的逻辑
              console.log('保存编辑后的任务:', taskId);
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  const handleDeleteTask = (taskId: string, date: string) => {
    Alert.alert(
      '删除任务',
      '确定要删除这个任务吗？',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. 先更新AsyncStorage中的数据
              const tasksJson = await AsyncStorage.getItem('@taskCollection');
              if (tasksJson) {
                const tasks = JSON.parse(tasksJson);
                const updatedStorageTasks = tasks.filter((task: any) => task.taskId !== taskId);
                await AsyncStorage.setItem('@taskCollection', JSON.stringify(updatedStorageTasks));
                
                // 2. 然后更新内存中的状态
                const updatedTaskData = { ...taskData };
                if (updatedTaskData[date]) {
                  updatedTaskData[date] = updatedTaskData[date].filter(
                    task => task.id !== taskId
                  );
                  
                  // 如果某一天的任务全部删除，则从对象中移除该日期
                  if (updatedTaskData[date].length === 0) {
                    delete updatedTaskData[date];
                  }
                  
                  setTaskData(updatedTaskData);
                }
                
                // 3. 显示删除成功提示
                Alert.alert('成功', '任务已删除');
              } else {
                Alert.alert('错误', '没有找到任务数据');
              }
            } catch (error) {
              console.error('删除任务失败:', error);
              Alert.alert('错误', '删除任务失败，请重试');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const hasTasks = Object.keys(taskData).some(date => taskData[date].length > 0);

  const getDateSectionTitle = (date: string) => {
    const today = new Date('2025-11-02');
    const targetDate = new Date(date);
    const diffTime = Math.abs(today.getTime() - targetDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `今日 (${date})`;
    } else if (diffDays === 1) {
      return `昨日 (${date})`;
    } else if (diffDays === 2) {
      return `前日 (${date})`;
    }
    return date;
  };

  const getDateSectionColor = (date: string) => {
    const today = new Date('2025-11-02');
    const targetDate = new Date(date);
    const diffTime = Math.abs(today.getTime() - targetDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '#6366f1'; // primary
    } else if (diffDays === 1) {
      return '#8b5cf6'; // secondary
    } else if (diffDays === 2) {
      return '#06b6d4'; // tertiary
    }
    return '#6b7280';
  };

  const renderTaskSection = (date: string, tasks: Task[]) => {
    if (tasks.length === 0) return null;

    return (
      <View key={date} style={styles.dateSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{getDateSectionTitle(date)}</Text>
          <View style={[styles.countBadge, { backgroundColor: `${getDateSectionColor(date)}1A` }]}>
            <Text style={[styles.countText, { color: getDateSectionColor(date) }]}>
              {tasks.length}个任务
            </Text>
          </View>
        </View>
        <View style={styles.tasksContainer}>
          {tasks.map((task, index) => (
            <TaskItem
              key={task.id}
              task={task}
              onPress={() => handleTaskPress(task.id)}
              onEdit={() => handleEditTask(task.id, date)}
              onDelete={() => handleDeleteTask(task.id, date)}
            />
          ))}
        </View>
      </View>
    );
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6366f1" style={styles.loadingSpinner} />
      <Text style={styles.loadingText}>加载中...</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyIconContainer}>
        <FontAwesome5 name="tasks" size={48} color="#9ca3af" />
      </View>
      <Text style={styles.emptyTitle}>暂无任务记录</Text>
      <Text style={styles.emptyDescription}>开始记录您的第一个任务吧！</Text>
      <TouchableOpacity style={styles.goHomeButton} onPress={handleGoHomePress}>
        <Text style={styles.goHomeButtonText}>去记录任务</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDataContent = () => (
    <View style={styles.dataContent}>
      {Object.entries(taskData).map(([date, tasks]) => renderTaskSection(date, tasks))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <FontAwesome6 name="arrow-left" size={18} color="#6b7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>最近任务</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* 主要内容区域 */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          renderLoadingState()
        ) : hasTasks ? (
          renderDataContent()
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DataViewScreen;

