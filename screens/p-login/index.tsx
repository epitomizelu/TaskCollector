/**
 * 微信登录页面
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '../../services/auth.service';
import styles from './styles';

const LoginScreen: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // 检查是否已登录
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    await authService.initialize();
    if (authService.isLoggedIn()) {
      router.replace('/p-home');
    }
  };

  const handleWechatLogin = async () => {
    setIsLoading(true);
    try {
      const userInfo = await authService.loginWithWechat();
      
      // 登录成功后跳转到首页
      router.replace('/p-home');
      
      Alert.alert('登录成功', `欢迎，${userInfo.nickname || '用户'}！`);
    } catch (error: any) {
      console.error('登录失败:', error);
      Alert.alert('登录失败', error.message || '请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipLogin = () => {
    // 允许跳过登录，使用免费模式
    router.replace('/p-home');
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4f46e5', '#7c3aed']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Logo 区域 */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <FontAwesome6 name="tasks" size={64} color="#ffffff" />
            </View>
            <Text style={styles.appTitle}>任务收集助手</Text>
            <Text style={styles.appSubtitle}>记录每一个成就的瞬间 ✨</Text>
          </View>

          {/* 登录按钮区域 */}
          <View style={styles.loginSection}>
            <TouchableOpacity
              style={styles.wechatButton}
              onPress={handleWechatLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <FontAwesome6 name="weixin" size={20} color="#ffffff" />
                  <Text style={styles.wechatButtonText}>微信扫码登录</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipLogin}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>暂不登录，继续使用</Text>
              <Text style={styles.skipHintText}>（免费模式，数据仅本地存储）</Text>
            </TouchableOpacity>
          </View>

          {/* 功能说明 */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>会员特权</Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <FontAwesome6 name="cloud" size={16} color="#ffffff" />
                <Text style={styles.featureText}>云端数据同步</Text>
              </View>
              <View style={styles.featureItem}>
                <FontAwesome6 name="mobile-screen" size={16} color="#ffffff" />
                <Text style={styles.featureText}>多设备数据共享</Text>
              </View>
              <View style={styles.featureItem}>
                <FontAwesome6 name="shield" size={16} color="#ffffff" />
                <Text style={styles.featureText}>数据备份与恢复</Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default LoginScreen;

