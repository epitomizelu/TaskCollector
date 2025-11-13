/**
 * 今日任务界面
 * 显示当天任务，支持增删改查、完成任务、切换日期
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { taskListService, DailyTask } from '../../../services/task-list.service';
import styles from './styles';

const TodayTaskScreen: React.FC = () => {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadTasks();
  }, [selectedDate]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const dateStr = getDateString(selectedDate);
      const todayStr = getDateString(new Date());
      const isToday = dateStr === todayStr;
      
      // 先检查本地是否有该日期的任务
      let tasks = await taskListService.getDailyTasks(dateStr);
      console.log(`本地 ${dateStr} 的任务数量: ${tasks.length}`);
      
      // 如果本地没有任务，先从云端同步
      if (tasks.length === 0) {
        console.log(`本地没有 ${dateStr} 的任务，开始从云端同步...`);
        try {
          await taskListService.syncDailyTasksFromCloud(dateStr, true); // 强制同步
          tasks = await taskListService.getDailyTasks(dateStr);
          console.log(`从云端同步后，${dateStr} 的任务数量: ${tasks.length}`);
        } catch (error) {
          console.error('从云端同步每日任务失败:', error);
          // 同步失败不影响继续执行
        }
      }
      
      // 如果是今天，且本地和云端都没有任务，则从预设任务生成
      if (isToday && tasks.length === 0) {
        console.log('本地和云端都没有今日任务，从预设任务生成今日任务');
        
        // 先同步预设任务（确保预设任务是最新的）
        try {
          await taskListService.syncPresetTasksBidirectional();
          console.log('预设任务同步完成');
        } catch (error) {
          console.error('同步预设任务失败:', error);
          // 同步失败不影响继续执行，使用本地预设任务
        }
        
        // 从预设任务初始化今日任务
        try {
          await taskListService.initializeTodayTasks();
          tasks = await taskListService.getDailyTasks(dateStr);
          console.log('从预设任务生成今日任务完成，任务数量:', tasks.length);
        } catch (error) {
          console.error('从预设任务生成今日任务失败:', error);
        }
      } else if (isToday && tasks.length > 0) {
        // 如果今天是新的一天，需要检查并重新初始化
        const isNewDay = await taskListService.checkIfNewDay();
        
        if (isNewDay) {
          console.log('检测到新的一天，重新初始化今日任务');
          // 先同步预设任务
          try {
            await taskListService.syncPresetTasksBidirectional();
            console.log('预设任务同步完成');
          } catch (error) {
            console.error('同步预设任务失败:', error);
          }
          
          // 重新初始化今日任务
          try {
            await taskListService.initializeTodayTasks();
            tasks = await taskListService.getDailyTasks(dateStr);
            console.log('今日任务重新初始化完成');
          } catch (error) {
            console.error('重新初始化今日任务失败:', error);
          }
        } else {
          // 今天已经初始化过，检查任务状态
          console.log('今天已初始化过，检查任务状态');
          
          // 获取预设任务
          const presetTasks = await taskListService.getPresetTasks();
          const enabledPresets = presetTasks.filter(t => t.enabled);
          
          // 检查今日任务数量是否与启用的预设任务数量一致
          if (tasks.length < enabledPresets.length) {
            console.log(`检测到预设任务数量（${enabledPresets.length}）大于今日任务数量（${tasks.length}），强制重新初始化`);
            try {
              await taskListService.forceReinitializeTodayTasks();
              tasks = await taskListService.getDailyTasks(dateStr);
              console.log('今日任务已强制重新初始化');
            } catch (error) {
              console.error('强制重新初始化今日任务失败:', error);
            }
          } else {
            // 检查任务的日期是否正确
            const tasksWithWrongDate = tasks.filter(task => task.date !== todayStr);
            if (tasksWithWrongDate.length > 0) {
              console.log(`检测到 ${tasksWithWrongDate.length} 个任务的日期不正确，强制重新初始化`);
              try {
                await taskListService.forceReinitializeTodayTasks();
                tasks = await taskListService.getDailyTasks(dateStr);
                console.log('今日任务已强制重新初始化（修复日期问题）');
              } catch (error) {
                console.error('强制重新初始化今日任务失败:', error);
              }
            }
          }
        }
      }
      
      // 确保获取的是指定日期的任务，而不是其他日期的任务
      const filteredTasks = isToday 
        ? tasks.filter(task => task.date === todayStr)
        : tasks.filter(task => task.date === dateStr);
      
      setDailyTasks(filteredTasks);
    } catch (error) {
      console.error('加载任务失败:', error);
      Alert.alert('错误', '加载任务失败');
    } finally {
      setIsLoading(false);
    }
  };

  const getDateString = (date: Date): string => {
    // 使用本地时区获取日期字符串
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateStr = getDateString(date);
    const todayStr = getDateString(today);
    const yesterdayStr = getDateString(yesterday);
    const tomorrowStr = getDateString(tomorrow);

    if (dateStr === todayStr) return '今天';
    if (dateStr === yesterdayStr) return '昨天';
    if (dateStr === tomorrowStr) return '明天';
    
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/module-home');
    }
  };

  const handleDateSelect = (type: 'today' | 'yesterday' | 'tomorrow' | 'custom', customDate?: Date) => {
    const newDate = new Date();
    if (type === 'today') {
      setSelectedDate(new Date());
    } else if (type === 'yesterday') {
      newDate.setDate(newDate.getDate() - 1);
      setSelectedDate(newDate);
    } else if (type === 'tomorrow') {
      newDate.setDate(newDate.getDate() + 1);
      setSelectedDate(newDate);
    } else if (type === 'custom' && customDate) {
      setSelectedDate(customDate);
    }
    setIsDatePickerVisible(false);
  };

  const handleAddTask = () => {
    setTaskName('');
    setTaskDescription('');
    setIsAddModalVisible(true);
  };

  const handleEditTask = (task: DailyTask) => {
    // 已同步的任务不允许编辑
    if (task.syncedToCollection) {
      Alert.alert('提示', '已同步到任务收集模块的任务不允许编辑');
      return;
    }
    setEditingTask(task);
    setTaskName(task.name);
    setTaskDescription(task.description || '');
    setIsEditModalVisible(true);
  };

  const handleDeleteTask = (task: DailyTask) => {
    // 已同步的任务不允许删除
    if (task.syncedToCollection) {
      Alert.alert('提示', '已同步到任务收集模块的任务不允许删除');
      return;
    }

    Alert.alert(
      '删除任务',
      `确定要删除"${task.name}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await taskListService.deleteDailyTask(task.id);
              await loadTasks();
              showToast('删除成功');
            } catch (error: any) {
              console.error('删除失败:', error);
              Alert.alert('错误', error.message || '删除失败，请重试');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleCompleteTask = async (task: DailyTask) => {
    try {
      if (task.completed) {
        await taskListService.uncompleteTask(task.id);
        showToast('已取消完成');
      } else {
        await taskListService.completeTask(task.id);
        showToast('任务已完成');
      }
      await loadTasks();
    } catch (error: any) {
      console.error('操作失败:', error);
      Alert.alert('错误', error.message || '操作失败，请重试');
    }
  };

  const handleSaveTask = async () => {
    if (!taskName.trim()) {
      Alert.alert('提示', '请输入任务名称');
      return;
    }

    try {
      const dateStr = getDateString(selectedDate);
      
      if (editingTask) {
        // 更新任务
        await taskListService.updateDailyTask(editingTask.id, {
          name: taskName.trim(),
          description: taskDescription.trim() || undefined,
          date: editingTask.date,
          completed: editingTask.completed,
          presetTaskId: editingTask.presetTaskId,
        });
        showToast('更新成功');
      } else {
        // 创建新任务
        await taskListService.addDailyTask({
          name: taskName.trim(),
          description: taskDescription.trim() || undefined,
          date: dateStr,
          completed: false,
        });
        showToast('添加成功');
      }

      setIsAddModalVisible(false);
      setIsEditModalVisible(false);
      setEditingTask(null);
      setTaskName('');
      setTaskDescription('');
      await loadTasks();
    } catch (error) {
      console.error('保存失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  const handleGoToPreset = () => {
    router.push('/task-list-preset');
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 2000);
  };

  const completedCount = dailyTasks.filter(t => t.completed).length;
  const totalCount = dailyTasks.length;
  const isToday = getDateString(selectedDate) === getDateString(new Date());

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <FontAwesome6 name="arrow-left" size={18} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setIsDatePickerVisible(true)}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="calendar" size={16} color="#6366f1" />
          <Text style={styles.dateButtonText}>{formatDateDisplay(selectedDate)}</Text>
          <FontAwesome6 name="chevron-down" size={12} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.presetButton}
          onPress={handleGoToPreset}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FontAwesome6 name="list-check" size={18} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* 进度统计 */}
      {totalCount > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedCount}/{totalCount} 已完成
          </Text>
        </View>
      )}

      {/* 主要内容区域 */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        ) : dailyTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="clipboard-list" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>暂无任务</Text>
            <Text style={styles.emptyDescription}>
              {isToday
                ? '今天还没有任务，添加一个开始吧！'
                : '这一天还没有任务'}
            </Text>
          </View>
        ) : (
          <View style={styles.tasksContainer}>
            {dailyTasks.map((task) => (
              <View
                key={task.id}
                style={[
                  styles.taskItem,
                  task.completed && styles.taskItemCompleted,
                  task.syncedToCollection && styles.taskItemSynced,
                ]}
              >
                <TouchableOpacity
                  style={styles.taskContent}
                  onPress={() => handleCompleteTask(task)}
                  activeOpacity={0.7}
                >
                  <View style={styles.taskLeft}>
                    <View
                      style={[
                        styles.checkbox,
                        task.completed && styles.checkboxChecked,
                      ]}
                    >
                      {task.completed && (
                        <FontAwesome6 name="check" size={12} color="#ffffff" />
                      )}
                    </View>
                    <View style={styles.taskInfo}>
                      <Text
                        style={[
                          styles.taskName,
                          task.completed && styles.taskNameCompleted,
                        ]}
                      >
                        {task.name}
                      </Text>
                      {task.description && (
                        <Text style={styles.taskDescription}>
                          {task.description}
                        </Text>
                      )}
                      {task.syncedToCollection && (
                        <View style={styles.syncedBadge}>
                          <FontAwesome6 name="check-circle" size={12} color="#10b981" />
                          <Text style={styles.syncedText}>已同步</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.taskActions}>
                    {!task.syncedToCollection && (
                      <>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleEditTask(task)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <FontAwesome6 name="pen-to-square" size={16} color="#6366f1" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDeleteTask(task)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <FontAwesome6 name="trash-can" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 添加按钮 */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={handleAddTask}
        activeOpacity={0.8}
      >
        <FontAwesome6 name="plus" size={20} color="#ffffff" />
        <Text style={styles.addButtonText}>添加任务</Text>
      </TouchableOpacity>

      {/* 日期选择器 Modal */}
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
              >
                <FontAwesome6 name="xmark" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateOptions}>
              <TouchableOpacity
                style={[
                  styles.dateOption,
                  getDateString(selectedDate) === getDateString(new Date()) &&
                    styles.dateOptionSelected,
                ]}
                onPress={() => handleDateSelect('today')}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="calendar-day" size={16} color="#4F46E5" />
                <View style={styles.dateOptionContent}>
                  <Text style={styles.dateOptionText}>今天</Text>
                  <Text style={styles.dateOptionSubtext}>
                    {new Date().toLocaleDateString('zh-CN', {
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dateOption,
                  getDateString(selectedDate) ===
                    getDateString(
                      (() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        return yesterday;
                      })()
                    ) && styles.dateOptionSelected,
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
                      return yesterday.toLocaleDateString('zh-CN', {
                        month: 'long',
                        day: 'numeric',
                      });
                    })()}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dateOption,
                  getDateString(selectedDate) ===
                    getDateString(
                      (() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        return tomorrow;
                      })()
                    ) && styles.dateOptionSelected,
                ]}
                onPress={() => handleDateSelect('tomorrow')}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="calendar-day" size={16} color="#4F46E5" />
                <View style={styles.dateOptionContent}>
                  <Text style={styles.dateOptionText}>明天</Text>
                  <Text style={styles.dateOptionSubtext}>
                    {(() => {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      return tomorrow.toLocaleDateString('zh-CN', {
                        month: 'long',
                        day: 'numeric',
                      });
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
                        handleDateSelect('custom', new Date(e.target.value));
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

      {/* 添加/编辑任务 Modal */}
      <Modal
        visible={isAddModalVisible || isEditModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setIsAddModalVisible(false);
          setIsEditModalVisible(false);
          setEditingTask(null);
          setTaskName('');
          setTaskDescription('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTask ? '编辑任务' : '添加任务'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setIsAddModalVisible(false);
                  setIsEditModalVisible(false);
                  setEditingTask(null);
                  setTaskName('');
                  setTaskDescription('');
                }}
              >
                <FontAwesome6 name="xmark" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>任务名称 *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="请输入任务名称"
                  value={taskName}
                  onChangeText={setTaskName}
                  maxLength={50}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>任务描述（可选）</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="请输入任务描述"
                  value={taskDescription}
                  onChangeText={setTaskDescription}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setIsAddModalVisible(false);
                    setIsEditModalVisible(false);
                    setEditingTask(null);
                    setTaskName('');
                    setTaskDescription('');
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleSaveTask}
                >
                  <Text style={styles.modalConfirmButtonText}>保存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 成功提示 Toast */}
      {showSuccessToast && (
        <View style={styles.toastContainer}>
          <View style={styles.toast}>
            <FontAwesome6 name="check-circle" size={16} color="#ffffff" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default TodayTaskScreen;

