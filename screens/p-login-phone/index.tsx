/**
 * 手机号登录/注册页面
 * 支持手机号+昵称注册，无密码，无短信验证
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { userService } from '../../services/user.service';
import styles from './styles';

const PhoneLoginScreen: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false); // false=登录, true=注册
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    // 检查是否已登录
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    await userService.initialize();
    if (userService.isLoggedIn()) {
      router.replace('/module-home');
    }
  };

  /**
   * 验证手机号格式
   */
  const validatePhone = (phoneNumber: string): boolean => {
    // 简单的手机号验证：11位数字
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  };

  /**
   * 处理登录
   */
  const handleLogin = async () => {
    const logs: string[] = [];
    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      const logMessage = `[${timestamp}] ${message}`;
      logs.push(logMessage);
      console.log(logMessage);
    };

    addLog('=== 开始登录流程 ===');
    addLog(`手机号: ${phone.trim()}`);

    if (!phone.trim()) {
      Alert.alert('提示', '请输入手机号');
      return;
    }

    if (!validatePhone(phone)) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }

    setIsLoading(true);
    try {
      addLog('1. 验证通过，开始调用 userService.login');
      
      const startTime = Date.now();
      const userInfo = await userService.login(phone.trim());
      const duration = Date.now() - startTime;
      
      addLog(`2. userService.login 完成 (耗时: ${duration}ms)`);
      addLog(`3. 返回用户信息: ${userInfo ? '存在' : '不存在'}`);
      
      // 检查 userInfo 是否存在
      if (!userInfo) {
        const errorMsg = '登录失败：未获取到用户信息';
        addLog(`4. 错误: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      addLog(`4. 用户信息详情: userId=${userInfo.userId || 'N/A'}, nickname=${userInfo.nickname || 'N/A'}, phone=${userInfo.phone || 'N/A'}`);
      addLog('5. 登录成功，准备跳转');
      
      // 登录成功后跳转到首页
      router.replace('/module-home');
      
      // 显示欢迎消息和日志
      const nickname = userInfo?.nickname || userInfo?.phone || '用户';
      const logSummary = logs.join('\n');
      // 限制日志长度，避免弹窗过大（保留最后30行）
      const maxLogLines = 30;
      const logLines = logs;
      const displayLogs = logLines.length > maxLogLines 
        ? ['... (省略部分日志) ...', ...logLines.slice(-maxLogLines)]
        : logLines;
      const logSummaryToShow = displayLogs.join('\n');
      
      Alert.alert(
        '登录成功',
        `欢迎回来，${nickname}！\n\n调试信息:\n${logSummaryToShow}\n\n(完整日志请查看控制台)`,
        [{ text: '确定' }]
      );
    } catch (error: any) {
      addLog(`错误捕获: ${error?.message || '未知错误'}`);
      addLog(`错误类型: ${error?.constructor?.name || 'Unknown'}`);
      addLog(`错误堆栈: ${error?.stack?.substring(0, 200) || 'N/A'}`);
      
      const logSummary = logs.join('\n');
      console.error('登录失败详情:', error);
      console.error('完整日志:', logSummary);
      
      // 限制日志长度，避免弹窗过大（保留最后30行）
      const maxLogLines = 30;
      const logLines = logs;
      const displayLogs = logLines.length > maxLogLines 
        ? ['... (省略部分日志) ...', ...logLines.slice(-maxLogLines)]
        : logLines;
      const logSummaryToShow = displayLogs.join('\n');
      
      // 如果用户不存在，提示注册
      if (error.message?.includes('不存在') || error.message?.includes('未找到') || error.message?.includes('未注册')) {
        Alert.alert(
          '提示',
          `该手机号未注册，请先注册\n\n调试信息:\n${logSummaryToShow}\n\n(完整日志请查看控制台)`,
          [
            { text: '取消', style: 'cancel' },
            { text: '去注册', onPress: () => setIsRegister(true) },
          ]
        );
      } else {
        Alert.alert(
          '登录失败',
          `${error.message || '请重试'}\n\n调试信息:\n${logSummaryToShow}\n\n(完整日志请查看控制台)`,
          [{ text: '确定' }]
        );
      }
    } finally {
      setIsLoading(false);
      addLog('=== 登录流程结束 ===');
    }
  };

  /**
   * 处理注册
   */
  const handleRegister = async () => {
    if (!phone.trim()) {
      Alert.alert('提示', '请输入手机号');
      return;
    }

    if (!validatePhone(phone)) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }

    if (!nickname.trim()) {
      Alert.alert('提示', '请输入昵称');
      return;
    }

    if (nickname.trim().length < 2) {
      Alert.alert('提示', '昵称至少2个字符');
      return;
    }

    setIsLoading(true);
    try {
      const userInfo = await userService.register({
        phone: phone.trim(),
        nickname: nickname.trim(),
      });
      
      // 检查 userInfo 是否存在
      if (!userInfo) {
        throw new Error('注册失败：未获取到用户信息');
      }
      
      // 注册成功后跳转到首页
      router.replace('/module-home');
      
      // 显示欢迎消息
      const nickname = userInfo?.nickname || userInfo?.phone || '用户';
      Alert.alert('注册成功', `欢迎，${nickname}！`);
    } catch (error: any) {
      console.error('注册失败:', error);
      
      // 如果手机号已存在，提示登录
      if (error.message?.includes('已存在') || error.message?.includes('已注册')) {
        Alert.alert('提示', '该手机号已注册，请直接登录', [
          { text: '取消', style: 'cancel' },
          { text: '去登录', onPress: () => setIsRegister(false) },
        ]);
      } else {
        Alert.alert('注册失败', error.message || '请重试');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 切换登录/注册模式
   */
  const toggleMode = () => {
    setIsRegister(!isRegister);
    setNickname(''); // 切换时清空昵称
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4f46e5', '#7c3aed']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.content}>
              {/* Logo 区域 */}
              <View style={styles.logoSection}>
                <View style={styles.logoContainer}>
                  <FontAwesome6 name="user-circle" size={64} color="#ffffff" />
                </View>
                <Text style={styles.appTitle}>任务收集助手</Text>
                <Text style={styles.appSubtitle}>
                  {isRegister ? '创建账号，开始使用' : '欢迎回来'}
                </Text>
              </View>

              {/* 表单区域 */}
              <View style={styles.formSection}>
                {/* 手机号输入 */}
                <View style={styles.inputGroup}>
                  <View style={styles.inputLabelContainer}>
                    <FontAwesome6 name="mobile-screen" size={16} color="#ffffff" />
                    <Text style={styles.inputLabel}>手机号</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="请输入手机号"
                    placeholderTextColor="#ffffff80"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={11}
                    editable={!isLoading}
                    autoCapitalize="none"
                  />
                </View>

                {/* 昵称输入（仅注册时显示） */}
                {isRegister && (
                  <View style={styles.inputGroup}>
                    <View style={styles.inputLabelContainer}>
                      <FontAwesome6 name="user" size={16} color="#ffffff" />
                      <Text style={styles.inputLabel}>昵称</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="请输入昵称（至少2个字符）"
                      placeholderTextColor="#ffffff80"
                      value={nickname}
                      onChangeText={setNickname}
                      maxLength={20}
                      editable={!isLoading}
                      autoCapitalize="none"
                    />
                  </View>
                )}

                {/* 提交按钮 */}
                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                  onPress={isRegister ? handleRegister : handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {isRegister ? '注册' : '登录'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* 切换登录/注册 */}
                <TouchableOpacity
                  style={styles.switchButton}
                  onPress={toggleMode}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.switchButtonText}>
                    {isRegister
                      ? '已有账号？去登录'
                      : '还没有账号？去注册'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 功能说明 */}
              <View style={styles.featuresSection}>
                <Text style={styles.featuresTitle}>登录后享受</Text>
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
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default PhoneLoginScreen;

