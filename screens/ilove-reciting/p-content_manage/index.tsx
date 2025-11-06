

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import styles from './styles';

interface ContentItem {
  id: string;
  title: string;
  uploadDate: string;
  sentenceCount: number;
  status: 'completed' | 'learning' | 'not_started';
}

const ContentManagePage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'audio' | 'document'>('audio');
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);

  const audioContent: ContentItem[] = [
    {
      id: '1',
      title: '英语单词 - 第3单元',
      uploadDate: '2024-12-25',
      sentenceCount: 20,
      status: 'completed',
    },
    {
      id: '2',
      title: '日语五十音图',
      uploadDate: '2024-12-24',
      sentenceCount: 47,
      status: 'learning',
    },
    {
      id: '3',
      title: '法语基础对话',
      uploadDate: '2024-12-23',
      sentenceCount: 15,
      status: 'not_started',
    },
    {
      id: '4',
      title: '德语词汇 - 日常用语',
      uploadDate: '2024-12-22',
      sentenceCount: 30,
      status: 'completed',
    },
  ];

  const documentContent: ContentItem[] = [
    {
      id: '1',
      title: '古文背诵 - 出师表',
      uploadDate: '2024-12-26',
      sentenceCount: 8,
      status: 'learning',
    },
    {
      id: '2',
      title: '唐诗三百首精选',
      uploadDate: '2024-12-25',
      sentenceCount: 50,
      status: 'completed',
    },
    {
      id: '3',
      title: '英语演讲稿 - 乔布斯',
      uploadDate: '2024-12-24',
      sentenceCount: 12,
      status: 'not_started',
    },
  ];

  const handleTabPress = (tab: 'audio' | 'document') => {
    setActiveTab(tab);
  };

  const handleSearchPress = () => {
    Alert.alert('搜索', '搜索功能开发中');
  };

  const handleUploadPress = () => {
    setIsUploadModalVisible(true);
  };

  const handleUploadModalClose = () => {
    setIsUploadModalVisible(false);
  };

  const handleUploadAudioPress = () => {
    setIsUploadModalVisible(false);
    router.push('/ilove-reciting-upload-audio' as any);
  };

  const handleUploadDocumentPress = () => {
    setIsUploadModalVisible(false);
    router.push('/ilove-reciting-upload-document' as any);
  };

  const handleContentItemPress = (item: ContentItem) => {
    Alert.alert('内容详情', `查看 ${item.title} 的详情`);
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/ilove-reciting-home' as any);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return { name: 'check', color: '#10B981' };
      case 'learning':
        return { name: 'clock', color: '#F59E0B' };
      case 'not_started':
        return { name: 'plus', color: '#3B82F6' };
      default:
        return { name: 'plus', color: '#3B82F6' };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'learning':
        return '学习中';
      case 'not_started':
        return '未开始';
      default:
        return '未开始';
    }
  };

  const renderContentItem = (item: ContentItem, type: 'audio' | 'document') => {
    const statusIcon = getStatusIcon(item.status);
    const iconColor = type === 'audio' ? '#4F46E5' : '#06B6D4';
    
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.contentItem}
        onPress={() => handleContentItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.contentItemLeft}>
          <View style={[styles.contentItemIcon, { backgroundColor: `${iconColor}1A` }]}>
            <FontAwesome6
              name={type === 'audio' ? 'file-audio' : 'file-alt'}
              size={20}
              color={iconColor}
            />
          </View>
          <View style={styles.contentItemInfo}>
            <Text style={styles.contentItemTitle}>{item.title}</Text>
            <Text style={styles.contentItemDate}>上传于 {item.uploadDate}</Text>
            <Text style={styles.contentItemCount}>
              共 {item.sentenceCount} {type === 'audio' ? '个句子' : '个段落'}
            </Text>
          </View>
        </View>
        <View style={styles.contentItemRight}>
          <View style={[styles.statusIconContainer, { backgroundColor: `${statusIcon.color}1A` }]}>
            <FontAwesome6
              name={statusIcon.name}
              size={14}
              color={statusIcon.color}
            />
          </View>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const currentContent = activeTab === 'audio' ? audioContent : documentContent;
  const contentCount = activeTab === 'audio' ? 8 : 6;
  const iconColor = activeTab === 'audio' ? '#4F46E5' : '#06B6D4';

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部标题栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="arrow-left" size={18} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>我的内容</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearchPress}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="magnifying-glass" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 内容分类Tab */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'audio' ? styles.tabActive : styles.tabInactive,
            ]}
            onPress={() => handleTabPress('audio')}
            activeOpacity={0.8}
          >
            <FontAwesome6
              name="file-audio"
              size={14}
              color={activeTab === 'audio' ? '#FFFFFF' : '#6B7280'}
              style={styles.tabIcon}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'audio' ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              音频内容
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'document' ? styles.tabActive : styles.tabInactive,
            ]}
            onPress={() => handleTabPress('document')}
            activeOpacity={0.8}
          >
            <FontAwesome6
              name="file-lines"
              size={14}
              color={activeTab === 'document' ? '#FFFFFF' : '#6B7280'}
              style={styles.tabIcon}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'document' ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              文档内容
            </Text>
          </TouchableOpacity>
        </View>

        {/* 统计卡片 */}
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statsInfo}>
              <Text style={styles.statsLabel}>
                {activeTab === 'audio' ? '音频总数' : '文档总数'}
              </Text>
              <Text style={[styles.statsCount, { color: iconColor }]}>
                {contentCount}
              </Text>
            </View>
            <View style={[styles.statsIconContainer, { backgroundColor: `${iconColor}1A` }]}>
              <FontAwesome6
                name={activeTab === 'audio' ? 'file-audio' : 'file-alt'}
                size={20}
                color={iconColor}
              />
            </View>
          </View>
        </View>

        {/* 内容列表 */}
        <View style={styles.contentListContainer}>
          {currentContent.map((item) => renderContentItem(item, activeTab))}
        </View>
      </ScrollView>

      {/* 上传悬浮按钮 */}
      <TouchableOpacity
        style={styles.uploadFab}
        onPress={handleUploadPress}
        activeOpacity={0.8}
      >
        <FontAwesome6 name="plus" size={20} color="#FFFFFF" />
      </TouchableOpacity>

      {/* 上传选择弹窗 */}
      <Modal
        visible={isUploadModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleUploadModalClose}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleUploadModalClose}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>选择上传类型</Text>
            
            <View style={styles.modalOptions}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={handleUploadAudioPress}
                activeOpacity={0.7}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: '#4F46E51A' }]}>
                  <FontAwesome6 name="file-audio" size={20} color="#4F46E5" />
                </View>
                <View style={styles.modalOptionInfo}>
                  <Text style={styles.modalOptionTitle}>上传音频</Text>
                  <Text style={styles.modalOptionSubtitle}>支持 MP3、WAV 等格式</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalOption}
                onPress={handleUploadDocumentPress}
                activeOpacity={0.7}
              >
                <View style={[styles.modalOptionIcon, { backgroundColor: '#06B6D41A' }]}>
                  <FontAwesome5 name="file-alt" size={20} color="#06B6D4" />
                </View>
                <View style={styles.modalOptionInfo}>
                  <Text style={styles.modalOptionTitle}>上传文档</Text>
                  <Text style={styles.modalOptionSubtitle}>支持 TXT、PDF、DOCX 等格式</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleUploadModalClose}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default ContentManagePage;

