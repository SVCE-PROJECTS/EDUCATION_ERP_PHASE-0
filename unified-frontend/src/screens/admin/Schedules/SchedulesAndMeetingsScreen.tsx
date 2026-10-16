// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import ScreenLayout from '../../../navigation/admin/ScreenLayout';
import MySchedulesScreen from './MySchedulesScreen';
import MeetingManagementScreen from '../MeetingManagement/MeetingManagementScreen';
import { useTheme } from '../../../context/admin/ThemeContext';
import { spacing, typography } from '../../../theme';

const TABS = [
  { key: 'mySchedules', label: 'My Schedules' },
  { key: 'meetings', label: 'Meeting Management' },
];

// Single screen holding My Schedules and Meeting Management as tabs —
// replaces the old separate sidebar entries so both are one click away
// instead of two. Neither sub-screen's own behavior is changed; this only
// decides when each shows its own sidebar/ScreenLayout vs. being embedded here.
const SchedulesAndMeetingsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [activeTab, setActiveTab] = useState('mySchedules');

  return (
    <ScreenLayout navigation={navigation} activeScreen="MySchedules">
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
          {activeTab === 'mySchedules' && <MySchedulesScreen navigation={navigation} embedded />}
          {activeTab === 'meetings' && <MeetingManagementScreen navigation={navigation} embedded />}
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

export default SchedulesAndMeetingsScreen;
