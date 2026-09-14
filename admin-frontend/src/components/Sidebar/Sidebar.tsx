// @ts-nocheck
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar, Icon } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../theme';

const NAV_ITEMS = [
  {
    key: 'Dashboard', label: 'Dashboard', icon: 'view-grid-outline', screen: 'Dashboard', disabled: true,
  },
  {
    key: 'StudentList', label: 'Student Registry', icon: 'account-group-outline', screen: 'AddStudent',
  },
  {
    key: 'FacultyList', label: 'Faculty Registry', icon: 'account-tie-outline', screen: 'FacultyList',
  },
  {
    key: 'NonTeachingStaffList', label: 'Non-Teaching Staff', icon: 'account-hard-hat-outline', screen: 'NonTeachingStaffList',
  },
  {
    key: 'SearchStudent', label: 'Search Student', icon: 'magnify', screen: 'SearchStudent',
  },
  {
    key: 'TransferStudent', label: 'Transfer Student', icon: 'swap-horizontal', screen: 'TransferStudent',
  },
  {
    key: 'ExportStudentData', label: 'Export Student Data', icon: 'tray-arrow-down', screen: 'ExportStudentData',
  },
  {
    key: 'Settings', label: 'Settings', icon: 'cog-outline', screen: 'Settings', disabled: true,
  },
];

// activeScreen: name of the currently active top-level route, used to highlight the matching nav item.
const Sidebar = ({ navigation, activeScreen }) => {
  const { user, logout } = useAuth();
  const initials = (user?.fullName || user?.username || 'AD')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
  <View style={styles.container}>
    <View style={styles.brand}>
      <Text style={styles.brandTitle}>SVCE EDUCATION ERP</Text>
      <Text style={styles.brandSubtitle}>Academic Management</Text>
    </View>

    <View style={styles.nav}>
      {NAV_ITEMS.map((item) => {
        const active = item.screen === activeScreen;
        return (
          <TouchableOpacity
            key={item.key}
            disabled={item.disabled}
            onPress={() => navigation.navigate(item.screen)}
            style={[styles.navItem, active && styles.navItemActive]}
          >
            <Icon
              source={item.icon}
              size={20}
              color={active ? colors.primary : item.disabled ? colors.textMuted : colors.textSecondary}
            />
            <Text
              style={[
                styles.navLabel,
                active && styles.navLabelActive,
                item.disabled && styles.navLabelDisabled,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>

    <View style={styles.profile}>
      <Avatar.Text size={36} label={initials} style={{ backgroundColor: colors.primaryLight }} color={colors.primary} />
      <View style={{ marginLeft: spacing.sm, flex: 1 }}>
        <Text style={styles.profileName}>{user?.fullName || user?.username || 'Administrator'}</Text>
        <Text style={styles.profileRole}>{user?.role === 'admin' ? 'Super Admin' : (user?.role || '')}</Text>
      </View>
      <TouchableOpacity onPress={logout} accessibilityLabel="Log out">
        <Icon source="logout" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 240,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: spacing.xl,
    height: '100%',
  },
  brand: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  brandTitle: {
    ...typography.h2,
    color: colors.primary,
  },
  brandSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  nav: {
    flex: 1,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  navItemActive: {
    backgroundColor: colors.primaryLight,
    borderRightWidth: 3,
    borderRightColor: colors.primary,
  },
  navLabel: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  navLabelActive: {
    color: colors.primary,
  },
  navLabelDisabled: {
    color: colors.textMuted,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  profileName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  profileRole: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});

export default Sidebar;
