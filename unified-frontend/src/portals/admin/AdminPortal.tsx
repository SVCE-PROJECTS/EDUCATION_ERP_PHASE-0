// @ts-nocheck
/**
 * AdminPortal — full admin-frontend navigator embedded inside unified-frontend.
 * Imports screens directly from admin-frontend/src/screens.
 * Uses its own AuthProvider so the admin token/user is isolated.
 */
import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';

// ── Admin screens ─────────────────────────────────────────────────────────────
import DashboardScreen           from '../../screens/admin/Dashboard/DashboardScreen';
import StudentListScreen         from '../../screens/admin/StudentRegistry/StudentListScreen';
import AddStudentScreen          from '../../screens/admin/StudentRegistry/AddStudentScreen';
import EditStudentScreen         from '../../screens/admin/StudentRegistry/EditStudentScreen';
import StudentDetailsScreen      from '../../screens/admin/StudentRegistry/StudentDetailsScreen';
import TransferStudentScreen     from '../../screens/admin/TransferStudent/TransferStudentScreen';
import RegistryScreen            from '../../screens/admin/Registry/RegistryScreen';
import AnalyticsScreen           from '../../screens/admin/Analytics/AnalyticsScreen';
import MyProfileScreen           from '../../screens/admin/MyProfile/MyProfileScreen';
import FeeScreen                 from '../../screens/admin/Fee/FeeScreen';
import AcademicFeeScreen         from '../../screens/admin/Fee/AcademicFeeScreen';
import FeeStubScreen             from '../../screens/admin/Fee/FeeStubScreen';
import ActivityLogScreen         from '../../screens/admin/ActivityLog/ActivityLogScreen';
import AdminUsersScreen          from '../../screens/admin/AdminUsers/AdminUsersScreen';
import SettingsAndUsersScreen    from '../../screens/admin/Settings/SettingsAndUsersScreen';
import TransferredStudentsScreen from '../../screens/admin/TransferredStudents/TransferredStudentsScreen';
import FacultyListScreen         from '../../screens/admin/FacultyRegistry/FacultyListScreen';
import AddFacultyScreen          from '../../screens/admin/FacultyRegistry/AddFacultyScreen';
import EditFacultyScreen         from '../../screens/admin/FacultyRegistry/EditFacultyScreen';
import FacultyDetailsScreen      from '../../screens/admin/FacultyRegistry/FacultyDetailsScreen';
import NonTeachingStaffListScreen    from '../../screens/admin/NonTeachingStaffRegistry/NonTeachingStaffListScreen';
import AddNonTeachingStaffScreen     from '../../screens/admin/NonTeachingStaffRegistry/AddNonTeachingStaffScreen';
import EditNonTeachingStaffScreen    from '../../screens/admin/NonTeachingStaffRegistry/EditNonTeachingStaffScreen';
import NonTeachingStaffDetailsScreen from '../../screens/admin/NonTeachingStaffRegistry/NonTeachingStaffDetailsScreen';
import SchedulesAndMeetingsScreen    from '../../screens/admin/Schedules/SchedulesAndMeetingsScreen';

// Meeting Management Screens
import MeetingManagementScreen       from '../../screens/admin/MeetingManagement/MeetingManagementScreen';
import CreateMeetingScreen           from '../../screens/admin/MeetingManagement/CreateMeetingScreen';
import MeetingDetailsScreen          from '../../screens/admin/MeetingManagement/MeetingDetailsScreen';
import EditMeetingScreen             from '../../screens/admin/MeetingManagement/EditMeetingScreen';

// ── Admin-specific providers ──────────────────────────────────────────────────
import { AuthProvider as AdminAuthProvider, useAuth as useAdminAuth } from '../../context/admin/AuthContext';
import { ThemeProvider as AdminThemeProvider, useTheme as useAdminTheme } from '../../context/admin/ThemeContext';
import { paperTheme, paperDarkTheme } from '../../theme/adminTheme';
import ErrorBoundary from '../../components/ErrorBoundary';

// ── Inject unified token into admin AuthContext on mount ──────────────────────
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setToken as setAdminAxiosToken } from '../../api/tokenStore';
import { useAuth as useUnifiedAuth } from '../../context/AuthContext';

const Stack = createNativeStackNavigator();

const makeQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// Bridges the unified token into admin's own AsyncStorage keys.
// Runs synchronously during render so the token is in tokenStore
// before React Query fires its first request.
function AdminTokenBridge() {
  const { user: unifiedUser, token: unifiedToken } = useUnifiedAuth();

  // Set token synchronously on every render where we have it,
  // so axiosInstance has it before any query fires.
  if (unifiedToken) {
    setAdminAxiosToken(unifiedToken);
  }

  useEffect(() => {
    if (!unifiedToken || !unifiedUser) return;
    AsyncStorage.setItem('auth_token', unifiedToken);
    AsyncStorage.setItem('auth_user', JSON.stringify({
      id:       unifiedUser.id,
      username: unifiedUser.username,
      fullName: unifiedUser.fullName ?? unifiedUser.name,
      role:     'admin',
    }));
  }, [unifiedToken]);

  return null;
}

