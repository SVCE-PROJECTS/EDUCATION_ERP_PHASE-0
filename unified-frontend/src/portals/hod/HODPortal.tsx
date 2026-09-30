// @ts-nocheck
/**
 * HODPortal — full hod-portal navigator embedded inside unified-frontend.
 */
import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── HOD screens ───────────────────────────────────────────────────────────────
import HODDashboard          from '../../screens/hod/HODDashboard';
import FacultyManagement     from '../../screens/hod/FacultyManagement';
import FacultyProfile        from '../../screens/hod/FacultyProfile';
import AddEditFaculty        from '../../screens/hod/AddEditFaculty';
import StudentManagement     from '../../screens/hod/StudentManagement';
import CoordinatorManagement from '../../screens/hod/CoordinatorManagement';
import ActivitiesPage        from '../../screens/hod/activities/ActivitiesPage';
import FacultyAllocation     from '../../screens/hod/FacultyAllocation';
import ActivityLog           from '../../screens/hod/ActivityLog';
import HODDrawerContent      from '../../layouts/hod/HODDrawerContent';
import SnackbarHost          from '../../components/hod/ui/SnackbarHost';

// ── HOD-specific providers ────────────────────────────────────────────────────
import { AuthProvider as HODAuthProvider, useAuth as useHODAuth } from '../../context/hod/AuthContext';
import { ThemeProvider as HODThemeProvider, useTheme as useHODTheme } from '../../context/hod/ThemeContext';
import { lightTheme, darkTheme } from '../../theme/hodTheme';
import { useAuth as useUnifiedAuth } from '../../context/AuthContext';
import { ROUTES } from '../../navigation/hod/routes';

const Stack  = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
});

const HOD_STORAGE_KEY = 'dept-erp-auth-v3';

// Bridges the unified token into HOD's own AuthContext storage
function HODTokenBridge() {
  const { user: unifiedUser, token: unifiedToken } = useUnifiedAuth();
  const { login } = useHODAuth();

  useEffect(() => {
    if (!unifiedToken || !unifiedUser) return;
    const hodUser = {
      id:             unifiedUser.id,
      username:       unifiedUser.username,
      name:           unifiedUser.name ?? unifiedUser.fullName ?? unifiedUser.username,
      email:          unifiedUser.email ?? '',
      designation:    unifiedUser.designation ?? '',
      department:     unifiedUser.department ?? { id: '', name: '', code: unifiedUser.departmentCode ?? '' },
      departmentCode: unifiedUser.departmentCode ?? '',
      isHOD:          true,
      roles:          unifiedUser.roles ?? [],
      photoUrl:       unifiedUser.profilePhoto ?? null,
    };
    login(hodUser, unifiedToken);
  }, [unifiedToken]);

  return null;
}

// When HOD signs out, also clear the unified session so App.tsx
// navigates back to the unified Login screen.
function HODLogoutBridge() {
  const { isAuthenticated, isLoading } = useHODAuth();
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

function HODDrawerNav() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  return (
    <Drawer.Navigator
      drawerContent={(props) => <HODDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: isLargeScreen ? 'permanent' : 'front',
        drawerStyle: { width: 260 },
        swipeEdgeWidth: isLargeScreen ? 0 : 40,
        overlayColor: isLargeScreen ? 'transparent' : 'rgba(0,0,0,0.5)',
      }}
    >
      <Drawer.Screen name={ROUTES.HOD_DASHBOARD}        component={HODDashboard} />
      <Drawer.Screen name={ROUTES.HOD_FACULTY}          component={FacultyManagement} />
      <Drawer.Screen name={ROUTES.HOD_STUDENTS}         component={StudentManagement} />
      <Drawer.Screen name={ROUTES.HOD_COORDINATORS}     component={CoordinatorManagement} />
      <Drawer.Screen name={ROUTES.HOD_ACTIVITIES}       component={ActivitiesPage} />
      <Drawer.Screen name={ROUTES.HOD_FACULTY_ALLOCATION} component={FacultyAllocation} />
      <Drawer.Screen name={ROUTES.HOD_ACTIVITY_LOG}     component={ActivityLog} />
    </Drawer.Navigator>
  );
}

function HODNavigator() {
  const { isAuthenticated, isLoading } = useHODAuth();

  // Show spinner while loading persisted session OR while token bridge is
  // hydrating (isLoading=false but isAuthenticated=false for 1-2 render cycles)
  if (isLoading || !isAuthenticated) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#0891B2" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HODRoot"              component={HODDrawerNav} />
      <Stack.Screen name={ROUTES.FACULTY_PROFILE} component={FacultyProfile} />
      <Stack.Screen name={ROUTES.FACULTY_ADD}     component={AddEditFaculty} />
      <Stack.Screen name={ROUTES.FACULTY_EDIT}    component={AddEditFaculty} />
    </Stack.Navigator>
  );
}

function HODShell() {
  const { isDark } = useHODTheme();
  return (
    <PaperProvider theme={isDark ? darkTheme : lightTheme}>
      <QueryClientProvider client={queryClient}>
        <HODTokenBridge />
        <HODLogoutBridge />
        <HODNavigator />
        <SnackbarHost />
      </QueryClientProvider>
    </PaperProvider>
  );
}

export default function HODPortal() {
  return (
    <HODAuthProvider>
      <HODThemeProvider>
        <HODShell />
      </HODThemeProvider>
    </HODAuthProvider>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
