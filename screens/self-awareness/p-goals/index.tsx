/**
 * 人生目标清单列表页面
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { selfAwarenessService, Goal } from '../../../services/self-awareness.service';
import styles from './styles';

const GoalsListScreen: React.FC = () => {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('life');
  const [priority, setPriority] = useState('3');
  const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed' | 'abandoned'>('pending');
  const [deadline, setDeadline] = useState('');
  const [milestones, setMilestones] = useState('');
  const [notes, setNotes] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadGoals();
    }, [])
  );

  const loadGoals = async () => {
    try {
      setIsLoading(true);
      const data = await selfAwarenessService.getGoals();
      setGoals(data);
    } catch (error) {
      console.error('加载目标列表失败:', error);
      Alert.alert('错误', '加载目标列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadGoals();
    setIsRefreshing(false);
  };

  const handleAdd = () => {
    setEditingGoal(null);
    setTitle('');
    setDescription('');
    setCategory('life');
    setPriority('3');
    setStatus('pending');
    setDeadline('');
    setMilestones('');
    setNotes('');
    setIsModalVisible(true);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || '');
    setCategory(goal.category || 'life');
    setPriority(String(goal.priority || 3));
    setStatus(goal.status || 'pending');
    setDeadline(goal.deadline || '');
    setMilestones(goal.milestones?.join(', ') || '');
    setNotes(goal.notes || '');
    setIsModalVisible(true);
  };

  const handleDelete = (goal: Goal) => {
    Alert.alert(
      '删除目标',
      `确定要删除"${goal.title}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await selfAwarenessService.deleteGoal(goal.goalId);
              await loadGoals();
            } catch (error: any) {
              Alert.alert('错误', error.message || '删除失败');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入目标标题');
      return;
    }

    try {
      const goalData = {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category || 'life',
        priority: parseInt(priority, 10) || 3,
        status: status || 'pending',
        deadline: deadline.trim() || null,
        milestones: milestones.trim() ? milestones.split(',').map(m => m.trim()).filter(m => m) : undefined,
        notes: notes.trim() || undefined,
      };

      if (editingGoal) {
        await selfAwarenessService.updateGoal(editingGoal.goalId, goalData);
      } else {
        await selfAwarenessService.createGoal(goalData);
      }

      setIsModalVisible(false);
      await loadGoals();
    } catch (error: any) {
      Alert.alert('错误', error.message || '保存失败');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'abandoned': return '#6b7280';
      default: return '#f59e0b';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'in_progress': return '进行中';
      case 'abandoned': return '已放弃';
      default: return '待开始';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.push('/self-awareness-home' as any)}
          >
            <FontAwesome6 name="house" size={18} color="#6366f1" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>人生目标</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <FontAwesome6 name="plus" size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {goals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="bullseye" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>暂无目标</Text>
            <Text style={styles.emptyDescription}>点击右上角 + 添加目标</Text>
          </View>
        ) : (
          goals.map((goal) => (
            <View key={goal.goalId} style={styles.item}>
              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{goal.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(goal.status || 'pending') }]}>
                    <Text style={styles.statusText}>{getStatusText(goal.status || 'pending')}</Text>
                  </View>
                </View>
                {goal.description && (
                  <Text style={styles.itemDescription}>{goal.description}</Text>
                )}
                {goal.deadline && (
                  <Text style={styles.itemDeadline}>截止日期: {goal.deadline}</Text>
                )}
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(goal)}
                >
                  <FontAwesome6 name="pen-to-square" size={16} color="#6366f1" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(goal)}
                >
                  <FontAwesome6 name="trash-can" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingGoal ? '编辑目标' : '添加目标'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <FontAwesome6 name="xmark" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>标题 *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="请输入目标标题"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>描述</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="请输入描述"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>分类</Text>
                <View style={styles.row}>
                  {['life', 'career', 'health', 'relationship'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        category === cat && styles.categoryButtonActive,
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          category === cat && styles.categoryButtonTextActive,
                        ]}
                      >
                        {cat === 'life' ? '生活' : cat === 'career' ? '事业' : cat === 'health' ? '健康' : '关系'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>优先级 (1-高, 2-中, 3-低)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="3"
                  value={priority}
                  onChangeText={setPriority}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>状态</Text>
                <View style={styles.row}>
                  {['pending', 'in_progress', 'completed', 'abandoned'].map((stat) => (
                    <TouchableOpacity
                      key={stat}
                      style={[
                        styles.statusButton,
                        status === stat && styles.statusButtonActive,
                      ]}
                      onPress={() => setStatus(stat as any)}
                    >
                      <Text
                        style={[
                          styles.statusButtonText,
                          status === stat && styles.statusButtonTextActive,
                        ]}
                      >
                        {getStatusText(stat)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>截止日期 (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="例如: 2024-12-31"
                  value={deadline}
                  onChangeText={setDeadline}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>里程碑（用逗号分隔）</Text>
                <TextInput
                  style={styles.input}
                  placeholder="例如: 完成第一步, 完成第二步"
                  value={milestones}
                  onChangeText={setMilestones}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>备注</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="请输入备注"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSave}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default GoalsListScreen;

