

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, BackHandler, Alert, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, } from 'react-native-reanimated';
import styles from './styles';

interface ConfirmDialogData {
  title: string;
  description: string;
  iconName: string;
  iconColor: string;
  confirmText: string;
  confirmColor: string;
}

const ConfirmDialog: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const actionType = (params.action as string) || 'clear_today';

  const [isVisible, setIsVisible] = useState(true);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // 动画值
  const backdropOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.9);
  const modalOpacity = useSharedValue(0);

  // 弹窗数据
  const getDialogData = (action: string): ConfirmDialogData => {
    switch (action) {
      case 'clear_today':
        return {
          title: '确认清空今日任务？',
          description: '此操作不可恢复，清空后今日的所有任务记录将被永久删除。',
          iconName: 'calendar-times',
          iconColor: '#f59e0b',
          confirmText: '确认清空',
          confirmColor: '#f59e0b',
        };
      case 'clear_all':
        return {
          title: '确认清空所有数据？',
          description: '此操作不可恢复，清空后所有历史任务记录将被永久删除。',
          iconName: 'trash',
          iconColor: '#ef4444',
          confirmText: '确认清空',
          confirmColor: '#ef4444',
        };
      default:
        return {
          title: '确认清空今日任务？',
          description: '此操作不可恢复，清空后今日的所有任务记录将被永久删除。',
          iconName: 'calendar-times',
          iconColor: '#f59e0b',
          confirmText: '确认清空',
          confirmColor: '#f59e0b',
        };
    }
  };

  const dialogData = getDialogData(actionType);

  // 入场动画
  useEffect(() => {
    backdropOpacity.value = withTiming(1, { duration: 300 });
    modalOpacity.value = withTiming(1, { duration: 300 });
    modalScale.value = withSpring(1, { damping: 15, stiffness: 150 });
  }, []);

  // 处理Android返回键
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleCancel);
    return () => backHandler.remove();
  }, []);

  // 动画样式
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    transform: [{ scale: modalScale.value }],
  }));

  // 关闭动画
  const closeWithAnimation = (callback: () => void) => {
    backdropOpacity.value = withTiming(0, { duration: 200 });
    modalOpacity.value = withTiming(0, { duration: 200 });
    modalScale.value = withTiming(0.9, { duration: 200 }, () => {
      runOnJS(callback)();
    });
  };

  // 处理取消
  const handleCancel = (): boolean => {
    closeWithAnimation(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/p-home');
      }
    });
    return true; // 阻止默认行为
  };

  // 处理确认
  const handleConfirm = async () => {
    setIsConfirmLoading(true);
    
    try {
      if (actionType === 'clear_today') {
        // 获取所有任务
        const tasksJson = await AsyncStorage.getItem('@taskCollection');
        if (tasksJson) {
          const tasks = JSON.parse(tasksJson);
          const today = new Date().toISOString().split('T')[0];
          // 过滤掉今天的任务
          const remainingTasks = tasks.filter((task: any) => task.recordDate !== today);
          await AsyncStorage.setItem('@taskCollection', JSON.stringify(remainingTasks));
        }
        // 清空成功后返回首页并显示提示
        setTimeout(() => {
          router.replace('/p-home?message=today_cleared');
        }, 500);
      } else if (actionType === 'clear_all') {
        await AsyncStorage.removeItem('@taskCollection');
        // 清空成功后返回首页并显示提示
        setTimeout(() => {
          router.replace('/p-home?message=all_cleared');
        }, 500);
      }
    } catch (error) {
      Alert.alert('错误', '操作失败，请重试');
    } finally {
      setIsConfirmLoading(false);
    }
  };

  // 处理背景点击
  const handleBackdropPress = () => {
    handleCancel();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="none"
        onRequestClose={handleCancel}
      >
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={handleBackdropPress}
          >
            <Animated.View style={[styles.modalContent, modalAnimatedStyle]}>
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                {/* 弹窗图标 */}
                <View style={[styles.iconContainer, { backgroundColor: dialogData.iconColor }]}>
                  <FontAwesome6
                    name={dialogData.iconName as any}
                    size={24}
                    color="#ffffff"
                  />
                </View>

                {/* 弹窗主体内容 */}
                <View style={styles.modalBody}>
                  {/* 弹窗标题 */}
                  <Text style={styles.modalTitle}>{dialogData.title}</Text>

                  {/* 弹窗描述 */}
                  <Text style={styles.modalDescription}>
                    {dialogData.description}
                  </Text>

                  {/* 操作按钮 */}
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={handleCancel}
                      disabled={isConfirmLoading}
                    >
                      <Text style={styles.cancelButtonText}>取消</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.confirmButton, { backgroundColor: dialogData.confirmColor }]}
                      onPress={handleConfirm}
                      disabled={isConfirmLoading}
                    >
                      <Text style={styles.confirmButtonText}>
                        {isConfirmLoading ? '处理中...' : dialogData.confirmText}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
};

export default ConfirmDialog;

