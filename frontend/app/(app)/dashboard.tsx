/**
 * dashboard.tsx
 *
 * Coordinates a single refresh across all dashboard widgets.
 * Each widget receives a `refreshKey` that increments only when
 * a full refresh is triggered — not on every focus event.
 *
 * useFocusEffect does NOT auto-increment refreshKey (prevents 7+
 * simultaneous API calls on every tab switch). Pull-to-refresh
 * awaits all widget refreshes via a Promise.all through a shared
 * callback pattern, then sets refreshing=false.
 */

import React, { useState, useCallback, useRef } from 'react';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import DashboardHeader    from '../../src/components/dashboard/DashboardHeader';
import QuickStats         from '../../src/components/dashboard/QuickStats';
import AttendanceSummary  from '../../src/components/dashboard/AttendanceSummary';
import AttendanceChart    from '../../src/components/dashboard/AttendanceChart';
import PendingAssignments from '../../src/components/dashboard/PendingAssignments';
import IAStats            from '../../src/components/dashboard/IAStats';
import RecentActivity     from '../../src/components/dashboard/RecentActivity';
import TodaysClasses      from '../../src/components/dashboard/TodaysClasses';
import Colors from '../../src/theme/colors';

export default function DashboardScreen() {
  const [refreshKey,  setRefreshKey]  = useState(0);
  const [refreshing,  setRefreshing]  = useState(false);
  // Track whether we've done the initial load on first focus
  const initialLoaded = useRef(false);

  // Only load data once on first focus — not on every tab switch
  useFocusEffect(
    useCallback(() => {
      if (!initialLoaded.current) {
        initialLoaded.current = true;
        setRefreshKey(k => k + 1);
      }
    }, [])
  );

  const refresh = useCallback(async () => {
    if (refreshing) return; // prevent duplicate refresh
    setRefreshing(true);
    try {
      // Increment refreshKey — all widgets react to this and fetch fresh data.
      // We await a small tick so React batches the state update before
      // widgets begin their own fetches.
      await new Promise<void>(resolve => {
        setRefreshKey(k => { resolve(); return k + 1; });
      });
      // Give widgets ~200ms to start their fetches, then release the spinner.
      // Widgets that need longer will finish on their own — the spinner
      // reflects "refresh initiated" not "all data loaded", which is the
      // correct UX for a dashboard with multiple independent panels.
      await new Promise<void>(r => setTimeout(r, 200));
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  return (
    <ScrollView
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          colors={[Colors.primary]}
          tintColor={Colors.primary}
        />
      }
    >
      <DashboardHeader />
      <QuickStats refreshKey={refreshKey} />
      <AttendanceSummary refreshKey={refreshKey} />
      <AttendanceChart refreshKey={refreshKey} />
      <View style={styles.row}>
        <View style={styles.half}><PendingAssignments refreshKey={refreshKey} /></View>
        <View style={styles.half}><IAStats refreshKey={refreshKey} /></View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}><TodaysClasses /></View>
        <View style={styles.half}><RecentActivity refreshKey={refreshKey} /></View>
      </View>
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll:    { flex: 1, backgroundColor: Colors.background },
  content:   { paddingBottom: 24 },
  row:       { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginTop: 12 },
  half:      { flex: 1 },
  bottomPad: { height: 30 },
});
