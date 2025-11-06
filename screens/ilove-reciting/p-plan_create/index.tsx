

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import styles from './styles';

interface ContentItem {
  id: string;
  name: string;
  type: 'audio' | 'document';
  totalSentences: number;
}

interface PlanCreateScreenProps {}

const PlanCreateScreen: React.FC<PlanCreateScreenProps> = () => {
  const router = useRouter();
  
  // 状态管理
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(14);
  const [selectedStartDate, setSelectedStartDate] = useState<Date>(new Date());
  const [isDatePickerVisible, setIsDatePickerVisible] = useState<boolean>(false);
  const [isContentPickerVisible, setIsContentPickerVisible] = useState<boolean>(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);

  // 可选的内容列表
  const availableContent: ContentItem[] = [
    {
      id: 'content1',
      name: '英语单词 - 第3单元',
      type: 'audio',
      totalSentences: 20,
    },
    {
      id: 'content2',
      name: '古文背诵 - 出师表',
      type: 'document',
      totalSentences: 25,
    },
    {
      id: 'content3',
      name: '日语五十音图',
      type: 'audio',
      totalSentences: 15,
    },
  ];

  // 可选的周期选项
  const durationOptions = [7, 14, 30];

  // 处理返回按钮
  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  // 处理内容选择
  const handleContentSelect = (content: ContentItem) => {
    setSelectedContent(content);
    setIsContentPickerVisible(false);
  };

  // 处理周期选择
  const handleDurationSelect = (duration: number) => {
    setSelectedDuration(duration);
  };

  // 处理日期选择
  const handleDateSelect = (dateType: 'today' | 'tomorrow' | 'nextWeek') => {
    const today = new Date();
    let newDate: Date;

    switch (dateType) {
      case 'today':
        newDate = today;
        break;
      case 'tomorrow':
        newDate = new Date(today);
        newDate.setDate(today.getDate() + 1);
        break;
      case 'nextWeek':
        newDate = new Date(today);
        newDate.setDate(today.getDate() + 7);
        break;
      default:
        newDate = today;
    }

    setSelectedStartDate(newDate);
    setIsDatePickerVisible(false);
  };

  // 生成计划
  const handleGeneratePlan = async () => {
    if (!selectedContent) {
      Alert.alert('提示', '请先选择背诵内容');
      return;
    }

    setIsGeneratingPlan(true);

    try {
      // 模拟生成计划的异步操作
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 生成新计划ID并跳转到我的计划页
      const newPlanId = 'plan_' + Date.now();
      router.push(`/p-plan_list?newPlanId=${newPlanId}`);
    } catch (error) {
      Alert.alert('错误', '生成计划失败，请重试');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // 格式化日期显示
  const formatDateDisplay = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return '明天';
    } else {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    }
  };

  // 计算结束日期
  const getEndDate = (): Date => {
    const endDate = new Date(selectedStartDate);
    endDate.setDate(endDate.getDate() + selectedDuration - 1);
    return endDate;
  };

  // 计算预计每日学习时间
  const getEstimatedDailyTime = (): number => {
    if (!selectedContent) return 0;
    return Math.ceil(selectedContent.totalSentences / selectedDuration) * 2;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="arrow-left" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>制定背诵计划</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* 选择背诵内容 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>选择背诵内容</Text>
            <TouchableOpacity
              style={styles.contentSelectButton}
              onPress={() => setIsContentPickerVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.contentSelectIconContainer}>
                {selectedContent ? (
                  <FontAwesome6
                    name={selectedContent.type === 'audio' ? 'file-audio' : 'file-alt'}
                    size={24}
                    color={selectedContent.type === 'audio' ? '#4F46E5' : '#06B6D4'}
                  />
                ) : (
                  <FontAwesome6 name="folder-open" size={24} color="#6B7280" />
                )}
              </View>
              <Text style={styles.contentSelectText}>
                {selectedContent ? selectedContent.name : '点击选择要背诵的内容'}
              </Text>
              <Text style={styles.contentSelectSubtext}>
                {selectedContent ? `${selectedContent.totalSentences}个句子` : '支持音频和文档内容'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 背诵参数设置 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>背诵参数</Text>
            
            {/* 背诵周期 */}
            <View style={styles.parameterGroup}>
              <Text style={styles.parameterLabel}>背诵周期</Text>
              <View style={styles.durationOptions}>
                {durationOptions.map((duration) => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationOption,
                      selectedDuration === duration && styles.durationOptionSelected,
                    ]}
                    onPress={() => handleDurationSelect(duration)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.durationOptionText,
                        selectedDuration === duration && styles.durationOptionTextSelected,
                      ]}
                    >
                      {duration}天
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 起始日期 */}
            <View style={styles.parameterGroup}>
              <Text style={styles.parameterLabel}>起始日期</Text>
              <TouchableOpacity
                style={styles.dateSelectButton}
                onPress={() => setIsDatePickerVisible(true)}
                activeOpacity={0.7}
              >
                <View style={styles.dateSelectLeft}>
                  <FontAwesome5 name="calendar-alt" size={16} color="#6B7280" />
                  <Text style={styles.dateSelectText}>
                    {formatDateDisplay(selectedStartDate)}
                  </Text>
                </View>
                <FontAwesome6 name="chevron-right" size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 计划预览 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>计划预览</Text>
            <View style={styles.previewContainer}>
              <View style={styles.previewItem}>
                <FontAwesome6
                  name={selectedContent ? (selectedContent.type === 'audio' ? 'file-audio' : 'file-alt') : 'file-alt'}
                  size={16}
                  color={selectedContent ? (selectedContent.type === 'audio' ? '#4F46E5' : '#06B6D4') : '#6B7280'}
                />
                <View style={styles.previewContent}>
                  <Text style={styles.previewTitle}>
                    {selectedContent ? selectedContent.name : '请先选择背诵内容'}
                  </Text>
                  <Text style={styles.previewSubtitle}>
                    {selectedContent
                      ? `${selectedContent.totalSentences}个句子 · 预计每日学习 ${getEstimatedDailyTime()} 分钟`
                      : '预计每日学习时间：-- 分钟'}
                  </Text>
                </View>
              </View>

              <View style={styles.previewItem}>
                <FontAwesome6 name="clock" size={16} color="#6B7280" />
                <View style={styles.previewContent}>
                  <Text style={styles.previewTitle}>背诵周期：{selectedDuration}天</Text>
                  <Text style={styles.previewSubtitle}>
                    {selectedContent
                      ? `学习时间：${formatDateDisplay(selectedStartDate)} 至 ${formatDateDisplay(getEndDate())}`
                      : '学习时间：-- 至 --'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 生成计划按钮 */}
          <View style={styles.generateSection}>
            <TouchableOpacity
              style={[
                styles.generateButton,
                (!selectedContent || isGeneratingPlan) && styles.generateButtonDisabled,
              ]}
              onPress={handleGeneratePlan}
              disabled={!selectedContent || isGeneratingPlan}
              activeOpacity={0.8}
            >
              <Text style={styles.generateButtonText}>
                {isGeneratingPlan ? '生成中...' : '生成背诵计划'}
              </Text>
              {isGeneratingPlan && (
                <View style={styles.loadingSpinner} />
              )}
            </TouchableOpacity>
          </View>
        </View>
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
              <Text style={styles.modalTitle}>选择起始日期</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsDatePickerVisible(false)}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="times" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.dateOptions}>
              <TouchableOpacity
                style={[
                  styles.dateOption,
                  formatDateDisplay(selectedStartDate) === '今天' && styles.dateOptionSelected,
                ]}
                onPress={() => handleDateSelect('today')}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="calendar-day" size={16} color="#4F46E5" />
                <Text style={styles.dateOptionText}>今天</Text>
                <Text style={styles.dateOptionSubtext}>12月28日</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dateOption,
                  formatDateDisplay(selectedStartDate) === '明天' && styles.dateOptionSelected,
                ]}
                onPress={() => handleDateSelect('tomorrow')}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="calendar-day" size={16} color="#4F46E5" />
                <Text style={styles.dateOptionText}>明天</Text>
                <Text style={styles.dateOptionSubtext}>12月29日</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.dateOption,
                  formatDateDisplay(selectedStartDate) === '1月4日' && styles.dateOptionSelected,
                ]}
                onPress={() => handleDateSelect('nextWeek')}
                activeOpacity={0.7}
              >
                <FontAwesome6 name="calendar-day" size={16} color="#4F46E5" />
                <Text style={styles.dateOptionText}>下周开始</Text>
                <Text style={styles.dateOptionSubtext}>1月4日</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 内容选择器模态框 */}
      <Modal
        visible={isContentPickerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsContentPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackground}
            onPress={() => setIsContentPickerVisible(false)}
            activeOpacity={1}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>选择背诵内容</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setIsContentPickerVisible(false)}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="times" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.contentOptions}>
              {availableContent.map((content) => (
                <TouchableOpacity
                  key={content.id}
                  style={[
                    styles.contentOption,
                    selectedContent?.id === content.id && styles.contentOptionSelected,
                  ]}
                  onPress={() => handleContentSelect(content)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.contentOptionIcon,
                    { backgroundColor: content.type === 'audio' ? 'rgba(79, 70, 229, 0.1)' : 'rgba(6, 182, 212, 0.1)' }
                  ]}>
                    <FontAwesome6
                      name={content.type === 'audio' ? 'file-audio' : 'file-alt'}
                      size={16}
                      color={content.type === 'audio' ? '#4F46E5' : '#06B6D4'}
                    />
                  </View>
                  <View style={styles.contentOptionInfo}>
                    <Text style={styles.contentOptionTitle}>{content.name}</Text>
                    <Text style={styles.contentOptionSubtitle}>
                      {content.type === 'audio' ? '音频内容' : '文档内容'} · {content.totalSentences}个句子
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default PlanCreateScreen;

