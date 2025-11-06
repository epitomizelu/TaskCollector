import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Page from "../screens/ilove-reciting/p-task_detail";

export default function Index() {
  return (
    <SafeAreaProvider>
      <Page />
    </SafeAreaProvider>
  );
}

