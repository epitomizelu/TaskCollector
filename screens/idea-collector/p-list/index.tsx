import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { ideaService, IdeaData } from '../../../services/idea.service';
import styles from './styles';

const IdeaListScreen = () => {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ideas, setIdeas] = useState<IdeaData[]>([]);
  const [filteredIdeas, setFilteredIdeas] = useState<IdeaData[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteIdeaInfo, setDeleteIdeaInfo] = useState<IdeaData | null>(null);

  // 每次页面获得焦点时刷新数据
  useFocusEffect(
    React.useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate])
  );

  const loadData = async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setIsLoading(true);
      }
      console.log('loadData 开始加载数据');
      const allIdeas = await ideaService.getAllIdeas();
      console.log('loadData 加载到的想法数量:', allIdeas.length);
      setIdeas(allIdeas);
      applyFilter(allIdeas, selectedDate);
      console.log('loadData 数据加载完成，已应用筛选');
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      if (!skipLoading) {
        setIsLoading(false);
      }
    }
  };

  const applyFilter = (ideasList: IdeaData[], date: string | null) => {
    if (date) {
      const filtered = ideasList.filter(idea => idea.recordDate === date);
      setFilteredIdeas(filtered);
    } else {
      setFilteredIdeas(ideasList);
    }
  };

  const handleDateFilter = () => {
    setShowDatePicker(true);
  };

  const handleDateConfirm = () => {
    if (dateInput.trim()) {
      // 验证日期格式 YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(dateInput.trim())) {
        setSelectedDate(dateInput.trim());
        applyFilter(ideas, dateInput.trim());
      } else {
        alert('日期格式错误，请使用 YYYY-MM-DD 格式');
      }
    } else {
      // 清除筛选
      setSelectedDate(null);
      applyFilter(ideas, null);
    }
    setShowDatePicker(false);
    setDateInput('');
  };

  const handleClearFilter = () => {
    setSelectedDate(null);
    applyFilter(ideas, null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleIdeaPress = (idea: IdeaData) => {
    router.push({
      pathname: '/idea-collector-detail',
      params: { ideaId: idea.ideaId },
    } as any);
  };

  const handleEditIdea = (idea: IdeaData) => {
    router.push({
      pathname: '/idea-collector-create',
      params: { ideaId: idea.ideaId },
    } as any);
  };

  const performDelete = async (idea: IdeaData) => {
    console.log('performDelete 开始执行', idea.ideaId);
    try {
      console.log('步骤1: 调用 ideaService.deleteIdea', idea.ideaId);
      await ideaService.deleteIdea(idea.ideaId);
      console.log('步骤2: 删除服务调用成功');
      
      // 刷新数据
      console.log('步骤3: 调用 loadData 刷新数据');
      await loadData(false);
      console.log('步骤4: 数据刷新完成，UI应该已更新');
      
      // 显示成功提示
      Alert.alert('成功', '想法已删除');
    } catch (error: any) {
      console.error('删除失败:', error);
      console.error('错误详情:', error?.message);
      console.error('错误堆栈:', error?.stack);
      Alert.alert('错误', error?.message || '删除失败，请稍后重试');
    }
  };

  const handleDeleteIdea = (idea: IdeaData) => {
    console.log('handleDeleteIdea 被调用', idea.ideaId, idea.content);
    
    // 在 Web 平台上使用自定义 Modal，其他平台使用 Alert
    if (Platform.OS === 'web') {
      console.log('Web 平台，使用自定义 Modal');
      setDeleteIdeaInfo(idea);
      setDeleteModalVisible(true);
    } else {
      console.log('原生平台，使用 Alert.alert');
      // 使用 setTimeout 确保 Alert 在下一个事件循环中显示
      setTimeout(() => {
        console.log('执行 Alert.alert...');
        try {
          Alert.alert(
            '确认删除',
            `确定要删除这个想法吗？\n\n"${idea.content.substring(0, 30)}${idea.content.length > 30 ? '...' : ''}"`,
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
                onPress: () => performDelete(idea),
              },
            ],
            { cancelable: true }
          );
          console.log('Alert.alert 已调用');
        } catch (error) {
          console.error('Alert.alert 调用失败:', error);
          // 如果 Alert 失败，直接执行删除
          console.log('Alert 失败，直接执行删除...');
          performDelete(idea);
        }
      }, 0);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteIdeaInfo) {
      setDeleteModalVisible(false);
      performDelete(deleteIdeaInfo);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalVisible(false);
    setDeleteIdeaInfo(null);
  };

  const handleCreateIdea = () => {
    router.push('/idea-collector-create' as any);
  };

  // 按日期分组（使用筛选后的想法）
  const groupedIdeas = filteredIdeas.reduce((acc, idea) => {
    const date = idea.recordDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(idea);
    return acc;
  }, {} as Record<string, IdeaData[]>);

  const sortedDates = Object.keys(groupedIdeas).sort((a, b) => b.localeCompare(a));

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <FontAwesome6 name="arrow-left" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>我的想法</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={handleDateFilter}
          >
            <FontAwesome6 name="calendar" size={18} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreateIdea}
          >
            <FontAwesome6 name="plus" size={20} color="#6366f1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 日期筛选显示 */}
      {selectedDate && (
        <View style={styles.filterBar}>
          <View style={styles.filterInfo}>
            <FontAwesome6 name="calendar-check" size={14} color="#6366f1" />
            <Text style={styles.filterText}>筛选日期: {selectedDate}</Text>
          </View>
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={handleClearFilter}
          >
            <FontAwesome6 name="xmark" size={14} color="#6B7280" />
            <Text style={styles.clearFilterText}>清除</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {sortedDates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="lightbulb" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>还没有想法记录</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleCreateIdea}
            >
              <Text style={styles.emptyButtonText}>记录第一个想法</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {sortedDates.map((date) => (
              <View key={date} style={styles.dateSection}>
                <Text style={styles.dateLabel}>{date}</Text>
                <View style={styles.ideasList}>
                  {groupedIdeas[date].map((idea) => (
                    <View key={idea.ideaId} style={styles.ideaCardWrapper}>
                      <TouchableOpacity
                        style={styles.ideaCard}
                        onPress={() => handleIdeaPress(idea)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.ideaContentWrapper}>
                          <View style={styles.ideaContent}>
                            <Text style={styles.ideaText} numberOfLines={3}>
                              {idea.content}
                            </Text>
                            <View style={styles.ideaMeta}>
                              {idea.analysis && (
                                <View style={styles.analysisBadge}>
                                  <FontAwesome6 name="brain" size={12} color="#6366f1" />
                                  <Text style={styles.analysisBadgeText}>AI已分析</Text>
                                </View>
                              )}
                              {idea.tags && idea.tags.length > 0 && (
                                <View style={styles.tagsContainer}>
                                  {idea.tags.slice(0, 2).map((tag, index) => (
                                    <View key={index} style={styles.tag}>
                                      <Text style={styles.tagText}>{tag}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          </View>
                        </View>
                        <View style={styles.ideaActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleEditIdea(idea)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <FontAwesome6 name="pen" size={16} color="#6366f1" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleDeleteIdea(idea)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <FontAwesome6 name="trash" size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* 删除确认 Modal (Web 平台使用) */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDeleteCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>确认删除</Text>
            <Text style={styles.modalSubtitle}>
              {deleteIdeaInfo
                ? `确定要删除这个想法吗？\n\n"${deleteIdeaInfo.content.substring(0, 30)}${deleteIdeaInfo.content.length > 30 ? '...' : ''}"`
                : '确定要删除这个想法吗？'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleDeleteCancel}
              >
                <Text style={styles.modalButtonCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleDeleteConfirm}
              >
                <Text style={styles.modalButtonConfirmText}>删除</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 日期选择器弹窗 */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>按日期筛选</Text>
            <Text style={styles.modalSubtitle}>输入日期 (YYYY-MM-DD)，留空显示全部</Text>
            <TextInput
              style={styles.dateInput}
              placeholder="例如: 2024-01-15"
              placeholderTextColor="#9CA3AF"
              value={dateInput}
              onChangeText={setDateInput}
              keyboardType="default"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowDatePicker(false);
                  setDateInput('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleDateConfirm}
              >
                <Text style={styles.modalButtonConfirmText}>确定</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default IdeaListScreen;

