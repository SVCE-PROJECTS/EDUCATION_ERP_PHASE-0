/**
 * Faculty Portal — Root App Component
 *
 * Provider tree (outer → inner):
 *   QueryClientProvider      — TanStack Query for future hooks
 *   PaperProvider            — react-native-paper theming
 *   SafeAreaProvider         — safe area insets (used by ScreenHeader, Sidebar)
 *   NavigationContainer      — React Navigation
 *   AuthProvider             — JWT / session management
 *   ClassesProvider          — Faculty's assigned classes (loaded after login)
 *   AppNavigator             — route stack
 */

import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ClassesProvider } from './src/context/ClassesContext';
import { paperTheme } from './src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={paperTheme}>
        <SafeAreaProvider>
          <AuthProvider>
            <ClassesProvider>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </ClassesProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
