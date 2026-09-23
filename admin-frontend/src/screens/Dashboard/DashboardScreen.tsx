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
  yearColors: ['#2563EB', '#0F766E', '#D97706', '#DC2626', '#7C3AED'],
};

const DEPT_ABBR = {
  'Computer Science and Engineering': 'CSE',
  'Computer Science and Engineering - AI': 'CSE-AI',
  'Computer Science and Engineering - Data Science': 'CSE-DS',
  'Computer Science and Engineering - Cyber Security': 'CSE-CY',
  'Information Science and Engineering': 'ISE',
  'Electronics and Communication Engineering': 'ECE',
  'Civil Engineering': 'CIVIL',
  'Mechanical Engineering': 'MECH',
};

const getAbbr = (label) =>
  DEPT_ABBR[label] || label.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 6);

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

// Bar chart showing students per dept, with year breakdown as stacked tooltip
const BarChart = ({ data, deptByYear }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const [hoveredIndex, setHoveredIndex] = React.useState(null);

  return (
    <View style={styles.barChart}>
      <View style={styles.barPlot}>
        {data.map((item, index) => {
          const yearData = deptByYear?.[item.label] || {};
          const yearEntries = Object.entries(yearData).sort();
          return (
            <View key={item.label} style={styles.barColumn}>
              <Text style={styles.barValue}>{item.value}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: `${Math.max((item.value / max) * 100, item.value ? 8 : 0)}%` }]} />
              </View>
              <View style={styles.barLabelWrap}>
                <Text style={styles.barLabel} numberOfLines={1}>{getAbbr(item.label)}</Text>
                <View
                  style={styles.tooltipTrigger}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <Text style={styles.tooltipIcon}>▲</Text>
                  {hoveredIndex === index && (
                    <View style={styles.tooltip}>
                      <Text style={styles.tooltipDeptName}>{item.label}</Text>
                      {yearEntries.length > 0 && (
                        <View style={styles.tooltipYears}>
                          {yearEntries.map(([year, count]) => (
                            <Text key={year} style={styles.tooltipYearRow}>
                              {year}: {count} students
                            </Text>
                          ))}
                        </View>
                      )}
                      <Text style={styles.tooltipTotal}>Total: {item.value}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}
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

  return (
    <View style={styles.pieWrap}>
      <View style={[styles.pie, pieStyle]}>
        <View style={styles.pieCenter}>
          <Text style={styles.pieCenterValue}>{total}</Text>
          <Text style={styles.pieCenterLabel}>Students</Text>
        </View>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: CHART_COLORS.secondary }]} />
          <Text style={styles.legendLabel}>Active</Text>
          <Text style={styles.legendValue}>{active} ({activePercent}%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: CHART_COLORS.accent }]} />
          <Text style={styles.legendLabel}>Transferred</Text>
          <Text style={styles.legendValue}>{transferred} ({transferredPercent}%)</Text>
        </View>
      </View>
    </View>
  );
};

const DashboardScreen = ({ navigation }) => {
  const { data, isLoading, isError, error } = useDashboard();
  const dashboard = data || {};
  const totalStudents = Number(dashboard.totalStudents || 0);

  const departmentData = useMemo(() => {
    const counts = dashboard.departmentCounts;
    if (!Array.isArray(counts) || counts.length === 0) return [];
    return counts
      .map(item => ({ label: String(item.label || 'Unassigned'), value: Number(item.value || 0) }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [dashboard.departmentCounts]);

  const transferred = Number(dashboard.transferredStudents || 0);
  const transferData = useMemo(
    () => ({ transferred, active: Math.max(totalStudents - transferred, 0) }),
    [totalStudents, transferred],
  );

  return (
    <ScreenLayout navigation={navigation} activeScreen="Dashboard">
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>Overview of student registry and transfer activity</Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon="account-group-outline" label="Registered Students" value={isLoading ? '—' : totalStudents} hint="Current registry" />
          <StatCard icon="swap-horizontal" label="Transferred Students" value={isLoading ? '—' : transferData.transferred} hint="Marked as transferred" />
          <StatCard icon="domain" label="Departments" value={isLoading ? '—' : departmentData.length} hint="Departments represented" />
        </View>

        <View style={styles.chartGrid}>
          {/* Bar Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Student Registry</Text>
                <Text style={styles.chartSubtitle}>Students by department · hover ▲ for year breakdown</Text>
              </View>
              <Icon source="chart-bar" size={22} color={CHART_COLORS.primary} />
            </View>
            {departmentData.length
              ? <BarChart data={departmentData} deptByYear={dashboard.departmentByYear} />
              : <Text style={styles.emptyChart}>{isError ? (error?.message || 'Unable to load data.') : 'No student registry data available.'}</Text>}
          </View>

          {/* Donut Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Student Transfer</Text>
                <Text style={styles.chartSubtitle}>Active vs transferred distribution</Text>
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
    flexGrow: 1, flexBasis: 220, minWidth: 200,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.lg,
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
  barLabelWrap: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  barLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm, maxWidth: 72, textAlign: 'center' },
  tooltipTrigger: { position: 'relative', alignItems: 'center' },
  tooltipIcon: { fontSize: 8, color: colors.textMuted, marginTop: 2 },
  tooltip: { position: 'absolute', bottom: 18, backgroundColor: '#1e293b', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, zIndex: 99, minWidth: 180, maxWidth: 240 },
  tooltipDeptName: { color: '#fff', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  tooltipYears: { gap: 2 },
  tooltipYearRow: { color: '#94a3b8', fontSize: 10 },
  tooltipTotal: { color: '#e2e8f0', fontSize: 11, fontWeight: '600', marginTop: 4, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 4 },
  pieWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
  pie: { width: 190, height: 190, borderRadius: 95, alignItems: 'center', justifyContent: 'center', backgroundColor: CHART_COLORS.muted },
  pieCenter: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pieCenterValue: { ...typography.h2, color: colors.textPrimary },
  pieCenterLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  legend: { width: '100%', maxWidth: 270, marginTop: spacing.lg, gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  legendDot: { width: 9, height: 9, borderRadius: 5, marginRight: spacing.sm },
  legendLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  legendValue: { ...typography.bodyBold, color: colors.textPrimary },
  emptyChart: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xxl },
});

export default DashboardScreen;
