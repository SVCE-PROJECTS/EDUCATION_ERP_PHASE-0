import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import ScreenWrapper from '../../layouts/hod/ScreenWrapper';
import FacultyManagement from './FacultyManagement';
import StudentManagement from './StudentManagement';
import CoordinatorManagement from './CoordinatorManagement';
import { useTheme } from '../../context/hod/ThemeContext';
import { ROUTES } from '../../navigation/hod/routes';

const TABS = [
  { key: 'faculty', label: 'Faculty List' },
  { key: 'students', label: 'Student List' },
  { key: 'coordinators', label: 'Coordinator Management' },
];

// Single screen holding Faculty List, Student List and Coordinator
// Management as tabs — replaces the old separate sidebar entries so all
// three are one click away instead of three. Neither sub-screen's own
// behavior is changed; this only decides when each shows its own
// ScreenWrapper vs. being embedded here.
export default function DataAndManagement() {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const [activeTab, setActiveTab] = useState('faculty');

  return (
    <ScreenWrapper route={ROUTES.HOD_FACULTY} scrollable={false}>
      <View style={s.container}>
        <View style={s.tabBar}>
          {TABS.map((tab) => {
            const active = tab.key === activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[s.tab, active && { borderBottomColor: theme.primary }]}
                activeOpacity={0.7}
              >
                <Text style={[s.tabText, { color: active ? theme.primary : theme.textSecondary }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.tabContent}>
          {activeTab === 'faculty' && <FacultyManagement embedded />}
          {activeTab === 'students' && <StudentManagement embedded />}
          {activeTab === 'coordinators' && <CoordinatorManagement embedded />}
        </View>
      </View>
    </ScreenWrapper>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
  },
});
