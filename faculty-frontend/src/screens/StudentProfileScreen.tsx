/**
 * Student Profile Screen
 *
 * API: GET /api/students/:id/profile   (:id = library_id string)
 *
 * Returns: {
 *   student, attendanceSummary, overallAttendance,
 *   recentAttendance, iaMarks, assignments, achievements
 * }
 *
 * Shows comprehensive profile with tabs: Overview, Attendance, IA Marks, Achievements.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ScreenHeader from '../components/ScreenHeader';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { getStudentProfile } from '../services/studentsApi';
import type { StudentProfile, StudentAttendanceSummary } from '../types/student';
import type { IAMark } from '../types/iaMarks';
import type { Achievement } from '../types/achievement';
import { colors, spacing, typography, radius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentProfile'>;
type Tab = 'overview' | 'attendance' | 'marks' | 'achievements';

const StudentProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { studentId, studentName } = route.params;

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getStudentProfile(studentId);
      setProfile(data);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to load profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'marks', label: 'IA Marks' },
    { key: 'achievements', label: 'Achievements' },
  ];

  if (loading) return (
    <View style={styles.screen}>
      <ScreenHeader title={studentName ?? 'Student Profile'} onBack={() => navigation.goBack()} />
      <LoadingIndicator fullScreen message="Loading profile…" />
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title={profile?.student.name ?? studentName ?? 'Student Profile'}
        subtitle={profile?.student.usn ?? undefined}
        onBack={() => navigation.goBack()}
      />

      {error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : null}

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {profile && (
          <>
            {activeTab === 'overview' && <OverviewTab profile={profile} />}
            {activeTab === 'attendance' && <AttendanceTab profile={profile} />}
            {activeTab === 'marks' && <MarksTab marks={profile.iaMarks ?? []} />}
            {activeTab === 'achievements' && <AchievementsTab achievements={profile.achievements ?? []} />}
          </>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Overview Tab ─────────────────────────────────────────────────────────────
const OverviewTab: React.FC<{ profile: StudentProfile }> = ({ profile }) => {
  const { student, overallAttendance } = profile;
  const attColor = overallAttendance >= 75 ? colors.success : overallAttendance >= 50 ? colors.warning : colors.danger;

  return (
    <>
      <Card>
        <Text style={tabStyles.sectionTitle}>Student Information</Text>
        <InfoRow label="Name" value={student.name} />
        <InfoRow label="USN" value={student.usn ?? '—'} />
        <InfoRow label="Email" value={student.email ?? '—'} />
        <InfoRow label="Phone" value={student.phone ?? '—'} />
        <InfoRow label="Gender" value={student.gender} />
        <InfoRow label="Program" value={student.program_name ?? '—'} />
        <InfoRow label="Department" value={student.department_name ?? '—'} />
        <InfoRow label="Semester" value={String(student.semester ?? '—')} />
        <InfoRow label="Section" value={student.section ?? '—'} />
        <InfoRow label="Academic Year" value={student.academic_year} />
        <View style={tabStyles.statusRow}>
          <Text style={tabStyles.infoLabel}>Status</Text>
          <StatusBadge
            label={student.status}
            variant={
              student.status === 'Enrolled' ? 'success'
              : student.status === 'On Leave' ? 'warning'
              : 'muted'
            }
          />
        </View>
      </Card>

      <Card>
        <Text style={tabStyles.sectionTitle}>Overall Attendance</Text>
        <View style={tabStyles.bigStatWrap}>
          <Text style={[tabStyles.bigStat, { color: attColor }]}>{overallAttendance}%</Text>
          <Text style={tabStyles.bigStatLabel}>
            {overallAttendance >= 75 ? '✓ Good standing' : overallAttendance >= 50 ? '⚠ At risk' : '✗ Low attendance'}
          </Text>
        </View>
      </Card>
    </>
  );
};

// ─── Attendance Tab ───────────────────────────────────────────────────────────
const AttendanceTab: React.FC<{ profile: StudentProfile }> = ({ profile }) => (
  <>
    <Text style={tabStyles.tabHeading}>Subject-wise Attendance</Text>
    {profile.attendanceSummary.length === 0 ? (
      <Card><Text style={tabStyles.emptyText}>No attendance records yet.</Text></Card>
    ) : (
      <Card noPadding>
        {profile.attendanceSummary.map((row: StudentAttendanceSummary, idx) => {
          const pctColor = row.percent >= 75 ? colors.success : row.percent >= 50 ? colors.warning : colors.danger;
          return (
            <View
              key={row.subject}
              style={[tabStyles.attRow, idx < profile.attendanceSummary.length - 1 && tabStyles.rowBorder]}
            >
              <View style={tabStyles.attSubject}>
                <Text style={tabStyles.attSubjectName} numberOfLines={2}>{row.subject}</Text>
                <Text style={tabStyles.attCount}>{row.present}/{row.total} classes</Text>
              </View>
              <Text style={[tabStyles.attPct, { color: pctColor }]}>{row.percent}%</Text>
            </View>
          );
        })}
      </Card>
    )}

    {profile.recentAttendance.length > 0 && (
      <>
        <Text style={[tabStyles.tabHeading, { marginTop: spacing.lg }]}>Recent Records</Text>
        <Card noPadding>
          {profile.recentAttendance.slice(0, 10).map((r, idx) => (
            <View
              key={idx}
              style={[tabStyles.recentRow, idx < 9 && tabStyles.rowBorder]}
            >
              <Text style={tabStyles.recentSubject} numberOfLines={1}>{r.subject}</Text>
              <Text style={tabStyles.recentDate}>{r.attendance_date?.split('T')[0]}</Text>
              <StatusBadge
                label={r.status}
                variant={r.status === 'Present' ? 'success' : 'danger'}
              />
            </View>
          ))}
        </Card>
      </>
    )}
  </>
);

// ─── Marks Tab ────────────────────────────────────────────────────────────────
const MarksTab: React.FC<{ marks: IAMark[] }> = ({ marks }) => (
  <>
    <Text style={tabStyles.tabHeading}>IA Marks</Text>
    {marks.length === 0 ? (
      <Card><Text style={tabStyles.emptyText}>No IA marks recorded yet.</Text></Card>
    ) : (
      <Card noPadding>
        <View style={[tabStyles.marksHeader, tabStyles.marksRow]}>
          <Text style={[tabStyles.marksSubject, tabStyles.marksHeaderText]}>Subject</Text>
          <Text style={[tabStyles.markCell, tabStyles.marksHeaderText]}>IA1</Text>
          <Text style={[tabStyles.markCell, tabStyles.marksHeaderText]}>IA2</Text>
          <Text style={[tabStyles.markCell, tabStyles.marksHeaderText]}>IA3</Text>
          <Text style={[tabStyles.markCell, tabStyles.marksHeaderText]}>Avg</Text>
        </View>
        {marks.map((m, idx) => {
          const avgColor = Number(m.average ?? 0) >= 80 ? colors.success : Number(m.average ?? 0) >= 60 ? colors.warning : colors.danger;
          return (
            <View key={m.ia_id} style={[tabStyles.marksRow, idx < marks.length - 1 && tabStyles.rowBorder]}>
              <View style={tabStyles.marksSubject}>
                <Text style={tabStyles.marksSubjectName} numberOfLines={2}>{m.subject_name}</Text>
                <Text style={tabStyles.marksSubjectCode}>{m.subject_code}</Text>
              </View>
              <Text style={tabStyles.markCell}>{m.ia1 ?? '—'}</Text>
              <Text style={tabStyles.markCell}>{m.ia2 ?? '—'}</Text>
              <Text style={tabStyles.markCell}>{m.ia3 ?? '—'}</Text>
              <Text style={[tabStyles.markCell, { color: avgColor, fontWeight: '700' }]}>
                {m.average != null ? Number(m.average).toFixed(1) : '—'}
              </Text>
            </View>
          );
        })}
      </Card>
    )}
  </>
);

// ─── Achievements Tab ─────────────────────────────────────────────────────────
const AchievementsTab: React.FC<{ achievements: Achievement[] }> = ({ achievements }) => (
  <>
    <Text style={tabStyles.tabHeading}>Achievements</Text>
    {achievements.length === 0 ? (
      <Card><Text style={tabStyles.emptyText}>No achievements recorded.</Text></Card>
    ) : (
      achievements.map((a) => (
        <Card key={a.achievement_id}>
          <View style={tabStyles.achHeader}>
            <Text style={tabStyles.achTitle} numberOfLines={2}>{a.title}</Text>
            <StatusBadge label={a.type} variant="info" />
          </View>
          {a.level && <Text style={tabStyles.achLevel}>{a.level}</Text>}
          {a.position && <Text style={tabStyles.achMeta}>Position: {a.position}</Text>}
          {a.achievement_date && (
            <Text style={tabStyles.achMeta}>
              Date: {new Date(a.achievement_date).toLocaleDateString('en-IN')}
            </Text>
          )}
        </Card>
      ))
    )}
  </>
);

// ─── InfoRow helper ───────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={tabStyles.infoRow}>
    <Text style={tabStyles.infoLabel}>{label}</Text>
    <Text style={tabStyles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  tabBar: { maxHeight: 50, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tabBarContent: { paddingHorizontal: spacing.md, gap: spacing.xs, alignItems: 'center' },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  tabActive: { backgroundColor: colors.primaryLight },
  tabText: { ...typography.smallBold, color: colors.textSecondary },
  tabTextActive: { color: colors.primary },
  body: { flex: 1 },
  bodyContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
});

const tabStyles = StyleSheet.create({
  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.md },
  tabHeading: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: { ...typography.small, color: colors.textSecondary, flex: 1 },
  infoValue: { ...typography.bodyBold, color: colors.textPrimary, flex: 2, textAlign: 'right' },
  bigStatWrap: { alignItems: 'center', paddingVertical: spacing.md },
  bigStat: { fontSize: 56, fontWeight: '700' },
  bigStatLabel: { ...typography.bodyBold, color: colors.textSecondary, marginTop: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  attRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.md },
  attSubject: { flex: 1 },
  attSubjectName: { ...typography.bodyBold, color: colors.textPrimary },
  attCount: { ...typography.caption, color: colors.textSecondary },
  attPct: { ...typography.h4, minWidth: 48, textAlign: 'right' },
  recentRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, gap: spacing.sm },
  recentSubject: { flex: 1, ...typography.small, color: colors.textPrimary },
  recentDate: { ...typography.caption, color: colors.textSecondary },
  marksRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, gap: spacing.xs },
  marksHeader: { backgroundColor: colors.primaryLight, paddingVertical: spacing.md },
  marksHeaderText: { ...typography.smallBold, color: colors.primaryDark },
  marksSubject: { flex: 2.5 },
  marksSubjectName: { ...typography.small, color: colors.textPrimary, fontWeight: '600' },
  marksSubjectCode: { ...typography.caption, color: colors.textSecondary },
  markCell: { flex: 1, ...typography.small, color: colors.textPrimary, textAlign: 'center' },
  achHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  achTitle: { ...typography.bodyBold, color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  achLevel: { ...typography.smallBold, color: colors.primary, marginBottom: 2 },
  achMeta: { ...typography.caption, color: colors.textSecondary },
});

export default StudentProfileScreen;
