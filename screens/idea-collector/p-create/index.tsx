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
import { ideaService, IdeaData } from '../../../services/idea.service';
import styles from './styles';

const IdeaCreateScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const ideaId = params.ideaId as string;

  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // 防重复提交

  useEffect(() => {
    if (ideaId) {
      loadIdea();
    }
  }, [ideaId]);

  const loadIdea = async () => {
    try {
      const idea = await ideaService.getIdeaById(ideaId);
      if (idea) {
        setContent(idea.content);
        setTags(idea.tags || []);
      }
    } catch (error) {
      console.error('加载想法失败:', error);
      Alert.alert('错误', '加载想法失败');
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    // 防重复提交
    if (isSubmitting) {
      return;
    }

    if (!content.trim()) {
      Alert.alert('提示', '请输入想法内容');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const now = new Date();
      const recordDate = now.toISOString().split('T')[0];
      const recordMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const recordYear = String(now.getFullYear());

      if (ideaId) {
        // 更新想法 - 先保存到本地
        await ideaService.updateIdea(ideaId, {
          content: content.trim(),
          tags,
          recordDate,
          recordMonth,
          recordYear,
        }, true); // autoAnalyze = true，会自动触发AI分析
      } else {
        // 创建新想法 - 先保存到本地
        // createIdea 方法已经实现了先本地后云端的逻辑
        await ideaService.createIdea({
          content: content.trim(),
          tags,
          recordDate,
          recordMonth,
          recordYear,
        }, true); // autoAnalyze = true，会自动触发AI分析
      }
      
      // 本地保存成功后，清除表单数据和状态
      setContent('');
      setTags([]);
      setTagInput('');
      setIsSubmitting(false);
      
      // 等待一小段时间确保数据已写入本地存储，然后跳转到首页
      // 使用 push 而不是 replace，确保 useFocusEffect 能正确触发
      setTimeout(() => {
        router.push('/idea-collector-home' as any);
      }, 50);
    } catch (error) {
      console.error('保存失败:', error);
      Alert.alert('错误', '保存失败，请稍后重试');
      setIsSubmitting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '请先输入想法内容');
      return;
    }

    try {
      setIsAnalyzing(true);
      const analysis = await ideaService.analyzeIdea(content.trim());
      
      // 显示分析结果
      Alert.alert(
        'AI分析结果',
        `真相洞察：${analysis.truth}\n\n情感：${analysis.emotions.join('、')}\n\n洞察：${analysis.insights.join('；')}`,
        [{ text: '确定' }]
      );
    } catch (error) {
      console.error('AI分析失败:', error);
      Alert.alert('错误', 'AI分析失败，请稍后重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <FontAwesome6 name="arrow-left" size={20} color="#1F2937" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => router.push('/module-home' as any)}
            >
              <FontAwesome6 name="house" size={18} color="#6366f1" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>
            {ideaId ? '编辑想法' : '记录想法'}
          </Text>
          <TouchableOpacity
            style={[styles.saveButton, isSubmitting && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* 想法内容输入 */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>想法内容</Text>
              <TextInput
                style={styles.textInput}
                placeholder="记录你的想法、念头、灵感..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={8}
                value={content}
                onChangeText={setContent}
                textAlignVertical="top"
              />
              <View style={styles.inputActions}>
                <TouchableOpacity
                  style={styles.analyzeButton}
                  onPress={handleAnalyze}
                  disabled={isAnalyzing || !content.trim()}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator size="small" color="#6366f1" />
                  ) : (
                    <>
                      <FontAwesome6 name="wand-magic-sparkles" size={14} color="#6366f1" />
                      <Text style={styles.analyzeButtonText}>AI分析</Text>
                    </>
                  )}
                </TouchableOpacity>
                <Text style={styles.charCount}>{content.length} 字</Text>
              </View>
            </View>

            {/* 标签 */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>标签</Text>
              <View style={styles.tagInputContainer}>
                <TextInput
                  style={styles.tagInput}
                  placeholder="添加标签..."
                  placeholderTextColor="#9CA3AF"
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={handleAddTag}
                />
                <TouchableOpacity
                  style={styles.addTagButton}
                  onPress={handleAddTag}
                  disabled={!tagInput.trim()}
                >
                  <FontAwesome6 name="plus" size={16} color="#6366f1" />
                </TouchableOpacity>
              </View>
              {tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {tags.map((tag, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.tag}
                      onPress={() => handleRemoveTag(tag)}
                    >
                      <Text style={styles.tagText}>{tag}</Text>
                      <FontAwesome6 name="xmark" size={12} color="#6B7280" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default IdeaCreateScreen;

