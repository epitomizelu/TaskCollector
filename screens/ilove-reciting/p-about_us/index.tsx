

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import styles from './styles';

const AboutUsScreen = () => {
  const router = useRouter();

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleWebsitePress = async () => {
    try {
      const url = 'https://www.yimai.app';
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('错误', '无法打开网站');
      }
    } catch (error) {
      Alert.alert('错误', '打开网站时发生错误');
    }
  };

  const handleEmailPress = async () => {
    try {
      const email = 'mailto:support@yimai.app';
      const supported = await Linking.canOpenURL(email);
      if (supported) {
        await Linking.openURL(email);
      } else {
        Alert.alert('错误', '无法打开邮件应用');
      }
    } catch (error) {
      Alert.alert('错误', '打开邮件时发生错误');
    }
  };

  const handlePhonePress = async () => {
    try {
      const phone = 'tel:400-123-4567';
      const supported = await Linking.canOpenURL(phone);
      if (supported) {
        await Linking.openURL(phone);
      } else {
        Alert.alert('错误', '无法拨打电话');
      }
    } catch (error) {
      Alert.alert('错误', '拨打电话时发生错误');
    }
  };

  const handleTermsPress = async () => {
    try {
      const url = 'https://www.yimai.app/terms';
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('错误', '无法打开用户协议');
      }
    } catch (error) {
      Alert.alert('错误', '打开用户协议时发生错误');
    }
  };

  const handlePrivacyPress = async () => {
    try {
      const url = 'https://www.yimai.app/privacy';
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('错误', '无法打开隐私政策');
      }
    } catch (error) {
      Alert.alert('错误', '打开隐私政策时发生错误');
    }
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
        <Text style={styles.headerTitle}>关于我们</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 应用信息区域 */}
        <View style={styles.appInfoSection}>
          <View style={styles.appInfoCard}>
            {/* 应用Logo */}
            <LinearGradient
              colors={['#4F46E5', '#06B6D4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.appLogo}
            >
              <FontAwesome6 name="brain" size={32} color="#FFFFFF" />
            </LinearGradient>
            
            {/* 应用名称 */}
            <Text style={styles.appName}>忆脉</Text>
            <Text style={styles.appSlogan}>智能记忆助手，让学习更高效</Text>
            
            {/* 版本信息 */}
            <View style={styles.versionInfo}>
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>当前版本</Text>
                <Text style={styles.versionNumber}>v1.0.0</Text>
              </View>
            </View>
            
            {/* 产品简介 */}
            <Text style={styles.appDescription}>
              忆脉是一款基于艾宾浩斯记忆曲线算法的智能学习应用，为用户提供个性化的背诵计划和智能复习管理，帮助用户高效记忆各类知识内容。
            </Text>
          </View>
        </View>

        {/* 联系我们 */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>联系我们</Text>
          
          <View style={styles.contactCard}>
            {/* 官方网站 */}
            <TouchableOpacity 
              style={[styles.contactItem, styles.contactItemWithBorder]} 
              onPress={handleWebsitePress}
              activeOpacity={0.7}
            >
              <View style={styles.contactItemContent}>
                <View style={[styles.contactIcon, styles.websiteIcon]}>
                  <FontAwesome6 name="globe" size={16} color="#4F46E5" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactTitle}>官方网站</Text>
                  <Text style={styles.contactSubtitle}>www.yimai.app</Text>
                </View>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#6B7280" />
            </TouchableOpacity>
            
            {/* 客服邮箱 */}
            <TouchableOpacity 
              style={[styles.contactItem, styles.contactItemWithBorder]} 
              onPress={handleEmailPress}
              activeOpacity={0.7}
            >
              <View style={styles.contactItemContent}>
                <View style={[styles.contactIcon, styles.emailIcon]}>
                  <FontAwesome6 name="envelope" size={16} color="#06B6D4" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactTitle}>客服邮箱</Text>
                  <Text style={styles.contactSubtitle}>support@yimai.app</Text>
                </View>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#6B7280" />
            </TouchableOpacity>
            
            {/* 客服电话 */}
            <TouchableOpacity 
              style={styles.contactItem} 
              onPress={handlePhonePress}
              activeOpacity={0.7}
            >
              <View style={styles.contactItemContent}>
                <View style={[styles.contactIcon, styles.phoneIcon]}>
                  <FontAwesome6 name="phone" size={16} color="#10B981" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactTitle}>客服电话</Text>
                  <Text style={styles.contactSubtitle}>400-123-4567</Text>
                </View>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 法律信息 */}
        <View style={styles.legalSection}>
          <Text style={styles.sectionTitle}>法律信息</Text>
          
          <View style={styles.legalCard}>
            {/* 用户协议 */}
            <TouchableOpacity 
              style={[styles.contactItem, styles.contactItemWithBorder]} 
              onPress={handleTermsPress}
              activeOpacity={0.7}
            >
              <View style={styles.contactItemContent}>
                <View style={[styles.contactIcon, styles.termsIcon]}>
                  <FontAwesome6 name="file-contract" size={16} color="#F59E0B" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactTitle}>用户协议</Text>
                  <Text style={styles.contactSubtitle}>查看用户服务协议</Text>
                </View>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#6B7280" />
            </TouchableOpacity>
            
            {/* 隐私政策 */}
            <TouchableOpacity 
              style={styles.contactItem} 
              onPress={handlePrivacyPress}
              activeOpacity={0.7}
            >
              <View style={styles.contactItemContent}>
                <View style={[styles.contactIcon, styles.privacyIcon]}>
                  <FontAwesome6 name="shield-halved" size={16} color="#3B82F6" />
                </View>
                <View style={styles.contactTextContainer}>
                  <Text style={styles.contactTitle}>隐私政策</Text>
                  <Text style={styles.contactSubtitle}>了解隐私保护政策</Text>
                </View>
              </View>
              <FontAwesome6 name="chevron-right" size={14} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 版权声明 */}
        <View style={styles.copyrightSection}>
          <View style={styles.copyrightCard}>
            <Text style={styles.copyrightText}>
              © 2024 忆脉科技有限公司{'\n'}
              保留所有权利
            </Text>
            <Text style={styles.buildInfo}>
              Build 20241228.1
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AboutUsScreen;

