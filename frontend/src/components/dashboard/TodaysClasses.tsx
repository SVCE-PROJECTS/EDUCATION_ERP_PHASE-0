import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  TIMETABLE, JS_DAY_TO_KEY, BREAK_TYPES,
  getPeriodStatus, type DayKey, type PeriodStatus,
} from '../../data/timetable';
import Colors from '../../theme/colors';

interface ClassItem {
  time:    string;
  subject: string;
  room:    string;
  status:  PeriodStatus;
}

const SUBJECT_COLORS: Record<string, string> = {
  ADA:   Colors.primary,  DBMS:  Colors.warning,
  DMS:   Colors.purple,   MC:    Colors.success,
  BCE:   Colors.orange,   GITS:  Colors.success,
  UHV:   Colors.danger,   PL:    Colors.secondary,
};

function subjectColor(s: string): string {
  const key = Object.keys(SUBJECT_COLORS).find(k => s.startsWith(k));
  return key ? SUBJECT_COLORS[key] : Colors.primary;
}

export default function TodaysClasses() {
  const router    = useRouter();
  const now       = new Date();
  const dayKey    = JS_DAY_TO_KEY[now.getDay()] as DayKey | undefined;
  const nowHour   = now.getHours() + now.getMinutes() / 60;
  const isWeekday = now.getDay() >= 1 && now.getDay() <= 6;

  const classes = useMemo<ClassItem[]>(() => {
    if (!dayKey) return [];
    return (TIMETABLE[dayKey] ?? [])
      .filter(p => !BREAK_TYPES.has(p.subject))
      .slice(0, 4)
      .map(p => ({
        time:    p.time,
        subject: p.subject,
        room:    p.room,
        // Use actual start AND end from the period string — fixes 2-hour labs
        status:  getPeriodStatus(p.time, nowHour, true),
      }));
  }, [dayKey, nowHour]);

  const doneCount     = classes.filter(c => c.status === 'done').length;
  const upcomingCount = classes.filter(c => c.status === 'upcoming').length;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Today's Classes</Text>
        <TouchableOpacity onPress={() => router.push('/timetable')}>
          <Text style={styles.viewAll}>Full →</Text>
        </TouchableOpacity>
      </View>

      {isWeekday && classes.length > 0 && (
        <View style={styles.miniSummary}>
          <View style={[styles.miniBadge, { backgroundColor: Colors.successLight }]}>
            <Text style={[styles.miniBadgeText, { color: Colors.success }]}>✓ {doneCount} done</Text>
          </View>
          <View style={[styles.miniBadge, { backgroundColor: Colors.primaryLight }]}>
            <Text style={[styles.miniBadgeText, { color: Colors.primary }]}>{upcomingCount} left</Text>
          </View>
        </View>
      )}

      {!isWeekday ? (
        <View style={styles.holiday}>
          <Text style={styles.holidayEmoji}>🌴</Text>
          <Text style={styles.holidayText}>Sunday — No Classes</Text>
        </View>
      ) : classes.length === 0 ? (
        <Text style={styles.noClass}>No classes scheduled today</Text>
      ) : (
        classes.map((item, idx) => {
          const dotColor = subjectColor(item.subject);
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.row, item.status === 'done' && styles.rowDone]}
              onPress={() => router.push('/timetable')}
              activeOpacity={0.7}
            >
              <View style={[styles.dot, { backgroundColor: item.status === 'done' ? Colors.border : dotColor }]} />
              <View style={styles.details}>
                <Text style={[styles.subject, item.status === 'done' && styles.subjectDone]} numberOfLines={1}>
                  {item.subject}
                </Text>
                <Text style={styles.meta}>{item.time}{item.room ? ` · ${item.room}` : ''}</Text>
              </View>
              {item.status === 'now' && (
                <View style={[styles.nowPill, { backgroundColor: dotColor + '20' }]}>
                  <Text style={[styles.nowText, { color: dotColor }]}>● NOW</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5,
    flex: 1, marginTop: 12,
  },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  heading:       { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  viewAll:       { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  miniSummary:   { flexDirection: 'row', gap: 6, marginBottom: 10 },
  miniBadge:     { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  miniBadgeText: { fontSize: 10, fontWeight: '700' },
  row:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 8 },
  rowDone:       { opacity: 0.5 },
  dot:           { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  details:       { flex: 1 },
  subject:       { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  subjectDone:   { textDecorationLine: 'line-through', color: Colors.textMuted },
  meta:          { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  nowPill:       { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  nowText:       { fontSize: 9, fontWeight: '800' },
  holiday:       { alignItems: 'center', paddingVertical: 16, gap: 4 },
  holidayEmoji:  { fontSize: 28 },
  holidayText:   { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  noClass:       { fontSize: 12, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
});
