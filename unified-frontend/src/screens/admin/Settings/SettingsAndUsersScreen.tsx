// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import ScreenLayout from '../../../navigation/admin/ScreenLayout';
import SettingsScreen from './SettingsScreen';
import AdminUsersScreen from '../AdminUsers/AdminUsersScreen';
import { useTheme } from '../../../context/admin/ThemeContext';
import { spacing, typography } from '../../../theme';

const TABS = [
  { key: 'settings', label: 'Settings' },
  { key: 'adminUsers', label: 'Admin Users' },
];

// Single screen holding Settings and Admin Users as tabs — replaces the old
// separate sidebar entries so both are one click away instead of two.
const SettingsAndUsersScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <ScreenLayout navigation={navigation} activeScreen="Settings">
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
          {activeTab === 'settings' && <SettingsScreen navigation={navigation} embedded />}
          {activeTab === 'adminUsers' && <AdminUsersScreen navigation={navigation} embedded />}
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

export default SettingsAndUsersScreen;
