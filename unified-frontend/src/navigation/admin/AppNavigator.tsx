
// @ts-nocheck

import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../../screens/admin/Login/LoginScreen';

import StudentListScreen from '../../screens/admin/StudentRegistry/StudentListScreen';
import AddStudentScreen from '../../screens/admin/StudentRegistry/AddStudentScreen';
import EditStudentScreen from '../../screens/admin/StudentRegistry/EditStudentScreen';
import StudentDetailsScreen from '../../screens/admin/StudentRegistry/StudentDetailsScreen';

import TransferStudentScreen from '../../screens/admin/TransferStudent/TransferStudentScreen';
import ExportStudentDataScreen from '../../screens/admin/ExportStudentData/ExportStudentDataScreen';

import DashboardScreen from '../../screens/admin/Dashboard/DashboardScreen';

import FeeScreen from '../../screens/admin/Fee/FeeScreen';
import AcademicFeeScreen from '../../screens/admin/Fee/AcademicFeeScreen';
import FeeStubScreen from '../../screens/admin/Fee/FeeStubScreen';

import ActivityLogScreen from '../../screens/admin/ActivityLog/ActivityLogScreen';
import AdminUsersScreen from '../../screens/admin/AdminUsers/AdminUsersScreen';
import SettingsScreen from '../../screens/admin/Settings/SettingsScreen';
import TransferredStudentsScreen from '../../screens/admin/TransferredStudents/TransferredStudentsScreen';

import FacultyListScreen from '../../screens/admin/FacultyRegistry/FacultyListScreen';
import AddFacultyScreen from '../../screens/admin/FacultyRegistry/AddFacultyScreen';
import EditFacultyScreen from '../../screens/admin/FacultyRegistry/EditFacultyScreen';
import FacultyDetailsScreen from '../../screens/admin/FacultyRegistry/FacultyDetailsScreen';
import NonTeachingStaffListScreen from '../../screens/admin/NonTeachingStaffRegistry/NonTeachingStaffListScreen';
import AddNonTeachingStaffScreen from '../../screens/admin/NonTeachingStaffRegistry/AddNonTeachingStaffScreen';
import EditNonTeachingStaffScreen from '../../screens/admin/NonTeachingStaffRegistry/EditNonTeachingStaffScreen';
import NonTeachingStaffDetailsScreen from '../../screens/admin/NonTeachingStaffRegistry/NonTeachingStaffDetailsScreen';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/admin/ThemeContext';
import { useTokenFromUrl } from '../../hooks/admin/useTokenFromUrl';

const Stack = createNativeStackNavigator();

// headerShown: false because each screen renders its own persistent
// Sidebar + content via ScreenLayout instead of a native header/drawer.
const AppNavigator = () => {
  const { isAuthenticated, isReady } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  // Auto-login when arriving from unified-frontend with ?token= in URL
  useTokenFromUrl();

  // Wait for the stored session check before deciding
  // whether to show Login or the main application.
  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
      </View>
    );
  }

  // Not authenticated → Login
  if (!isAuthenticated) {
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />
      </Stack.Navigator>
    );
  }

  // Authenticated → Main application
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="Dashboard"
    >
      {/* Dashboard */}
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
      />

      {/* Student Registry */}
      <Stack.Screen
        name="StudentList"
        component={StudentListScreen}
      />

      <Stack.Screen
        name="AddStudent"
        component={AddStudentScreen}
      />

      <Stack.Screen
        name="EditStudent"
        component={EditStudentScreen}
      />

      <Stack.Screen
        name="StudentDetails"
        component={StudentDetailsScreen}
      />

      {/* Student Transfer */}
      <Stack.Screen
        name="TransferStudent"
        component={TransferStudentScreen}
      />

      {/* Download */}
      <Stack.Screen
        name="ExportStudentData"
        component={ExportStudentDataScreen}
      />

      {/* Fee Management */}
      <Stack.Screen
        name="Fee"
        component={FeeScreen}
      />

      {/* Faculty Registry */}
      <Stack.Screen name="FacultyList" component={FacultyListScreen} />
      <Stack.Screen name="AddFaculty" component={AddFacultyScreen} />
      <Stack.Screen name="EditFaculty" component={EditFacultyScreen} />
      <Stack.Screen name="FacultyDetails" component={FacultyDetailsScreen} />

      {/* Non-Teaching Staff Registry */}
      <Stack.Screen name="NonTeachingStaffList" component={NonTeachingStaffListScreen} />
      <Stack.Screen name="AddNonTeachingStaff" component={AddNonTeachingStaffScreen} />
      <Stack.Screen name="EditNonTeachingStaff" component={EditNonTeachingStaffScreen} />
      <Stack.Screen name="NonTeachingStaffDetails" component={NonTeachingStaffDetailsScreen} />

      <Stack.Screen
        name="AcademicFee"
        component={AcademicFeeScreen}
      />

      <Stack.Screen
        name="TuitionFee"
        component={FeeStubScreen}
        initialParams={{
          title: 'Tuition Fees',
          icon: 'currency-inr',
          description: 'Tuition fee structure management is being built and will be available in a future update.',
        }}
      />

      <Stack.Screen
        name="ExamFee"
        component={FeeStubScreen}
        initialParams={{
          title: 'Exam Fees',
          icon: 'clipboard-text-outline',
          description: 'Examination fee structure management is being built and will be available in a future update.',
        }}
      />

      <Stack.Screen
        name="TransportFee"
        component={FeeStubScreen}
        initialParams={{
          title: 'Transport Fees',
          icon: 'bus-outline',
          description: 'Transport fee management is being built and will be available in a future update.',
        }}
      />

      <Stack.Screen
        name="HostelFee"
        component={FeeStubScreen}
        initialParams={{
          title: 'Hostel Fees',
          icon: 'home-city-outline',
          description: 'Hostel fee management is being built and will be available in a future update.',
        }}
      />

      {/* Activity Log */}
      <Stack.Screen
        name="ActivityLog"
        component={ActivityLogScreen}
      />

      {/* Admin Users */}
      <Stack.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
      />

      {/* Settings */}
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
      />

      {/* Transferred Students — reached by tapping the Dashboard stat card */}
      <Stack.Screen
        name="TransferredStudents"
        component={TransferredStudentsScreen}
      />
    </Stack.Navigator>
  );
};

const getStyles = (colors) => StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

export default AppNavigator;


