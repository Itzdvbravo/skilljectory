import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AchievementQueueProvider } from './src/components/achievements/AchievementQueueProvider';
import { CustomModalAlertProvider } from './src/components/common/CustomModalAlert';

const queryClient = new QueryClient();

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AchievementQueueProvider>
          <CustomModalAlertProvider>
            <RootNavigator />
            <StatusBar style="light" />
          </CustomModalAlertProvider>
        </AchievementQueueProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
