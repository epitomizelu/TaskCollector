

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, Linking, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import { userService } from '../../../services/user.service';
import styles from './styles';

interface SettingItemProps {
  icon: string;
  iconColor: string;
  iconBgColor: string;
  title: string;
  description: string;
  rightText?: string;
  rightIcon?: string;
  showBorder?: boolean;
  onPress: () => void;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  iconColor,
  iconBgColor,
  title,
  description,
  rightText,
  rightIcon,
  showBorder = false,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.settingItem, showBorder && styles.settingItemBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingItemLeft}>
        <View style={[styles.settingItemIcon, { backgroundColor: iconBgColor }]}>
          <FontAwesome6 name={icon} size={16} color={iconColor} />
        </View>
        <View style={styles.settingItemText}>
          <Text style={styles.settingItemTitle}>{title}</Text>
          <Text style={styles.settingItemDescription}>{description}</Text>
        </View>
      </View>
      <View style={styles.settingItemRight}>
        {rightText && (
          <Text style={styles.settingItemRightText}>{rightText}</Text>
        )}
        {rightIcon && (
          <FontAwesome6 name={rightIcon} size={14} color="#6B7280" />
        )}
      </View>
    </TouchableOpacity>
  );
};

const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [isSuccessToastVisible, setIsSuccessToastVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [cacheSize, setCacheSize] = useState('128 MB');
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const showConfirmModal = (title: string, message: string, callback: () => void) => {
    setModalTitle(title);
    setModalMessage(message);
    setConfirmCallback(() => callback);
    setIsConfirmModalVisible(true);
  };

  const hideConfirmModal = () => {
    setIsConfirmModalVisible(false);
    setConfirmCallback(null);
  };

  const handleModalConfirm = () => {
    hideConfirmModal();
    if (confirmCallback) {
      confirmCallback();
    }
  };

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setIsSuccessToastVisible(true);
    setTimeout(() => {
      setIsSuccessToastVisible(false);
    }, 3000);
  };

  const handleNotificationSetting = () => {
    console.log('通知设置功能暂未实现');
  };

  const handleClearCache = () => {
    showConfirmModal(
      '清除缓存',
      '确定要清除应用缓存吗？这将删除所有临时文件和数据。',
      () => {
        setTimeout(() => {
          setCacheSize('0 MB');
          showSuccessToast('缓存已清除');
        }, 500);
      }
    );
  };

  const handleAccountSecurity = () => {
    console.log('账户安全设置功能暂未实现');
  };

  const handlePrivacySetting = () => {
    console.log('隐私设置功能暂未实现');
  };

  const handlePrivacyPolicy = async () => {
    try {
      await Linking.openURL('https://example.com/privacy-policy');
    } catch (error) {
      Alert.alert('错误', '无法打开链接');
    }
  };

  const handleUserAgreement = async () => {
    try {
      await Linking.openURL('https://example.com/user-agreement');
    } catch (error) {
      Alert.alert('错误', '无法打开链接');
    }
  };

  const handleAboutUs = () => {
    router.push('/ilove-reciting-about-us' as any);
  };

  const handleVersionInfo = () => {
    console.log('检查更新功能暂未实现');
  };

  const handleLogout = () => {
    showConfirmModal(
      '退出登录',
      '确定要退出当前账户吗？退出后需要重新登录才能继续使用应用。',
      async () => {
        try {
          // 调用退出登录服务
          await userService.logout();
          
          // 跳转到登录页面
          router.replace('/p-login-phone');
        } catch (error: any) {
          console.error('退出登录失败:', error);
          Alert.alert('错误', '退出登录失败，请重试');
        }
      }
    );
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
        <Text style={styles.headerTitle}>设置</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* 主内容区域 */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* 通用设置 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>通用设置</Text>
            <View style={styles.settingCard}>
              <SettingItem
                icon="bell"
                iconColor="#4F46E5"
                iconBgColor="rgba(79, 70, 229, 0.1)"
                title="通知设置"
                description="推送提醒和学习通知"
                rightIcon="chevron-right"
                showBorder={true}
                onPress={handleNotificationSetting}
              />
              <SettingItem
                icon="broom"
                iconColor="#F59E0B"
                iconBgColor="rgba(245, 158, 11, 0.1)"
                title="清除缓存"
                description="清理应用缓存数据"
                rightText={cacheSize}
                rightIcon="chevron-right"
                onPress={handleClearCache}
              />
            </View>
          </View>

          {/* 账户与安全 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>账户与安全</Text>
            <View style={styles.settingCard}>
              <SettingItem
                icon="shield-alt"
                iconColor="#3B82F6"
                iconBgColor="rgba(59, 130, 246, 0.1)"
                title="账户安全"
                description="密码、绑定手机等"
                rightIcon="chevron-right"
                showBorder={true}
                onPress={handleAccountSecurity}
              />
              <SettingItem
                icon="user-secret"
                iconColor="#06B6D4"
                iconBgColor="rgba(6, 182, 212, 0.1)"
                title="隐私设置"
                description="数据使用和隐私保护"
                rightIcon="chevron-right"
                onPress={handlePrivacySetting}
              />
            </View>
          </View>

          {/* 法律条款 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>法律条款</Text>
            <View style={styles.settingCard}>
              <SettingItem
                icon="file-contract"
                iconColor="#10B981"
                iconBgColor="rgba(16, 185, 129, 0.1)"
                title="隐私政策"
                description="了解我们如何保护您的隐私"
                rightIcon="external-link-alt"
                showBorder={true}
                onPress={handlePrivacyPolicy}
              />
              <SettingItem
                icon="handshake"
                iconColor="#4F46E5"
                iconBgColor="rgba(79, 70, 229, 0.1)"
                title="用户协议"
                description="查看服务条款和使用规则"
                rightIcon="external-link-alt"
                onPress={handleUserAgreement}
              />
            </View>
          </View>

          {/* 关于应用 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>关于应用</Text>
            <View style={styles.settingCard}>
              <SettingItem
                icon="info-circle"
                iconColor="#F59E0B"
                iconBgColor="rgba(245, 158, 11, 0.1)"
                title="关于我们"
                description="应用信息和版本说明"
                rightIcon="chevron-right"
                showBorder={true}
                onPress={handleAboutUs}
              />
              <SettingItem
                icon="code-branch"
                iconColor="#3B82F6"
                iconBgColor="rgba(59, 130, 246, 0.1)"
                title="当前版本"
                description="检查更新"
                rightText="v1.0.0"
                onPress={handleVersionInfo}
              />
            </View>
          </View>

          {/* 退出登录 */}
          <View style={styles.logoutSection}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <FontAwesome5 name="sign-out-alt" size={20} color="#EF4444" />
              <Text style={styles.logoutButtonText}>退出登录</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* 确认对话框 */}
      <Modal
        visible={isConfirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideConfirmModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={hideConfirmModal}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <Text style={styles.modalMessage}>{modalMessage}</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={hideConfirmModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleModalConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalConfirmButtonText}>确认</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 成功提示 */}
      {isSuccessToastVisible && (
        <View style={styles.toastContainer}>
          <View style={styles.toast}>
            <FontAwesome5 name="check-circle" size={16} color="#FFFFFF" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default SettingsScreen;

