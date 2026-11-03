// @ts-nocheck
import React from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';
import { Text, Icon, ActivityIndicator } from 'react-native-paper';
import ScreenLayout from '../../../navigation/admin/ScreenLayout';
import { useAnalyticsOverview } from '../../../hooks/admin/useAnalytics';
import { useAdminAttendanceSummary } from '../../../hooks/admin/useAttendanceAnalytics';
import { useTheme } from '../../../context/admin/ThemeContext';
import {
  spacing, typography, radius, shadows,
} from '../../../theme';

const PALETTE = {
  blue: '#3B82F6',
  teal: '#14B8A6',
  violet: '#A78BFA',
  amber: '#F59E0B',
  rose: '#FB7185',
  slate: '#94A3B8',
  green: '#22C55E',
};

const DONUT_COLORS = [PALETTE.blue, PALETTE.teal, PALETTE.violet, PALETTE.amber, PALETTE.rose, PALETTE.slate, PALETTE.green];

// Generic vertical bar chart — data: [{ label, value }]
const SimpleBarChart = ({ data, barColor, styles }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={styles.barPlot}>
      {data.map((item) => (
        <View key={item.label} style={styles.barColumn}>
          <Text style={styles.barValue}>{item.value}</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.bar,
                { height: `${Math.max((item.value / max) * 100, item.value ? 8 : 0)}%`, backgroundColor: barColor },
              ]}
            />
          </View>
          <Text style={styles.barLabel} numberOfLines={2}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

// Generic donut chart with legend — segments: [{ label, value, color }]
const SimpleDonut = ({ segments, centerLabel, styles }) => {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  let cumulative = 0;
  const stops = segments.map((seg) => {
    const pct = total ? (seg.value / total) * 100 : 0;
    const start = cumulative;
    cumulative += pct;
    return `${seg.color} ${start}% ${cumulative}%`;
  }).join(', ');
  const pieStyle = Platform.OS === 'web' ? { background: `conic-gradient(${stops})` } : {};

  return (
    <View style={styles.pieWrap}>
      <View style={[styles.pie, pieStyle]}>
        <View style={styles.pieCenter}>
          <Text style={styles.pieCenterValue}>{total}</Text>
          <Text style={styles.pieCenterLabel}>{centerLabel}</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {segments.map((seg) => {
          const pct = total ? Math.round((seg.value / total) * 100) : 0;
          return (
            <View key={seg.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>{seg.label}</Text>
              <Text style={styles.legendValue}>{seg.value} ({pct}%)</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const ChartCard = ({
  title, subtitle, icon, iconColor, children, styles,
}) => (
  <View style={styles.chartCard}>
    <View style={styles.chartHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.chartTitle}>{title}</Text>
        {subtitle ? <Text style={styles.chartSubtitle}>{subtitle}</Text> : null}
      </View>
      <Icon source={icon} size={22} color={iconColor} />
    </View>
    {children}
  </View>
);

const StatTile = ({ label, value, hint, styles }) => (
  <View style={styles.statTile}>
    <Text style={styles.statTileValue}>{value}</Text>
    <Text style={styles.statTileLabel}>{label}</Text>
    {hint ? <Text style={styles.statTileHint}>{hint}</Text> : null}
  </View>
);

const label = (slug) => String(slug || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const AnalyticsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { data, isLoading, isError, error } = useAnalyticsOverview();

  if (isLoading) {
    return (
      <ScreenLayout navigation={navigation} activeScreen="Analytics">
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenLayout>
    );
  }

  if (isError || !data) {
    return (
      <ScreenLayout navigation={navigation} activeScreen="Analytics">
        <View style={styles.centerContent}>
          <Text style={styles.emptyChart}>{error?.message || 'Unable to load analytics.'}</Text>
        </View>
      </ScreenLayout>
    );
  }

  const asBarData = (rows = [], toLabel = (l) => l) => rows.map((r) => ({ label: toLabel(r.label), value: r.value }));

  return (
    <ScreenLayout navigation={navigation} activeScreen="Analytics">
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Analytics</Text>
        <Text style={styles.pageSubtitle}>A read-only view across everything the registry, faculty, staff and meeting records already hold.</Text>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <StatTile styles={styles} label="Attendance Rate" value={data.academics.attendanceRate != null ? `${data.academics.attendanceRate}%` : '—'} hint={`${data.academics.attendanceSampleSize} records`} />
          <StatTile styles={styles} label="IA Marks Average" value={data.academics.iaAverage != null ? data.academics.iaAverage : '—'} />
          <StatTile styles={styles} label="Faculty Coordinating" value={data.faculty.coordinatorCoverage.withRole} hint={`of ${data.faculty.coordinatorCoverage.withRole + data.faculty.coordinatorCoverage.withoutRole} active faculty`} />
          <StatTile styles={styles} label="Total Meetings" value={data.meetings.byStatus.reduce((s, r) => s + r.value, 0)} />
        </View>

        {/* Coordinator Assignments — explicit, so admin can always see who's coordinating what */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Coordinator Assignments</Text>
            <Icon source="account-star-outline" size={20} color={PALETTE.violet} />
          </View>
          {data.coordinators.length === 0 ? (
            <Text style={styles.emptyChart}>No faculty currently hold a coordinator role.</Text>
          ) : (
            <View style={styles.coordinatorTable}>
              <View style={[styles.coordinatorRow, styles.coordinatorHeaderRow]}>
                <Text style={[styles.coordinatorCell, styles.coordinatorHeaderText, { flex: 1.4 }]}>Faculty</Text>
                <Text style={[styles.coordinatorCell, styles.coordinatorHeaderText, { flex: 1.2 }]}>Department</Text>
                <Text style={[styles.coordinatorCell, styles.coordinatorHeaderText, { flex: 1.4 }]}>Role(s)</Text>
              </View>
              {data.coordinators.map((c) => (
                <View key={c.facultyId} style={styles.coordinatorRow}>
                  <View style={{ flex: 1.4 }}>
                    <Text style={styles.coordinatorName} numberOfLines={1}>{c.name}</Text>
                    <Text style={styles.coordinatorMeta} numberOfLines={1}>{c.employeeId}</Text>
                  </View>
                  <Text style={[styles.coordinatorCell, { flex: 1.2 }]} numberOfLines={2}>{c.departmentName}</Text>
                  <View style={{ flex: 1.4, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    {c.roles.map((r) => (
                      <View key={r} style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Students */}
        <Text style={styles.groupLabel}>Students</Text>
        <View style={styles.chartGrid}>
          <ChartCard styles={styles} title="By Gender" subtitle="Current registry" icon="gender-male-female" iconColor={PALETTE.blue}>
            {data.students.byGender.length
              ? <SimpleDonut styles={styles} centerLabel="Students" segments={data.students.byGender.map((r, i) => ({ label: r.label, value: r.value, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} />
              : <Text style={styles.emptyChart}>No student data available.</Text>}
          </ChartCard>

          <ChartCard styles={styles} title="By Status" subtitle="Enrollment status" icon="chart-donut" iconColor={PALETTE.teal}>
            {data.students.byStatus.length
              ? <SimpleDonut styles={styles} centerLabel="Students" segments={data.students.byStatus.map((r, i) => ({ label: r.label, value: r.value, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} />
              : <Text style={styles.emptyChart}>No student data available.</Text>}
          </ChartCard>

          <ChartCard styles={styles} title="By Academic Year" subtitle="Intake distribution" icon="chart-bar" iconColor={PALETTE.violet}>
            {data.students.byAcademicYear.length
              ? <SimpleBarChart styles={styles} barColor={PALETTE.violet} data={asBarData(data.students.byAcademicYear)} />
              : <Text style={styles.emptyChart}>No student data available.</Text>}
          </ChartCard>

          <ChartCard styles={styles} title="By Program" subtitle="Program distribution" icon="chart-bar" iconColor={PALETTE.amber}>
            {data.students.byProgram.length
              ? <SimpleBarChart styles={styles} barColor={PALETTE.amber} data={asBarData(data.students.byProgram)} />
              : <Text style={styles.emptyChart}>No student data available.</Text>}
          </ChartCard>
        </View>

        {/* Faculty & Staff */}
        <Text style={styles.groupLabel}>Faculty & Non-Teaching Staff</Text>
        <View style={styles.chartGrid}>
          <ChartCard styles={styles} title="Faculty by Designation" icon="chart-bar" iconColor={PALETTE.blue}>
            {data.faculty.byDesignation.length
              ? <SimpleBarChart styles={styles} barColor={PALETTE.blue} data={asBarData(data.faculty.byDesignation)} />
              : <Text style={styles.emptyChart}>No faculty data available.</Text>}
          </ChartCard>

          <ChartCard styles={styles} title="Faculty by Experience" icon="chart-bar" iconColor={PALETTE.teal}>
            {data.faculty.byExperience.some((r) => r.value > 0)
              ? <SimpleBarChart styles={styles} barColor={PALETTE.teal} data={asBarData(data.faculty.byExperience)} />
              : <Text style={styles.emptyChart}>No faculty data available.</Text>}
          </ChartCard>

          <ChartCard styles={styles} title="Coordinator Coverage" subtitle="Share of faculty coordinating something" icon="chart-donut" iconColor={PALETTE.rose}>
            <SimpleDonut
              styles={styles}
              centerLabel="Faculty"
              segments={[
                { label: 'Coordinating', value: data.faculty.coordinatorCoverage.withRole, color: PALETTE.rose },
                { label: 'Not coordinating', value: data.faculty.coordinatorCoverage.withoutRole, color: PALETTE.slate },
              ]}
            />
          </ChartCard>

          <ChartCard styles={styles} title="Non-Teaching Staff by Designation" icon="chart-bar" iconColor={PALETTE.amber}>
            {data.nonTeachingStaff.byDesignation.length
              ? <SimpleBarChart styles={styles} barColor={PALETTE.amber} data={asBarData(data.nonTeachingStaff.byDesignation)} />
              : <Text style={styles.emptyChart}>No non-teaching staff data available.</Text>}
          </ChartCard>
        </View>

        {/* Meetings */}
        <Text style={styles.groupLabel}>Meeting Activity</Text>
        <View style={styles.chartGrid}>
          <ChartCard styles={styles} title="By Status" icon="chart-bar" iconColor={PALETTE.blue}>
            {data.meetings.byStatus.length
              ? <SimpleBarChart styles={styles} barColor={PALETTE.blue} data={asBarData(data.meetings.byStatus, label)} />
              : <Text style={styles.emptyChart}>No meeting data available.</Text>}
          </ChartCard>

          <ChartCard styles={styles} title="Online vs Offline" icon="chart-donut" iconColor={PALETTE.teal}>
            {data.meetings.byType.length
              ? <SimpleDonut styles={styles} centerLabel="Meetings" segments={data.meetings.byType.map((r, i) => ({ label: label(r.label), value: r.value, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} />
              : <Text style={styles.emptyChart}>No meeting data available.</Text>}
          </ChartCard>

          <ChartCard styles={styles} title="By Department" icon="chart-bar" iconColor={PALETTE.violet}>
            {data.meetings.byDepartment.length
              ? <SimpleBarChart styles={styles} barColor={PALETTE.violet} data={asBarData(data.meetings.byDepartment)} />
              : <Text style={styles.emptyChart}>No meeting data available.</Text>}
          </ChartCard>

          <ChartCard styles={styles} title="Participant Responses" subtitle="Availability replies across all meetings" icon="chart-donut" iconColor={PALETTE.amber}>
            {data.meetings.participantResponses.length
              ? <SimpleDonut styles={styles} centerLabel="Replies" segments={data.meetings.participantResponses.map((r, i) => ({ label: label(r.label), value: r.value, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} />
              : <Text style={styles.emptyChart}>No participant data available.</Text>}
          </ChartCard>
        </View>

        {/* ── Attendance Intelligence (DuckDB) ──────────────────────────── */}
        <View style={styles.sectionDivider} />
        <AdminAttendanceIntelligence styles={styles} />

      </ScrollView>
    </ScreenLayout>
  );
};

// ── Admin Attendance Intelligence component ───────────────────────────────────

function AdminAttendanceIntelligence({ styles: s }) {
  const { data, isLoading, isError, error } = useAdminAttendanceSummary();

  const freshnessBadge = () => {
    if (!data?.freshness) return null;
    const f     = data.freshness;
    const stale = f.stale || !f.analyticsAvailable;
    const label = f.lastSuccessfulRefreshAt
      ? `Refreshed ${new Date(f.lastSuccessfulRefreshAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'Never refreshed';
    return (
      <View style={[s.freshnessBadge, stale ? s.freshnessBadgeStale : s.freshnessBadgeFresh]}>
        <Text style={[s.freshnessText, { color: stale ? '#CA8A04' : '#16A34A' }]}>
          {f.analyticsAvailable ? label : 'Analytics offline'}
          {stale && f.analyticsAvailable ? ' · Stale' : ''}
        </Text>
      </View>
    );
  };

  const content = () => {
    if (isLoading) return <ActivityIndicator animating size="small" style={{ marginVertical: 16 }} />;

    if (isError) {
      const is503 = (error as any)?.status === 503 || (error as any)?.response?.status === 503;
      return (
        <View style={s.unavailableBox}>
          <Text style={s.unavailableTitle}>{is503 ? '📊 Analytics Offline' : '⚠️ Unavailable'}</Text>
          <Text style={s.unavailableBody}>
            {is503
              ? 'Attendance analytics are temporarily unavailable. All other features work normally.'
              : (error as any)?.message || 'Unable to load analytics.'}
          </Text>
        </View>
      );
    }

    if (!data || data.overall.recordedSessions === 0) {
      return <Text style={s.emptyChart}>No attendance data in the analytics snapshot for this period.</Text>;
    }

    const { overall, departments } = data;
    const pct = overall.attendancePercentage;

    return (
      <>
        {/* Institution-level tiles */}
        <View style={s.intelStatsRow}>
          <View style={s.intelTile}>
            <Text style={s.intelTileValue}>{pct !== null ? `${pct.toFixed(1)}%` : '—'}</Text>
            <Text style={s.intelTileLabel}>Institution Attendance</Text>
            <Text style={s.intelTileHint}>{overall.recordedSessions.toLocaleString()} sessions recorded</Text>
          </View>
          <View style={s.intelTile}>
            <Text style={s.intelTileValue}>{overall.presentSessions.toLocaleString()}</Text>
            <Text style={s.intelTileLabel}>Present (total)</Text>
          </View>
          <View style={s.intelTile}>
            <Text style={s.intelTileValue}>{departments.length}</Text>
            <Text style={s.intelTileLabel}>Departments</Text>
          </View>
        </View>

        {/* Per-department breakdown */}
        <Text style={s.intelSubLabel}>By department</Text>
        {departments.map((dept) => {
          const dpct = dept.attendancePercentage;
          const color = dpct === null ? '#94A3B8'
            : dpct < 60 ? '#DC2626'
            : dpct < 75 ? '#CA8A04'
            : '#16A34A';
          const bg = dpct === null ? '#F1F5F9'
            : dpct < 60 ? '#FEE2E2'
            : dpct < 75 ? '#FEF9C3'
            : '#DCFCE7';
          return (
            <View key={dept.departmentId} style={s.deptRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.deptRowId}>Department #{dept.departmentId}</Text>
                <Text style={s.deptRowDetail}>
                  {dept.distinctStudents} students · {dept.distinctClasses} classes · {dept.recordedSessions} sessions
                </Text>
              </View>
              <View style={[s.deptBand, { backgroundColor: bg }]}>
                <Text style={[s.deptBandText, { color }]}>
                  {dpct !== null ? `${dpct.toFixed(1)}%` : '—'}
                </Text>
              </View>
            </View>
          );
        })}

        <Text style={s.intelDisclaimer}>
          Colours: red &lt;60% · amber &lt;75% · green ≥75%. Demo thresholds — not official policy.
          Data reflects the last analytics snapshot shown above.
        </Text>
      </>
    );
  };

  return (
    <View style={{ marginBottom: spacing.xl }}>
      <View style={s.intelHeader}>
        <Text style={s.intelTitle}>Attendance Intelligence</Text>
        {freshnessBadge()}
      </View>
      <Text style={s.intelSubtitle}>
        Institution-wide attendance aggregated from the DuckDB analytics snapshot.
      </Text>
      {content()}
    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  pageTitle: { ...typography.h1, color: colors.textPrimary },
  pageSubtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg, maxWidth: 640 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  statTile: {
    flex: 1, minWidth: 160, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg, ...shadows.soft,
  },
  statTileValue: { ...typography.h2, color: colors.textPrimary },
  statTileLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  statTileHint: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  sectionCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.lg, ...shadows.soft,
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { ...typography.h3, color: colors.textPrimary },

  coordinatorTable: { gap: 0 },
  coordinatorRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
  },
  coordinatorHeaderRow: { paddingBottom: spacing.xs },
  coordinatorHeaderText: { ...typography.label, color: colors.textSecondary, textTransform: 'uppercase', fontSize: 11 },
  coordinatorCell: { ...typography.body, color: colors.textSecondary, fontSize: 13 },
  coordinatorName: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 13 },
  coordinatorMeta: { ...typography.caption, color: colors.textMuted },
  roleBadge: { backgroundColor: colors.primarySoft, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  roleBadgeText: { ...typography.caption, color: colors.primary, fontWeight: '600', fontSize: 11 },

  groupLabel: { ...typography.label, color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.xs, letterSpacing: 0.6 },

  chartGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginBottom: spacing.lg },
  chartCard: {
    flex: 1, minWidth: 320, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg, minHeight: 300, ...shadows.soft,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  chartTitle: { ...typography.h3, color: colors.textPrimary, fontSize: 15 },
  chartSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
  emptyChart: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xxl },

  // Bar chart
  barPlot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', flex: 1, minHeight: 200 },
  barColumn: { flex: 1, alignItems: 'center', maxWidth: 70 },
  barValue: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  barTrack: { width: 26, height: 160, backgroundColor: colors.background, borderRadius: radius.sm, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: radius.sm },
  barLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },

  // Donut chart
  pieWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap', justifyContent: 'center' },
  pie: {
    width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.background,
  },
  pieCenter: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  pieCenterValue: { ...typography.h2, color: colors.textPrimary },
  pieCenterLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  legend: { gap: spacing.sm, flexShrink: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { ...typography.body, color: colors.textSecondary, flex: 1, fontSize: 13 },
  legendValue: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 13 },

  // ── Attendance Intelligence additions ─────────────────────────────────────
  sectionDivider:   { height: 1, backgroundColor: colors.border, marginVertical: spacing.xl, marginHorizontal: -spacing.lg },
  intelHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  intelTitle:       { ...typography.h2, color: colors.textPrimary },
  intelSubtitle:    { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  freshnessBadge:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  freshnessBadgeFresh: { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
  freshnessBadgeStale: { backgroundColor: '#FEF9C3', borderColor: '#CA8A04' },
  freshnessText:    { fontSize: 11, fontWeight: '600' },
  unavailableBox:   { backgroundColor: '#FEF9C3', borderRadius: radius.md, borderWidth: 1, borderColor: '#CA8A04', padding: spacing.md, marginVertical: spacing.sm },
  unavailableTitle: { fontSize: 14, fontWeight: '700', color: '#CA8A04', marginBottom: 4 },
  unavailableBody:  { fontSize: 12, color: '#CA8A04', lineHeight: 18 },
  intelStatsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },
  intelTile:        { flex: 1, minWidth: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.md, ...shadows.card },
  intelTileValue:   { ...typography.h2, color: colors.textPrimary },
  intelTileLabel:   { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  intelTileHint:    { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  intelSubLabel:    { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.sm, letterSpacing: 0.5, textTransform: 'uppercase' },
  deptRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md },
  deptRowId:        { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  deptRowDetail:    { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  deptBand:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm },
  deptBandText:     { fontSize: 13, fontWeight: '700' },
  intelDisclaimer:  { fontSize: 11, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.md, lineHeight: 16 },
});

export default AnalyticsScreen;
