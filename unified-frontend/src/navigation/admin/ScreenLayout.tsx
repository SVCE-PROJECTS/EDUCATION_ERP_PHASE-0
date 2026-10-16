// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import Sidebar from '../../components/Sidebar/Sidebar';
import { useTheme } from '../../context/admin/ThemeContext';
import { spacing, radius, typography } from '../../theme';

// Keep in sync with Sidebar.tsx's NAV_ITEMS labels.
const SCREEN_TITLES = {
  Dashboard: 'Dashboard',
  Registry: 'Registry',
  MeetingManagement: 'Meeting Management',
  TransferStudent: 'Transfer Student',
  Fee: 'Fee Management',
  Analytics: 'Analytics',
  MyProfile: 'My Profile',
  ActivityLog: 'Activity Log',
  AdminUsers: 'Admin Users',
  Settings: 'Settings',
  MySchedules: 'My Schedules',
};

const BREAKPOINT = 768;

// Wrap any screen's content with this to get the persistent left sidebar.
// activeScreen must match one of the route names in AppNavigator so the
// matching nav item highlights correctly.
//
// Below the BREAKPOINT the sidebar isn't shown inline (it would otherwise
// permanently eat into the content area on a phone/narrow window) — instead
// it slides in as an overlay, opened via a hamburger button, matching how
// the HOD/Faculty drawers behave at the same width.
const ScreenLayout = ({ navigation, activeScreen, children }) => {
  // Dashboard is home — every other screen gets a pill that jumps straight
  // back to it, regardless of how deep the sidebar navigation got.
  const showBack = activeScreen !== 'Dashboard';
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= BREAKPOINT;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <View style={styles.row}>
      {isLargeScreen ? (
        <Sidebar navigation={navigation} activeScreen={activeScreen} />
      ) : (
        sidebarOpen && (
          <View style={styles.overlayRoot}>
            <TouchableOpacity
              style={styles.backdrop}
              activeOpacity={1}
              onPress={() => setSidebarOpen(false)}
              accessibilityLabel="Close menu"
            />
            <Sidebar
              navigation={navigation}
              activeScreen={activeScreen}
              onNavigate={() => setSidebarOpen(false)}
            />
          </View>
        )
      )}
      <View style={styles.main}>
        {!isLargeScreen && (
          <View style={styles.mobileBar}>
            <TouchableOpacity
              onPress={() => setSidebarOpen(true)}
              style={styles.menuBtn}
              accessibilityLabel="Open menu"
            >
              <Icon source="menu" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.mobileTitle} numberOfLines={1}>
              {SCREEN_TITLES[activeScreen] || activeScreen}
            </Text>
          </View>
        )}
        {/* On the Dashboard itself, the greeting banner inside the page
            content already carries the page's identity — a "Dashboard"
            title here would just duplicate it above the greeting instead
            of letting the greeting lead. Every other screen keeps its
            title bar as before. */}
        {activeScreen !== 'Dashboard' && (
          <View style={styles.toolbar}>
            <View style={styles.toolbarLeft}>
              {showBack && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('Dashboard')}
                  style={styles.backRow}
                  accessibilityLabel="Back to Dashboard"
                >
                  <Icon source="arrow-left" size={18} color={colors.primary} />
                  <Text style={styles.backText}>Back to Dashboard</Text>
                </TouchableOpacity>
              )}
              {isLargeScreen && (
                <Text style={styles.screenTitle}>{SCREEN_TITLES[activeScreen] || activeScreen}</Text>
              )}
            </View>
          </View>
        )}
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  main: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: colors.background,
  },
  overlayRoot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    zIndex: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  mobileBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  menuBtn: {
    padding: 4,
  },
  mobileTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    zIndex: 10,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  screenTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  backText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  content: {
    flex: 1,
  },
});

export default ScreenLayout;
