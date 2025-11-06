/**
 * 应用入口页面
 * 始终跳转到模块选择首页，让用户选择要使用的功能模块
 */
import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // 始终跳转到模块首页，让用户选择要使用的功能
    router.replace('/module-home');
  }, []);

  // 在路由跳转期间显示空内容
  return null;
}
