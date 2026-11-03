import React from 'react';
import { View, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import ScreenWrapper from '../../layouts/hod/ScreenWrapper';
import { useAnalyticsOverview } from '../../hooks/hod/useAnalytics';
import { useHODAttendanceSummary } from '../../hooks/hod/useAttendanceAnalytics';
import { useTheme } from '../../context/hod/ThemeContext';
import { ThemeColors, shadows } from '../../theme/hod/colors';
import { ROUTES } from '../../navigation/hod/routes';

const PALETTE = {
  blue: '#3B82F6', teal: '#14B8A6', violet: '#A78BFA', amber: '#F59E0B', rose: '#FB7185', slate: '#94A3B8',
};
const DONUT_COLORS = [PALETTE.blue, PALETTE.teal, PALETTE.violet, PALETTE.amber, PALETTE.rose, PALETTE.slate];

const SimpleBarChart = ({ data, barColor, styles }: any) => {
  const max = Math.max(...data.map((d: any) => d.value), 1);
  return (
    <View style={styles.barPlot}>
      {data.map((item: any) => (
        <View key={item.label} style={styles.barColumn}>
          <Text style={styles.barValue}>{item.value}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.bar, { height: `${Math.max((item.value / max) * 100, item.value ? 8 : 0)}%`, backgroundColor: barColor }]} />
          </View>
          <Text style={styles.barLabel} numberOfLines={2}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

const SimpleDonut = ({ segments, centerLabel, styles }: any) => {
  const total = segments.reduce((sum: number, seg: any) => sum + seg.value, 0);
  let cumulative = 0;
  const stops = segments.map((seg: any) => {
    const pct = total ? (seg.value / total) * 100 : 0;
    const start = cumulative;
    cumulative += pct;
    return `${seg.color} ${start}% ${cumulative}%`;
  }).join(', ');
  const pieStyle = Platform.OS === 'web' ? { background: `conic-gradient(${stops})` } as any : {};

  return (
    <View style={styles.pieWrap}>
      <View style={[styles.pie, pieStyle]}>
        <View style={styles.pieCenter}>
          <Text style={styles.pieCenterValue}>{total}</Text>
          <Text style={styles.pieCenterLabel}>{centerLabel}</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {segments.map((seg: any) => {
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

const ChartCard = ({ title, subtitle, children, styles }: any) => (
  <View style={styles.chartCard}>
    <Text style={styles.chartTitle}>{title}</Text>
    {subtitle ? <Text style={styles.chartSubtitle}>{subtitle}</Text> : null}
    {children}
  </View>
);

const StatTile = ({ label, value, hint, styles }: any) => (
  <View style={styles.statTile}>
    <Text style={styles.statTileValue}>{value}</Text>
    <Text style={styles.statTileLabel}>{label}</Text>
    {hint ? <Text style={styles.statTileHint}>{hint}</Text> : null}
  </View>
);

const label = (slug: string) => String(slug || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function HODAnalytics() {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const { data, isLoading, isError, error } = useAnalyticsOverview();

  if (isLoading) {
    return (
      <ScreenWrapper route={ROUTES.HOD_ANALYTICS} scrollable={false}>
        <View style={s.centerContent}><ActivityIndicator size="large" color={theme.primary} /></View>
      </ScreenWrapper>
    );
  }

  if (isError || !data) {
    return (
      <ScreenWrapper route={ROUTES.HOD_ANALYTICS} scrollable={false}>
        <View style={s.centerContent}><Text style={s.emptyChart}>{(error as any)?.message || 'Unable to load analytics.'}</Text></View>
      </ScreenWrapper>
    );
  }

  const asBarData = (rows: any[] = []) => rows.map((r) => ({ label: r.label, value: r.value }));

  return (
    <ScreenWrapper route={ROUTES.HOD_ANALYTICS} scrollable={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={s.pageSubtitle}>A read-only view across your department's students, faculty, coordinators and meetings.</Text>

        <View style={s.statsRow}>
          <StatTile styles={s} label="Attendance Rate" value={data.academics.attendanceRate != null ? `${data.academics.attendanceRate}%` : '—'} hint={`${data.academics.attendanceSampleSize} records`} />
          <StatTile styles={s} label="IA Marks Average" value={data.academics.iaAverage != null ? data.academics.iaAverage : '—'} />
          <StatTile styles={s} label="Faculty Coordinating" value={data.faculty.coordinatorCoverage.withRole} hint={`of ${data.faculty.coordinatorCoverage.withRole + data.faculty.coordinatorCoverage.withoutRole} active faculty`} />
          <StatTile styles={s} label="Total Meetings" value={data.meetings.byStatus.reduce((sum: number, r: any) => sum + r.value, 0)} />
        </View>

        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>Coordinator Assignments</Text>
          {data.coordinators.length === 0 ? (
            <Text style={s.emptyChart}>No faculty in your department currently hold a coordinator role.</Text>
          ) : (
            <View>
              {data.coordinators.map((c: any) => (
                <View key={c.facultyId} style={s.coordinatorRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.coordinatorName} numberOfLines={1}>{c.name}</Text>
                    <Text style={s.coordinatorMeta} numberOfLines={1}>{c.employeeId}</Text>
                  </View>
                  <View style={{ flex: 1.2, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                    {c.roles.map((r: string) => (
                      <View key={r} style={s.roleBadge}><Text style={s.roleBadgeText}>{r}</Text></View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={s.groupLabel}>Students</Text>
        <View style={s.chartGrid}>
          <ChartCard styles={s} title="By Gender">
            {data.students.byGender.length ? <SimpleDonut styles={s} centerLabel="Students" segments={data.students.byGender.map((r: any, i: number) => ({ label: r.label, value: r.value, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} /> : <Text style={s.emptyChart}>No data.</Text>}
          </ChartCard>
          <ChartCard styles={s} title="By Status">
            {data.students.byStatus.length ? <SimpleDonut styles={s} centerLabel="Students" segments={data.students.byStatus.map((r: any, i: number) => ({ label: r.label, value: r.value, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} /> : <Text style={s.emptyChart}>No data.</Text>}
          </ChartCard>
          <ChartCard styles={s} title="By Semester">
            {data.students.bySemester.length ? <SimpleBarChart styles={s} barColor={PALETTE.violet} data={asBarData(data.students.bySemester)} /> : <Text style={s.emptyChart}>No data.</Text>}
          </ChartCard>
        </View>

        <Text style={s.groupLabel}>Faculty</Text>
        <View style={s.chartGrid}>
          <ChartCard styles={s} title="By Designation">
            {data.faculty.byDesignation.length ? <SimpleBarChart styles={s} barColor={PALETTE.blue} data={asBarData(data.faculty.byDesignation)} /> : <Text style={s.emptyChart}>No data.</Text>}
          </ChartCard>
          <ChartCard styles={s} title="By Experience">
            {data.faculty.byExperience.some((r: any) => r.value > 0) ? <SimpleBarChart styles={s} barColor={PALETTE.teal} data={asBarData(data.faculty.byExperience)} /> : <Text style={s.emptyChart}>No data.</Text>}
          </ChartCard>
          <ChartCard styles={s} title="Coordinator Coverage">
            <SimpleDonut
              styles={s}
              centerLabel="Faculty"
              segments={[
                { label: 'Coordinating', value: data.faculty.coordinatorCoverage.withRole, color: PALETTE.rose },
                { label: 'Not coordinating', value: data.faculty.coordinatorCoverage.withoutRole, color: PALETTE.slate },
              ]}
            />
          </ChartCard>
        </View>

        <Text style={s.groupLabel}>Meeting Activity</Text>
        <View style={s.chartGrid}>
          <ChartCard styles={s} title="By Status">
            {data.meetings.byStatus.length ? <SimpleBarChart styles={s} barColor={PALETTE.blue} data={asBarData(data.meetings.byStatus).map((r) => ({ ...r, label: label(r.label) }))} /> : <Text style={s.emptyChart}>No data.</Text>}
          </ChartCard>
          <ChartCard styles={s} title="Online vs Offline">
            {data.meetings.byType.length ? <SimpleDonut styles={s} centerLabel="Meetings" segments={data.meetings.byType.map((r: any, i: number) => ({ label: label(r.label), value: r.value, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} /> : <Text style={s.emptyChart}>No data.</Text>}
          </ChartCard>
          <ChartCard styles={s} title="Participant Responses">
            {data.meetings.participantResponses.length ? <SimpleDonut styles={s} centerLabel="Replies" segments={data.meetings.participantResponses.map((r: any, i: number) => ({ label: label(r.label), value: r.value, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} /> : <Text style={s.emptyChart}>No data.</Text>}
          </ChartCard>
        </View>

        {/* Attendance Intelligence — DuckDB-powered department summary */}
        <View style={s.sectionDivider} />
        <HODAttendanceIntelligence s={s} />

      </ScrollView>
    </ScreenWrapper>
  );
}

// ── HOD Attendance Intelligence section ───────────────────────────────────────

function HODAttendanceIntelligence({ s }: { s: any }) {
  const { data, isLoading, isError, error } = useHODAttendanceSummary();

  const renderFreshness = () => {
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
    if (isLoading) return (
      <ActivityIndicator size="small" color="#1D4ED8" style={{ marginVertical: 16 }} />
    );

    if (isError) {
      const is503 = (error as any)?.response?.status === 503;
      return (
        <View style={s.unavailableBox}>
          <Text style={s.unavailableTitle}>{is503 ? '📊 Analytics Offline' : '⚠️ Unavailable'}</Text>
          <Text style={s.unavailableBody}>
            {is503
              ? 'Attendance analytics are temporarily unavailable. All other features work normally.'
              : (error as any)?.message || 'Unable to load attendance analytics.'}
          </Text>
        </View>
      );
    }

    if (!data || data.overall.recordedSessions === 0) {
      return <Text style={s.emptyChart}>No attendance data in the analytics snapshot for this period.</Text>;
    }

    const { overall, classes } = data;
    const pct = overall.attendancePercentage;

    const bandCounts = classes.reduce(
      (acc, c) => { acc[c.overallBand] = (acc[c.overallBand] || 0) + 1; return acc; },
      {} as Record<string, number>,
    );

    return (
      <>
        {/* Overview tiles */}
        <View style={s.statsRow}>
          <View style={s.statTile}>
            <Text style={s.statTileValue}>{pct !== null ? `${pct.toFixed(1)}%` : '—'}</Text>
            <Text style={s.statTileLabel}>Dept Attendance</Text>
            <Text style={s.statTileHint}>{overall.recordedSessions} sessions recorded</Text>
          </View>
          <View style={s.statTile}>
            <Text style={s.statTileValue}>{overall.presentSessions}</Text>
            <Text style={s.statTileLabel}>Present (total)</Text>
            <Text style={s.statTileHint}>{overall.recordedSessions - overall.presentSessions} absent</Text>
          </View>
          <View style={s.statTile}>
            <Text style={s.statTileValue}>{classes.length}</Text>
            <Text style={s.statTileLabel}>Classes</Text>
            <Text style={s.statTileHint}>{bandCounts['critical'] || 0} critical · {bandCounts['at_risk'] || 0} at-risk</Text>
          </View>
        </View>

        {/* Per-class breakdown */}
        <Text style={s.intelSubLabel}>Per-class attendance</Text>
        {classes.map((c) => {
          const cpct = c.attendancePercentage;
          const bandColors: Record<string, string> = {
            critical: '#DC2626', at_risk: '#CA8A04', on_track: '#16A34A', insufficient_data: '#94A3B8',
          };
          const badgeColor = bandColors[c.overallBand] ?? '#94A3B8';
          const badgeBg: Record<string, string> = {
            critical: '#FEE2E2', at_risk: '#FEF9C3', on_track: '#DCFCE7', insufficient_data: '#F1F5F9',
          };
          return (
            <View key={c.classId} style={s.classRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.classRowId}>Class #{c.classId}</Text>
                <Text style={s.classRowDetail}>
                  {c.distinctStudents} students · {c.recordedSessions} sessions
                </Text>
              </View>
              <View style={[s.classBand, { backgroundColor: badgeBg[c.overallBand] ?? '#F1F5F9' }]}>
                <Text style={[s.classBandText, { color: badgeColor }]}>
                  {cpct !== null ? `${cpct.toFixed(1)}%` : '—'}
                </Text>
              </View>
            </View>
          );
        })}

        <Text style={s.intelDisclaimer}>
          Risk bands are demo defaults (critical &lt;60%, at-risk &lt;75%) — not official VTU/SVCE policy.
          Data reflects the last successful analytics refresh shown above.
        </Text>
      </>
    );
  };

  return (
    <View style={s.intelSection}>
      <View style={s.intelHeader}>
        <Text style={s.intelTitle}>Attendance Intelligence</Text>
        {renderFreshness()}
      </View>
      <Text style={s.emptyChart} />
      {content()}
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  pageSubtitle: { fontSize: 13, color: theme.textSecondary, marginBottom: 16, maxWidth: 640 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statTile: {
    flex: 1, minWidth: 150, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 16, padding: 16, ...shadows.card,
  },
  statTileValue: { fontSize: 22, fontWeight: '700', color: theme.textPrimary },
  statTileLabel: { fontSize: 12, color: theme.textSecondary, marginTop: 4 },
  statTileHint: { fontSize: 11, color: theme.textMuted, marginTop: 2 },

  sectionCard: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 20,
    padding: 16, marginBottom: 16, ...shadows.card,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginBottom: 10 },
  coordinatorRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: theme.border, gap: 8,
  },
  coordinatorName: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  coordinatorMeta: { fontSize: 11, color: theme.textMuted },
  roleBadge: { backgroundColor: theme.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  roleBadgeText: { fontSize: 11, fontWeight: '600', color: theme.primary },

  groupLabel: { fontSize: 11, fontWeight: '700', color: theme.textSecondary, marginBottom: 8, marginTop: 4, letterSpacing: 0.6, textTransform: 'uppercase' },
  chartGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  chartCard: {
    flex: 1, minWidth: 280, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 20, padding: 16, minHeight: 260, ...shadows.card,
  },
  chartTitle: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  chartSubtitle: { fontSize: 11, color: theme.textSecondary, marginTop: 2, marginBottom: 8 },
  emptyChart: { fontSize: 13, color: theme.textMuted, textAlign: 'center', paddingVertical: 32 },

  barPlot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', flex: 1, minHeight: 180, marginTop: 12 },
  barColumn: { flex: 1, alignItems: 'center', maxWidth: 70 },
  barValue: { fontSize: 11, color: theme.textSecondary, marginBottom: 4 },
  barTrack: { width: 24, height: 140, backgroundColor: theme.background, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 8 },
  barLabel: { fontSize: 11, color: theme.textSecondary, marginTop: 8, textAlign: 'center' },

  pieWrap: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 },
  pie: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
  pieCenter: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  pieCenterValue: { fontSize: 18, fontWeight: '700', color: theme.textPrimary },
  pieCenterLabel: { fontSize: 10, color: theme.textSecondary, marginTop: 2 },
  legend: { gap: 8, flexShrink: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: theme.textSecondary, flex: 1 },
  legendValue: { fontSize: 12, fontWeight: '700', color: theme.textPrimary },

  // ── Attendance Intelligence additions ─────────────────────────────────────
  sectionDivider:  { height: 1, backgroundColor: theme.border, marginVertical: 24, marginHorizontal: -16 },
  intelSection:    { marginBottom: 24 },
  intelHeader:     { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 8 },
  intelTitle:      { fontSize: 17, fontWeight: '700' as const, color: theme.textPrimary },
  freshnessBadge:  { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  freshnessBadgeFresh: { backgroundColor: '#DCFCE7', borderColor: '#16A34A' },
  freshnessBadgeStale: { backgroundColor: '#FEF9C3', borderColor: '#CA8A04' },
  freshnessText:   { fontSize: 11, fontWeight: '600' as const },
  unavailableBox:  { backgroundColor: '#FEF9C3', borderRadius: 12, borderWidth: 1, borderColor: '#CA8A04', padding: 14, marginVertical: 8 },
  unavailableTitle:{ fontSize: 14, fontWeight: '700' as const, color: '#CA8A04', marginBottom: 4 },
  unavailableBody: { fontSize: 12, color: '#CA8A04', lineHeight: 18 },
  intelSubLabel:   { fontSize: 11, fontWeight: '700' as const, color: theme.textSecondary, marginTop: 8, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' as const },
  classRow:        { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border, gap: 12 },
  classRowId:      { fontSize: 13, fontWeight: '600' as const, color: theme.textPrimary },
  classRowDetail:  { fontSize: 11, color: theme.textSecondary, marginTop: 2 },
  classBand:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  classBandText:   { fontSize: 13, fontWeight: '700' as const },
  intelDisclaimer: { fontSize: 11, color: theme.textMuted, fontStyle: 'italic' as const, marginTop: 12, lineHeight: 16 },
});
