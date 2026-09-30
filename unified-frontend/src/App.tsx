// @ts-nocheck
import 'react-native-gesture-handler';
import React from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen  from './screens/LoginScreen';
import AdminPortal  from './portals/admin/AdminPortal';
import HODPortal    from './portals/hod/HODPortal';
import FacultyPortal from './portals/faculty/FacultyPortal';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    html, body, #root { height: 100%; margin: 0; }
    #root { display: flex; flex-direction: column; }
  `;
  document.head.appendChild(style);
}

const Stack = createNativeStackNavigator();

// -- Root navigator -----------------------------------------------------------
// Before auth is ready -> spinner
// Not authenticated    -> UnifiedLogin
// admin                -> AdminPortal
// hod                  -> HODPortal
// faculty              -> FacultyPortal
//
// The `key` forces a completely fresh portal (fresh contexts, fresh state)
// every time a different user logs in, so no state leaks between sessions.

function RootNavigator() {
  const { isAuthenticated, isReady, user } = useAuth();

  if (!isReady) {
    return (
      <View style={s.splash}>
        <ActivityIndicator size="large" color="#1D4ED8" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  const k = `${user?.role}-${user?.id}`;
  if (user?.role === 'admin') return <AdminPortal key={k} />;
  if (user?.role === 'hod')   return <HODPortal key={k} />;
  return <FacultyPortal key={k} />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={s.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F2044' },
});
