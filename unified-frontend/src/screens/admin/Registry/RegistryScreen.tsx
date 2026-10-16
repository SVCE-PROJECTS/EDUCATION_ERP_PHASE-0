// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import ScreenLayout from '../../../navigation/admin/ScreenLayout';
import StudentListScreen from '../StudentRegistry/StudentListScreen';
import FacultyListScreen from '../FacultyRegistry/FacultyListScreen';
import NonTeachingStaffListScreen from '../NonTeachingStaffRegistry/NonTeachingStaffListScreen';
import { useTheme } from '../../../context/admin/ThemeContext';
import { spacing, typography } from '../../../theme';

const TABS = [
  { key: 'students', label: 'Student Registry' },
  { key: 'faculty', label: 'Faculty Registry' },
  { key: 'nonTeaching', label: 'Non-Teaching Staff' },
];

// Single screen holding all three registries as tabs — replaces the old
// separate StudentList/FacultyList/NonTeachingStaffList sidebar entries so
// browsing, searching and adding any of the three is one click away instead
// of three separate destinations.
const RegistryScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [activeTab, setActiveTab] = useState('students');

  return (
    <ScreenLayout navigation={navigation} activeScreen="Registry">
      <View style={styles.container}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, active && { borderBottomColor: colors.primary }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, { color: active ? colors.primary : colors.textSecondary }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.tabContent}>
          {activeTab === 'students' && <StudentListScreen navigation={navigation} embedded />}
          {activeTab === 'faculty' && <FacultyListScreen navigation={navigation} embedded />}
          {activeTab === 'nonTeaching' && <NonTeachingStaffListScreen navigation={navigation} embedded />}
        </View>
      </View>
    </ScreenLayout>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    ...typography.bodyBold,
  },
  tabContent: {
    flex: 1,
  },
});

export default RegistryScreen;
