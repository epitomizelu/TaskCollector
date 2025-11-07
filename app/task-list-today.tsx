import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TodayTaskScreen from '../screens/task-list/p-today';

export default function Index() {
  return (
    <SafeAreaProvider>
      <TodayTaskScreen />
    </SafeAreaProvider>
  );
}

