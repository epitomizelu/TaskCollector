import React, { useEffect } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, usePathname, useGlobalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox } from 'react-native';
import { AppShell } from '../core/app-shell';
import { updateService } from '../services/update.service';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
  // 添加其它想暂时忽略的错误或警告信息
]);

export default function RootLayout() {
  const pathname = usePathname();
  const searchParams = useGlobalSearchParams();

  // 应用启动时检查更新（静默检查，不阻塞启动）
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // 静默检查更新，不阻塞应用启动
        updateService.checkForUpdate().catch(error => {
          console.error('[RootLayout] 更新检查失败:', error);
        });
      } catch (error) {
        console.error('[RootLayout] 更新检查异常:', error);
      }
    };

    // 延迟检查，确保应用已启动
    const timer = setTimeout(checkForUpdates, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!pathname) {
      return;
    }
    let searchString = '';
    if (Object.keys(searchParams).length > 0) {
      const queryString = Object.keys(searchParams)
        .map(key => {
          const value = searchParams[key];
          if (typeof value === 'string') {
            return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
          }
          return '';
        }).filter(Boolean).join('&');

      searchString = '?' + queryString;
    }

    const pageId = pathname.replace('/', '').toUpperCase();
    console.log('当前pageId:', pageId, ', pathname:', pathname, ', search:', searchString);
    if (typeof window === 'object' && window.parent && window.parent.postMessage) {
      window.parent.postMessage({
        type: 'chux-path-change',
        pageId: pageId,
        pathname: pathname,
        search: searchString,
      }, '*');
    }
  }, [pathname, searchParams])

  return (
    <AppShell>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark"></StatusBar>
        <Stack screenOptions={{
          // 设置所有页面的切换动画为从右侧滑入，适用于iOS 和 Android
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          // 隐藏自带的头部
          headerShown: false 
        }}>
          <Stack.Screen name="index" options={{ title: "首页" }} />
          <Stack.Screen name="p-login-phone" options={{ title: "手机号登录" }} />
          <Stack.Screen name="module-home" options={{ title: "模块首页" }} />
          <Stack.Screen name="p-home" options={{ title: "任务收集" }} />
          <Stack.Screen name="p-full-home" options={{ title: "任务收集完整首页" }} />
          <Stack.Screen name="p-report_view" options={{ title: "报表查看页" }} />
          <Stack.Screen name="p-data_view" options={{ title: "数据查看页" }} />
          <Stack.Screen name="p-confirm_dialog" options={{ title: "确认弹窗" }} />
          <Stack.Screen name="p-export_success" options={{ title: "导出成功提示页" }} />
          {/* 我爱背书模块路由 */}
          <Stack.Screen name="ilove-reciting-home" options={{ title: "我爱背书" }} />
          <Stack.Screen name="ilove-reciting-full-home" options={{ title: "我爱背书完整首页" }} />
          <Stack.Screen name="ilove-reciting-plan-list" options={{ title: "计划列表" }} />
          <Stack.Screen name="ilove-reciting-plan-create" options={{ title: "创建计划" }} />
          <Stack.Screen name="ilove-reciting-task-list" options={{ title: "任务列表" }} />
          <Stack.Screen name="ilove-reciting-task-detail" options={{ title: "任务详情" }} />
          <Stack.Screen name="ilove-reciting-content-manage" options={{ title: "内容管理" }} />
          <Stack.Screen name="ilove-reciting-profile" options={{ title: "个人资料" }} />
          <Stack.Screen name="ilove-reciting-settings" options={{ title: "设置" }} />
          <Stack.Screen name="ilove-reciting-about-us" options={{ title: "关于我们" }} />
          <Stack.Screen name="ilove-reciting-upload-audio" options={{ title: "上传音频" }} />
          <Stack.Screen name="ilove-reciting-upload-document" options={{ title: "上传文档" }} />
          <Stack.Screen name="test-api" options={{ title: "云函数测试" }} />
          {/* 任务清单模块路由 */}
          <Stack.Screen name="task-list-today" options={{ title: "今日任务" }} />
          <Stack.Screen name="task-list-preset" options={{ title: "预设任务" }} />
          <Stack.Screen name="app-update" options={{ title: "检查更新" }} />
              </Stack>
      </GestureHandlerRootView>
    </AppShell>
  );
}
