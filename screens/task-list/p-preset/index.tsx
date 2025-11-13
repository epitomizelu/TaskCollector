/**
 * 预设任务界面
 * 支持录入每日常规任务
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
import { taskListService, PresetTask } from '../../../services/task-list.service';
import styles from './styles';

const PresetTaskScreen: React.FC = () => {
  const router = useRouter();
  const [presetTasks, setPresetTasks] = useState<PresetTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<PresetTask | null>(null);
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPresetTasks();
  }, []);

  const loadPresetTasks = async () => {
    setIsLoading(true);
    try {
      // 先进行双向同步（取交集，先更新本地，后更新云端）
      try {
        await taskListService.syncPresetTasksBidirectional();
        console.log('预设任务双向同步完成');
      } catch (error) {
        console.error('同步预设任务失败:', error);
        // 同步失败不影响继续执行，使用本地数据
      }
      
      // 然后加载预设任务
      const tasks = await taskListService.getPresetTasks();
      setPresetTasks(tasks);
    } catch (error) {
      console.error('加载预设任务失败:', error);
      Alert.alert('错误', '加载预设任务失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/module-home');
    }
  };

  const handleAddTask = () => {
    setTaskName('');
    setTaskDescription('');
    setIsAddModalVisible(true);
  };

  const handleEditTask = (task: PresetTask) => {
    setEditingTask(task);
    setTaskName(task.name);
    setTaskDescription(task.description || '');
    setIsEditModalVisible(true);
  };

  const handleDeleteTask = (task: PresetTask) => {
    Alert.alert(
      '删除预设任务',
      `确定要删除"${task.name}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await taskListService.deletePresetTask(task.id);
              await loadPresetTasks();
              showToast('删除成功');
            } catch (error) {
              console.error('删除失败:', error);
              Alert.alert('错误', '删除失败，请重试');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleSaveTask = async () => {
    if (!taskName.trim()) {
      Alert.alert('提示', '请输入任务名称');
      return;
    }

    if (isSaving) {
      return; // 防止重复点击
    }

    setIsSaving(true);
    try {
      if (editingTask) {
        // 更新任务 - 先乐观更新UI
        const updatedTask: PresetTask = {
          ...editingTask,
          name: taskName.trim(),
          description: taskDescription.trim() || undefined,
          updatedAt: new Date().toISOString(),
        };
        
        // 立即更新UI
        setPresetTasks(prevTasks =>
          prevTasks.map(t => t.id === editingTask.id ? updatedTask : t)
        );
        
        // 关闭Modal
        setIsAddModalVisible(false);
        setIsEditModalVisible(false);
        setEditingTask(null);
        setTaskName('');
        setTaskDescription('');
        setIsSaving(false);
        showToast('更新成功');
        
        // 异步更新数据（不阻塞UI）
        taskListService.updatePresetTask(editingTask.id, {
          name: taskName.trim(),
          description: taskDescription.trim() || undefined,
          order: editingTask.order,
          enabled: editingTask.enabled,
        }).catch(error => {
          console.error('更新任务失败:', error);
          // 如果失败，恢复UI状态
          setPresetTasks(prevTasks =>
            prevTasks.map(t => t.id === editingTask.id ? editingTask : t)
          );
          Alert.alert('错误', '更新失败，请重试');
        });
      } else {
        // 创建新任务 - 先保存到本地，获取真实ID后再更新UI
        const maxOrder = presetTasks.length > 0
          ? Math.max(...presetTasks.map(t => t.order))
          : 0;
        
        // 先保存到本地存储（快速操作）
        const savedTask = await taskListService.savePresetTask({
          name: taskName.trim(),
          description: taskDescription.trim() || undefined,
          order: maxOrder + 1,
          enabled: true,
        });
        
        // 立即更新UI（使用保存后的真实ID）
        setPresetTasks(prevTasks => [...prevTasks, savedTask]);
        
        // 关闭Modal
        setIsAddModalVisible(false);
        setIsEditModalVisible(false);
        setEditingTask(null);
        setTaskName('');
        setTaskDescription('');
        setIsSaving(false);
        showToast('添加成功');
      }
    } catch (error) {
      console.error('保存失败:', error);
      setIsSaving(false);
      Alert.alert('错误', '保存失败，请重试');
    }
  };

  const handleToggleEnabled = async (task: PresetTask) => {
    try {
      await taskListService.updatePresetTask(task.id, {
        name: task.name,
        description: task.description,
        order: task.order,
        enabled: !task.enabled,
      });
      await loadPresetTasks();
    } catch (error) {
      console.error('更新失败:', error);
      Alert.alert('错误', '更新失败，请重试');
    }
  };

  const showToast = (message: string) => {
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <FontAwesome6 name="arrow-left" size={18} color="#6b7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>预设任务</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* 主要内容区域 */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        ) : presetTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="list-check" size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>暂无预设任务</Text>
            <Text style={styles.emptyDescription}>
              添加每日常规任务，系统会在每天自动为您创建任务
            </Text>
          </View>
        ) : (
          <View style={styles.tasksContainer}>
            {presetTasks.map((task) => (
              <View key={task.id} style={styles.taskItem}>
                <TouchableOpacity
                  style={styles.taskContent}
                  onPress={() => handleToggleEnabled(task)}
                  activeOpacity={0.7}
                >
                  <View style={styles.taskLeft}>
                    <View
                      style={[
                        styles.checkbox,
                        task.enabled && styles.checkboxChecked,
                      ]}
                    >
                      {task.enabled && (
                        <FontAwesome6 name="check" size={12} color="#ffffff" />
                      )}
                    </View>
                    <View style={styles.taskInfo}>
                      <Text
                        style={[
                          styles.taskName,
                          !task.enabled && styles.taskNameDisabled,
                        ]}
                      >
                        {task.name}
                      </Text>
                      {task.description && (
                        <Text style={styles.taskDescription}>
                          {task.description}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.taskActions}>
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
        <Text style={styles.addButtonText}>添加预设任务</Text>
      </TouchableOpacity>

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
                {editingTask ? '编辑预设任务' : '添加预设任务'}
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
                  style={[styles.modalConfirmButton, isSaving && styles.modalConfirmButtonDisabled]}
                  onPress={handleSaveTask}
                  disabled={isSaving}
                >
                  <Text style={styles.modalConfirmButtonText}>
                    {isSaving ? '保存中...' : '保存'}
                  </Text>
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
            <Text style={styles.toastText}>操作成功</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default PresetTaskScreen;

