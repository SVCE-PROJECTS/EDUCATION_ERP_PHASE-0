// @ts-nocheck

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  spacing, typography, radius, shadows,
} from '../../theme';

const NAV_ITEMS = [
  {
    key: 'Dashboard',
    label: 'Dashboard',
    icon: 'view-grid-outline',
    screen: 'Dashboard',
  },
  {
    key: 'StudentList',
    label: 'Student Registry',
    icon: 'account-group-outline',
    screen: 'StudentList',
  },
  {
    key: 'TransferStudent',
    label: 'Transfer Student',
    icon: 'swap-horizontal',
    screen: 'TransferStudent',
  },
  {
    key: 'ExportStudentData',
    label: 'Download Student Data',
    icon: 'tray-arrow-down',
    screen: 'ExportStudentData',
  },
  {
    key: 'Fee',
    label: 'Fee Management',
    icon: 'cash-multiple',
    screen: 'Fee',
  },
  {
    key: 'ActivityLog',
    label: 'Activity Log',
    icon: 'clipboard-text-clock-outline',
    screen: 'ActivityLog',
  },
  {
    key: 'AdminUsers',
    label: 'Admin Users',
    icon: 'shield-account-outline',
    screen: 'AdminUsers',
  },
  {
    key: 'Settings',
    label: 'Settings',
    icon: 'cog-outline',
    screen: 'Settings',
  },
];

const Sidebar = ({ navigation, activeScreen }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();
  const styles = getStyles(colors);

  const initials = (user?.fullName || user?.username || 'AD')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.container}>

      {/* Brand — gradient hero panel, tap to jump home */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Dashboard')}
        activeOpacity={0.85}
        accessibilityLabel="Go to Dashboard"
      >
        <LinearGradient
          colors={colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.brand}
        >
          <View style={styles.brandIconWrap}>
            <Icon source="school-outline" size={22} color={colors.white} />
          </View>
          <Text style={styles.brandTitle}>SVCE EDUCATION ERP</Text>
          <Text style={styles.brandSubtitle}>Academic Management</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Navigation */}
      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = item.screen === activeScreen;

          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => navigation.navigate(item.screen)}
              activeOpacity={0.7}
              style={[
                styles.navItem,
                active && styles.navItemActive,
              ]}
            >
              <View style={[styles.navIconWrap, active && styles.navIconWrapActive]}>
                <Icon
                  source={item.icon}
                  size={18}
                  color={active ? colors.primary : colors.textSecondary}
                />
              </View>

              <Text
                style={[
                  styles.navLabel,
                  active && styles.navLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Profile */}
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.profileName} numberOfLines={1}>
            {user?.fullName ||
              user?.username ||
              'Administrator'}
          </Text>

          <Text style={styles.profileRole}>
            {user?.role === 'admin'
              ? 'Super Admin'
              : user?.role
                ? user.role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
                : ''}
          </Text>
        </View>

        <TouchableOpacity
          onPress={toggleTheme}
          accessibilityLabel="Toggle dark mode"
          activeOpacity={0.7}
          style={styles.themeBtn}
        >
          <Icon
            source={isDark ? 'white-balance-sunny' : 'weather-night'}
            size={16}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={logout}
          accessibilityLabel="Log out"
          activeOpacity={0.7}
          style={styles.logoutBtn}
        >
          <Icon
            source="logout"
            size={17}
            color={colors.danger}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    width: 248,
    backgroundColor: colors.surface,
    height: '100%',
    ...shadows.soft,
  },

  brand: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },

  brandIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  brandTitle: {
    ...typography.h3,
    color: colors.white,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  brandSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  nav: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.xs,
  },

  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.md,
  },

  navItemActive: {
    backgroundColor: colors.primarySoft,
  },

  navIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  navIconWrapActive: {
    backgroundColor: colors.surface,
  },

  navLabel: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    flexShrink: 1,
  },

  navLabelActive: {
    color: colors.primary,
  },

  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    ...typography.bodyBold,
    color: colors.white,
    fontSize: 13,
  },

  profileInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },

  profileName: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 13,
  },

  profileRole: {
    ...typography.caption,
    color: colors.textSecondary,
  },

  logoutBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerBg,
  },

  themeBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
});

export default Sidebar;
