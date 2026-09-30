// @ts-nocheck
/**
 * FacultyPortal - full faculty-portal navigator embedded inside unified-frontend.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// -- Faculty screens ----------------------------------------------------------
import Dashboard            from '../../screens/faculty/Dashboard';
import MyProfile            from '../../screens/faculty/MyProfile';
import Assignments          from '../../screens/faculty/Assignments';
import Attendance           from '../../screens/faculty/Attendance';
import IAMarks              from '../../screens/faculty/IAMarks';
import FacultyDrawerContent from '../../layouts/faculty/FacultyDrawerContent';
import SnackbarHost         from '../../components/faculty/ui/SnackbarHost';

// -- Faculty-specific providers -----------------------------------------------
import { AuthProvider as FacultyAuthProvider, useAuth as useFacultyAuth } from '../../context/faculty/AuthContext';
import { ThemeProvider as FacultyThemeProvider, useTheme as useFacultyTheme } from '../../context/faculty/ThemeContext';
import { lightTheme, darkTheme } from '../../theme/facultyTheme';
import { useAuth as useUnifiedAuth } from '../../context/AuthContext';
import { ROUTES } from '../../navigation/faculty/routes';

const Stack  = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const makeQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
});

// Bridges the unified token into Faculty's own AuthContext
function FacultyTokenBridge() {
  const { user: unifiedUser, token: unifiedToken } = useUnifiedAuth();
  const { login } = useFacultyAuth();

  useEffect(() => {
    if (!unifiedToken || !unifiedUser) return;
    const facultyUser = {
      id:             unifiedUser.id,
      username:       unifiedUser.username,
      name:           unifiedUser.name ?? unifiedUser.fullName ?? unifiedUser.username,
      email:          unifiedUser.email ?? '',
      designation:    unifiedUser.designation ?? '',
      department:     unifiedUser.department ?? { id: '', name: '', code: unifiedUser.departmentCode ?? '' },
      departmentCode: unifiedUser.departmentCode ?? '',
      isHOD:          false,
      roles:          unifiedUser.roles ?? [],
      photoUrl:       unifiedUser.profilePhoto ?? null,
    };
    login(facultyUser, unifiedToken);
  }, [unifiedToken]);

  return null;
}

// When faculty signs out, also clear the unified session so App.tsx
// navigates back to the unified Login screen.
// Safety net only: the drawer and Topbar Sign out buttons also call
// unifiedLogoutRef directly.
function FacultyLogoutBridge() {
  const { isAuthenticated, isLoading } = useFacultyAuth();
  const { logout: unifiedLogout } = useUnifiedAuth();
  const wasAuthed = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      wasAuthed.current = true;
    } else if (wasAuthed.current) {
      wasAuthed.current = false;
      unifiedLogout();
    }
  }, [isAuthenticated, isLoading]);

  return null;
}

function FacultyDrawerNav() {
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

function FacultyNavigator() {
  const { isAuthenticated, isLoading } = useFacultyAuth();

  if (isLoading || !isAuthenticated) {
    // Spinner while token bridge hydrates - FacultyLogoutBridge handles redirect
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FacultyRoot" component={FacultyDrawerNav} />
    </Stack.Navigator>
  );
}

function FacultyShell() {
  const { isDark } = useFacultyTheme();
  // Fresh per mount — App.tsx remounts FacultyPortal (via `key`) on every
  // login, but a module-level QueryClient would survive that remount and
  // keep serving one faculty's cached data (e.g. their classes) to the
  // next faculty who logs into the same browser tab.
  const [queryClient] = useState(makeQueryClient);
  return (
    <PaperProvider theme={isDark ? darkTheme : lightTheme}>
      <QueryClientProvider client={queryClient}>
        <FacultyTokenBridge />
        <FacultyLogoutBridge />
        <FacultyNavigator />
        <SnackbarHost />
      </QueryClientProvider>
    </PaperProvider>
  );
}

export default function FacultyPortal() {
  return (
    <FacultyAuthProvider>
      <FacultyThemeProvider>
        <FacultyShell />
      </FacultyThemeProvider>
    </FacultyAuthProvider>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});