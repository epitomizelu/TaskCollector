

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import styles from './styles';

interface ExportData {
  exportDate: string;
  totalTasks: number;
  daysRecorded: number;
  tasks: Array<{
    taskId: string;
    rawText: string;
    taskName: string;
    completionTime: string;
    quantity: {
      distance?: number;
      count?: number;
      duration?: number;
      unit: string;
    };
    recordDate: string;
    recordMonth: string;
    recordYear: string;
  }>;
}

const ExportSuccessScreen: React.FC = () => {
  const router = useRouter();
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 模拟导出的JSON数据
  const mockExportData: ExportData = {
    exportDate: new Date().toISOString(),
    totalTasks: 42,
    daysRecorded: 15,
    tasks: [
      {
        taskId: 'task_001',
        rawText: '我完成了晨跑5公里',
        taskName: '晨跑锻炼',
        completionTime: '2025-11-02 07:30',
        quantity: { distance: 5, unit: '公里' },
        recordDate: '2025-11-02',
        recordMonth: '2025-11',
        recordYear: '2025'
      },
      {
        taskId: 'task_002',
        rawText: '完成了俯卧撑45个',
        taskName: '俯卧撑训练',
        completionTime: '2025-11-02 12:30',
        quantity: { count: 45, unit: '个' },
        recordDate: '2025-11-02',
        recordMonth: '2025-11',
        recordYear: '2025'
      },
      {
        taskId: 'task_003',
        rawText: '阅读《产品设计》第3章',
        taskName: '阅读学习',
        completionTime: '2025-11-02 09:15',
        quantity: { duration: 45, unit: '分钟' },
        recordDate: '2025-11-02',
        recordMonth: '2025-11',
        recordYear: '2025'
      }
    ]
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
    setTimeout(() => {
      setIsToastVisible(false);
    }, 3000);
  };

  const handleDownloadJSON = async () => {
    try {
      const jsonData = JSON.stringify(mockExportData, null, 2);
      const fileName = `task_data_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonData);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
        showToast('文件已保存到下载文件夹');
      } else {
        showToast('文件下载功能不可用');
      }
    } catch (error) {
      console.error('下载失败:', error);
      showToast('下载失败，请重试');
    }
  };

  const handleCopyJSON = async () => {
    try {
      const jsonData = JSON.stringify(mockExportData, null, 2);
      await Clipboard.setStringAsync(jsonData);
      showToast('JSON内容已复制到剪贴板！');
    } catch (error) {
      console.error('复制失败:', error);
      showToast('复制失败，请重试');
    }
  };

  const getExportMonth = () => {
    const exportDate = new Date(mockExportData.exportDate);
    return `${exportDate.getFullYear()}-${String(exportDate.getMonth() + 1).padStart(2, '0')}`;
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
          <FontAwesome6 name="arrow-left" size={18} color="#6b7280" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>导出成功</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 成功提示卡片 */}
        <View style={styles.successCard}>
          {/* 成功图标 */}
          <View style={styles.successIcon}>
            <FontAwesome6 name="check" size={32} color="#ffffff" />
          </View>
          
          {/* 成功文字 */}
          <Text style={styles.successTitle}>导出成功！</Text>
          <Text style={styles.successDescription}>
            您的任务数据已成功导出为JSON格式，现在可以下载文件或复制内容。
          </Text>
          
          {/* 数据统计信息 */}
          <View style={styles.exportStats}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{mockExportData.totalTasks}</Text>
                <Text style={styles.statLabel}>总任务</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{mockExportData.daysRecorded}</Text>
                <Text style={styles.statLabel}>记录天数</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{getExportMonth()}</Text>
                <Text style={styles.statLabel}>导出月份</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 操作按钮区域 */}
        <View style={styles.actionButtons}>
          {/* 下载JSON文件按钮 */}
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownloadJSON}
            activeOpacity={0.8}
          >
            <FontAwesome6 name="download" size={20} color="#ffffff" />
            <Text style={styles.downloadButtonText}>下载JSON文件</Text>
          </TouchableOpacity>
          
          {/* 复制JSON内容按钮 */}
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyJSON}
            activeOpacity={0.8}
          >
            <FontAwesome6 name="copy" size={20} color="#6366f1" />
            <Text style={styles.copyButtonText}>复制JSON内容</Text>
          </TouchableOpacity>
        </View>

        {/* 提示信息 */}
        <View style={styles.tipsSection}>
          <View style={styles.tipsContent}>
            <View style={styles.tipsIcon}>
              <FontAwesome6 name="info" size={14} color="#ffffff" />
            </View>
            <View style={styles.tipsText}>
              <Text style={styles.tipsTitle}>温馨提示</Text>
              <View style={styles.tipsList}>
                <Text style={styles.tipsItem}>• JSON文件可用于数据备份和迁移</Text>
                <Text style={styles.tipsItem}>• 您可以使用文本编辑器查看文件内容</Text>
                <Text style={styles.tipsItem}>• 建议定期导出数据以防止丢失</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Toast提示框 */}
      {isToastVisible && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

export default ExportSuccessScreen;

