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

const ReviewDailyScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const reviewId = params.reviewId as string;
  const date = params.date as string || reviewService.getDateString('daily');

  const [achievements, setAchievements] = useState<string[]>(['']);
  const [reflections, setReflections] = useState<string[]>(['']);
  const [improvements, setImprovements] = useState<string[]>(['']);
  const [gratitude, setGratitude] = useState<string[]>(['']);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (reviewId) {
      loadReview();
    }
  }, [reviewId]);

  const loadReview = async () => {
    try {
      setIsLoading(true);
      const review = await reviewService.getReviewById(reviewId);
      if (review) {
        setAchievements(review.content.achievements || ['']);
        setReflections(review.content.reflections || ['']);
        setImprovements(review.content.improvements || ['']);
        setGratitude(review.content.gratitude || ['']);
        setNotes(review.content.notes || '');
        setRating(review.rating);
      }
    } catch (error) {
      console.error('加载复盘失败:', error);
      Alert.alert('错误', '加载复盘失败');
    } finally {
      setIsLoading(false);
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
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      const reviewData: Omit<ReviewData, 'reviewId' | 'createdAt' | 'updatedAt'> = {
        type: 'daily',
        date,
        content: {
          achievements: achievements.filter(a => a.trim()),
          reflections: reflections.filter(r => r.trim()),
          improvements: improvements.filter(i => i.trim()),
          gratitude: gratitude.filter(g => g.trim()),
          notes: notes.trim() || undefined,
        },
        rating,
      };

      if (reviewId) {
        await reviewService.updateReview(reviewId, reviewData);
      } else {
        await reviewService.createReview(reviewData);
      }

      Alert.alert('成功', '保存成功', [
        {
          text: '确定',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('保存失败:', error);
      Alert.alert('错误', '保存失败，请重试');
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
          {/* 头部 */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="arrow-left" size={20} color="#1F2937" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.title}>日复盘</Text>
              <Text style={styles.subtitle}>{date}</Text>
            </View>
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
          </View>

          {/* 评分 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>今日评分 (1-10)</Text>
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

          {/* 成就 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>今日成就</Text>
            {achievements.map((item, index) => (
              <View key={index} style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="记录今天完成的事情..."
                  value={item}
                  onChangeText={value => handleUpdateItem(setAchievements, index, value)}
                  multiline
                />
                {achievements.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveItem(setAchievements, index)}
                  >
                    <FontAwesome6 name="xmark" size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddItem(setAchievements)}
            >
              <FontAwesome6 name="plus" size={16} color="#6366f1" />
              <Text style={styles.addButtonText}>添加</Text>
            </TouchableOpacity>
          </View>

          {/* 反思 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>今日反思</Text>
            {reflections.map((item, index) => (
              <View key={index} style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="今天有什么值得思考的..."
                  value={item}
                  onChangeText={value => handleUpdateItem(setReflections, index, value)}
                  multiline
                />
                {reflections.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveItem(setReflections, index)}
                  >
                    <FontAwesome6 name="xmark" size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddItem(setReflections)}
            >
              <FontAwesome6 name="plus" size={16} color="#6366f1" />
              <Text style={styles.addButtonText}>添加</Text>
            </TouchableOpacity>
          </View>

          {/* 改进 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>明日改进</Text>
            {improvements.map((item, index) => (
              <View key={index} style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="明天可以做得更好的地方..."
                  value={item}
                  onChangeText={value => handleUpdateItem(setImprovements, index, value)}
                  multiline
                />
                {improvements.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveItem(setImprovements, index)}
                  >
                    <FontAwesome6 name="xmark" size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddItem(setImprovements)}
            >
              <FontAwesome6 name="plus" size={16} color="#6366f1" />
              <Text style={styles.addButtonText}>添加</Text>
            </TouchableOpacity>
          </View>

          {/* 感恩 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>今日感恩</Text>
            {gratitude.map((item, index) => (
              <View key={index} style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="今天要感谢的人或事..."
                  value={item}
                  onChangeText={value => handleUpdateItem(setGratitude, index, value)}
                  multiline
                />
                {gratitude.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveItem(setGratitude, index)}
                  >
                    <FontAwesome6 name="xmark" size={16} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddItem(setGratitude)}
            >
              <FontAwesome6 name="plus" size={16} color="#6366f1" />
              <Text style={styles.addButtonText}>添加</Text>
            </TouchableOpacity>
          </View>

          {/* 备注 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>备注</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="其他想记录的内容..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ReviewDailyScreen;

