// @ts-nocheck
import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import ScreenLayout from '../../navigation/ScreenLayout';
import { useDashboard } from '../../hooks/useDashboard';
import { colors, spacing, typography, radius } from '../../theme';

const CHART_COLORS = {
  primary: '#2563EB',
  secondary: '#0F766E',
  accent: '#7C3AED',
  warning: '#D97706',
  muted: '#CBD5E1',
};

const StatCard = ({ icon, label, value, hint }) => (
  <View style={styles.statCard}>
    <View style={styles.statIcon}>
      <Icon source={icon} size={20} color={colors.primary} />
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statHint}>{hint}</Text>
  </View>
);

const BarChart = ({ data }) => {
  const max = Math.max(...data.map((item) => item.value), 1);
  return (
    <View style={styles.barChart}>
      <View style={styles.barPlot}>
        {data.map((item) => (
          <View key={item.label} style={styles.barColumn}>
            <Text style={styles.barValue}>{item.value}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { height: `${Math.max((item.value / max) * 100, item.value ? 8 : 0)}%` }]} />
            </View>
            <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const PieChart = ({ transferred, active }) => {
  const total = transferred + active;
  const transferredPercent = total ? Math.round((transferred / total) * 100) : 0;
  const activePercent = 100 - transferredPercent;
  const pieStyle = Platform.OS === 'web'
    ? { background: `conic-gradient(${CHART_COLORS.accent} 0% ${transferredPercent}%, ${CHART_COLORS.secondary} ${transferredPercent}% 100%)` }
    : {};
  const nativePieAngle = Math.min(transferredPercent, 100) * 3.6;
  const nativeOverlay = transferredPercent <= 50
    ? { backgroundColor: CHART_COLORS.accent, transform: [{ rotate: `${nativePieAngle}deg` }] }
    : { backgroundColor: CHART_COLORS.secondary, transform: [{ rotate: `${nativePieAngle - 180}deg` }] };

  return (
    <View style={styles.pieWrap}>
      <View style={[styles.pie, pieStyle]}>
        {Platform.OS !== 'web' && transferredPercent > 0 && transferredPercent < 100 && (
          <View style={[styles.nativePieHalf, nativeOverlay]} />
        )}
        {Platform.OS !== 'web' && transferredPercent === 100 && (
          <View style={[styles.nativePieFull, { backgroundColor: CHART_COLORS.accent }]} />
        )}
        <View style={styles.pieCenter}>
          <Text style={styles.pieCenterValue}>{total}</Text>
          <Text style={styles.pieCenterLabel}>Students</Text>
        </View>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: CHART_COLORS.secondary }]} />
          <Text style={styles.legendLabel}>Active</Text>
          <Text style={styles.legendValue}>{activePercent}%</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: CHART_COLORS.accent }]} />
          <Text style={styles.legendLabel}>Transferred</Text>
          <Text style={styles.legendValue}>{transferredPercent}%</Text>
        </View>
      </View>
    </View>
  );
};

const DashboardScreen = ({ navigation }) => {
  const { data, isLoading, isError, error } = useDashboard();
  const dashboard = data || {};
  const totalStudents = Number(dashboard.totalStudents || 0);

  const departmentData = useMemo(
    () => Array.isArray(dashboard.departmentCounts)
      ? dashboard.departmentCounts
          .map((item) => ({
            label: String(item.label || 'Unassigned'),
            value: Number(item.value || 0),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 7)
      : [],
    [dashboard.departmentCounts],
  );

  const transferred = Number(dashboard.transferredStudents || 0);
  const transferData = useMemo(
    () => ({ transferred, active: Math.max(totalStudents - transferred, 0) }),
    [totalStudents, transferred],
  );

  return (
    <ScreenLayout navigation={navigation} activeScreen="Dashboard">
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>Overview of student registry and transfer activity</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon="account-group-outline" label="Registered Students" value={isLoading ? '—' : totalStudents} hint="Current registry" />
          <StatCard icon="swap-horizontal" label="Transferred Students" value={isLoading ? '—' : transferData.transferred} hint="Marked as transferred" />
          <StatCard icon="domain" label="Departments" value={isLoading ? '—' : departmentData.length} hint="Departments represented" />
        </View>

        <View style={styles.chartGrid}>
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Student Registry</Text>
                <Text style={styles.chartSubtitle}>Students by department</Text>
              </View>
              <Icon source="chart-bar" size={22} color={CHART_COLORS.primary} />
            </View>
            {departmentData.length ? <BarChart data={departmentData} /> : <Text style={styles.emptyChart}>{isError ? (error?.message || 'Unable to load dashboard data.') : 'No student registry data available.'}</Text>}
          </View>

          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Student Transfer</Text>
                <Text style={styles.chartSubtitle}>Current transfer distribution</Text>
              </View>
              <Icon source="chart-donut" size={22} color={CHART_COLORS.accent} />
            </View>
            <PieChart transferred={transferData.transferred} active={transferData.active} />
          </View>
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.xl },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
  statCard: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 200,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  statIcon: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  statValue: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.xs },
  statHint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  chartGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  chartCard: { flex: 1, minWidth: 360, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, minHeight: 360 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  chartTitle: { ...typography.h3, color: colors.textPrimary },
  chartSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
  barChart: { flex: 1, minHeight: 270, justifyContent: 'flex-end' },
  barPlot: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: colors.border, paddingTop: spacing.lg },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minWidth: 38, height: '100%' },
  barValue: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  barTrack: { width: '55%', maxWidth: 42, height: '72%', justifyContent: 'flex-end', backgroundColor: '#F1F5F9', borderRadius: radius.sm, overflow: 'hidden' },
  bar: { width: '100%', backgroundColor: CHART_COLORS.primary, borderRadius: radius.sm },
  barLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm, maxWidth: 72, textAlign: 'center' },
  pieWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
  pie: { width: 190, height: 190, borderRadius: 95, alignItems: 'center', justifyContent: 'center', backgroundColor: CHART_COLORS.muted },
  pieCenter: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pieCenterValue: { ...typography.h2, color: colors.textPrimary },
  pieCenterLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  nativePieHalf: { position: 'absolute', width: 95, height: 190, right: 0, top: 0, borderTopRightRadius: 95, borderBottomRightRadius: 95, transformOrigin: 'left center' },
  nativePieFull: { ...StyleSheet.absoluteFillObject, borderRadius: 95 },
  legend: { width: '100%', maxWidth: 270, marginTop: spacing.lg, gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  legendDot: { width: 9, height: 9, borderRadius: 5, marginRight: spacing.sm },
  legendLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  legendValue: { ...typography.bodyBold, color: colors.textPrimary },
  emptyChart: { ...typography.body, color: colors.textMuted, flex: 1, alignItems: 'center', justifyContent: 'center', textAlign: 'center', paddingVertical: spacing.xxl },
});

export default DashboardScreen;
