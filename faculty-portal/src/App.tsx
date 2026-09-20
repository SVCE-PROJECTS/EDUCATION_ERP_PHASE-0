/**
 * Faculty Portal — App entry point.
 *
 * Provider tree and RootNavigator mirror hod-portal/src/App.tsx exactly:
 *   AuthProvider → ThemeProvider → AppShell
 *   AppShell →  GestureHandlerRootView → SafeAreaProvider
 *            → QueryClientProvider → PaperProvider
 *            → NavigationContainer → RootNavigator
 *
 * Auth gate: shows Login if not authenticated; FacultyDrawer otherwise.
 * Faculty don't need isHOD — any authenticated user with a valid token is let in.
 */

import React from 'react';
import { StyleSheet, View, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { navigationRef } from './navigation/navigationRef';
import { ROUTES } from './navigation/routes';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { lightTheme, darkTheme } from './theme/paperTheme';

// ── Screens ──────────────────────────────────────────────────────────────────
import LoginPage   from './pages/LoginPage';
import NotFound    from './pages/NotFound';
import Dashboard   from './pages/faculty/Dashboard';
import MyProfile   from './pages/faculty/MyProfile';
import Assignments from './pages/faculty/Assignments';
import Attendance  from './pages/faculty/Attendance';
import IAMarks     from './pages/faculty/IAMarks';

// ── Drawer content ────────────────────────────────────────────────────────────
import FacultyDrawerContent from './layouts/FacultyDrawerContent';

// ── UI helpers ────────────────────────────────────────────────────────────────
import SnackbarHost from './components/ui/SnackbarHost';

// ─────────────────────────────────────────────────────────────────────────────

const Stack  = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

// ── Faculty Drawer ────────────────────────────────────────────────────────────
// The drawer is the persistent authenticated shell. All primary screens live
// here. The Stack wraps the drawer so future detail/push screens can go on top.

function FacultyDrawer() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return (
    <Drawer.Navigator
      drawerContent={(props) => <FacultyDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: isLargeScreen ? 'permanent' : 'front',
        drawerStyle: { width: 260 },
        swipeEdgeWidth: isLargeScreen ? 0 : 40,
        overlayColor: isLargeScreen ? 'transparent' : 'rgba(0,0,0,0.5)',
      }}
    >
      <Drawer.Screen name={ROUTES.FACULTY_DASHBOARD} component={Dashboard} />
      <Drawer.Screen name={ROUTES.ASSIGNMENTS}       component={Assignments} />
      <Drawer.Screen name={ROUTES.ATTENDANCE}        component={Attendance} />
      <Drawer.Screen name={ROUTES.IA_MARKS}          component={IAMarks} />
      <Drawer.Screen name={ROUTES.MY_PROFILE}        component={MyProfile} />
    </Drawer.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────────────────────
// Unauthenticated → Login
// Authenticated   → FacultyDrawer (root) + any future stack-push screens

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name={ROUTES.LOGIN} component={LoginPage} />
      ) : (
        <Stack.Screen name="FacultyRoot" component={FacultyDrawer} />
      )}
      <Stack.Screen name={ROUTES.NOT_FOUND} component={NotFound} />
    </Stack.Navigator>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────
// Split out so useTheme() / useAuth() are called inside their providers.

function AppShell() {
  const { isDark } = useTheme();
  const theme = isDark ? darkTheme : lightTheme;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <PaperProvider theme={theme}>
            <NavigationContainer ref={navigationRef}>
              <StatusBar style={isDark ? 'light' : 'dark'} />
              <RootNavigator />
            </NavigationContainer>
            {/* SnackbarHost renders outside NavigationContainer — same as hod-portal */}
            <SnackbarHost />
          </PaperProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────

export default function App() {
  // Load MaterialCommunityIcons font (same requirement as admin-frontend and hod-portal)
  const [fontsLoaded] = useFonts({
    MaterialCommunityIcons: require('react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
