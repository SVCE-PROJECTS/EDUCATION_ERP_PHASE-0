/**
 * Timetable Screen
 *
 * API: GET /api/students/semesters/:semester/sections/:section
 * → response.data.timetable: TimetableEntry[]
 *
 * Strategy:
 *   1. Read the faculty's assigned classes from ClassesContext
 *      (GET /api/faculty/me/classes) — gives us every unique
 *      semester_number + section_name combination.
 *   2. Deduplicate to get distinct semester+section pairs.
 *   3. For each pair call getSectionDashboard and collect timetable rows.
 *   4. Filter rows where String(entry.facultyId) === String(faculty.faculty_id)
 *      so only this faculty's own slots are shown.
 *   5. Group by day for a clean weekly view.
 *
 * Why filter by faculty_id (numeric PK)?
 *   The timetable repository returns the numeric faculty_id from the
 *   classes table JOIN — NOT the string employee_id. The faculty profile
 *   stored in AuthContext has both:
 *     faculty.faculty_id  (numeric PK, e.g. 1)
 *     faculty.employeeId  (string, e.g. "EMP001")
 *   We compare String(entry.facultyId) === String(faculty.faculty_id).
 *
 * Pull-to-refresh reloads all section dashboards.
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
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { useClasses } from '../context/ClassesContext';
import { getSectionDashboard } from '../services/studentsApi';
import type { TimetableEntry, DayOfWeek } from '../types/timetable';
import { colors, spacing, typography, radius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Timetable'>;

// Canonical day order matching studentList.service.js DAY_ORDER
const DAY_ORDER: DayOfWeek[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

const DAY_SHORT: Record<DayOfWeek, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

// Period slot label helpers
const PERIOD_LABELS: Record<number, string> = {
  1: '8:00–9:00',
  2: '9:00–10:00',
  3: '10:15–11:15',
  4: '11:15–12:15',
  5: '1:00–2:00',
  6: '2:00–3:00',
  7: '3:15–4:15',
  8: '4:15–5:15',
};

const periodLabel = (period: number) =>
  PERIOD_LABELS[period] ?? `Period ${period}`;

// Subject colour cycling (consistent per subject name)
const SUBJECT_COLORS = [
  { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' },
  { bg: '#F0FDF4', border: '#22C55E', text: '#15803D' },
  { bg: '#FFF7ED', border: '#F97316', text: '#C2410C' },
  { bg: '#FAF5FF', border: '#A855F7', text: '#7E22CE' },
  { bg: '#ECFDF5', border: '#10B981', text: '#065F46' },
  { bg: '#FEF3C7', border: '#F59E0B', text: '#B45309' },
];

const subjectColorIndex = (() => {
  const map = new Map<string, number>();
  let counter = 0;
  return (name: string) => {
    if (!map.has(name)) map.set(name, counter++ % SUBJECT_COLORS.length);
    return SUBJECT_COLORS[map.get(name)!];
  };
})();

// Group timetable entries by day
const groupByDay = (
  entries: TimetableEntry[],
): Map<DayOfWeek, TimetableEntry[]> => {
  const map = new Map<DayOfWeek, TimetableEntry[]>();
  for (const day of DAY_ORDER) map.set(day, []);
  for (const entry of entries) {
    const day = entry.day as DayOfWeek;
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(entry);
  }
  // Sort each day's slots by period
  map.forEach((slots) => slots.sort((a, b) => a.period - b.period));
  return map;
};

const TimetableScreen: React.FC<Props> = ({ navigation }) => {
  const { faculty } = useAuth();
  const { classes, loading: classesLoading } = useClasses();

  const [myEntries, setMyEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<DayOfWeek>('Monday');

  /**
   * Build a deduplicated list of semester+section pairs from the faculty's
   * assigned classes, then fetch section dashboards and collect timetable rows
   * that belong to this faculty.
   */
  const load = useCallback(async () => {
    if (!faculty || classes.length === 0) return;
    setError(null);

    // Deduplicate: each unique (semester_number, section_name) pair
    const pairs = Array.from(
      new Map(
        classes.map((c) => [
          `${c.semester_number}|${c.section_name}`,
          { semester: c.semester_number, section: c.section_name },
        ]),
      ).values(),
    );

    if (pairs.length === 0) {
      setMyEntries([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Fetch all section dashboards in parallel
      const results = await Promise.allSettled(
        pairs.map((p) => getSectionDashboard(p.semester, p.section)),
      );

      // Collect and filter only this faculty's timetable rows
      // faculty_id and facultyId are both present in the profile (pg returns as string)
      const myId = String(faculty.faculty_id ?? faculty.employeeId ?? '');
      const collected: TimetableEntry[] = [];

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          result.value.timetable
            .filter((e) => String(e.facultyId) === myId)
            .forEach((e) => collected.push(e));
        }
      });

      // Deduplicate by day+period (same slot may appear across multiple fetches)
      const seen = new Set<string>();
      const deduped = collected.filter((e) => {
        const key = `${e.day}|${e.period}|${e.subjectCode}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setMyEntries(deduped);

      // Default active day to today if it has classes, else first day with classes
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
      const grouped = groupByDay(deduped);
      const hasTodayClasses = (grouped.get(today)?.length ?? 0) > 0;
      if (hasTodayClasses) {
        setActiveDay(today);
      } else {
        const firstWithClasses = DAY_ORDER.find(
          (d) => (grouped.get(d)?.length ?? 0) > 0,
        );
        if (firstWithClasses) setActiveDay(firstWithClasses);
      }
    } catch (err: unknown) {
      setError(
        (err as { message?: string }).message ?? 'Failed to load timetable.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [faculty, classes]);

  useEffect(() => {
    if (!classesLoading && classes.length >= 0) {
      setLoading(true);
      load();
    }
  }, [classesLoading, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const grouped = groupByDay(myEntries);
  const activeDaySlots = grouped.get(activeDay) ?? [];

  // Total classes today
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
  const todayCount = grouped.get(today)?.length ?? 0;

  if (loading || classesLoading) {
    return (
      <ScreenLayout navigation={navigation} activeScreen="Timetable">
        <LoadingIndicator fullScreen message="Loading timetable…" />
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout navigation={navigation} activeScreen="Timetable">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>My Timetable</Text>
            <Text style={styles.pageSubtitle}>
              {myEntries.length > 0
                ? `${myEntries.length} total slot${myEntries.length !== 1 ? 's' : ''} · ${todayCount} today`
                : 'No timetable data yet'}
            </Text>
          </View>
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>{today.slice(0, 3)}</Text>
          </View>
        </View>

        {error && (
          <ErrorMessage message={error} onRetry={() => { setLoading(true); load(); }} />
        )}

        {!error && myEntries.length === 0 && !loading && (
          <EmptyState
            icon="🗓️"
            title="No timetable entries"
            message="No timetable slots are assigned to you yet. Contact your department coordinator."
          />
        )}

        {myEntries.length > 0 && (
          <>
            {/* Day selector tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dayTabsScroll}
              contentContainerStyle={styles.dayTabsContent}
            >
              {DAY_ORDER.map((day) => {
                const count = grouped.get(day)?.length ?? 0;
                const isToday = day === today;
                const isActive = day === activeDay;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayTab,
                      isActive && styles.dayTabActive,
                      isToday && !isActive && styles.dayTabToday,
                    ]}
                    onPress={() => setActiveDay(day)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`${day}${count > 0 ? `, ${count} class${count !== 1 ? 'es' : ''}` : ', no classes'}`}
                  >
                    <Text
                      style={[
                        styles.dayTabText,
                        isActive && styles.dayTabTextActive,
                        isToday && !isActive && styles.dayTabTextToday,
                      ]}
                    >
                      {DAY_SHORT[day]}
                    </Text>
                    {count > 0 && (
                      <View
                        style={[
                          styles.dayTabDot,
                          isActive && styles.dayTabDotActive,
                        ]}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Active day label */}
            <View style={styles.activeDayHeader}>
              <Text style={styles.activeDayName}>
                {activeDay}
                {activeDay === today ? '  (Today)' : ''}
              </Text>
              <Text style={styles.activeDayCount}>
                {activeDaySlots.length} class{activeDaySlots.length !== 1 ? 'es' : ''}
              </Text>
            </View>

            {/* Slots for active day */}
            {activeDaySlots.length === 0 ? (
              <Card>
                <View style={styles.emptyDay}>
                  <Text style={styles.emptyDayIcon}>🎉</Text>
                  <Text style={styles.emptyDayText}>No classes on {activeDay}</Text>
                </View>
              </Card>
            ) : (
              activeDaySlots.map((slot, idx) => {
                const clr = subjectColorIndex(slot.subject);
                return (
                  <View
                    key={`${slot.day}-${slot.period}-${slot.subjectCode}`}
                    style={[
                      styles.slotCard,
                      { borderLeftColor: clr.border, backgroundColor: clr.bg },
                    ]}
                  >
                    {/* Period pill */}
                    <View style={[styles.periodPill, { backgroundColor: clr.border }]}>
                      <Text style={styles.periodPillText}>P{slot.period}</Text>
                    </View>

                    <View style={styles.slotBody}>
                      {/* Subject */}
                      <Text style={[styles.subjectName, { color: clr.text }]}>
                        {slot.subject}
                      </Text>
                      <Text style={[styles.subjectCode, { color: clr.border }]}>
                        {slot.subjectCode}
                      </Text>

                      {/* Time & Room row */}
                      <View style={styles.slotMeta}>
                        <View style={styles.metaChip}>
                          <Text style={styles.metaIcon}>🕐</Text>
                          <Text style={styles.metaText}>{periodLabel(slot.period)}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Period number large display */}
                    <View style={styles.periodNumber}>
                      <Text style={[styles.periodNumberText, { color: clr.border }]}>
                        {slot.period}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}

            {/* Weekly summary */}
            <Text style={styles.sectionTitle}>Weekly Summary</Text>
            <Card noPadding>
              {DAY_ORDER.map((day, idx) => {
                const slots = grouped.get(day) ?? [];
                const isToday = day === today;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.summaryRow,
                      idx < DAY_ORDER.length - 1 && styles.summaryBorder,
                      isToday && styles.summaryRowToday,
                    ]}
                    onPress={() => setActiveDay(day)}
                    accessibilityRole="button"
                    accessibilityLabel={`${day}: ${slots.length} classes`}
                  >
                    <View style={styles.summaryDayWrap}>
                      <Text style={[styles.summaryDay, isToday && styles.summaryDayToday]}>
                        {day}
                      </Text>
                      {isToday && (
                        <View style={styles.todayPill}>
                          <Text style={styles.todayPillText}>Today</Text>
                        </View>
                      )}
                    </View>

                    {slots.length === 0 ? (
                      <Text style={styles.summaryFree}>Free day</Text>
                    ) : (
                      <View style={styles.summarySubjects}>
                        {slots.map((s) => {
                          const clr = subjectColorIndex(s.subject);
                          return (
                            <View
                              key={`${s.period}-${s.subjectCode}`}
                              style={[styles.summarySubjectChip, { backgroundColor: clr.bg }]}
                            >
                              <Text style={[styles.summarySubjectText, { color: clr.text }]}>
                                P{s.period} · {s.subjectCode}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </Card>
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 60 },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  pageTitle: { ...typography.h2, color: colors.textPrimary },
  pageSubtitle: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  todayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  todayBadgeText: { ...typography.bodyBold, color: colors.white },

  // Day tabs
  dayTabsScroll: { marginBottom: spacing.md },
  dayTabsContent: { gap: spacing.sm, paddingBottom: spacing.xs },
  dayTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    minWidth: 52,
  },
  dayTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayTabToday: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  dayTabText: { ...typography.smallBold, color: colors.textSecondary },
  dayTabTextActive: { color: colors.white },
  dayTabTextToday: { color: colors.primary },
  dayTabDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 3,
  },
  dayTabDotActive: { backgroundColor: colors.white },

  activeDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activeDayName: { ...typography.h4, color: colors.textPrimary },
  activeDayCount: { ...typography.small, color: colors.textSecondary },

  // Slot cards
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  periodPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodPillText: { ...typography.smallBold, color: colors.white },
  slotBody: { flex: 1 },
  subjectName: { ...typography.bodyBold, marginBottom: 1 },
  subjectCode: { ...typography.caption, marginBottom: spacing.xs },
  slotMeta: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaIcon: { fontSize: 11 },
  metaText: { ...typography.caption, color: colors.textSecondary },
  periodNumber: {
    width: 32,
    alignItems: 'center',
  },
  periodNumberText: {
    fontSize: 28,
    fontWeight: '800',
    opacity: 0.25,
  },

  emptyDay: { alignItems: 'center', paddingVertical: spacing.md },
  emptyDayIcon: { fontSize: 28, marginBottom: spacing.sm },
  emptyDayText: { ...typography.body, color: colors.textSecondary },

  // Weekly summary
  sectionTitle: {
    ...typography.h4,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  summaryRow: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  summaryRowToday: { backgroundColor: colors.primaryLight },
  summaryDayWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  summaryDay: { ...typography.bodyBold, color: colors.textPrimary },
  summaryDayToday: { color: colors.primary },
  todayPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  todayPillText: { ...typography.caption, color: colors.white },
  summaryFree: { ...typography.small, color: colors.textMuted },
  summarySubjects: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  summarySubjectChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  summarySubjectText: { ...typography.caption, fontWeight: '600' },
});

export default TimetableScreen;
