import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { DrawerContentComponentProps, DrawerContentScrollView } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Award,
  Flame,
  GraduationCap,
  CalendarClock,
  History,
  LogOut,
  Sun,
  Moon,
} from '../../components/hod/icons';
import Avatar from '../../components/hod/ui/Avatar';
import { useAuth } from '../../context/hod/AuthContext';
import { useTheme } from '../../context/hod/ThemeContext';
import { authService } from '../../services/hod/auth.service';
import { resolveFileUrl } from '../../services/hod/api';
import { getRoleShortName } from '../../utils/hod/roleUtils';
import { ROUTES } from '../../navigation/hod/routes';
import { colors, ThemeColors, shadows } from '../../theme/hod/colors';
import Toast from '../../services/hod/toast';
import { unifiedLogoutRef } from '../../context/AuthContext';

type IconComponent = React.ComponentType<{ size?: number; color?: string; style?: any }>;

interface NavItem {
  label: string;
  route: string;
  icon: IconComponent;
}

// -- Navigation items ---------------------------------------------------------

const HOD_NAV: NavItem[] = [
  { label: 'Dashboard', route: ROUTES.HOD_DASHBOARD, icon: LayoutDashboard },
  { label: 'Faculty List', route: ROUTES.HOD_FACULTY, icon: Users },
  { label: 'Student List', route: ROUTES.HOD_STUDENTS, icon: BookOpen },
  { label: 'Coordinator Management', route: ROUTES.HOD_COORDINATORS, icon: Award },
  { label: 'Faculty Allocation', route: ROUTES.HOD_FACULTY_ALLOCATION, icon: CalendarClock },
  { label: 'Activities', route: ROUTES.HOD_ACTIVITIES, icon: Flame },
  { label: 'Activity Log', route: ROUTES.HOD_ACTIVITY_LOG, icon: History },
];

// -- Sidebar item -------------------------------------------------------------

interface SidebarItemProps {
  icon: IconComponent;
  label: string;
  isActive: boolean;
  onPress: () => void;
  theme: ThemeColors;
  styles: ReturnType<typeof getStyles>;
}

function SidebarItem({ icon: Icon, label, isActive, onPress, theme, styles }: SidebarItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.navItem, isActive && styles.navItemActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
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

// -- Main drawer content ------------------------------------------------------

export default function HODDrawerContent(props: DrawerContentComponentProps) {
  const { state, navigation: drawerNav } = props;
  const { user, logout } = useAuth();
  const { colors: theme, isDark, toggleDark } = useTheme();
  const styles = getStyles(theme);

  const activeRoute = state.routes[state.index]?.name;

  const handleLogout = async () => {
    await unifiedLogoutRef.current?.();
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* -- Brand header: gradient hero panel, tap to jump home ------------- */}
      <TouchableOpacity
        onPress={() => drawerNav.navigate(ROUTES.HOD_DASHBOARD as never)}
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
          <Text style={styles.brandName} numberOfLines={1}>
            {user?.departmentCode || 'CSE'} Department Portal
          </Text>
          <Text style={styles.brandDept} numberOfLines={1}>
            SVCE — Engineering College ERP
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* -- Nav items -------------------------------------------------------- */}
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
            theme={theme}
            styles={styles}
          />
        ))}
      </DrawerContentScrollView>

      {/* -- Profile + Theme + Sign out row — mirrors admin sidebar --------- */}
      <View style={styles.profileRow}>
        {/* Avatar + name — tap to view profile */}
        <TouchableOpacity
          style={styles.profileInfo}
          onPress={() => drawerNav.navigate(ROUTES.FACULTY_PROFILE as never, { id: user?.id } as never)}
          activeOpacity={0.75}
        >
          <Avatar src={resolveFileUrl(user?.photoUrl)} name={user?.name} size="sm" />
          <View style={styles.profileText}>
            <Text style={styles.profileName} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.profileRole} numberOfLines={1}>
              {user?.isHOD ? 'HOD' : getRoleShortName(user?.roles?.[0] ?? '')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Theme toggle */}
        <TouchableOpacity onPress={toggleDark} style={styles.iconBtn} activeOpacity={0.7}
          accessibilityLabel="Toggle dark mode">
          {isDark ? <Sun size={16} color={theme.textSecondary} /> : <Moon size={16} color={theme.textSecondary} />}
        </TouchableOpacity>

        {/* Sign out */}
        <TouchableOpacity onPress={handleLogout} style={styles.signOutBtn} activeOpacity={0.7}
          accessibilityLabel="Sign out">
          <LogOut size={17} color={colors.red[500]} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// -- Styles -------------------------------------------------------------------

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRightWidth: 1,
    borderRightColor: theme.border,
  },

  // Brand
  brand: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.3,
  },
  brandDept: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // User card
  userSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.primarySoft,
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
    color: theme.textPrimary,
  },
  userRole: {
    fontSize: 11,
    color: theme.textSecondary,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: theme.primarySoft,
  },
  navIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  navIconWrapActive: {
    backgroundColor: theme.surface,
    ...shadows.soft,
  },
  navLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  navLabelActive: {
    color: theme.primary,
    fontWeight: '700',
  },

  // Profile + theme + signout row (bottom, mirrors admin sidebar)
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    padding: 10,
    borderRadius: 14,
    backgroundColor: theme.primarySoft,
    gap: 6,
  },
  profileInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 12, fontWeight: '600', color: theme.textPrimary },
  profileRole: { fontSize: 11, color: theme.textSecondary, marginTop: 1 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.border,
  },
  signOutBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.red[50],
    borderWidth: 1, borderColor: colors.red[100],
  },
});