import React from 'react';
import Page from './p-home';
import { StatusBar } from 'expo-status-bar'

export default function Index() {
  return (
    <>
      <StatusBar style='dark' />
      <Page />
    </>
  );
}
