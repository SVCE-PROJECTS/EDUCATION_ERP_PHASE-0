/**
 * Dashboard Screen
 *
 * APIs:
 *   GET /api/dashboard/stats            → DashboardStats
 *   GET /api/dashboard/weekly-attendance → WeeklyAttendanceDay[]
 *   GET /api/faculty/me/classes          → FacultyClass[] (from ClassesContext)
 *
 * Shows: stat cards, weekly attendance bar chart, recent activities, class list.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ScreenLayout from '../components/ScreenLayout';
import StatCard from '../components/StatCard';
import Card from '../components/Card';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import { useClasses } from '../context/ClassesContext';
import { getDashboardStats, getWeeklyAttendance } from '../services/dashboardApi';
import type { DashboardStats, WeeklyAttendanceDay } from '../types';
import { colors, spacing, typography } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { faculty } = useAuth();
  const { classes, loading: classesLoading } = useClasses();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyAttendanceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [s, w] = await Promise.all([
        getDashboardStats(),
        getWeeklyAttendance(),
      ]);
      setStats(s);
      setWeekly(w);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to load dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) return (
    <ScreenLayout navigation={navigation} activeScreen="Dashboard">
      <LoadingIndicator fullScreen message="Loading dashboard…" />
    </ScreenLayout>
  );

  return (
    <ScreenLayout navigation={navigation} activeScreen="Dashboard">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome banner */}
        <View style={styles.banner}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{faculty?.name ?? 'Faculty'}</Text>
            <Text style={styles.dept}>
              {faculty?.designation ?? ''}{faculty?.departmentCode ? ` · ${faculty.departmentCode}` : ''}
            </Text>
          </View>
          <Text style={styles.bannerEmoji}>👋</Text>
        </View>

        {error && <ErrorMessage message={error} onRetry={load} />}

        {/* Stat cards */}
        {stats && (
          <>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard
                label="Total Students"
                value={stats.totalStudents}
                icon="👥"
                color={colors.primary}
                bgColor={colors.primaryLight}
              />
              <StatCard
                label="Attendance"
                value={`${stats.attendancePercent}%`}
                icon="📋"
                color={colors.success}
                bgColor={colors.successBg}
              />
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                label="Assignments"
                value={stats.totalAssignments}
                icon="📝"
                color={colors.warning}
                bgColor={colors.warningBg}
              />
              <StatCard
                label="Open Tasks"
                value={stats.openAssignments}
                icon="🔓"
                color={colors.info}
                bgColor={colors.infoBg}
              />
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                label="IA Average"
                value={stats.iaAverage}
                icon="📊"
                color={colors.primaryDark}
                bgColor={colors.primaryLight}
              />
            </View>
          </>
        )}

        {/* Weekly attendance chart */}
        {weekly.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Weekly Attendance</Text>
            <Card>
              <View style={styles.chartRow}>
                {weekly.map((day) => (
                  <View key={day.date} style={styles.chartCol}>
                    <Text style={styles.chartPct}>{day.percent}%</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${Math.max(day.percent, 4)}%` as unknown as number,
                            backgroundColor: day.percent >= 75
                              ? colors.success
                              : day.percent >= 50
                              ? colors.warning
                              : colors.danger,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.chartDay}>{day.day}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}

        {/* My classes */}
        <Text style={styles.sectionTitle}>My Classes</Text>
        {classesLoading ? (
          <LoadingIndicator message="Loading classes…" />
        ) : classes.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No classes assigned yet.</Text>
          </Card>
        ) : (
          <Card noPadding>
            {classes.map((cls, idx) => (
              <View
                key={cls.class_id}
                style={[
                  styles.classRow,
                  idx < classes.length - 1 && styles.classRowBorder,
                ]}
              >
                <View style={styles.classIcon}>
                  <Text style={styles.classIconText}>📚</Text>
                </View>
                <View style={styles.classInfo}>
                  <Text style={styles.classSubject}>{cls.subject_name}</Text>
                  <Text style={styles.classMeta}>
                    Sem {cls.semester_number} · Sec {cls.section_name} · {cls.subject_code}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Recent activities */}
        {stats && stats.recentActivities.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Card>
              {stats.recentActivities.map((activity, idx) => (
                <View key={idx} style={styles.activityRow}>
                  <Text style={styles.activityDot}>•</Text>
                  <Text style={styles.activityText}>{activity}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {[
            { label: 'Mark Attendance', icon: '📋', screen: 'Attendance' as keyof RootStackParamList },
            { label: 'Enter IA Marks', icon: '📊', screen: 'IAMarks' as keyof RootStackParamList },
            { label: 'New Assignment', icon: '📝', screen: 'Assignments' as keyof RootStackParamList },
            { label: 'AI Checker', icon: '🔍', screen: 'AIChecker' as keyof RootStackParamList },
            { label: 'Timetable',  icon: '🗓️', screen: 'Timetable'  as keyof RootStackParamList },
          ].map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={styles.quickCard}
              onPress={() => navigation.navigate(item.screen as never)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Text style={styles.quickIcon}>{item.icon}</Text>
              <Text style={styles.quickLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  banner: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  greeting: { ...typography.body, color: 'rgba(255,255,255,0.8)' },
  name: { ...typography.h3, color: colors.white, marginTop: 2 },
  dept: { ...typography.caption, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  bannerEmoji: { fontSize: 36 },
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: spacing.xs,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartPct: { ...typography.caption, color: colors.textSecondary, marginBottom: 2, fontSize: 9 },
  barTrack: {
    width: '80%',
    height: 80,
    backgroundColor: colors.border,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: { width: '100%', borderRadius: 4 },
  chartDay: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  classRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  classIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classIconText: { fontSize: 20 },
  classInfo: { flex: 1 },
  classSubject: { ...typography.bodyBold, color: colors.textPrimary },
  classMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  activityRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  activityDot: { color: colors.primary, fontSize: 18, lineHeight: 22 },
  activityText: { ...typography.body, color: colors.textSecondary, flex: 1 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  quickCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickIcon: { fontSize: 28 },
  quickLabel: { ...typography.smallBold, color: colors.textPrimary, textAlign: 'center' },
});

export default DashboardScreen;
