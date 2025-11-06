
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Sidebar, MenuItem } from '../../components/Sidebar';
import { taskService } from '../../services/task.service';
import styles from './styles';

interface TaskData {
  taskId: string;
  rawText: string;
  taskName: string;
  completionTime: string;
  quantity: { [key: string]: number };
  recordDate: string;
  recordMonth: string;
  recordYear: string;
}

const HomeScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const textInputRef = useRef<TextInput>(null);
  
  const [taskInputText, setTaskInputText] = useState<string>('');
  const [isToastVisible, setIsToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(false);

  // 监听 URL 参数变化，显示操作成功的提示
  useEffect(() => {
    if (params.success === 'true') {
      showToast('操作成功 ✅');
    }
  }, [params]);

  // 初始化数据
  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      const tasks = await taskService.getAllTasks();
      if (tasks.length === 0) {
        // 初始化示例数据（仅本地存储，用于演示）
        const sampleTasks: TaskData[] = [
          {
            taskId: 'task_1',
            rawText: '完成代码审查 3个',
            taskName: '代码审查',
            completionTime: new Date().toISOString(),
            quantity: { '个': 3 },
            recordDate: new Date().toISOString().split('T')[0],
            recordMonth: String(new Date().getMonth() + 1),
            recordYear: '2025'
          }
        ];
        // 使用taskService保存，会自动同步到云端（如果已启用）
        for (const task of sampleTasks) {
          await taskService.createTask(task);
        }
      }
    } catch (error) {
      console.error('初始化数据失败:', error);
    }
  };

  const handleTaskFormSubmit = async () => {
    const trimmedText = taskInputText.trim();
    
    if (trimmedText) {
      await processUserInput(trimmedText);
      setTaskInputText('');
      textInputRef.current?.blur();
    }
  };

  const processUserInput = async (text: string) => {
    const lowerText = text.toLowerCase();
    
    // 检查是否为指令
    if (lowerText.includes('生成今日报表') || lowerText.includes('日报')) {
      router.push('/p-report_view?type=today');
      return;
    } else if (lowerText.includes('生成月度报表') || lowerText.includes('月报')) {
      router.push('/p-report_view?type=month');
      return;
    } else if (lowerText.includes('生成年度报表') || lowerText.includes('年报')) {
      router.push('/p-report_view?type=year');
      return;
    } else if (lowerText.includes('生成ascii报表')) {
      router.push('/p-report_view?type=ascii');
      return;
    } else if (lowerText.includes('查看最近任务')) {
      router.push('/p-data_view');
      return;
    } else if (lowerText.includes('清空今日任务')) {
      router.push('/p-confirm_dialog?action=clear_today');
      return;
    } else if (lowerText.includes('清空所有数据')) {
      router.push('/p-confirm_dialog?action=clear_all');
      return;
    } else if (lowerText.includes('导出数据')) {
      router.push('/p-export_success');
      return;
    }
    
    // 如果不是指令，视为任务记录
    await recordTask(text);
  };

  const recordTask = async (text: string) => {
    try {
      const taskData = parseTaskText(text);
      
      // 使用taskService保存，会自动同步到云端（如果已启用）
      await taskService.createTask(taskData);
      
      // 显示成功提示
      showToast('任务已记录 ✅');
    } catch (error) {
      console.error('记录任务失败:', error);
      showToast('记录失败，请重试');
    }
  };

  const parseTaskText = (text: string): TaskData => {
    const now = new Date();
    const taskName = extractTaskName(text);
    const quantity = extractQuantity(text);
    
    return {
      taskId: 'task_' + Date.now(),
      rawText: text,
      taskName: taskName,
      completionTime: now.toISOString(),
      quantity: quantity,
      recordDate: now.toISOString().split('T')[0],
      recordMonth: String(now.getMonth() + 1),
      recordYear: String(now.getFullYear())
    };
  };

  const extractTaskName = (text: string): string => {
    // 移除数量信息，提取任务名称
    const patterns = [
      /(\d+)(个|件|次|条|项|份|篇|本|张|块|瓶|杯|碗|盘|份|套|组|批|场|节|章|段|句|字|词)/g,
      /\d+/g
    ];
    
    let taskName = text;
    patterns.forEach(pattern => {
      taskName = taskName.replace(pattern, '').trim();
    });
    
    return taskName || '未命名任务';
  };

  const extractQuantity = (text: string): { [key: string]: number } => {
    const match = text.match(/(\d+)(个|件|次|条|项|份|篇|本|张|块|瓶|杯|碗|盘|份|套|组|批|场|节|章|段|句|字|词)/);
    if (match) {
      return { [match[2]]: parseInt(match[1]) };
    }
    return {};
  };


  const showToast = (message: string) => {
    setToastMessage(message);
    setIsToastVisible(true);
    
    setTimeout(() => {
      setIsToastVisible(false);
    }, 3000);
  };

  // 侧边栏菜单项 - 只保留三个
  const menuItems: MenuItem[] = [
    {
      id: 'app-home',
      label: '回到APP首页',
      icon: 'grid',
      path: '/module-home',
    },
    {
      id: 'core-function',
      label: '任务输入',
      icon: 'plus-circle',
      path: '/p-home',
    },
    {
      id: 'full-home',
      label: '完整首页',
      icon: 'house',
      path: '/p-full-home',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 顶部导航栏 */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setSidebarVisible(true)}
              activeOpacity={0.7}
            >
              <FontAwesome6 name="bars" size={20} color="#6366f1" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.appTitle}>任务收集</Text>
              <Text style={styles.appSubtitle}>快速记录你的任务</Text>
            </View>
            <View style={styles.headerPlaceholder} />
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 输入区域 */}
          <View style={styles.inputSection}>
            <View style={styles.inputCard}>
              <Text style={styles.inputTitle}>记录你的任务</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={textInputRef}
                  style={styles.textInput}
                  placeholder="输入你完成的任务，例如：我完成了俯卧撑45个"
                  placeholderTextColor="#6b7280"
                  value={taskInputText}
                  onChangeText={setTaskInputText}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleTaskFormSubmit}
                  activeOpacity={0.7}
                >
                  <FontAwesome6 name="paper-plane" size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.inputHint}>
                💡 提示：输入"生成今日报表"可查看今日成果
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Toast提示框 */}
        {isToastVisible && (
          <View style={styles.toastContainer}>
            <View style={styles.toast}>
              <Text style={styles.toastText}>{toastMessage}</Text>
            </View>
          </View>
        )}

        {/* 侧边栏 */}
        <Sidebar
          visible={sidebarVisible}
          onClose={() => setSidebarVisible(false)}
          menuItems={menuItems}
          moduleName="任务收集"
          moduleIcon="list-check"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default HomeScreen;
