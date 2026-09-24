
// @ts-nocheck

import React from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/Login/LoginScreen';

import StudentListScreen from '../screens/StudentRegistry/StudentListScreen';
import AddStudentScreen from '../screens/StudentRegistry/AddStudentScreen';
import EditStudentScreen from '../screens/StudentRegistry/EditStudentScreen';
import StudentDetailsScreen from '../screens/StudentRegistry/StudentDetailsScreen';

import TransferStudentScreen from '../screens/TransferStudent/TransferStudentScreen';
import ExportStudentDataScreen from '../screens/ExportStudentData/ExportStudentDataScreen';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';

import FeeScreen from '../screens/Fee/FeeScreen';
import AcademicFeeScreen from '../screens/Fee/AcademicFeeScreen';
import FeeStubScreen from '../screens/Fee/FeeStubScreen';

import ActivityLogScreen from '../screens/ActivityLog/ActivityLogScreen';
import AdminUsersScreen from '../screens/AdminUsers/AdminUsersScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import TransferredStudentsScreen from '../screens/TransferredStudents/TransferredStudentsScreen';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Stack = createNativeStackNavigator();

// headerShown: false because each screen renders its own persistent
// Sidebar + content via ScreenLayout instead of a native header/drawer.
const AppNavigator = () => {
  const { isAuthenticated, isReady } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);

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


