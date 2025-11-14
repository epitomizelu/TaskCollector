import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { reviewService, ReviewData } from '../../../services/review.service';
import styles from './styles';

const ReviewMonthlyScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const reviewId = params.reviewId as string;
  const date = params.date as string || reviewService.getDateString('monthly');

  const [achievements, setAchievements] = useState<string[]>(['']);
  const [reflections, setReflections] = useState<string[]>(['']);
  const [improvements, setImprovements] = useState<string[]>(['']);
  const [gratitude, setGratitude] = useState<string[]>(['']);
  const [goals, setGoals] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [currentReview, setCurrentReview] = useState<ReviewData | null>(null);
  // 折叠状态：成就、反思、改进、感恩、目标
  const [collapsed, setCollapsed] = useState({
    achievements: false,
    reflections: false,
    improvements: false,
    gratitude: false,
    goals: false,
  });

  useEffect(() => {
    // 检查日期变更并初始化
    initializePage();
  }, []);

  const initializePage = async () => {
    try {
      setIsLoading(true);
      
      // 检查日期是否变更
      const dateChanged = await reviewService.checkDateChange('monthly');
      
      if (dateChanged) {
        // 日期已变更，清空页面数据
        clearForm();
        // 同步云端数据
        await reviewService.getAllReviews();
      }
      
      // 加载当天的复盘数据
      await loadTodayReview();
    } catch (error) {
      console.error('初始化页面失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setAchievements(['']);
    setReflections(['']);
    setImprovements(['']);
    setGratitude(['']);
    setGoals(['']);
    setNotes('');
    setRating(undefined);
    setCurrentReview(null);
  };

  const loadTodayReview = async () => {
    try {
      const today = reviewService.getDateString('monthly');
      const review = await reviewService.getReviewByDate('monthly', today);
      
      if (review) {
        setCurrentReview(review);
        setAchievements(review.content.achievements && review.content.achievements.length > 0 
          ? review.content.achievements 
          : ['']);
        setReflections(review.content.reflections && review.content.reflections.length > 0 
          ? review.content.reflections 
          : ['']);
        setImprovements(review.content.improvements && review.content.improvements.length > 0 
          ? review.content.improvements 
          : ['']);
        setGratitude(review.content.gratitude && review.content.gratitude.length > 0 
          ? review.content.gratitude 
          : ['']);
        setGoals(review.content.goals && review.content.goals.length > 0 
          ? review.content.goals 
          : ['']);
        setNotes(review.content.notes || '');
        setRating(review.rating);
        
        // 检查是否可以编辑
        setIsReadOnly(!reviewService.canEdit(review));
      } else {
        const isToday = reviewService.isToday(date, 'monthly');
        setIsReadOnly(!isToday);
      }
    } catch (error) {
      console.error('加载复盘失败:', error);
    }
  };


  const handleAddItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, '']);
  };

  const handleUpdateItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number,
    value: string
  ) => {
    setter(prev => {
      const newItems = [...prev];
      newItems[index] = value;
      return newItems;
    });
  };

  const handleRemoveItem = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    index: number
  ) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (isSubmitting || isReadOnly) {
      return;
    }

    const today = reviewService.getDateString('monthly');
    if (date !== today) {
      Alert.alert('提示', '只能编辑本月的复盘');
      return;
    }

    try {
      setIsSubmitting(true);

      const reviewData: Omit<ReviewData, 'reviewId' | 'createdAt' | 'updatedAt'> = {
        type: 'monthly',
        date: today,
        content: {
          achievements: achievements.filter(a => a.trim()),
          reflections: reflections.filter(r => r.trim()),
          improvements: improvements.filter(i => i.trim()),
          gratitude: gratitude.filter(g => g.trim()),
          goals: goals.filter(g => g.trim()),
          notes: notes.trim() || undefined,
        },
        rating,
      };

      await reviewService.createOrUpdateReview(reviewData);

      Alert.alert('成功', '保存成功', [
        {
          text: '确定',
          onPress: () => {
            loadTodayReview();
          },
        },
      ]);
    } catch (error: any) {
      console.error('保存失败:', error);
      Alert.alert('错误', error.message || '保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="arrow-left" size={20} color="#1F2937" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.title}>月复盘</Text>
              <Text style={styles.subtitle}>{date}</Text>
            </View>
            {!isReadOnly && (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>保存</Text>
                )}
              </TouchableOpacity>
            )}
            {isReadOnly && (
              <View style={styles.readOnlyBadge}>
                <Text style={styles.readOnlyText}>只读</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>本月评分 (1-10)</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.ratingButton,
                    rating === num && styles.ratingButtonActive,
                  ]}
                  onPress={() => setRating(num)}
                >
                  <Text
                    style={[
                      styles.ratingButtonText,
                      rating === num && styles.ratingButtonTextActive,
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setCollapsed(prev => ({ ...prev, achievements: !prev.achievements }))}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>本月成就</Text>
              <FontAwesome6
                name={collapsed.achievements ? 'chevron-down' : 'chevron-up'}
                size={16}
                color="#6B7280"
              />
            </TouchableOpacity>
            {!collapsed.achievements && (
              <>
                {achievements.map((item, index) => (
                  <View key={index} style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, isReadOnly && styles.inputReadOnly]}
                      placeholder="记录本月完成的事情..."
                      value={item}
                      onChangeText={value => !isReadOnly && handleUpdateItem(setAchievements, index, value)}
                      multiline
                      editable={!isReadOnly}
                    />
                    {achievements.length > 1 && !isReadOnly && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveItem(setAchievements, index)}
                      >
                        <FontAwesome6 name="xmark" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {!isReadOnly && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddItem(setAchievements)}
                  >
                    <FontAwesome6 name="plus" size={16} color="#6366f1" />
                    <Text style={styles.addButtonText}>添加</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setCollapsed(prev => ({ ...prev, reflections: !prev.reflections }))}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>本月反思</Text>
              <FontAwesome6
                name={collapsed.reflections ? 'chevron-down' : 'chevron-up'}
                size={16}
                color="#6B7280"
              />
            </TouchableOpacity>
            {!collapsed.reflections && (
              <>
                {reflections.map((item, index) => (
                  <View key={index} style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, isReadOnly && styles.inputReadOnly]}
                      placeholder="本月有什么值得思考的..."
                      value={item}
                      onChangeText={value => !isReadOnly && handleUpdateItem(setReflections, index, value)}
                      multiline
                      editable={!isReadOnly}
                    />
                    {reflections.length > 1 && !isReadOnly && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveItem(setReflections, index)}
                      >
                        <FontAwesome6 name="xmark" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {!isReadOnly && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddItem(setReflections)}
                  >
                    <FontAwesome6 name="plus" size={16} color="#6366f1" />
                    <Text style={styles.addButtonText}>添加</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setCollapsed(prev => ({ ...prev, improvements: !prev.improvements }))}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>下月改进</Text>
              <FontAwesome6
                name={collapsed.improvements ? 'chevron-down' : 'chevron-up'}
                size={16}
                color="#6B7280"
              />
            </TouchableOpacity>
            {!collapsed.improvements && (
              <>
                {improvements.map((item, index) => (
                  <View key={index} style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, isReadOnly && styles.inputReadOnly]}
                      placeholder="下月可以做得更好的地方..."
                      value={item}
                      onChangeText={value => !isReadOnly && handleUpdateItem(setImprovements, index, value)}
                      multiline
                      editable={!isReadOnly}
                    />
                    {improvements.length > 1 && !isReadOnly && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveItem(setImprovements, index)}
                      >
                        <FontAwesome6 name="xmark" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {!isReadOnly && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddItem(setImprovements)}
                  >
                    <FontAwesome6 name="plus" size={16} color="#6366f1" />
                    <Text style={styles.addButtonText}>添加</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setCollapsed(prev => ({ ...prev, gratitude: !prev.gratitude }))}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>本月感恩</Text>
              <FontAwesome6
                name={collapsed.gratitude ? 'chevron-down' : 'chevron-up'}
                size={16}
                color="#6B7280"
              />
            </TouchableOpacity>
            {!collapsed.gratitude && (
              <>
                {gratitude.map((item, index) => (
                  <View key={index} style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, isReadOnly && styles.inputReadOnly]}
                      placeholder="本月要感谢的人或事..."
                      value={item}
                      onChangeText={value => !isReadOnly && handleUpdateItem(setGratitude, index, value)}
                      multiline
                      editable={!isReadOnly}
                    />
                    {gratitude.length > 1 && !isReadOnly && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveItem(setGratitude, index)}
                      >
                        <FontAwesome6 name="xmark" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {!isReadOnly && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddItem(setGratitude)}
                  >
                    <FontAwesome6 name="plus" size={16} color="#6366f1" />
                    <Text style={styles.addButtonText}>添加</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => setCollapsed(prev => ({ ...prev, goals: !prev.goals }))}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionTitle}>下月目标</Text>
              <FontAwesome6
                name={collapsed.goals ? 'chevron-down' : 'chevron-up'}
                size={16}
                color="#6B7280"
              />
            </TouchableOpacity>
            {!collapsed.goals && (
              <>
                {goals.map((item, index) => (
                  <View key={index} style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, isReadOnly && styles.inputReadOnly]}
                      placeholder="下月的目标..."
                      value={item}
                      onChangeText={value => !isReadOnly && handleUpdateItem(setGoals, index, value)}
                      multiline
                      editable={!isReadOnly}
                    />
                    {goals.length > 1 && !isReadOnly && (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveItem(setGoals, index)}
                      >
                        <FontAwesome6 name="xmark" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {!isReadOnly && (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddItem(setGoals)}
                  >
                    <FontAwesome6 name="plus" size={16} color="#6366f1" />
                    <Text style={styles.addButtonText}>添加</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>备注</Text>
            <TextInput
              style={[styles.input, styles.textArea, isReadOnly && styles.inputReadOnly]}
              placeholder="其他想记录的内容..."
              value={notes}
              onChangeText={value => !isReadOnly && setNotes(value)}
              multiline
              numberOfLines={4}
              editable={!isReadOnly}
            />
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ReviewMonthlyScreen;

