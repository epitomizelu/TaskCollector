/**
 * 应用入口页面
 * 检查登录状态，未登录则跳转到登录页面，已登录则跳转到模块首页
 */
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { userService } from '../services/user.service';

export default function Index() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkLoginAndRedirect();
  }, []);

  const checkLoginAndRedirect = async () => {
    try {
      // 初始化用户服务，从本地加载登录状态
      await userService.initialize();

      // 检查是否已登录
      if (userService.isLoggedIn()) {
        // 已登录，跳转到模块首页
        router.replace('/module-home');
      } else {
        // 未登录，跳转到登录页面
        router.replace('/p-login-phone');
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      // 出错时也跳转到登录页面
      router.replace('/p-login-phone');
    } finally {
      setIsChecking(false);
    }
  };

  // 在检查登录状态期间显示加载指示器
  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // 路由跳转期间显示空内容
  return null;
}
