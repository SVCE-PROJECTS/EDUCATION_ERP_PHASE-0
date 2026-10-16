import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import ScreenWrapper from '../../layouts/faculty/ScreenWrapper';
import MySchedules from './MySchedules';
import Meetings from './Meetings';
import { useTheme } from '../../context/faculty/ThemeContext';
import { ROUTES } from '../../navigation/faculty/routes';

const TABS = [
  { key: 'mySchedules', label: 'My Schedules' },
  { key: 'meetings', label: 'Meetings' },
];

// Single screen holding My Schedules and Meetings as tabs — replaces the
// old separate sidebar entries so both are one click away instead of two.
// Neither sub-screen's own behavior is changed; this only decides when each
// shows its own ScreenWrapper vs. being embedded here.
export default function SchedulesAndMeetings({ navigation }: { navigation: any }) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const [activeTab, setActiveTab] = useState('mySchedules');

  return (
    <ScreenWrapper route={ROUTES.MY_SCHEDULES} scrollable={false}>
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
          {activeTab === 'mySchedules' && <MySchedules embedded />}
          {activeTab === 'meetings' && <Meetings navigation={navigation} embedded />}
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
