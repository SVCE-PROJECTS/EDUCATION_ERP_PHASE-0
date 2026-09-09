/**
 * Faculty Portal — Drawer sidebar.
 * Mirrors hod-portal/src/layouts/HODDrawerContent.tsx exactly:
 * brand header → user card → nav items → logout button.
 */

import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import {
  LayoutDashboard, Users, ClipboardList, CheckSquare,
  Award, GraduationCap, LogOut,
} from '../components/icons';
import Avatar from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { getRoleShortName } from '../utils/roleUtils';
import { ROUTES } from '../navigation/routes';
import { colors, shadows, primaryScale, neutral } from '../theme/colors';
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
}

function SidebarItem({ icon: Icon, label, isActive, onPress }: SidebarItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress} activeOpacity={0.75}
      style={[styles.navItem, isActive && styles.navItemActive]}
      accessibilityRole="button" accessibilityState={{ selected: isActive }}
    >
      <Icon size={17} color={isActive ? colors.white : neutral[500]} style={styles.navIcon} />
      <Text style={[styles.navLabel, isActive && styles.navLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function FacultyDrawerContent(props: DrawerContentComponentProps) {
  const { state, navigation: drawerNav } = props;
  const { user, logout } = useAuth();
  const activeRoute = state.routes[state.index]?.name;

  const handleLogout = async () => {
    try { await authService.logout(); } catch { /* ignore network errors */ }
    logout();
    Toast.show({ type: 'success', text1: 'Logged out successfully' });
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Brand header */}
      <View style={styles.brand}>
        <View style={styles.brandIcon}>
          <GraduationCap size={20} color={colors.white} />
        </View>
        <View>
          <Text style={styles.brandName}>Faculty Portal</Text>
          <Text style={styles.brandDept}>{user?.departmentCode || 'ERP'}</Text>
        </View>
      </View>

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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white, borderRightWidth: 1, borderRightColor: neutral[100] },

  brand: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 20,
    borderBottomWidth: 1, borderBottomColor: neutral[100],
  },
  brandIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: primaryScale[600],
    alignItems: 'center', justifyContent: 'center',
  },
  brandName: { fontSize: 13, fontWeight: '700', color: neutral[900], lineHeight: 18 },
  brandDept: { fontSize: 11, color: neutral[500] },

  userSection: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: neutral[100],
  },
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: neutral[50], borderRadius: 12, padding: 8,
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: 12, fontWeight: '600', color: neutral[900] },
  userRole: { fontSize: 11, color: neutral[500], marginTop: 1 },

  navList: { paddingHorizontal: 12, paddingVertical: 12, gap: 4 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
  },
  navItemActive: { backgroundColor: primaryScale[600], ...shadows.soft, shadowColor: primaryScale[500] },
  navIcon: { flexShrink: 0 },
  navLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: neutral[600] },
  navLabelActive: { color: colors.white, fontWeight: '600' },

  logoutSection: { paddingHorizontal: 12, paddingBottom: 24 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
  },
  logoutText: { fontSize: 13, fontWeight: '500', color: colors.red[500] },
});
