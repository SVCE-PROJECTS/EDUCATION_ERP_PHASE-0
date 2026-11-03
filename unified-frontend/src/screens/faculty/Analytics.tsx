/**
 * Faculty Analytics Screen
 *
 * Two sections:
 *   1. Overview (existing) — reads from /analytics/overview (PostgreSQL live queries)
 *   2. Attendance Intelligence (new, Step D) — reads from /analytics/attendance/*
 *      backed by DuckDB via the refresh pipeline.
 *
 * The Attendance Intelligence section is additive and fully independent.
 * If DuckDB is unavailable, it shows a clear message and the overview section
 * continues to work normally.
 */

import React, { useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, Platform, ActivityIndicator,
  TouchableOpacity, TextInput, Modal,
} from 'react-native';
import { Text } from 'react-native-paper';
import ScreenWrapper from '../../layouts/faculty/ScreenWrapper';
import { useAnalyticsOverview } from '../../hooks/faculty/useAnalytics';
import {
  useClassSummary,
  useStudentRisks,
  useAttendanceTrend,
  useRecoveryProjection,
  useAnalyticsFreshness,
  academicYearStart,
  today,
} from '../../hooks/faculty/useAttendanceAnalytics';
import { useMyClasses } from '../../hooks/faculty/useClasses';
import { useTheme } from '../../context/faculty/ThemeContext';
import { ThemeColors, shadows, colors, primaryScale } from '../../theme/faculty/colors';
import { ROUTES } from '../../navigation/faculty/routes';
import { FacultyClass } from '../../services/faculty/class.service';
import { RiskBand, StudentRiskRow } from '../../services/faculty/attendanceAnalytics.service';
import { Check, ChevronDown } from '../../components/faculty/icons';

// ─────────────────────────────────────────────────────────────────────────────
// Shared palette
// ─────────────────────────────────────────────────────────────────────────────

const PALETTE = {
  blue:   '#3B82F6',
  teal:   '#14B8A6',
  violet: '#A78BFA',
  amber:  '#F59E0B',
  rose:   '#FB7185',
  slate:  '#94A3B8',
};

const DONUT_COLORS = [PALETTE.blue, PALETTE.teal, PALETTE.violet, PALETTE.amber, PALETTE.rose, PALETTE.slate];

const RISK_PALETTE: Record<RiskBand, { bg: string; text: string; dot: string }> = {
  critical:          { bg: colors.dangerBg,  text: colors.danger,  dot: colors.danger  },
  at_risk:           { bg: colors.warningBg, text: colors.warning, dot: colors.warning },
  on_track:          { bg: colors.successBg, text: colors.success, dot: colors.success },
  insufficient_data: { bg: '#F1F5F9',        text: '#64748B',      dot: '#94A3B8'      },
};

