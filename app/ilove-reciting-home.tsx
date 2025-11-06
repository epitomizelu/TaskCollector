import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Page from "../screens/ilove-reciting/p-task_list";

export default function Index() {
  return (
    <SafeAreaProvider>
      <Page />
    </SafeAreaProvider>
  );
}

