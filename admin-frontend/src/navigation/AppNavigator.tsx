
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

import SearchStudentScreen from '../screens/SearchStudent/SearchStudentScreen';
import TransferStudentScreen from '../screens/TransferStudent/TransferStudentScreen';
import ExportStudentDataScreen from '../screens/ExportStudentData/ExportStudentDataScreen';

import DashboardScreen from '../screens/Dashboard/DashboardScreen';

import FeeScreen from '../screens/Fee/FeeScreen';

import FacultyListScreen from '../screens/FacultyRegistry/FacultyListScreen';
import AddFacultyScreen from '../screens/FacultyRegistry/AddFacultyScreen';
import EditFacultyScreen from '../screens/FacultyRegistry/EditFacultyScreen';
import FacultyDetailsScreen from '../screens/FacultyRegistry/FacultyDetailsScreen';
import NonTeachingStaffListScreen from '../screens/NonTeachingStaffRegistry/NonTeachingStaffListScreen';
import AddNonTeachingStaffScreen from '../screens/NonTeachingStaffRegistry/AddNonTeachingStaffScreen';
import EditNonTeachingStaffScreen from '../screens/NonTeachingStaffRegistry/EditNonTeachingStaffScreen';
import NonTeachingStaffDetailsScreen from '../screens/NonTeachingStaffRegistry/NonTeachingStaffDetailsScreen';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

// headerShown: false because each screen renders its own persistent
// Sidebar + content via ScreenLayout instead of a native header/drawer.
const AppNavigator = () => {
  const { isAuthenticated, isReady } = useAuth();

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

      {/* Student Search */}
      <Stack.Screen
        name="SearchStudent"
        component={SearchStudentScreen}
      />

      {/* Student Transfer */}
      <Stack.Screen
        name="TransferStudent"
        component={TransferStudentScreen}
      />

      {/* Export */}
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
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});

export default AppNavigator;


