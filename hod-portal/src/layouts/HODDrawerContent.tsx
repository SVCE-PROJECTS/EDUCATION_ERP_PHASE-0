import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { DrawerContentComponentProps, DrawerContentScrollView } from '@react-navigation/drawer';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Award,
  Flame,
  GraduationCap,
  CalendarClock,
  LogOut,
} from '../components/icons';
import Avatar from '../components/ui/Avatar';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { getRoleShortName } from '../utils/roleUtils';
import { ROUTES } from '../navigation/routes';
import { colors, shadows, primaryScale, neutral } from '../theme/colors';
import Toast from '../services/toast';

type IconComponent = React.ComponentType<{ size?: number; color?: string; style?: any }>;

interface NavItem {
  label: string;
  route: string;
  icon: IconComponent;
}

// ── Navigation items ──────────────────────────────────────────────────────────

const HOD_NAV: NavItem[] = [
  { label: 'Dashboard', route: ROUTES.HOD_DASHBOARD, icon: LayoutDashboard },
  { label: 'Faculty List', route: ROUTES.HOD_FACULTY, icon: Users },
  { label: 'Student List', route: ROUTES.HOD_STUDENTS, icon: BookOpen },
  { label: 'Coordinator Management', route: ROUTES.HOD_COORDINATORS, icon: Award },
  { label: 'Faculty Allocation', route: ROUTES.HOD_FACULTY_ALLOCATION, icon: CalendarClock },
  { label: 'Activities', route: ROUTES.HOD_ACTIVITIES, icon: Flame },
];

// ── Sidebar item ──────────────────────────────────────────────────────────────

interface SidebarItemProps {
  icon: IconComponent;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function SidebarItem({ icon: Icon, label, isActive, onPress }: SidebarItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.navItem, isActive && styles.navItemActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <Icon size={17} color={isActive ? colors.white : neutral[500]} style={styles.navIcon} />
      <Text style={[styles.navLabel, isActive && styles.navLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── Main drawer content ───────────────────────────────────────────────────────

export default function HODDrawerContent(props: DrawerContentComponentProps) {
  const { state, navigation: drawerNav } = props;
  const { user, logout } = useAuth();

  // Current active route name inside the drawer
  const activeRoute = state.routes[state.index]?.name;

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore network errors on logout
    } finally {
      logout();
      Toast.show({ type: 'success', text1: 'Logged out successfully' });
      // Navigation resets automatically because isAuthenticated becomes false
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* ── Brand header ───────────────────────────────────────────────── */}
      <View style={styles.brand}>
        <View style={styles.brandIcon}>
          <GraduationCap size={18} color={colors.white} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.brandName} numberOfLines={1}>
            {user?.departmentCode || 'CSE'} Department Portal
          </Text>
          <Text style={styles.brandDept} numberOfLines={1}>
            SVCE — Engineering College ERP
          </Text>
        </View>
      </View>

      {/* ── User info ───────────────────────────────────────────────────── */}
      <View style={styles.userSection}>
        <View style={styles.userCard}>
          <Avatar src={(user as any)?.photo} name={user?.name} size="sm" />
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name}
            </Text>
            <Text style={styles.userRole} numberOfLines={1}>
              {user?.isHOD ? 'HOD' : getRoleShortName(user?.roles?.[0] ?? '')}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Nav items ──────────────────────────────────────────────────── */}
      <DrawerContentScrollView
        {...props}
        scrollEnabled
        contentContainerStyle={styles.navList}
        showsVerticalScrollIndicator={false}
      >
        {HOD_NAV.map((item) => (
          <SidebarItem
            key={item.route}
            icon={item.icon}
            label={item.label}
            isActive={activeRoute === item.route}
            onPress={() => drawerNav.navigate(item.route as never)}
          />
        ))}
      </DrawerContentScrollView>

      {/* ── Logout button ───────────────────────────────────────────────── */}
      <View style={styles.logoutSection}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.75}>
          <LogOut size={16} color={colors.red[500]} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: neutral[100],
  },

  // Brand
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: neutral[100],
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: primaryScale[600],
    alignItems: 'center',
    justifyContent: 'center',
    // gradient not natively possible without expo-linear-gradient;
    // use a solid blue which matches the brand colour exactly
  },
  brandName: {
    fontSize: 13,
    fontWeight: '700',
    color: neutral[900],
    lineHeight: 18,
  },
  brandDept: {
    fontSize: 11,
    color: neutral[500],
  },

  // User card
  userSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: neutral[100],
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: neutral[50],
    borderRadius: 12,
    padding: 8,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 12,
    fontWeight: '600',
    color: neutral[900],
  },
  userRole: {
    fontSize: 11,
    color: neutral[500],
    marginTop: 1,
  },

  // Nav
  navList: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: primaryScale[600],
    ...shadows.soft,
    shadowColor: primaryScale[500],
  },
  navIcon: {
    flexShrink: 0,
  },
  navLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: neutral[600],
  },
  navLabelActive: {
    color: colors.white,
    fontWeight: '600',
  },

  // Logout
  logoutSection: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.red[500],
  },
});
