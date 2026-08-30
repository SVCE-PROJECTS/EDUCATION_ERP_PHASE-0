/**
 * Sidebar — mobile drawer pattern.
 *
 * On mobile (phones) the sidebar is hidden by default.
 * A hamburger button in the top-left opens it as a full-height overlay.
 * Tapping a nav item or the backdrop closes it.
 *
 * The parent ScreenLayout passes `drawerOpen` + `setDrawerOpen` state
 * so the hamburger button in the header can also toggle it.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography } from '../theme';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';

type Nav = NavigationProp<RootStackParamList>;

const SIDEBAR_WIDTH = Math.min(260, Dimensions.get('window').width * 0.78);

const NAV_ITEMS: Array<{
  key: keyof RootStackParamList;
  label: string;
  icon: string;
}> = [
  { key: 'Dashboard',   label: 'Dashboard',    icon: '🏠' },
  { key: 'Attendance',  label: 'Attendance',   icon: '📋' },
  { key: 'IAMarks',     label: 'IA Marks',     icon: '📊' },
  { key: 'Assignments', label: 'Assignments',  icon: '📝' },
  { key: 'Students',    label: 'Students',     icon: '👥' },
  { key: 'Timetable',   label: 'Timetable',    icon: '🗓️' },
  { key: 'AIChecker',   label: 'AI Checker',   icon: '🔍' },
  { key: 'Profile',     label: 'My Profile',   icon: '👤' },
];

interface Props {
  navigation: Nav;
  activeScreen: keyof RootStackParamList;
  visible: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<Props> = ({
  navigation,
  activeScreen,
  visible,
  onClose,
}) => {
  const { faculty, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const initials = (faculty?.name ?? faculty?.username ?? 'FC')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleNav = (key: keyof RootStackParamList) => {
    onClose();
    // Small delay so close animation doesn't fight navigation
    setTimeout(() => navigation.navigate(key as never), 50);
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop — tap to close */}
      <TouchableWithoutFeedback onPress={onClose} accessibilityLabel="Close menu">
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Drawer panel */}
      <View
        style={[
          styles.drawer,
          { width: SIDEBAR_WIDTH, paddingTop: insets.top + spacing.md },
        ]}
      >
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.brandTitle}>SVCE ERP</Text>
          <Text style={styles.brandSubtitle}>Faculty Portal</Text>
        </View>

        {/* Nav items */}
        <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
          {NAV_ITEMS.map((item) => {
            const active = activeScreen === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => handleNav(item.key)}
                style={[styles.navItem, active && styles.navItemActive]}
                accessibilityRole="menuitem"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: active }}
              >
                <Text style={styles.navIcon}>{item.icon}</Text>
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {item.label}
                </Text>
                {active && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Profile row + logout */}
        <View
          style={[
            styles.profile,
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {faculty?.name ?? 'Faculty'}
            </Text>
            <Text style={styles.profileDept} numberOfLines={1}>
              {faculty?.departmentCode ?? ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel="Logout"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.logoutIcon}>⏻</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.sm,
  },
  closeBtnText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  brand: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    marginTop: spacing.sm,
  },
  brandTitle: {
    ...typography.h3,
    color: colors.primary,
  },
  brandSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  nav: { flex: 1 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  navItemActive: {
    backgroundColor: colors.primaryLight,
  },
  activeDot: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  navIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  navLabel: {
    ...typography.bodyBold,
    color: colors.textSecondary,
    flex: 1,
  },
  navLabelActive: { color: colors.primary },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 14,
  },
  profileInfo: { flex: 1 },
  profileName: { ...typography.bodyBold, color: colors.textPrimary },
  profileDept: { ...typography.caption, color: colors.textSecondary },
  logoutIcon: { fontSize: 22, color: colors.textSecondary },
});

export default Sidebar;
