/**
 * Faculty Portal — Drawer sidebar.
 * Mirrors hod-portal/src/layouts/HODDrawerContent.tsx: gradient brand
 * header → user card → pill-style nav items → logout button, fully
 * theme-aware.
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LayoutDashboard, Users, ClipboardList, CheckSquare,
  Award, GraduationCap, LogOut,
} from '../../components/faculty/icons';
import Avatar from '../../components/faculty/ui/Avatar';
import { useAuth } from '../../context/faculty/AuthContext';
import { useTheme } from '../../context/faculty/ThemeContext';
import { authService } from '../../services/faculty/auth.service';
import { resolveFileUrl } from '../../services/faculty/api';
import { getRoleShortName } from '../../utils/faculty/roleUtils';
import { ROUTES } from '../../navigation/faculty/routes';
import { colors, shadows, ThemeColors } from '../../theme/faculty/colors';
import Toast from '../../services/faculty/toast';
import { unifiedLogoutRef } from '../../context/AuthContext';

type IconComponent = React.ComponentType<{ size?: number; color?: string; style?: any }>;

interface NavItem { label: string; route: string; icon: IconComponent; }

const FACULTY_NAV: NavItem[] = [
  { label: 'Dashboard',   route: ROUTES.FACULTY_DASHBOARD, icon: LayoutDashboard },
  { label: 'Assignments', route: ROUTES.ASSIGNMENTS,       icon: ClipboardList },
  { label: 'Attendance',  route: ROUTES.ATTENDANCE,        icon: CheckSquare },
  { label: 'IA Marks',    route: ROUTES.IA_MARKS,          icon: Award },
  { label: 'My Profile',  route: ROUTES.MY_PROFILE,        icon: Users },
];

interface SidebarItemProps {
  icon: IconComponent; label: string; isActive: boolean; onPress: () => void;
  theme: ThemeColors; styles: ReturnType<typeof getStyles>;
}

function SidebarItem({ icon: Icon, label, isActive, onPress, theme, styles }: SidebarItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress} activeOpacity={0.75}
      style={[styles.navItem, isActive && styles.navItemActive]}
      accessibilityRole="button" accessibilityState={{ selected: isActive }}
    >
      <View style={[styles.navIconWrap, isActive && styles.navIconWrapActive]}>
        <Icon size={17} color={isActive ? theme.primary : theme.textSecondary} />
      </View>
      <Text style={[styles.navLabel, isActive && styles.navLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function FacultyDrawerContent(props: DrawerContentComponentProps) {
  const { state, navigation: drawerNav } = props;
  const { user, logout } = useAuth();
  const { colors: theme, isDark, toggleTheme } = useTheme();
  const styles = getStyles(theme);
  const activeRoute = state.routes[state.index]?.name;

  const handleLogout = async () => {
    await unifiedLogoutRef.current?.();
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Brand header — gradient hero panel, tap to jump home */}
      <TouchableOpacity
        onPress={() => drawerNav.navigate(ROUTES.FACULTY_DASHBOARD as never)}
        activeOpacity={0.85}
        accessibilityLabel="Go to Dashboard"
      >
        <LinearGradient
          colors={theme.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.brand}
        >
          <View style={styles.brandIcon}>
            <GraduationCap size={20} color={colors.white} />
          </View>
          <Text style={styles.brandName}>Faculty Portal</Text>
          <Text style={styles.brandDept}>SVCE — Engineering College ERP</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* User card */}
      {/* Nav items */}
      <DrawerContentScrollView
        {...props} scrollEnabled contentContainerStyle={styles.navList}
        showsVerticalScrollIndicator={false}
      >
        {FACULTY_NAV.map((item) => (
          <SidebarItem
            key={item.route} icon={item.icon} label={item.label}
            isActive={activeRoute === item.route}
            onPress={() => drawerNav.navigate(item.route as never)}
            theme={theme} styles={styles}
          />
        ))}
      </DrawerContentScrollView>

      {/* Profile + Theme + Sign out row — mirrors admin sidebar */}
      <View style={styles.profileRow}>
        <TouchableOpacity
          style={styles.profileInfo}
          onPress={() => drawerNav.navigate(ROUTES.MY_PROFILE as never)}
          activeOpacity={0.75}
        >
          <Avatar src={resolveFileUrl(user?.photoUrl)} name={user?.name} size="sm" />
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.profileRole} numberOfLines={1}>
              {getRoleShortName(user?.roles?.[0] ?? 'FACULTY')}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn} activeOpacity={0.7}
          accessibilityLabel="Toggle dark mode">
          <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={styles.signOutBtn} activeOpacity={0.7}
          accessibilityLabel="Sign out">
          <LogOut size={17} color={colors.red[500]} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.surface, borderRightWidth: 1, borderRightColor: theme.border },

  brand: {
    alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
  },
  brandIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  brandName: { fontSize: 14, fontWeight: '700', color: colors.white, letterSpacing: 0.3 },
  brandDept: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  userSection: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.primarySoft, borderRadius: 12, padding: 8,
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 12, fontWeight: '600', color: theme.textPrimary },
  userRole: { fontSize: 11, color: theme.textSecondary, marginTop: 1 },

  navList: { paddingHorizontal: 12, paddingVertical: 12, gap: 4 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12,
  },
  navItemActive: { backgroundColor: theme.primarySoft },
  navIconWrap: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  navIconWrapActive: { backgroundColor: theme.surface, ...shadows.soft },
  navLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: theme.textSecondary },
  navLabelActive: { color: theme.primary, fontWeight: '700' },

  // Profile + theme + signout row
  profileRow: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, padding: 10, borderRadius: 14,
    backgroundColor: theme.primarySoft, gap: 6,
  },
  profileInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 12, fontWeight: '600', color: theme.textPrimary },
  profileRole: { fontSize: 11, color: theme.textSecondary, marginTop: 1 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
  },
  signOutBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.red[50], borderWidth: 1, borderColor: colors.red[100],
  },
  logoutText: { fontSize: 13, fontWeight: '500', color: colors.red[500] },
});