import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PresetTaskScreen from '../screens/task-list/p-preset';

export default function Index() {
  return (
    <SafeAreaProvider>
      <PresetTaskScreen />
    </SafeAreaProvider>
  );
}

