/**
 * ScreenLayout — full-screen layout with a top header bar.
 *
 * Header contains:
 *   ☰  Hamburger button  (opens the drawer sidebar)
 *   Screen title          (derived from activeScreen)
 *   Right slot            (optional, passed as prop)
 *
 * The Sidebar is a Modal overlay — it does not steal horizontal space,
 * so every screen gets the full phone width for its content.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Sidebar from './Sidebar';
import { colors, spacing, typography } from '../theme';
import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';

type Nav = NavigationProp<RootStackParamList>;

const SCREEN_TITLES: Partial<Record<keyof RootStackParamList, string>> = {
  Dashboard:   'Dashboard',
  Attendance:  'Attendance',
  IAMarks:     'IA Marks',
  Assignments: 'Assignments',
  Students:    'Students',
  Timetable:   'Timetable',
  AIChecker:   'AI Checker',
  Profile:     'My Profile',
};

interface Props {
  navigation: Nav;
  activeScreen: keyof RootStackParamList;
  children: React.ReactNode;
  /** Optional element rendered on the right side of the header */
  headerRight?: React.ReactNode;
}

const ScreenLayout: React.FC<Props> = ({
  navigation,
  activeScreen,
  children,
  headerRight,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar backgroundColor={colors.primary} barStyle="light-content" />

      {/* ── Top header bar ───────────────────────────────────── */}
      <View style={styles.header}>
        {/* Hamburger */}
        <TouchableOpacity
          style={styles.hamburger}
          onPress={() => setDrawerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={styles.bar} />
          <View style={[styles.bar, styles.barMid]} />
          <View style={styles.bar} />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.headerTitle} numberOfLines={1}>
          {SCREEN_TITLES[activeScreen] ?? String(activeScreen)}
        </Text>

        {/* Right slot (optional) */}
        <View style={styles.headerRight}>
          {headerRight ?? null}
        </View>
      </View>

      {/* ── Content ──────────────────────────────────────────── */}
      <View style={styles.content}>{children}</View>

      {/* ── Drawer sidebar (modal overlay) ───────────────────── */}
      <Sidebar
        navigation={navigation}
        activeScreen={activeScreen}
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  hamburger: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    gap: 5,
  },
  bar: {
    height: 2,
    backgroundColor: colors.white,
    borderRadius: 2,
    width: 22,
  },
  barMid: {
    width: 16,
  },
  headerTitle: {
    ...typography.h4,
    color: colors.white,
    flex: 1,
    marginLeft: spacing.md,
  },
  headerRight: {
    width: 36,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default ScreenLayout;
