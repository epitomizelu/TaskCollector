import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppUpdateScreen from '../screens/app-update';

export default function Index() {
  return (
    <SafeAreaProvider>
      <AppUpdateScreen />
    </SafeAreaProvider>
  );
}