// Safety net: if admin's own session clears without going through the
// logout button (e.g. 401 from axiosInstance), end the unified session too.
function AdminLogoutBridge() {
  const { isAuthenticated, isReady } = useAdminAuth();
  const { logout: unifiedLogout } = useUnifiedAuth();
  const wasAuthed = useRef(false);

  useEffect(() => {
    if (!isReady) return;
    if (isAuthenticated) {
      wasAuthed.current = true;
    } else if (wasAuthed.current) {
      wasAuthed.current = false;
      unifiedLogout();
    }
  }, [isAuthenticated, isReady]);

  return null;
}

function AdminNavigator() {
  const { isAuthenticated, isReady } = useAdminAuth();
  const { colors } = useAdminTheme();

  if (!isReady || !isAuthenticated) {
    // Brief spinner while token bridge hydrates — unified logout bridge
    // will redirect to the unified login if the session is truly gone.
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Dashboard">
      <Stack.Screen name="Dashboard"             component={DashboardScreen} />
      <Stack.Screen name="Registry"               component={RegistryScreen} />
      <Stack.Screen name="StudentList"           component={StudentListScreen} />
      <Stack.Screen name="AddStudent"            component={AddStudentScreen} />
      <Stack.Screen name="EditStudent"           component={EditStudentScreen} />
      <Stack.Screen name="StudentDetails"        component={StudentDetailsScreen} />
      <Stack.Screen name="TransferStudent"       component={TransferStudentScreen} />
      <Stack.Screen name="Fee"                   component={FeeScreen} />
      <Stack.Screen name="Analytics"              component={AnalyticsScreen} />
      <Stack.Screen name="MyProfile"              component={MyProfileScreen} />
      <Stack.Screen name="AcademicFee"           component={AcademicFeeScreen} />
      <Stack.Screen name="TuitionFee"            component={FeeStubScreen}
        initialParams={{ title: 'Tuition Fees', icon: 'currency-inr', description: 'Coming soon.' }} />
      <Stack.Screen name="ExamFee"               component={FeeStubScreen}
        initialParams={{ title: 'Exam Fees', icon: 'clipboard-text-outline', description: 'Coming soon.' }} />
      <Stack.Screen name="TransportFee"          component={FeeStubScreen}
        initialParams={{ title: 'Transport Fees', icon: 'bus-outline', description: 'Coming soon.' }} />
      <Stack.Screen name="HostelFee"             component={FeeStubScreen}
        initialParams={{ title: 'Hostel Fees', icon: 'home-city-outline', description: 'Coming soon.' }} />
      <Stack.Screen name="FacultyList"           component={FacultyListScreen} />
      <Stack.Screen name="AddFaculty"            component={AddFacultyScreen} />
      <Stack.Screen name="EditFaculty"           component={EditFacultyScreen} />
      <Stack.Screen name="FacultyDetails"        component={FacultyDetailsScreen} />
      <Stack.Screen name="NonTeachingStaffList"    component={NonTeachingStaffListScreen} />
      <Stack.Screen name="AddNonTeachingStaff"     component={AddNonTeachingStaffScreen} />
      <Stack.Screen name="EditNonTeachingStaff"    component={EditNonTeachingStaffScreen} />
      <Stack.Screen name="NonTeachingStaffDetails" component={NonTeachingStaffDetailsScreen} />
      <Stack.Screen name="ActivityLog"           component={ActivityLogScreen} />
      <Stack.Screen name="AdminUsers"            component={AdminUsersScreen} />
      <Stack.Screen name="Settings"              component={SettingsAndUsersScreen} />
      <Stack.Screen name="TransferredStudents"   component={TransferredStudentsScreen} />
      <Stack.Screen name="MySchedules"           component={SchedulesAndMeetingsScreen} />
      <Stack.Screen name="MeetingManagement"     component={MeetingManagementScreen} />
      <Stack.Screen name="CreateMeeting"         component={CreateMeetingScreen} />
      <Stack.Screen name="MeetingDetails"        component={MeetingDetailsScreen} />
      <Stack.Screen name="EditMeeting"           component={EditMeetingScreen} />
    </Stack.Navigator>
  );
}

function AdminShell() {
  const { isDark } = useAdminTheme();
  // Fresh per mount — see FacultyPortal.tsx for why this can't be a
  // module-level singleton (it would leak one admin's cached data to the
  // next admin who logs into the same browser tab).
  const [queryClient] = useState(makeQueryClient);
  return (
    <PaperProvider theme={isDark ? paperDarkTheme : paperTheme}>
      <QueryClientProvider client={queryClient}>
        <AdminTokenBridge />
        <AdminLogoutBridge />
        <AdminNavigator />
      </QueryClientProvider>
    </PaperProvider>
  );
}

export default function AdminPortal() {
  return (
    <ErrorBoundary>
      <AdminAuthProvider>
        <AdminThemeProvider>
          <AdminShell />
        </AdminThemeProvider>
      </AdminAuthProvider>
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
