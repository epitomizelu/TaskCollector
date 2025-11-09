import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { ideaService, IdeaData } from '../../../services/idea.service';
import styles from './styles';

const IdeaDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const ideaId = params.ideaId as string;

  const [isLoading, setIsLoading] = useState(true);
  const [idea, setIdea] = useState<IdeaData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (ideaId) {
      loadIdea();
    }
  }, [ideaId]);

  const loadIdea = async () => {
    try {
      setIsLoading(true);
      const ideaData = await ideaService.getIdeaById(ideaId);
      setIdea(ideaData);
    } catch (error) {
      console.error('加载想法失败:', error);
      Alert.alert('错误', '加载想法失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!idea) return;

    try {
      setIsAnalyzing(true);
      const analysis = await ideaService.analyzeIdea(idea.content);
      const updatedIdea = await ideaService.updateIdea(ideaId, {
        analysis,
      }, false);
      setIdea(updatedIdea);
      Alert.alert('成功', 'AI分析完成');
    } catch (error) {
      console.error('AI分析失败:', error);
      Alert.alert('错误', 'AI分析失败，请稍后重试');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEdit = () => {
    router.push({
      pathname: '/idea-collector-create',
      params: { ideaId },
    } as any);
  };

  const handleDelete = () => {
    Alert.alert(
      '确认删除',
      '确定要删除这个想法吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await ideaService.deleteIdea(ideaId);
              router.back();
            } catch (error) {
              console.error('删除失败:', error);
              Alert.alert('错误', '删除失败');
            }
          },
        },
      ]
    );
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

  if (!idea) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>想法不存在</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
        <Text style={styles.headerTitle}>想法详情</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleEdit}
          >
            <FontAwesome6 name="pen" size={18} color="#6366f1" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleDelete}
          >
            <FontAwesome6 name="trash" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* 想法内容 */}
          <View style={styles.contentCard}>
            <View style={styles.cardHeader}>
              <FontAwesome6 name="lightbulb" size={20} color="#6366f1" />
              <Text style={styles.cardTitle}>想法内容</Text>
            </View>
            <Text style={styles.ideaContent}>{idea.content}</Text>
            <View style={styles.metaInfo}>
              <Text style={styles.metaText}>记录时间: {idea.recordDate}</Text>
              {idea.tags && idea.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {idea.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* AI分析 */}
          <View style={styles.contentCard}>
            <View style={styles.cardHeader}>
              <FontAwesome6 name="brain" size={20} color="#10B981" />
              <Text style={styles.cardTitle}>AI分析</Text>
              {!idea.analysis && (
                <TouchableOpacity
                  style={styles.analyzeButton}
                  onPress={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator size="small" color="#6366f1" />
                  ) : (
                    <>
                      <FontAwesome6 name="wand-magic-sparkles" size={14} color="#6366f1" />
                      <Text style={styles.analyzeButtonText}>立即分析</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {idea.analysis ? (
              <View style={styles.analysisContent}>
                {/* 真相分析 */}
                <View style={styles.analysisSection}>
                  <Text style={styles.analysisSectionTitle}>真相洞察</Text>
                  <Text style={styles.analysisText}>{idea.analysis.truth}</Text>
                </View>

                {/* 情感分析 */}
                {idea.analysis.emotions && idea.analysis.emotions.length > 0 && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>情感</Text>
                    <View style={styles.emotionsContainer}>
                      {idea.analysis.emotions.map((emotion, index) => (
                        <View key={index} style={styles.emotionTag}>
                          <Text style={styles.emotionText}>{emotion}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 洞察 */}
                {idea.analysis.insights && idea.analysis.insights.length > 0 && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>洞察</Text>
                    {idea.analysis.insights.map((insight, index) => (
                      <View key={index} style={styles.insightItem}>
                        <FontAwesome6 name="circle-check" size={14} color="#10B981" />
                        <Text style={styles.insightText}>{insight}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 建议 */}
                {idea.analysis.suggestions && idea.analysis.suggestions.length > 0 && (
                  <View style={styles.analysisSection}>
                    <Text style={styles.analysisSectionTitle}>建议</Text>
                    {idea.analysis.suggestions.map((suggestion, index) => (
                      <View key={index} style={styles.suggestionItem}>
                        <FontAwesome6 name="lightbulb" size={14} color="#F59E0B" />
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.noAnalysisContainer}>
                <FontAwesome6 name="brain" size={48} color="#D1D5DB" />
                <Text style={styles.noAnalysisText}>还没有AI分析</Text>
                <Text style={styles.noAnalysisSubtext}>点击"立即分析"获取AI洞察</Text>
                <TouchableOpacity
                  style={styles.analyzeButtonLarge}
                  onPress={handleAnalyze}
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <FontAwesome6 name="wand-magic-sparkles" size={16} color="#FFFFFF" />
                      <Text style={styles.analyzeButtonLargeText}>开始AI分析</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default IdeaDetailScreen;

