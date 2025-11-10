/**
 * 价值观和原则清单列表页面
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
import { selfAwarenessService, Value } from '../../../services/self-awareness.service';
import styles from './styles';

const ValuesListScreen: React.FC = () => {
  const router = useRouter();
  const [values, setValues] = useState<Value[]>([]);
  const [filteredValues, setFilteredValues] = useState<Value[]>([]);
  const [selectedType, setSelectedType] = useState<'value' | 'principle' | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingValue, setEditingValue] = useState<Value | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'value' | 'principle'>('value');
  const [importance, setImportance] = useState('3');
  const [examples, setExamples] = useState('');
  const [notes, setNotes] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      loadValues();
    }, [])
  );

  const loadValues = async () => {
    try {
      setIsLoading(true);
      const data = await selfAwarenessService.getValues();
      setValues(data);
      applyFilter(data, selectedType);
    } catch (error) {
      console.error('加载价值观列表失败:', error);
      Alert.alert('错误', '加载价值观列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = (data: Value[], filterType: 'value' | 'principle' | 'all') => {
    if (filterType === 'all') {
      setFilteredValues(data);
    } else {
      setFilteredValues(data.filter(v => v.type === filterType));
    }
  };

  const handleFilterChange = (filterType: 'value' | 'principle' | 'all') => {
    setSelectedType(filterType);
    applyFilter(values, filterType);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadValues();
    setIsRefreshing(false);
  };

  const handleAdd = () => {
    setEditingValue(null);
    setName('');
    setDescription('');
    setType('value');
    setImportance('3');
    setExamples('');
    setNotes('');
    setIsModalVisible(true);
  };

  const handleEdit = (value: Value) => {
    setEditingValue(value);
    setName(value.name);
    setDescription(value.description || '');
    setType(value.type || 'value');
    setImportance(String(value.importance || 3));
    setExamples(value.examples?.join(', ') || '');
    setNotes(value.notes || '');
    setIsModalVisible(true);
  };

  const handleDelete = (value: Value) => {
    Alert.alert(
      '删除',
      `确定要删除"${value.name}"吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await selfAwarenessService.deleteValue(value.valueId);
              await loadValues();
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
      Alert.alert('提示', '请输入名称');
      return;
    }

    try {
      const valueData = {
        name: name.trim(),
        description: description.trim() || undefined,
        type: type || 'value',
        importance: parseInt(importance, 10) || 3,
        examples: examples.trim() ? examples.split(',').map(e => e.trim()).filter(e => e) : undefined,
        notes: notes.trim() || undefined,
      };

      if (editingValue) {
        await selfAwarenessService.updateValue(editingValue.valueId, valueData);
      } else {
        await selfAwarenessService.createValue(valueData);
      }

      setIsModalVisible(false);
      await loadValues();
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
        <Text style={styles.headerTitle}>价值观和原则</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <FontAwesome6 name="plus" size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* 筛选器 */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, selectedType === 'all' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('all')}
        >
          <Text style={[styles.filterButtonText, selectedType === 'all' && styles.filterButtonTextActive]}>
            全部
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, selectedType === 'value' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('value')}
        >
          <Text style={[styles.filterButtonText, selectedType === 'value' && styles.filterButtonTextActive]}>
            价值观
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, selectedType === 'principle' && styles.filterButtonActive]}
          onPress={() => handleFilterChange('principle')}
        >
          <Text style={[styles.filterButtonText, selectedType === 'principle' && styles.filterButtonTextActive]}>
            原则
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
      >
        {filteredValues.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="heart" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>暂无{selectedType === 'all' ? '' : selectedType === 'value' ? '价值观' : '原则'}</Text>
            <Text style={styles.emptyDescription}>点击右上角 + 添加</Text>
          </View>
        ) : (
          filteredValues.map((value) => (
            <View key={value.valueId} style={styles.item}>
              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{value.name}</Text>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>
                      {value.type === 'value' ? '价值观' : '原则'}
                    </Text>
                  </View>
                </View>
                {value.description && (
                  <Text style={styles.itemDescription}>{value.description}</Text>
                )}
                {value.examples && value.examples.length > 0 && (
                  <View style={styles.examplesContainer}>
                    {value.examples.map((example, index) => (
                      <View key={index} style={styles.exampleTag}>
                        <Text style={styles.exampleText}>{example}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(value)}
                >
                  <FontAwesome6 name="pen-to-square" size={16} color="#6366f1" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(value)}
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
                {editingValue ? '编辑' : '添加'}
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <FontAwesome6 name="xmark" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>名称 *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="请输入名称"
                  value={name}
                  onChangeText={setName}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>类型</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.typeButton, type === 'value' && styles.typeButtonActive]}
                    onPress={() => setType('value')}
                  >
                    <Text style={[styles.typeButtonText, type === 'value' && styles.typeButtonTextActive]}>
                      价值观
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeButton, type === 'principle' && styles.typeButtonActive]}
                    onPress={() => setType('principle')}
                  >
                    <Text style={[styles.typeButtonText, type === 'principle' && styles.typeButtonTextActive]}>
                      原则
                    </Text>
                  </TouchableOpacity>
                </View>
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
                <Text style={styles.inputLabel}>重要性 (1-最重要, 2-重要, 3-一般)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="3"
                  value={importance}
                  onChangeText={setImportance}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>实例/应用场景（用逗号分隔）</Text>
                <TextInput
                  style={styles.input}
                  placeholder="例如: 工作中, 生活中"
                  value={examples}
                  onChangeText={setExamples}
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

export default ValuesListScreen;

