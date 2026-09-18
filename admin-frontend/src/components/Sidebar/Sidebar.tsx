
// @ts-nocheck

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Text, Avatar, Icon } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../theme';

// Update this path to match the location of your logo file.
import collegeLogo from '../../assets/images/college-logo.png';

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
    screen: 'AddStudent',
  },
  {
    key: 'SearchStudent',
    label: 'Search Student',
    icon: 'magnify',
    screen: 'SearchStudent',
  },
  {
    key: 'TransferStudent',
    label: 'Transfer Student',
    icon: 'swap-horizontal',
    screen: 'TransferStudent',
  },
  {
    key: 'ExportStudentData',
    label: 'Export Student Data',
    icon: 'tray-arrow-down',
    screen: 'ExportStudentData',
  },
  {
    key: 'Fee',
    label: 'Fee',
    icon: 'cash-multiple',
    screen: 'Fee',
  },
];

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

      
      {/* Brand */}
      <View style={styles.brand}>

        <Image
          source={collegeLogo}
          style={styles.collegeLogo}
          resizeMode="contain"
          accessibilityLabel="College logo"
        />

        <Text style={styles.brandTitle}>
          SVCE EDUCATION ERP
        </Text>

        <Text style={styles.brandSubtitle}>
          Academic Management
        </Text>

      </View>



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
              <Icon
                source={item.icon}
                size={20}
                color={
                  active
                    ? colors.primary
                    : colors.textSecondary
                }
              />

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
        <Avatar.Text
          size={36}
          label={initials}
          style={{
            backgroundColor: colors.primaryLight,
          }}
          color={colors.primary}
        />

        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {user?.fullName ||
              user?.username ||
              'Administrator'}
          </Text>

          <Text style={styles.profileRole}>
            {user?.role === 'admin'
              ? 'Super Admin'
              : user?.role || ''}
          </Text>
        </View>

        <TouchableOpacity
          onPress={logout}
          accessibilityLabel="Log out"
          activeOpacity={0.7}
        >
          <Icon
            source="logout"
            size={20}
            color={colors.textSecondary}
          />
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
    alignItems: 'center',
  },

  collegeLogo: {
    width: 240,
    height: 70,
    marginBottom: spacing.md,
    alignSelf: 'center',
  },

  brandTitle: {
    ...typography.h2,
    color: colors.primary,
    textAlign: 'center',
  },

  brandSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  nav: {
    flex: 1,
  },

  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: spacing.md,
  },

  navLabelActive: {
    color: colors.primary,
  },

  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  profileInfo: {
    marginLeft: spacing.sm,
    flex: 1,
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

