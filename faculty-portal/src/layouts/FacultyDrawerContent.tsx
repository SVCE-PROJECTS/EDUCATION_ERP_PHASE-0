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
} from '../components/icons';
import Avatar from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/auth.service';
import { getRoleShortName } from '../utils/roleUtils';
import { ROUTES } from '../navigation/routes';
import { colors, shadows, ThemeColors } from '../theme/colors';
import Toast from '../services/toast';

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
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  const activeRoute = state.routes[state.index]?.name;

  const handleLogout = async () => {
    try { await authService.logout(); } catch { /* ignore network errors */ }
    logout();
    Toast.show({ type: 'success', text1: 'Logged out successfully' });
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Brand header — gradient hero panel */}
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
        <Text style={styles.brandDept}>{user?.departmentCode || 'ERP'}</Text>
      </LinearGradient>

      {/* User card */}
      <View style={styles.userSection}>
        <View style={styles.userCard}>
          <Avatar src={user?.photo} name={user?.name} size="sm" />
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.userRole} numberOfLines={1}>
              {getRoleShortName(user?.roles?.[0] ?? 'FACULTY')}
            </Text>
          </View>
        </View>
      </View>

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

      {/* Logout */}
      <View style={styles.logoutSection}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.75}>
          <LogOut size={16} color={colors.red[500]} />
          <Text style={styles.logoutText}>Sign Out</Text>
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

  logoutSection: { paddingHorizontal: 12, paddingBottom: 24 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
  },
  logoutText: { fontSize: 13, fontWeight: '500', color: colors.red[500] },
});
