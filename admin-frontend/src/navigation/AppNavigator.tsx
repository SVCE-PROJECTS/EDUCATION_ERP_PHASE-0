// @ts-nocheck
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/Login/LoginScreen';
import StudentListScreen from '../screens/StudentRegistry/StudentListScreen';
import AddStudentScreen from '../screens/StudentRegistry/AddStudentScreen';
import EditStudentScreen from '../screens/StudentRegistry/EditStudentScreen';
import StudentDetailsScreen from '../screens/StudentRegistry/StudentDetailsScreen';
import SearchStudentScreen from '../screens/SearchStudent/SearchStudentScreen';
import TransferStudentScreen from '../screens/TransferStudent/TransferStudentScreen';
import ExportStudentDataScreen from '../screens/ExportStudentData/ExportStudentDataScreen';
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

  // Wait for the stored session check (see AuthContext) before deciding
  // whether to land on Login or the main app, to avoid a Login screen flash.
  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
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

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AddStudent">
      <Stack.Screen name="StudentList"     component={StudentListScreen} />
      <Stack.Screen name="AddStudent"      component={AddStudentScreen} />
      <Stack.Screen name="EditStudent"     component={EditStudentScreen} />
      <Stack.Screen name="StudentDetails"  component={StudentDetailsScreen} />
      <Stack.Screen name="SearchStudent"   component={SearchStudentScreen} />
      <Stack.Screen name="TransferStudent" component={TransferStudentScreen} />
      <Stack.Screen name="ExportStudentData" component={ExportStudentDataScreen} />
      <Stack.Screen name="FacultyList"           component={FacultyListScreen} />
      <Stack.Screen name="AddFaculty"            component={AddFacultyScreen} />
      <Stack.Screen name="EditFaculty"           component={EditFacultyScreen} />
      <Stack.Screen name="FacultyDetails"        component={FacultyDetailsScreen} />
      <Stack.Screen name="NonTeachingStaffList"        component={NonTeachingStaffListScreen} />
      <Stack.Screen name="AddNonTeachingStaff"         component={AddNonTeachingStaffScreen} />
      <Stack.Screen name="EditNonTeachingStaff"        component={EditNonTeachingStaffScreen} />
      <Stack.Screen name="NonTeachingStaffDetails"     component={NonTeachingStaffDetailsScreen} />
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