const RISK_LABELS: Record<RiskBand, string> = {
  critical:          'Critical',
  at_risk:           'At Risk',
  on_track:          'On Track',
  insufficient_data: 'No Data',
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared chart / card components (same shape as the existing ones)
// ─────────────────────────────────────────────────────────────────────────────

const SimpleBarChart = ({ data, barColor, styles: s }: any) => {
  const max = Math.max(...data.map((d: any) => d.value), 1);
  return (
    <View style={s.barPlot}>
      {data.map((item: any) => (
        <View key={item.label} style={s.barColumn}>
          <Text style={s.barValue}>{item.value}</Text>
          <View style={s.barTrack}>
            <View style={[s.bar, {
              height: `${Math.max((item.value / max) * 100, item.value ? 8 : 0)}%`,
              backgroundColor: barColor,
            }]} />
          </View>
          <Text style={s.barLabel} numberOfLines={2}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

const SimpleDonut = ({ segments, centerLabel, styles: s }: any) => {
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
    <View style={s.pieWrap}>
      <View style={[s.pie, pieStyle]}>
        <View style={s.pieCenter}>
          <Text style={s.pieCenterValue}>{total}</Text>
          <Text style={s.pieCenterLabel}>{centerLabel}</Text>
        </View>
      </View>
      <View style={s.legend}>
        {segments.map((seg: any) => {
          const pct = total ? Math.round((seg.value / total) * 100) : 0;
          return (
            <View key={seg.label} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: seg.color }]} />
              <Text style={s.legendLabel} numberOfLines={1}>{seg.label}</Text>
              <Text style={s.legendValue}>{seg.value} ({pct}%)</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const ChartCard = ({ title, children, styles: s }: any) => (
  <View style={s.chartCard}>
    <Text style={s.chartTitle}>{title}</Text>
    {children}
  </View>
);

const StatTile = ({ label, value, hint, styles: s }: any) => (
  <View style={s.statTile}>
    <Text style={s.statTileValue}>{value}</Text>
    <Text style={s.statTileLabel}>{label}</Text>
    {hint ? <Text style={s.statTileHint}>{hint}</Text> : null}
  </View>
);

const labelify = (slug: string) =>
  String(slug || 'Unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ─────────────────────────────────────────────────────────────────────────────
// Attendance Intelligence sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Pill badge showing last refresh time and stale state */
function FreshnessBadge({ styles: s }: { styles: any }) {
  const { data } = useAnalyticsFreshness();
  if (!data) return null;
  const stale    = data.stale || !data.analyticsAvailable;
  const label    = data.lastSuccessfulRefreshAt
    ? `Refreshed ${new Date(data.lastSuccessfulRefreshAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Never refreshed';
  return (
    <View style={[s.freshnessBadge, stale ? s.freshnessBadgeStale : s.freshnessBadgeFresh]}>
      <View style={[s.freshnessDot, { backgroundColor: stale ? colors.warning : colors.success }]} />
      <Text style={[s.freshnessText, { color: stale ? colors.warning : colors.success }]}>
        {data.analyticsAvailable ? label : 'Analytics offline'}
        {stale && data.analyticsAvailable ? ' · Stale' : ''}
      </Text>
    </View>
  );
}

/** Compact risk band badge */
function RiskBadge({ band, styles: s }: { band: RiskBand; styles: any }) {
  const p = RISK_PALETTE[band] ?? RISK_PALETTE.insufficient_data;
  return (
    <View style={[s.riskBadge, { backgroundColor: p.bg }]}>
      <View style={[s.riskDot, { backgroundColor: p.dot }]} />
      <Text style={[s.riskBadgeText, { color: p.text }]}>{RISK_LABELS[band]}</Text>
    </View>
  );
}

/** Summary stats row */
function SummaryStats({ classId, from, to, styles: s }: {
  classId: number; from: string; to: string; styles: any;
}) {
  const { data, isLoading, isError, error } = useClassSummary({ classId, from, to });

  if (isLoading) return <ActivityIndicator size="small" color={primaryScale[600]} style={{ marginVertical: 16 }} />;

  if (isError) {
    const msg = (error as any)?.response?.data?.message || (error as any)?.message || 'Analytics unavailable';
    const is503 = (error as any)?.response?.status === 503;
    return (
      <View style={s.unavailableBox}>
        <Text style={s.unavailableTitle}>{is503 ? '📊 Analytics Offline' : '⚠️ Error'}</Text>
        <Text style={s.unavailableBody}>
          {is503
            ? 'Attendance intelligence is temporarily unavailable. Attendance marking and all other features work normally.'
            : msg}
        </Text>
      </View>
    );
  }

  if (!data) return null;

  const { summary, riskBands, thresholds } = data;
  const pct = summary.attendancePercentage;

  return (
    <View>
      {/* Top-line stats */}
      <View style={s.statsRow}>
        <StatTile styles={s}
          label="Attendance"
          value={pct !== null ? `${pct.toFixed(1)}%` : '—'}
          hint={`${summary.recordedRows} sessions recorded`} />
        <StatTile styles={s}
          label="Present"
          value={summary.presentRows}
          hint={`${summary.absentRows} absent`} />
        <StatTile styles={s}
          label="At Risk"
          value={riskBands.atRisk + riskBands.critical}
          hint="students below 75%" />
        <StatTile styles={s}
          label="On Track"
          value={riskBands.onTrack}
          hint="≥75% attendance" />
      </View>

      {/* Risk band donut */}
      {summary.recordedRows > 0 && (
        <ChartCard styles={s} title="Students by Risk Band">
          <Text style={s.thresholdNote}>{thresholds.note}</Text>
          <SimpleDonut
            styles={s}
            centerLabel="Students"
            segments={[
              { label: `Critical (<${thresholds.critical}%)`, value: riskBands.critical,     color: colors.danger },
              { label: `At Risk (<${thresholds.atRisk}%)`,    value: riskBands.atRisk,       color: colors.warning },
              { label: 'On Track',                            value: riskBands.onTrack,      color: colors.success },
              { label: 'No Data',                             value: riskBands.insufficient, color: PALETTE.slate },
            ].filter(s => s.value > 0)}
          />
        </ChartCard>
      )}
      {summary.recordedRows === 0 && (
        <Text style={s.emptyChart}>No attendance recorded for this class in the selected period.</Text>
      )}
    </View>
  );
}

/** Trend chart */
function TrendChart({ classId, from, to, styles: s }: {
  classId: number; from: string; to: string; styles: any;
}) {
  const { data, isLoading } = useAttendanceTrend({ classId, from, to });

  if (isLoading) return <ActivityIndicator size="small" color={primaryScale[600]} style={{ marginVertical: 12 }} />;
  if (!data || data.trend.length === 0) {
    return <Text style={s.emptyChart}>No trend data for this period.</Text>;
  }

  // Show up to 10 most recent points to keep bars readable
  const points = data.trend.slice(-10);
  const barData = points.map(p => ({
    label: p.date.slice(5),   // MM-DD
    value: p.attendancePercentage ?? 0,
  }));

  return <SimpleBarChart styles={s} barColor={PALETTE.teal} data={barData} />;
}

/** Paginated student risk list */
function RiskList({ classId, from, to, styles: s }: {
  classId: number; from: string; to: string; styles: any;
}) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<RiskBand | undefined>(undefined);
  const { data, isLoading } = useStudentRisks({ classId, from, to, page, pageSize: 20, riskBand: filter });

  const FILTERS: Array<{ label: string; value: RiskBand | undefined }> = [
    { label: 'All',      value: undefined },
    { label: 'Critical', value: 'critical' },
    { label: 'At Risk',  value: 'at_risk' },
    { label: 'On Track', value: 'on_track' },
  ];

  return (
    <View>
      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 4, flexDirection: 'row' }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={String(f.value)}
            style={[s.chip, filter === f.value && s.chipActive]}
            onPress={() => { setFilter(f.value); setPage(1); }} activeOpacity={0.75}>
            <Text style={[s.chipText, filter === f.value && s.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading && <ActivityIndicator size="small" color={primaryScale[600]} style={{ marginVertical: 12 }} />}

      {!isLoading && data && (
        <>
          {data.students.length === 0
            ? <Text style={s.emptyChart}>No students match this filter.</Text>
            : data.students.map((st: StudentRiskRow) => (
                <View key={st.studentId} style={s.riskRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.riskStudentId} numberOfLines={1}>{st.studentId}</Text>
                    <Text style={s.riskDetail}>
                      {st.presentSessions}/{st.recordedSessions} sessions
                      {st.attendancePercentage !== null
                        ? ` · ${st.attendancePercentage.toFixed(1)}%`
                        : ''}
                    </Text>
                  </View>
                  <RiskBadge band={st.riskBand} styles={s} />
                </View>
              ))
          }

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <View style={s.paginationRow}>
              <TouchableOpacity
                style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}
                onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                <Text style={s.pageBtnText}>‹ Prev</Text>
              </TouchableOpacity>
              <Text style={s.pageInfo}>{page} / {data.pagination.totalPages}</Text>
              <TouchableOpacity
                style={[s.pageBtn, page >= data.pagination.totalPages && s.pageBtnDisabled]}
                onPress={() => setPage(p => p + 1)}
                disabled={page >= data.pagination.totalPages}>
                <Text style={s.pageBtnText}>Next ›</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

/** Recovery simulator */
function RecoverySimulator({ classId, students, from, to, styles: s }: {
  classId: number;
  students: StudentRiskRow[];
  from: string;
  to: string;
  styles: any;
}) {
  const [studentId,   setStudentId]   = useState('');
  const [future,      setFuture]      = useState('10');
  const [target,      setTarget]      = useState('75');
  const [submitted,   setSubmitted]   = useState(false);
  const [pickerOpen,  setPickerOpen]  = useState(false);

  const targetRate   = Math.min(1, Math.max(0, (parseFloat(target) || 75) / 100));
  const futureParsed = Math.max(0, parseInt(future, 10) || 0);
  const enabled      = submitted && !!studentId && futureParsed >= 0;

  const { data, isLoading, isFetching } = useRecoveryProjection({
    classId, studentId, future: futureParsed, target: targetRate, from, to, enabled,
  });

  const selectedStudent = students.find(s => s.studentId === studentId);

  return (
    <View style={s.simulatorCard}>
      <Text style={s.simulatorTitle}>Recovery Simulator</Text>
      <Text style={s.simulatorSubtitle}>
        Calculates the minimum future sessions a student must attend to reach a target rate.
        This is a projection, not a guarantee.
      </Text>

      {/* Student picker */}
      <View style={{ gap: 4 }}>
        <Text style={s.inputLabel}>Student (USN)</Text>
        <TouchableOpacity style={s.pickerBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.8}>
          <Text style={[s.pickerBtnText, !studentId && s.pickerBtnPlaceholder]} numberOfLines={1}>
            {studentId || 'Select student…'}
          </Text>
          <ChevronDown size={14} color="#64748B" />
        </TouchableOpacity>
        <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
            <View style={s.pickerDropdown}>
              <ScrollView style={{ maxHeight: 320 }}>
                {students.map(st => (
                  <TouchableOpacity key={st.studentId} style={[s.pickerItem, studentId === st.studentId && s.pickerItemActive]}
                    onPress={() => { setStudentId(st.studentId); setPickerOpen(false); setSubmitted(false); }}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.pickerItemText} numberOfLines={1}>{st.studentId}</Text>
                      {st.attendancePercentage !== null && (
                        <Text style={s.pickerItemSub}>{st.attendancePercentage.toFixed(1)}% · {RISK_LABELS[st.riskBand]}</Text>
                      )}
                    </View>
                    {studentId === st.studentId && <Check size={13} color={primaryScale[600]} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>

      {/* Inputs row */}
      <View style={s.simInputRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.inputLabel}>Future sessions</Text>
          <TextInput
            style={s.simInput}
            keyboardType="numeric"
            value={future}
            onChangeText={setFuture}
            placeholder="e.g. 10"
            placeholderTextColor="#94A3B8"
          />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.inputLabel}>Target %</Text>
          <TextInput
            style={s.simInput}
            keyboardType="numeric"
            value={target}
            onChangeText={setTarget}
            placeholder="e.g. 75"
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>

      <TouchableOpacity style={s.simBtn}
        onPress={() => setSubmitted(true)} activeOpacity={0.85}>
        <Text style={s.simBtnText}>Calculate</Text>
      </TouchableOpacity>

      {/* Result */}
      {(isLoading || isFetching) && <ActivityIndicator size="small" color={primaryScale[600]} style={{ marginTop: 12 }} />}

      {data && submitted && !isLoading && (
        <View style={[s.simResult, { borderColor: data.result.canReachTarget ? colors.success : colors.danger }]}>
          {/* Current attendance */}
          {selectedStudent && (
            <Text style={s.simResultLine}>
              Current: {selectedStudent.attendancePercentage?.toFixed(1) ?? '?'}%
              ({selectedStudent.presentSessions}/{selectedStudent.recordedSessions} sessions)
            </Text>
          )}
          <Text style={s.simResultLine}>
            Target: {data.inputs.targetPercentage}% ·
            Future sessions: {data.inputs.futureSessions}
          </Text>

          {/* Outcome */}
          <View style={[s.simOutcome, { backgroundColor: data.result.canReachTarget ? colors.successBg : colors.dangerBg }]}>
            <Text style={[s.simOutcomeValue, { color: data.result.canReachTarget ? colors.success : colors.danger }]}>
              {data.result.canReachTarget
                ? data.result.minSessionsNeeded === 0
                  ? '✓ Target already met'
                  : `Attend ${data.result.minSessionsNeeded} of ${data.inputs.futureSessions} remaining`
                : `Cannot reach ${data.inputs.targetPercentage}% with ${data.inputs.futureSessions} sessions`}
            </Text>
            <Text style={[s.simOutcomeExpl, { color: data.result.canReachTarget ? colors.success : colors.danger }]}>
              {data.result.explanation}
            </Text>
          </View>

          <Text style={s.simDisclaimer}>{data.disclaimer}</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────

export default function FacultyAnalytics() {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const { data: overviewData, isLoading: overviewLoading, isError: overviewError, error: overviewErr } = useAnalyticsOverview();
  const { data: myClasses = [] } = useMyClasses();

  // Intelligence section state
  const [selectedClass, setSelectedClass] = useState<FacultyClass | null>(null);
  const [from, setFrom] = useState(academicYearStart());
  const [to,   setTo]   = useState(today());
  const [classPickerOpen, setClassPickerOpen] = useState(false);

  // Students for recovery simulator — fetched from risk list (page 1, large)
  const { data: allRisks } = useStudentRisks({
    classId: selectedClass?.class_id,
    from, to, page: 1, pageSize: 200,
  });
  const riskStudents: StudentRiskRow[] = allRisks?.students ?? [];

  // ── Existing overview section ──────────────────────────────────────────────

  const renderOverview = () => {
    if (overviewLoading) return <ActivityIndicator size="large" color={theme.primary} style={{ marginVertical: 32 }} />;
    if (overviewError || !overviewData) {
      return <Text style={s.emptyChart}>{(overviewErr as any)?.message || 'Unable to load overview.'}</Text>;
    }

    const asBarData  = (rows: any[] = []) => rows.map(r => ({ label: labelify(r.label), value: r.value }));
    const asBarDataR = (rows: any[] = []) => rows.map(r => ({ label: r.label, value: r.value }));

    return (
      <>
        <Text style={s.pageSubtitle}>A read-only view of your own classes, meetings and coordinator roles.</Text>

        <View style={s.statsRow}>
          <StatTile styles={s} label="Attendance Rate"
            value={overviewData.academics.attendanceRate != null ? `${overviewData.academics.attendanceRate}%` : '—'}
            hint={`${overviewData.academics.attendanceSampleSize} records`} />
          <StatTile styles={s} label="IA Marks Average"
            value={overviewData.academics.iaAverage != null ? overviewData.academics.iaAverage : '—'} />
          <StatTile styles={s} label="Students Taught"
            value={overviewData.teaching.studentsTaught} />
          <StatTile styles={s} label="Assignments"
            value={overviewData.teaching.totalAssignments}
            hint={`${overviewData.teaching.openAssignments} open`} />
        </View>

        {overviewData.coordinatorRoles.length > 0 && (
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>Your Coordinator Roles</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {overviewData.coordinatorRoles.map((r: string) => (
                <View key={r} style={s.roleBadge}><Text style={s.roleBadgeText}>{r}</Text></View>
              ))}
            </View>
          </View>
        )}

        <Text style={s.groupLabel}>Your Classes</Text>
        <View style={s.chartGrid}>
          <ChartCard styles={s} title="Attendance % by Class">
            {overviewData.teaching.attendanceByClass?.length
              ? <SimpleBarChart styles={s} barColor={PALETTE.teal} data={asBarDataR(overviewData.teaching.attendanceByClass)} />
              : <Text style={s.emptyChart}>No attendance recorded for your classes yet.</Text>}
          </ChartCard>
          <ChartCard styles={s} title="IA Average by Class">
            {overviewData.teaching.iaByClass?.length
              ? <SimpleBarChart styles={s} barColor={PALETTE.amber} data={asBarDataR(overviewData.teaching.iaByClass)} />
              : <Text style={s.emptyChart}>No IA marks recorded for your classes yet.</Text>}
          </ChartCard>
        </View>

        <Text style={s.groupLabel}>Meeting Activity</Text>
        <View style={s.chartGrid}>
          <ChartCard styles={s} title="By Status">
            {overviewData.meetings.byStatus.length
              ? <SimpleBarChart styles={s} barColor={PALETTE.blue} data={asBarData(overviewData.meetings.byStatus)} />
              : <Text style={s.emptyChart}>No meetings yet.</Text>}
          </ChartCard>
          <ChartCard styles={s} title="Online vs Offline">
            {overviewData.meetings.byType.length
              ? <SimpleDonut styles={s} centerLabel="Meetings"
                  segments={overviewData.meetings.byType.map((r: any, i: number) => ({
                    label: labelify(r.label), value: r.value, color: DONUT_COLORS[i % DONUT_COLORS.length],
                  }))} />
              : <Text style={s.emptyChart}>No meetings yet.</Text>}
          </ChartCard>
          <ChartCard styles={s} title="Responses to Your Meetings">
            {overviewData.meetings.participantResponses?.length
              ? <SimpleDonut styles={s} centerLabel="Replies"
                  segments={overviewData.meetings.participantResponses.map((r: any, i: number) => ({
                    label: labelify(r.label), value: r.value, color: DONUT_COLORS[i % DONUT_COLORS.length],
                  }))} />
              : <Text style={s.emptyChart}>You haven't organized any meetings yet.</Text>}
          </ChartCard>
        </View>
      </>
    );
  };

  // ── Attendance Intelligence section ────────────────────────────────────────

  const renderIntelligence = () => (
    <>
      {/* Section header */}
      <View style={s.intelHeader}>
        <Text style={s.intelTitle}>Attendance Intelligence</Text>
        <FreshnessBadge styles={s} />
      </View>
      <Text style={s.intelSubtitle}>
        Analytics powered by a snapshot of PostgreSQL data.
        Select a class to see detailed insights.
      </Text>

      {/* Class selector */}
      <View style={{ gap: 6 }}>
        <Text style={s.inputLabel}>Select Class</Text>
        <TouchableOpacity style={s.pickerBtn} onPress={() => setClassPickerOpen(true)} activeOpacity={0.8}>
          <Text style={[s.pickerBtnText, !selectedClass && s.pickerBtnPlaceholder]} numberOfLines={1}>
            {selectedClass ? selectedClass.label : 'Choose a class…'}
          </Text>
          <ChevronDown size={14} color="#64748B" />
        </TouchableOpacity>

        <Modal visible={classPickerOpen} transparent animationType="fade"
          onRequestClose={() => setClassPickerOpen(false)}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setClassPickerOpen(false)}>
            <View style={s.pickerDropdown}>
              <ScrollView style={{ maxHeight: 360 }}>
                {myClasses.map(cls => (
                  <TouchableOpacity key={cls.class_id}
                    style={[s.pickerItem, selectedClass?.class_id === cls.class_id && s.pickerItemActive]}
                    onPress={() => { setSelectedClass(cls); setClassPickerOpen(false); }}>
                    <Text style={s.pickerItemText} numberOfLines={2}>{cls.label}</Text>
                    {selectedClass?.class_id === cls.class_id && <Check size={13} color={primaryScale[600]} />}
                  </TouchableOpacity>
                ))}
                {myClasses.length === 0 && (
                  <Text style={[s.emptyChart, { padding: 16 }]}>No classes found.</Text>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>

      {/* Date range row */}
      <View style={s.dateRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.inputLabel}>From</Text>
          <TextInput style={s.dateInput} value={from} onChangeText={setFrom}
            placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.inputLabel}>To</Text>
          <TextInput style={s.dateInput} value={to} onChangeText={setTo}
            placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8" />
        </View>
      </View>

      {/* Content — only shown when a class is selected */}
      {!selectedClass ? (
        <View style={s.noClassPlaceholder}>
          <Text style={s.noClassText}>Select a class above to view attendance insights.</Text>
        </View>
      ) : (
        <>
          {/* Summary */}
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>Class Summary</Text>
            <SummaryStats classId={selectedClass.class_id} from={from} to={to} styles={s} />
          </View>

          {/* Trend */}
          <View style={s.chartCard}>
            <Text style={s.chartTitle}>Attendance Trend</Text>
            <Text style={s.chartSubtitle}>Daily attendance % (up to 10 most recent sessions)</Text>
            <TrendChart classId={selectedClass.class_id} from={from} to={to} styles={s} />
          </View>

          {/* Risk list */}
          <View style={s.sectionCard}>
            <Text style={s.sectionTitle}>Student Risk List</Text>
            <Text style={s.intelSubtitle}>
              Sorted by attendance percentage (lowest first).
              Thresholds are demo defaults — not official VTU/SVCE policy.
            </Text>
            <RiskList classId={selectedClass.class_id} from={from} to={to} styles={s} />
          </View>

          {/* Recovery simulator */}
          {riskStudents.length > 0 && (
            <RecoverySimulator
              classId={selectedClass.class_id}
              students={riskStudents}
              from={from}
              to={to}
              styles={s}
            />
          )}
        </>
      )}
    </>
  );

  return (
    <ScreenWrapper route={ROUTES.ANALYTICS} scrollable={false}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderOverview()}

        {/* Divider */}
        <View style={s.sectionDivider} />

        {renderIntelligence()}

        {/* Bottom padding */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </ScreenWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  // ── Existing overview styles (unchanged) ──────────────────────────────────
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  pageSubtitle:  { fontSize: 13, color: theme.textSecondary, marginBottom: 16, maxWidth: 640 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statTile: {
    flex: 1, minWidth: 150, backgroundColor: theme.surface, borderWidth: 1,
    borderColor: theme.border, borderRadius: 16, padding: 16, ...shadows.card,
  },
  statTileValue: { fontSize: 22, fontWeight: '700', color: theme.textPrimary },
  statTileLabel: { fontSize: 12, color: theme.textSecondary, marginTop: 4 },
  statTileHint:  { fontSize: 11, color: theme.textMuted, marginTop: 2 },

  sectionCard: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 20, padding: 16, marginBottom: 16, ...shadows.card,
  },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, marginBottom: 10 },
  roleBadge: {
    backgroundColor: theme.primarySoft, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '600', color: theme.primary },

  groupLabel: {
    fontSize: 11, fontWeight: '700', color: theme.textSecondary, marginBottom: 8, marginTop: 4,
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  chartGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  chartCard: {
    flex: 1, minWidth: 280, backgroundColor: theme.surface, borderWidth: 1,
    borderColor: theme.border, borderRadius: 20, padding: 16, minHeight: 240, ...shadows.card,
    marginBottom: 12,
  },
  chartTitle:    { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  chartSubtitle: { fontSize: 11, color: theme.textSecondary, marginTop: 2, marginBottom: 8 },
  emptyChart:    { fontSize: 13, color: theme.textMuted, textAlign: 'center', paddingVertical: 32 },

  barPlot: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around',
    flex: 1, minHeight: 160, marginTop: 12,
  },
  barColumn:  { flex: 1, alignItems: 'center', maxWidth: 70 },
  barValue:   { fontSize: 11, color: theme.textSecondary, marginBottom: 4 },
  barTrack: {
    width: 24, height: 120, backgroundColor: theme.background, borderRadius: 8,
    justifyContent: 'flex-end', overflow: 'hidden',
  },
  bar:      { width: '100%', borderRadius: 8 },
  barLabel: { fontSize: 11, color: theme.textSecondary, marginTop: 8, textAlign: 'center' },

  pieWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    flexWrap: 'wrap', justifyContent: 'center', marginTop: 8,
  },
  pie: {
    width: 110, height: 110, borderRadius: 55, alignItems: 'center',
    justifyContent: 'center', backgroundColor: theme.background,
  },
  pieCenter: {
    width: 66, height: 66, borderRadius: 33, backgroundColor: theme.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  pieCenterValue: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  pieCenterLabel: { fontSize: 10, color: theme.textSecondary, marginTop: 2 },
  legend:         { gap: 8, flexShrink: 1 },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot:      { width: 9, height: 9, borderRadius: 5 },
  legendLabel:    { fontSize: 12, color: theme.textSecondary, flex: 1 },
  legendValue:    { fontSize: 12, fontWeight: '700', color: theme.textPrimary },

  // ── Section divider ───────────────────────────────────────────────────────
  sectionDivider: {
    height: 1, backgroundColor: theme.border, marginVertical: 24,
    marginHorizontal: -16,
  },

  // ── Intelligence section ──────────────────────────────────────────────────
  intelHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4,
  },
  intelTitle:    { fontSize: 17, fontWeight: '700', color: theme.textPrimary },
  intelSubtitle: { fontSize: 13, color: theme.textSecondary, marginBottom: 12 },

  // Freshness badge
  freshnessBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1,
  },
  freshnessBadgeFresh: { backgroundColor: colors.successBg, borderColor: colors.success },
  freshnessBadgeStale: { backgroundColor: colors.warningBg, borderColor: colors.warning },
  freshnessDot:  { width: 7, height: 7, borderRadius: 4 },
  freshnessText: { fontSize: 11, fontWeight: '600' },

  // Controls
  inputLabel: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: theme.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: theme.background,
    minHeight: 42,
  },
  pickerBtnText:        { flex: 1, fontSize: 13, color: theme.textPrimary, marginRight: 6 },
  pickerBtnPlaceholder: { color: theme.textMuted },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  pickerDropdown: {
    backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1,
    borderColor: theme.border, width: '100%', maxWidth: 520, ...shadows.card,
  },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  pickerItemActive: { backgroundColor: primaryScale[50] },
  pickerItemText:   { flex: 1, fontSize: 13, color: theme.textSecondary, marginRight: 8 },
  pickerItemSub:    { fontSize: 11, color: theme.textMuted, marginTop: 2 },

  dateRow:  { flexDirection: 'row', gap: 12, marginBottom: 4 },
  dateInput: {
    borderWidth: 1, borderColor: theme.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: theme.background,
    fontSize: 13, color: theme.textPrimary, minHeight: 42,
  },

  noClassPlaceholder: {
    backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1,
    borderColor: theme.border, padding: 32, alignItems: 'center', marginBottom: 16,
  },
  noClassText: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },

  // Unavailable / error box
  unavailableBox: {
    backgroundColor: colors.warningBg, borderRadius: 12, borderWidth: 1,
    borderColor: colors.warning, padding: 14, marginVertical: 8,
  },
  unavailableTitle: { fontSize: 14, fontWeight: '700', color: colors.warning, marginBottom: 4 },
  unavailableBody:  { fontSize: 12, color: colors.warning, lineHeight: 18 },

  // Threshold note
  thresholdNote: { fontSize: 11, color: theme.textMuted, marginBottom: 8, fontStyle: 'italic' },

  // Risk list
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface,
  },
  chipActive:     { backgroundColor: primaryScale[600], borderColor: primaryScale[600] },
  chipText:       { fontSize: 12, fontWeight: '500', color: theme.textSecondary },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },

  riskRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: theme.border, gap: 12,
  },
  riskStudentId: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  riskDetail:    { fontSize: 11, color: theme.textSecondary, marginTop: 2 },
  riskBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
  riskDot:       { width: 6, height: 6, borderRadius: 3 },
  riskBadgeText: { fontSize: 11, fontWeight: '700' },

  paginationRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, paddingTop: 12,
  },
  pageBtn:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText:     { fontSize: 13, color: theme.textSecondary, fontWeight: '600' },
  pageInfo:        { fontSize: 13, color: theme.textSecondary },

  // Recovery simulator
  simulatorCard: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 20, padding: 16, marginBottom: 16, gap: 12, ...shadows.card,
  },
  simulatorTitle:    { fontSize: 15, fontWeight: '700', color: theme.textPrimary },
  simulatorSubtitle: { fontSize: 12, color: theme.textSecondary, lineHeight: 18 },
  simInputRow:       { flexDirection: 'row', gap: 12 },
  simInput: {
    borderWidth: 1, borderColor: theme.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: theme.background,
    fontSize: 13, color: theme.textPrimary, minHeight: 42,
  },
  simBtn: {
    backgroundColor: primaryScale[600], borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  simBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  simResult: {
    borderWidth: 1, borderRadius: 12, padding: 12, gap: 8, marginTop: 4,
  },
  simResultLine: { fontSize: 12, color: theme.textSecondary },
  simOutcome: { borderRadius: 8, padding: 10 },
  simOutcomeValue: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  simOutcomeExpl:  { fontSize: 12, lineHeight: 17 },
  simDisclaimer:   { fontSize: 11, color: theme.textMuted, fontStyle: 'italic', lineHeight: 16 },
});
