// @ts-nocheck
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { paperTheme, paperDarkTheme } from './src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Picks the matching MD3 paper theme for the app's own dark-mode state, so
// react-native-paper's own chrome (Dialog, Modal, Snackbar, Menu) goes dark
// too instead of just the custom-built screens.
function PaperThemeBridge({ children }) {
  const { isDark } = useTheme();
  return (
    <PaperProvider theme={isDark ? paperDarkTheme : paperTheme}>
      {children}
    </PaperProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PaperThemeBridge>
          <AuthProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </AuthProvider>
        </PaperThemeBridge>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
