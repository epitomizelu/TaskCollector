/**
 * 老师清单列表页面
 */

import React, { useState, useEffect } from 'react';
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
import { selfAwarenessService, Teacher } from '../../../services/self-awareness.service';
import styles from './styles';

const TeachersListScreen: React.FC = () => {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState('');
  const [qualities, setQualities] = useState('');
  const [learnings, setLearnings] = useState('');
  const [notes, setNotes] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadTeachers();
    }, [])
  );

  const loadTeachers = async () => {
    try {
      setIsLoading(true);
      const data = await selfAwarenessService.getTeachers();
      setTeachers(data);
    } catch (error) {
      console.error('加载老师列表失败:', error);
      Alert.alert('错误', '加载老师列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTeachers();
    setIsRefreshing(false);
  };

  const handleAdd = () => {
    setEditingTeacher(null);
    setName('');
    setDescription('');
    setFields('');
    setQualities('');
    setLearnings('');
    setNotes('');
    setIsModalVisible(true);
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setName(teacher.name);
    setDescription(teacher.description || '');
    setFields(teacher.fields?.join(', ') || '');
    setQualities(teacher.qualities?.join(', ') || '');
    setLearnings(teacher.learnings?.join(', ') || '');
    setNotes(teacher.notes || '');
    setIsModalVisible(true);
  };

  const handleDelete = (teacher: Teacher) => {
    Alert.alert(
      '删除老师',
      `确定要删除"${teacher.name}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await selfAwarenessService.deleteTeacher(teacher.teacherId);
              await loadTeachers();
            } catch (error: any) {
              Alert.alert('错误', error.message || '删除失败');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('提示', '请输入老师姓名');
      return;
    }

    try {
      const teacherData = {
        name: name.trim(),
        description: description.trim() || undefined,
        fields: fields.trim() ? fields.split(',').map(f => f.trim()).filter(f => f) : undefined,
        qualities: qualities.trim() ? qualities.split(',').map(q => q.trim()).filter(q => q) : undefined,
        learnings: learnings.trim() ? learnings.split(',').map(l => l.trim()).filter(l => l) : undefined,
        notes: notes.trim() || undefined,
      };

      if (editingTeacher) {
        await selfAwarenessService.updateTeacher(editingTeacher.teacherId, teacherData);
      } else {
        await selfAwarenessService.createTeacher(teacherData);
      }

      setIsModalVisible(false);
      await loadTeachers();
    } catch (error: any) {
      Alert.alert('错误', error.message || '保存失败');
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
      {/* 头部 */}
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
        <Text style={styles.headerTitle}>老师清单</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <FontAwesome6 name="plus" size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* 列表 */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {teachers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="user-graduate" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>暂无老师</Text>
            <Text style={styles.emptyDescription}>点击右上角 + 添加老师</Text>
          </View>
        ) : (
          teachers.map((teacher) => (
            <View key={teacher.teacherId} style={styles.item}>
              <View style={styles.itemContent}>
                <Text style={styles.itemName}>{teacher.name}</Text>
                {teacher.description && (
                  <Text style={styles.itemDescription}>{teacher.description}</Text>
                )}
                {teacher.fields && teacher.fields.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {teacher.fields.map((field, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{field}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(teacher)}
                >
                  <FontAwesome6 name="pen-to-square" size={16} color="#6366f1" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(teacher)}
                >
                  <FontAwesome6 name="trash-can" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 添加/编辑 Modal */}
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
                {editingTeacher ? '编辑老师' : '添加老师'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <FontAwesome6 name="xmark" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>姓名 *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="请输入老师姓名"
                  value={name}
                  onChangeText={setName}
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
                <Text style={styles.inputLabel}>领域（用逗号分隔）</Text>
                <TextInput
                  style={styles.input}
                  placeholder="例如：技术、管理、设计"
                  value={fields}
                  onChangeText={setFields}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>品质（用逗号分隔）</Text>
                <TextInput
                  style={styles.input}
                  placeholder="例如：认真、负责、创新"
                  value={qualities}
                  onChangeText={setQualities}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>学习要点（用逗号分隔）</Text>
                <TextInput
                  style={styles.input}
                  placeholder="例如：沟通技巧、时间管理"
                  value={learnings}
                  onChangeText={setLearnings}
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

export default TeachersListScreen;

