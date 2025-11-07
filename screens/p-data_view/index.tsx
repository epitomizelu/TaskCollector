

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, Platform } from 'react-native';
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
  // 用于匹配原始数据
  originalTaskId?: string;
  originalTaskName?: string;
  originalCompletionTime?: string;
}

interface TaskData {
  [key: string]: Task[];
}

const DataViewScreen = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [taskData, setTaskData] = useState<TaskData>({});
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTaskInfo, setDeleteTaskInfo] = useState<{ taskId: string; date: string; task: Task | null } | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTaskInfo, setEditTaskInfo] = useState<{ taskId: string; date: string; task: Task | null } | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // 从AsyncStorage加载任务数据
  const loadTasksFromStorage = async () => {
    try {
      const tasksJson = await AsyncStorage.getItem('@taskCollection');
      if (tasksJson) {
        const tasks = JSON.parse(tasksJson);
        console.log('从 AsyncStorage 加载的任务数量:', tasks.length);
        console.log('原始任务数据示例:', tasks[0]);
        
        // 转换为按日期分组的格式
        const groupedTasks: TaskData = {};
        
        tasks.forEach((task: any, index: number) => {
          // 生成或使用 taskId
          let taskId = task.taskId;
          if (!taskId || taskId === undefined) {
            // 如果没有 taskId，生成一个基于时间和索引的 ID
            taskId = `task_${task.completionTime ? new Date(task.completionTime).getTime() : Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
            console.warn(`任务 ${index} 没有 taskId，已生成新 ID: ${taskId}`, task);
          }
          
          // 安全解析 completionTime
          let time = '';
          if (task.completionTime) {
            try {
              // 处理 ISO 格式或普通格式的时间
              const timeStr = typeof task.completionTime === 'string' 
                ? task.completionTime 
                : new Date(task.completionTime).toISOString();
              
              // 如果是 ISO 格式，提取时间部分
              if (timeStr.includes('T')) {
                time = timeStr.split('T')[1]?.split('.')[0] || '';
              } else if (timeStr.includes(' ')) {
                time = timeStr.split(' ')[1] || '';
              }
            } catch (e) {
              console.warn('解析时间失败:', task.completionTime, e);
            }
          }
          
          // 确保 recordDate 存在
          const recordDate = task.recordDate || (task.completionTime ? new Date(task.completionTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
          
          if (!groupedTasks[recordDate]) {
            groupedTasks[recordDate] = [];
          }
          
          groupedTasks[recordDate].push({
            id: taskId,
            name: task.taskName || '未命名任务',
            time: time || '00:00:00',
            status: 'completed',
            completionTime: task.completionTime || new Date().toISOString(),
            // 保存原始数据用于匹配
            originalTaskId: task.taskId,
            originalTaskName: task.taskName,
            originalCompletionTime: task.completionTime
          });
        });
        
        console.log('分组后的任务数据:', Object.keys(groupedTasks).map(date => ({
          date,
          count: groupedTasks[date].length,
          tasks: groupedTasks[date].map(t => ({ id: t.id, name: t.name }))
        })));
        
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
    } else {
      // 如果没有历史记录，导航到模块首页
      console.log('没有历史记录，导航到模块首页');
      router.replace('/module-home');
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
    console.log('✅ handleEditTask 被调用:', { taskId, date });
    
    // 验证 taskId
    if (!taskId || taskId === 'undefined') {
      console.error('❌ 无效的 taskId:', taskId);
      Alert.alert('错误', '任务ID无效，无法编辑');
      return;
    }
    
    console.log('当前任务数据:', taskData);
    console.log('查找任务的日期:', date);
    console.log('该日期的任务列表:', taskData[date]);
    
    const task = taskData[date]?.find(t => t.id === taskId);
    console.log('找到的任务:', task);
    
    if (!task) {
      console.warn('❌ 未找到任务:', { taskId, date, availableDates: Object.keys(taskData) });
      console.log('该日期所有任务的ID:', taskData[date]?.map(t => t.id));
      Alert.alert('错误', '未找到要编辑的任务');
      return;
    }
    
    console.log('准备显示编辑对话框...');
    
    // 在 Web 平台上使用自定义 Modal，其他平台使用 Alert
    if (Platform.OS === 'web') {
      console.log('Web 平台，使用自定义 Modal');
      setEditTaskInfo({ taskId, date, task });
      setEditModalVisible(true);
    } else {
      console.log('原生平台，使用 Alert.alert');
      setTimeout(() => {
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
                console.log('保存编辑后的任务:', taskId);
                // 实际应用中这里会有更新任务的逻辑
                setShowSuccessToast(true);
                setTimeout(() => {
                  setShowSuccessToast(false);
                }, 2000);
              },
            },
          ],
          { cancelable: true }
        );
      }, 0);
    }
  };

  // 处理编辑确认
  const handleEditConfirm = () => {
    if (!editTaskInfo) return;
    
    const { taskId } = editTaskInfo;
    setEditModalVisible(false);
    
    console.log('保存编辑后的任务:', taskId);
    // 实际应用中这里会有更新任务的逻辑
    // 目前只是显示成功提示
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 2000);
    
    setEditTaskInfo(null);
  };

  // 处理编辑取消
  const handleEditCancel = () => {
    console.log('用户取消了编辑');
    setEditModalVisible(false);
    setEditTaskInfo(null);
  };

  const handleDeleteTask = (taskId: string, date: string) => {
    console.log('✅ handleDeleteTask 被调用:', { taskId, date });
    
    // 验证 taskId
    if (!taskId || taskId === 'undefined') {
      console.error('❌ 无效的 taskId:', taskId);
      Alert.alert('错误', '任务ID无效，无法删除');
      return;
    }
    
    console.log('当前任务数据:', taskData);
    console.log('查找任务的日期:', date);
    console.log('该日期的任务列表:', taskData[date]);
    
    const task = taskData[date]?.find(t => t.id === taskId);
    console.log('找到的任务:', task);
    
    if (!task) {
      console.warn('❌ 未找到要删除的任务:', { taskId, date });
      console.log('该日期所有任务的ID:', taskData[date]?.map(t => t.id));
      Alert.alert('错误', `未找到要删除的任务\n任务ID: ${taskId}\n日期: ${date}`);
      return;
    }
    
    // 定义删除执行函数
    const executeDelete = async () => {
      try {
        console.log('开始删除任务:', taskId);
        
        // 1. 先更新AsyncStorage中的数据
        const tasksJson = await AsyncStorage.getItem('@taskCollection');
        if (tasksJson) {
          const tasks = JSON.parse(tasksJson);
          console.log('AsyncStorage中的任务数量:', tasks.length);
          
          // 删除匹配的任务（支持通过 taskId 或 completionTime 匹配）
          const updatedStorageTasks = tasks.filter((taskItem: any) => {
            // 优先使用 taskId 匹配
            if (taskItem.taskId && taskItem.taskId === taskId) {
              console.log('通过 taskId 匹配到任务:', taskItem);
              return false;
            }
            
            // 如果生成的 ID 匹配原始 taskId
            if (task.originalTaskId && taskItem.taskId === task.originalTaskId) {
              console.log('通过原始 taskId 匹配到任务:', taskItem);
              return false;
            }
            
            // 如果没有 taskId，尝试通过 completionTime 和 taskName 匹配
            if (!taskItem.taskId && task.completionTime && task.name) {
              const taskTime = taskItem.completionTime === task.completionTime || 
                             taskItem.completionTime === task.originalCompletionTime;
              const taskName = taskItem.taskName === task.name || 
                             taskItem.taskName === task.originalTaskName;
              if (taskTime && taskName) {
                console.log('通过时间和名称匹配到任务:', taskItem);
                return false;
              }
            }
            
            return true;
          });
          
          console.log('删除后剩余任务数量:', updatedStorageTasks.length);
          await AsyncStorage.setItem('@taskCollection', JSON.stringify(updatedStorageTasks));
          console.log('AsyncStorage更新完成');
          
          // 2. 然后更新内存中的状态
          const updatedTaskData = { ...taskData };
          if (updatedTaskData[date]) {
            const beforeCount = updatedTaskData[date].length;
            updatedTaskData[date] = updatedTaskData[date].filter(
              taskItem => taskItem.id !== taskId
            );
            const afterCount = updatedTaskData[date].length;
            console.log(`日期 ${date} 的任务数量: ${beforeCount} -> ${afterCount}`);
            
            // 如果某一天的任务全部删除，则从对象中移除该日期
            if (updatedTaskData[date].length === 0) {
              delete updatedTaskData[date];
              console.log(`日期 ${date} 的所有任务已删除，移除该日期`);
            }
            
            setTaskData(updatedTaskData);
            console.log('状态更新完成');
          }
          
          // 3. 显示删除成功提示
          console.log('准备显示删除成功 Alert...');
          Alert.alert('成功', '任务已删除');
        } else {
          console.warn('AsyncStorage中没有任务数据');
          Alert.alert('错误', '没有找到任务数据');
        }
      } catch (error) {
        console.error('❌ 删除任务失败:', error);
        Alert.alert('错误', `删除任务失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    };
    
    console.log('准备显示删除确认对话框...');
    
    // 在 Web 平台上使用自定义 Modal，其他平台使用 Alert
    if (Platform.OS === 'web') {
      console.log('Web 平台，使用自定义 Modal');
      setDeleteTaskInfo({ taskId, date, task });
      setDeleteModalVisible(true);
    } else {
      console.log('原生平台，使用 Alert.alert');
      // 使用 setTimeout 确保 Alert 在下一个事件循环中显示
      setTimeout(() => {
        console.log('执行 Alert.alert...');
        try {
          Alert.alert(
            '删除任务',
            `确定要删除任务"${task.name}"吗？`,
            [
              {
                text: '取消',
                style: 'cancel',
                onPress: () => {
                  console.log('用户取消了删除');
                },
              },
              {
                text: '删除',
                style: 'destructive',
                onPress: executeDelete,
              },
            ],
            { cancelable: true }
          );
          console.log('Alert.alert 已调用');
        } catch (error) {
          console.error('Alert.alert 调用失败:', error);
          // 如果 Alert 失败，直接执行删除
          console.log('Alert 失败，直接执行删除...');
          executeDelete();
        }
      }, 0);
    }
  };

  // 处理删除确认
  const handleDeleteConfirm = async () => {
    if (!deleteTaskInfo) return;
    
    const { taskId, date, task } = deleteTaskInfo;
    setDeleteModalVisible(false);
    
    try {
      console.log('开始删除任务:', taskId);
      
      // 1. 先更新AsyncStorage中的数据
      const tasksJson = await AsyncStorage.getItem('@taskCollection');
      if (tasksJson) {
        const tasks = JSON.parse(tasksJson);
        console.log('AsyncStorage中的任务数量:', tasks.length);
        
        // 删除匹配的任务（支持通过 taskId 或 completionTime 匹配）
        const updatedStorageTasks = tasks.filter((taskItem: any) => {
          // 优先使用 taskId 匹配
          if (taskItem.taskId && taskItem.taskId === taskId) {
            console.log('通过 taskId 匹配到任务:', taskItem);
            return false;
          }
          
          // 如果生成的 ID 匹配原始 taskId
          if (task && task.originalTaskId && taskItem.taskId === task.originalTaskId) {
            console.log('通过原始 taskId 匹配到任务:', taskItem);
            return false;
          }
          
          // 如果没有 taskId，尝试通过 completionTime 和 taskName 匹配
          if (!taskItem.taskId && task && task.completionTime && task.name) {
            const taskTime = taskItem.completionTime === task.completionTime || 
                           taskItem.completionTime === task.originalCompletionTime;
            const taskName = taskItem.taskName === task.name || 
                           taskItem.taskName === task.originalTaskName;
            if (taskTime && taskName) {
              console.log('通过时间和名称匹配到任务:', taskItem);
              return false;
            }
          }
          
          return true;
        });
        
        console.log('删除后剩余任务数量:', updatedStorageTasks.length);
        await AsyncStorage.setItem('@taskCollection', JSON.stringify(updatedStorageTasks));
        console.log('AsyncStorage更新完成');
        
        // 2. 然后更新内存中的状态
        const updatedTaskData = { ...taskData };
        if (updatedTaskData[date]) {
          const beforeCount = updatedTaskData[date].length;
          updatedTaskData[date] = updatedTaskData[date].filter(
            taskItem => taskItem.id !== taskId
          );
          const afterCount = updatedTaskData[date].length;
          console.log(`日期 ${date} 的任务数量: ${beforeCount} -> ${afterCount}`);
          
          // 如果某一天的任务全部删除，则从对象中移除该日期
          if (updatedTaskData[date].length === 0) {
            delete updatedTaskData[date];
            console.log(`日期 ${date} 的所有任务已删除，移除该日期`);
          }
          
          setTaskData(updatedTaskData);
          console.log('状态更新完成');
        }
        
        // 3. 显示删除成功提示（使用自定义Toast）
        console.log('准备显示删除成功提示...');
        setShowSuccessToast(true);
        setTimeout(() => {
          setShowSuccessToast(false);
        }, 2000);
      } else {
        console.warn('AsyncStorage中没有任务数据');
        // 错误情况仍然使用Alert，因为需要用户知道
        Alert.alert('错误', '没有找到任务数据');
      }
    } catch (error) {
      console.error('❌ 删除任务失败:', error);
      // 错误情况仍然使用Alert，因为需要用户知道
      Alert.alert('错误', `删除任务失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setDeleteTaskInfo(null);
    }
  };

  // 处理删除取消
  const handleDeleteCancel = () => {
    console.log('用户取消了删除');
    setDeleteModalVisible(false);
    setDeleteTaskInfo(null);
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
          {tasks.map((task, index) => {
            console.log(`渲染任务 ${index}:`, { id: task.id, name: task.name, date });
            
            const handleEdit = () => {
              console.log('📝 编辑回调被调用:', { taskId: task.id, date, task });
              handleEditTask(task.id, date);
            };
            
            const handleDelete = () => {
              console.log('🗑️ 删除回调被调用:', { taskId: task.id, date, task });
              handleDeleteTask(task.id, date);
            };
            
            return (
              <TaskItem
                key={task.id || `task-${index}-${date}`}
                task={task}
                onPress={() => handleTaskPress(task.id)}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            );
          })}
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
      {Object.entries(taskData).map(([date, tasks]) => (
        <React.Fragment key={date}>
          {renderTaskSection(date, tasks)}
        </React.Fragment>
      ))}
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
      <ScrollView 
        style={styles.mainContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >
        {isLoading ? (
          renderLoadingState()
        ) : hasTasks ? (
          renderDataContent()
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      {/* 删除确认 Modal (Web 平台使用) */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDeleteCancel}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 24,
            width: '80%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 5,
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: 12,
            }}>
              删除任务
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#6b7280',
              marginBottom: 24,
              lineHeight: 24,
            }}>
              {deleteTaskInfo?.task 
                ? `确定要删除任务"${deleteTaskInfo.task.name}"吗？`
                : '确定要删除这个任务吗？'}
            </Text>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 12,
            }}>
              <TouchableOpacity
                onPress={handleDeleteCancel}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: '#f3f4f6',
                }}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontSize: 16,
                  color: '#6b7280',
                  fontWeight: '500',
                }}>
                  取消
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteConfirm}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: '#ef4444',
                }}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontSize: 16,
                  color: '#ffffff',
                  fontWeight: '500',
                }}>
                  删除
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 编辑确认 Modal (Web 平台使用) */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleEditCancel}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 24,
            width: '80%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 5,
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: 12,
            }}>
              编辑任务
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#6b7280',
              marginBottom: 24,
              lineHeight: 24,
            }}>
              {editTaskInfo?.task 
                ? `编辑任务: ${editTaskInfo.task.name}`
                : '编辑任务'}
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#9ca3af',
              marginBottom: 24,
            }}>
              编辑功能开发中，敬请期待
            </Text>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              gap: 12,
            }}>
              <TouchableOpacity
                onPress={handleEditCancel}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: '#f3f4f6',
                }}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontSize: 16,
                  color: '#6b7280',
                  fontWeight: '500',
                }}>
                  取消
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEditConfirm}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: '#6366f1',
                }}
                activeOpacity={0.7}
              >
                <Text style={{
                  fontSize: 16,
                  color: '#ffffff',
                  fontWeight: '500',
                }}>
                  确定
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 成功提示 Toast */}
      {showSuccessToast && (
        <View style={{
          position: 'absolute',
          top: 100,
          left: '50%',
          marginLeft: -100,
          backgroundColor: '#22c55e',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 5,
          zIndex: 1000,
        }}>
          <FontAwesome6 name="check-circle" size={16} color="#ffffff" />
          <Text style={{
            color: '#ffffff',
            fontSize: 14,
            fontWeight: '500',
            marginLeft: 8,
          }}>
            操作成功
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default DataViewScreen;

