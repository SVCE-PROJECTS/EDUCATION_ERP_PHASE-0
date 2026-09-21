import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SnackbarHost from './components/ui/SnackbarHost';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View, ActivityIndicator } from 'react-native';

import { navigationRef } from './navigation/navigationRef';
import { ROUTES } from './navigation/routes';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { lightTheme, darkTheme } from './theme/paperTheme';

// ── Screens ──────────────────────────────────────────────────────────────────
import LoginScreen from './pages/LoginPage';
import NotFoundScreen from './pages/NotFound';
import HODDashboard from './pages/hod/HODDashboard';
import FacultyManagement from './pages/hod/FacultyManagement';
import FacultyProfile from './pages/hod/FacultyProfile';
import AddEditFaculty from './pages/hod/AddEditFaculty';
import StudentManagement from './pages/hod/StudentManagement';
import CoordinatorManagement from './pages/hod/CoordinatorManagement';
import ActivitiesPage from './pages/hod/activities/ActivitiesPage';
import FacultyAllocation from './pages/hod/FacultyAllocation';

// ── Drawer custom content ─────────────────────────────────────────────────────
import HODDrawerContent from './layouts/HODDrawerContent';

// ─────────────────────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator();
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

// ── HOD Drawer navigator ──────────────────────────────────────────────────────
// The drawer acts as the persistent shell for all authenticated HOD screens.
// Stack-push screens (FacultyProfile, Add/Edit) live in the root Stack so they
// appear on top of the drawer with a proper back-arrow header.
function HODDrawer() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <HODDrawerContent {...props} />}
      screenOptions={{
        headerShown: false, // Topbar is rendered inside each screen
        drawerStyle: { width: 260 },
        swipeEdgeWidth: 40,
      }}
    >
      <Drawer.Screen name={ROUTES.HOD_DASHBOARD} component={HODDashboard} />
      <Drawer.Screen name={ROUTES.HOD_FACULTY} component={FacultyManagement} />
      <Drawer.Screen name={ROUTES.HOD_STUDENTS} component={StudentManagement} />
      <Drawer.Screen name={ROUTES.HOD_COORDINATORS} component={CoordinatorManagement} />
      <Drawer.Screen name={ROUTES.HOD_ACTIVITIES} component={ActivitiesPage} />
      <Drawer.Screen name={ROUTES.HOD_FACULTY_ALLOCATION} component={FacultyAllocation} />
    </Drawer.Navigator>
  );
}

// ── Root stack ────────────────────────────────────────────────────────────────
// Unauthenticated flow:  Login
// Authenticated flow:    HODDrawer (with nested drawer screens)
//                        + stack-push screens on top of the drawer
function RootNavigator() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated || !user?.isHOD ? (
        // ── Public ──
        <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      ) : (
        // ── Protected HOD ──
        <>
          <Stack.Screen name="HODRoot" component={HODDrawer} />
          <Stack.Screen name={ROUTES.FACULTY_PROFILE} component={FacultyProfile} options={{ headerShown: false }} />
          <Stack.Screen name={ROUTES.FACULTY_ADD} component={AddEditFaculty} options={{ headerShown: false }} />
          <Stack.Screen name={ROUTES.FACULTY_EDIT} component={AddEditFaculty} options={{ headerShown: false }} />
        </>
      )}
      <Stack.Screen name={ROUTES.NOT_FOUND} component={NotFoundScreen} />
    </Stack.Navigator>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  // react-native-vector-icons ships its glyphs as a font file — unlike
  // lucide-react-native (plain SVG paths, no font needed), this font must be
  // explicitly loaded before any <Icon name="..."/> can render a glyph.
  // Without this, every icon silently renders as a blank box, on both
  // native and web.
  const [fontsLoaded] = useFonts({
    MaterialCommunityIcons: require('react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
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

// Split out so useTheme()/useAuth() can be called inside the providers
// mounted just above — they throw if called outside their provider tree.
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
            {/* Snackbar host must be rendered outside NavigationContainer */}
            <SnackbarHost />
          </PaperProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
