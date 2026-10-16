import React from 'react';
import { View, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import ScreenWrapper from '../../layouts/faculty/ScreenWrapper';
import { useAnalyticsOverview } from '../../hooks/faculty/useAnalytics';
import { useTheme } from '../../context/faculty/ThemeContext';
import { ThemeColors, shadows } from '../../theme/faculty/colors';
import { ROUTES } from '../../navigation/faculty/routes';

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

const ChartCard = ({ title, children, styles }: any) => (
  <View style={styles.chartCard}>
    <Text style={styles.chartTitle}>{title}</Text>
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

export default function FacultyAnalytics() {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const { data, isLoading, isError, error } = useAnalyticsOverview();

  if (isLoading) {
    return (
      <ScreenWrapper route={ROUTES.ANALYTICS} scrollable={false}>
        <View style={s.centerContent}><ActivityIndicator size="large" color={theme.primary} /></View>
      </ScreenWrapper>
    );
  }

  if (isError || !data) {
    return (
      <ScreenWrapper route={ROUTES.ANALYTICS} scrollable={false}>
        <View style={s.centerContent}><Text style={s.emptyChart}>{(error as any)?.message || 'Unable to load analytics.'}</Text></View>
      </ScreenWrapper>
    );
  }

  const asBarData = (rows: any[] = []) => rows.map((r) => ({ label: label(r.label), value: r.value }));
  // Class labels (e.g. "CS301 - Sec A") are already human-readable — don't
  // run them through the slug-to-title-case formatter meant for status enums.
  const asBarDataRaw = (rows: any[] = []) => rows.map((r) => ({ label: r.label, value: r.value }));

  return (
    <ScreenWrapper route={ROUTES.ANALYTICS} scrollable={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={s.pageSubtitle}>A read-only view of your own classes, meetings and coordinator roles.</Text>

        <View style={s.statsRow}>
          <StatTile styles={s} label="Attendance Rate" value={data.academics.attendanceRate != null ? `${data.academics.attendanceRate}%` : '—'} hint={`${data.academics.attendanceSampleSize} records`} />
          <StatTile styles={s} label="IA Marks Average" value={data.academics.iaAverage != null ? data.academics.iaAverage : '—'} />
          <StatTile styles={s} label="Students Taught" value={data.teaching.studentsTaught} />
          <StatTile styles={s} label="Assignments" value={data.teaching.totalAssignments} hint={`${data.teaching.openAssignments} open`} />
        </View>

        {data.coordinatorRoles.length > 0 && (
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>Your Coordinator Roles</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {data.coordinatorRoles.map((r: string) => (
                <View key={r} style={s.roleBadge}><Text style={s.roleBadgeText}>{r}</Text></View>
              ))}
            </View>
          </View>
        )}

        <Text style={s.groupLabel}>Your Classes</Text>
        <View style={s.chartGrid}>
          <ChartCard styles={s} title="Attendance % by Class">
            {data.teaching.attendanceByClass?.length ? <SimpleBarChart styles={s} barColor={PALETTE.teal} data={asBarDataRaw(data.teaching.attendanceByClass)} /> : <Text style={s.emptyChart}>No attendance recorded for your classes yet.</Text>}
          </ChartCard>
          <ChartCard styles={s} title="IA Average by Class">
            {data.teaching.iaByClass?.length ? <SimpleBarChart styles={s} barColor={PALETTE.amber} data={asBarDataRaw(data.teaching.iaByClass)} /> : <Text style={s.emptyChart}>No IA marks recorded for your classes yet.</Text>}
          </ChartCard>
        </View>

        <Text style={s.groupLabel}>Meeting Activity</Text>
        <View style={s.chartGrid}>
          <ChartCard styles={s} title="By Status">
            {data.meetings.byStatus.length ? <SimpleBarChart styles={s} barColor={PALETTE.blue} data={asBarData(data.meetings.byStatus)} /> : <Text style={s.emptyChart}>No meetings yet.</Text>}
          </ChartCard>
          <ChartCard styles={s} title="Online vs Offline">
            {data.meetings.byType.length ? <SimpleDonut styles={s} centerLabel="Meetings" segments={data.meetings.byType.map((r: any, i: number) => ({ label: label(r.label), value: r.value, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} /> : <Text style={s.emptyChart}>No meetings yet.</Text>}
          </ChartCard>
          <ChartCard styles={s} title="Responses to Your Meetings">
            {data.meetings.participantResponses?.length ? <SimpleDonut styles={s} centerLabel="Replies" segments={data.meetings.participantResponses.map((r: any, i: number) => ({ label: label(r.label), value: r.value, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} /> : <Text style={s.emptyChart}>You haven't organized any meetings yet.</Text>}
          </ChartCard>
        </View>
      </ScrollView>
    </ScreenWrapper>
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
  roleBadge: { backgroundColor: theme.primarySoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  roleBadgeText: { fontSize: 12, fontWeight: '600', color: theme.primary },

  groupLabel: { fontSize: 11, fontWeight: '700', color: theme.textSecondary, marginBottom: 8, marginTop: 4, letterSpacing: 0.6, textTransform: 'uppercase' },
  chartGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  chartCard: {
    flex: 1, minWidth: 280, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 20, padding: 16, minHeight: 240, ...shadows.card,
  },
  chartTitle: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  emptyChart: { fontSize: 13, color: theme.textMuted, textAlign: 'center', paddingVertical: 32 },

  barPlot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', flex: 1, minHeight: 160, marginTop: 12 },
  barColumn: { flex: 1, alignItems: 'center', maxWidth: 70 },
  barValue: { fontSize: 11, color: theme.textSecondary, marginBottom: 4 },
  barTrack: { width: 24, height: 120, backgroundColor: theme.background, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 8 },
  barLabel: { fontSize: 11, color: theme.textSecondary, marginTop: 8, textAlign: 'center' },

  pieWrap: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 },
  pie: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
  pieCenter: { width: 66, height: 66, borderRadius: 33, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  pieCenterValue: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  pieCenterLabel: { fontSize: 10, color: theme.textSecondary, marginTop: 2 },
  legend: { gap: 8, flexShrink: 1 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: theme.textSecondary, flex: 1 },
  legendValue: { fontSize: 12, fontWeight: '700', color: theme.textPrimary },
});
