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
import { API_CONFIG } from '../../config/api.config';
import { appUpdateService, UpdateInfo, DownloadProgress } from '../../services/app-update.service';
import styles from './styles';

const PhoneLoginScreen: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false); // false=登录, true=注册
  const [phone, setPhone] = useState('');
  const [nickname, setNickname] = useState('');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<DownloadProgress | null>(null);


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
    console.log('=== handleLogin 被调用 ===');
    console.log('当前状态:', { phone, isLoading, isRegister });
    
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
      console.log('手机号为空，显示提示');
      Alert.alert('提示', '请输入手机号');
      return;
    }

    if (!validatePhone(phone)) {
      console.log('手机号格式不正确，显示提示');
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }

    // 在开始登录前，检查并显示 API Key 配置
    const apiKeyInfo = {
      hasApiKey: !!API_CONFIG.API_KEY,
      apiKeyLength: API_CONFIG.API_KEY.length,
      apiKeyPrefix: API_CONFIG.API_KEY ? API_CONFIG.API_KEY.substring(0, 8) + '...' : '空',
      apiKeySuffix: API_CONFIG.API_KEY ? '...' + API_CONFIG.API_KEY.substring(API_CONFIG.API_KEY.length - 4) : '空',
      baseUrl: API_CONFIG.BASE_URL,
      envVarExists: !!process.env.EXPO_PUBLIC_API_KEY,
    };
    addLog(`API Key 配置检查: hasApiKey=${apiKeyInfo.hasApiKey}, length=${apiKeyInfo.apiKeyLength}, prefix=${apiKeyInfo.apiKeyPrefix}`);
    addLog(`BASE_URL: ${apiKeyInfo.baseUrl}`);
    addLog(`环境变量存在: ${apiKeyInfo.envVarExists}`);

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
      
      // 登录成功后跳转到首页（先跳转，模块注册在后台进行）
      router.replace('/module-home');
      
      // ✅ 登录成功后，异步注册并激活所有模块（不阻塞登录流程）
      // 注意：模块注册在 AppShell 中也会检查，这里作为补充
      import('../../core/module-registry')
        .then(({ moduleRegistry }) => {
          return moduleRegistry.registerAllModules();
        })
        .then(() => {
          addLog('模块注册完成（异步）');
        })
        .catch((error) => {
          console.error('模块注册失败（异步）:', error);
          // 模块注册失败不影响登录流程
        });
      
      // 显示欢迎消息
      const nickname = userInfo?.nickname || userInfo?.phone || '用户';
      Alert.alert('登录成功', `欢迎回来，${nickname}！`, [{ text: '确定' }]);
    } catch (error: any) {
      // 记录错误日志到控制台（不显示在弹窗中）
      console.error('登录失败详情:', error);
      const logSummary = logs.join('\n');
      console.error('完整日志:', logSummary);
      
      // 如果用户不存在，提示注册
      if (error.message?.includes('不存在') || error.message?.includes('未找到') || error.message?.includes('未注册')) {
        Alert.alert(
          '提示',
          '该手机号未注册，请先注册',
          [
            { text: '取消', style: 'cancel' },
            { text: '去注册', onPress: () => setIsRegister(true) },
          ]
        );
      } else {
        // 显示简化的错误信息
        let errorMessage = error.message || '登录失败，请稍后重试';
        
        // 如果是凭证错误，显示友好提示
        if (error.message?.includes('Credentials are invalid') || error.message?.includes('凭证无效')) {
          errorMessage = '登录失败，请检查网络连接或联系管理员';
        }
        
        Alert.alert(
          '登录失败',
          errorMessage,
          [
            { text: '确定' },
            {
              text: '检查更新',
              onPress: () => {
                // 登录失败时也可以检查更新
                handleCheckUpdate();
              },
            },
          ]
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

  /**
   * 处理检查更新
   */
  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const updateInfo = await appUpdateService.checkForUpdate();
      
      if (!updateInfo.hasUpdate) {
        Alert.alert('提示', '当前已是最新版本');
        return;
      }

      // 有更新，询问是否下载
      Alert.alert(
        '发现新版本',
        `最新版本: v${updateInfo.latestVersion} (Build ${updateInfo.latestVersionCode})\n\n${updateInfo.updateLog || '无更新说明'}\n\n文件大小: ${appUpdateService.formatFileSize(updateInfo.fileSize)}\n\n是否立即更新？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '立即更新',
            onPress: () => handleDownloadUpdate(updateInfo),
          },
        ]
      );
    } catch (error: any) {
      console.error('检查更新失败:', error);
      Alert.alert('检查更新失败', error.message || '请稍后重试');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  /**
   * 处理下载更新
   */
  const handleDownloadUpdate = async (updateInfo: UpdateInfo) => {
    setIsDownloadingUpdate(true);
    setUpdateProgress(null);
    
    try {
      const fileUri = await appUpdateService.downloadApk(
        updateInfo,
        (progress) => {
          setUpdateProgress(progress);
        }
      );

      // 下载完成，提示安装
      Alert.alert(
        '下载完成',
        'APK 已下载完成，是否立即安装？',
        [
          { text: '稍后', style: 'cancel' },
          {
            text: '安装',
            onPress: async () => {
              try {
                await appUpdateService.installApk(fileUri);
              } catch (err: any) {
                Alert.alert('安装失败', err.message || '无法启动安装程序');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('下载更新失败:', error);
      Alert.alert('下载失败', error.message || '无法下载更新文件');
    } finally {
      setIsDownloadingUpdate(false);
      setUpdateProgress(null);
    }
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
                  disabled={isLoading || isCheckingUpdate || isDownloadingUpdate}
                  activeOpacity={0.7}
                >
                  <Text style={styles.switchButtonText}>
                    {isRegister
                      ? '已有账号？去登录'
                      : '还没有账号？去注册'}
                  </Text>
                </TouchableOpacity>

                {/* 检查更新按钮 */}
                <TouchableOpacity
                  style={[styles.updateButton, (isLoading || isCheckingUpdate || isDownloadingUpdate) && styles.updateButtonDisabled]}
                  onPress={handleCheckUpdate}
                  disabled={isLoading || isCheckingUpdate || isDownloadingUpdate}
                  activeOpacity={0.7}
                >
                  {isCheckingUpdate || isDownloadingUpdate ? (
                    <View style={styles.updateButtonContent}>
                      <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.updateButtonText}>
                        {isDownloadingUpdate ? '下载中...' : '检查中...'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.updateButtonContent}>
                      <FontAwesome6 name="arrow-rotate-right" size={14} color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.updateButtonText}>检查更新</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* 下载进度 */}
                {isDownloadingUpdate && updateProgress && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${updateProgress.progress * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.round(updateProgress.progress * 100)}% ({appUpdateService.formatFileSize(updateProgress.totalBytesWritten)} / {appUpdateService.formatFileSize(updateProgress.totalBytesExpectedToWrite)})
                    </Text>
                  </View>
                )}
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

