// @ts-nocheck

import React from 'react';
import {
  View,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/admin/AuthContext';
import { useTheme } from '../../context/admin/ThemeContext';
import { unifiedLogoutRef } from '../../context/AuthContext';
import {
  spacing, typography, radius, shadows,
} from '../../theme';

const svceLogo = require('../../assets/svce_logo_transparent.png');
const LOGO_ASPECT = 1087 / 209;

const NAV_ITEMS = [
  {
    key: 'Dashboard',
    label: 'Dashboard',
    icon: 'view-grid-outline',
    screen: 'Dashboard',
  },
  {
    key: 'Registry',
    label: 'Registry',
    icon: 'folder-account-outline',
    screen: 'Registry',
    // The Add/Edit/Details screens for all three registries still carry
    // their old activeScreen value — treat any of them as "Registry" too
    // so the sidebar highlights correctly no matter which sub-screen you're on.
    matchScreens: ['StudentList', 'FacultyList', 'NonTeachingStaffList'],
  },
  {
    key: 'TransferStudent',
    label: 'Transfer Student',
    icon: 'swap-horizontal',
    screen: 'TransferStudent',
    // Reached from the Dashboard's "Transferred Students" quick action, not
    // from this sidebar item directly — still highlight it as the closest
    // match so the sidebar doesn't go blank while you're there.
    matchScreens: ['TransferredStudents'],
  },
  {
    key: 'Fee',
    label: 'Fee Management',
    icon: 'cash-multiple',
    screen: 'Fee',
  },
  {
    key: 'Analytics',
    label: 'Analytics',
    icon: 'chart-box-outline',
    screen: 'Analytics',
  },
  {
    key: 'ActivityLog',
    label: 'Activity Log',
    icon: 'clipboard-text-clock-outline',
    screen: 'ActivityLog',
  },
  {
    key: 'Settings',
    label: 'Settings',
    icon: 'cog-outline',
    screen: 'Settings',
    // The Settings screen itself now holds Settings + Admin Users as tabs —
    // AdminUsers is still a directly-reachable standalone route (e.g. from
    // the Dashboard's quick action), so match it here for sidebar highlighting.
    matchScreens: ['AdminUsers'],
  },
  {
    key: 'MySchedules',
    label: 'My Schedules',
    icon: 'calendar-month',
    screen: 'MySchedules',
    // The My Schedules screen itself now holds My Schedules + Meeting
    // Management as tabs — the standalone meeting screens are still
    // directly-reachable routes, so match them here for sidebar highlighting.
    matchScreens: ['MeetingManagement', 'CreateMeeting', 'EditMeeting', 'MeetingDetails'],
  },
];

// onNavigate: optional — called after every navigation (nav item tap, brand
// tap). Used by ScreenLayout's mobile overlay to close itself once the user
// has picked a destination; the always-visible desktop sidebar doesn't pass it.
const Sidebar = ({ navigation, activeScreen, onNavigate }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();
  const styles = getStyles(colors);

  const goTo = (screen) => {
    try {
      navigation.navigate(screen);
      onNavigate?.();
    } catch (error) {
      console.error('[Sidebar] Navigation error:', error);
    }
  };

  const handleLogout = async () => {
    // Only call unified logout — it clears all session keys and
    // App.tsx unmounts the portal, returning to the unified LoginScreen.
    await unifiedLogoutRef.current?.();
  };

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
        onPress={() => goTo('Dashboard')}
        activeOpacity={0.85}
        accessibilityLabel="Go to Dashboard"
      >
        <LinearGradient
          colors={colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.brand}
        >
          <Image
            source={svceLogo}
            // At height 46 the logo's natural width (~239px) exceeds the
            // sidebar's available content width (248px container - 32px
            // padding = 216px), so the wordmark was getting clipped. 40
            // keeps it within that space, matching how HOD/Faculty fit theirs.
            style={{ height: 40, width: 40 * LOGO_ASPECT, marginBottom: spacing.sm }}
            resizeMode="contain"
            accessibilityLabel="SVCE — Sri Venkateshwara College of Engineering"
          />
          <Text style={styles.brandSubtitle}>Academic Management</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Navigation */}
      <ScrollView
        style={styles.nav}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
        keyboardShouldPersistTaps="handled"
      >
        {NAV_ITEMS.map((item) => {
          const active = item.screen === activeScreen || item.matchScreens?.includes(activeScreen);

          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => goTo(item.screen)}
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
      </ScrollView>

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
          onPress={handleLogout}
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

  brandSubtitle: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  nav: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },

  navContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
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
