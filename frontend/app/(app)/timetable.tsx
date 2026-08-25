/**
 * timetable.tsx — Full weekly timetable screen
 *
 * Uses src/data/timetable.ts as single source of truth.
 * Period status uses actual start+end times (fixes 2-hour labs).
 * Faculty name comes from AuthContext — no hardcoded strings.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  TIMETABLE, STAFF, DAYS, DAY_FULL, JS_DAY_TO_KEY, BREAK_TYPES,
  getPeriodStatus,
  type DayKey,
} from '../../src/data/timetable';
import { useAuth } from '../../src/context/AuthContext';
import Colors from '../../src/theme/colors';

// ── Subject colours ───────────────────────────────────────────────

interface SubjectColor { bg: string; text: string; dot: string; }

const SUBJECT_COLORS: Record<string, SubjectColor> = {
  'ADA':     { bg: Colors.primaryLight,  text: Colors.primary,   dot: Colors.primary   },
  'MC':      { bg: Colors.successLight,  text: Colors.success,   dot: Colors.success   },
  'DBMS':    { bg: Colors.warningLight,  text: Colors.warning,   dot: Colors.warning   },
  'DMS':     { bg: Colors.purpleLight,   text: Colors.purple,    dot: Colors.purple    },
  'BCE':     { bg: Colors.orangeLight,   text: Colors.orange,    dot: Colors.orange    },
  'GITS':    { bg: Colors.successLight,  text: Colors.success,   dot: Colors.success   },
  'UHV':     { bg: Colors.dangerLight,   text: Colors.danger,    dot: Colors.danger    },
  'PL':      { bg: Colors.background,    text: Colors.secondary, dot: Colors.secondary },
  'ADA Lab': { bg: Colors.primaryLight,  text: Colors.primary,   dot: Colors.primary   },
  'CODSL':   { bg: Colors.successLight,  text: Colors.success,   dot: Colors.success   },
  'MCL':     { bg: Colors.successLight,  text: Colors.success,   dot: Colors.success   },
  'DBMSL':   { bg: Colors.warningLight,  text: Colors.warning,   dot: Colors.warning   },
  'NSS/PT':  { bg: Colors.background,    text: Colors.textMuted, dot: Colors.textMuted },
  'CCA/ECA': { bg: Colors.background,    text: Colors.textMuted, dot: Colors.textMuted },
  'Skill/Counselling':    { bg: Colors.background, text: Colors.secondary, dot: Colors.textMuted },
  'Online Certification/Skill Enhancement': { bg: Colors.background, text: Colors.secondary, dot: Colors.textMuted },
  'Break':   { bg: Colors.background,    text: Colors.textMuted, dot: Colors.textMuted },
  'Lunch':   { bg: Colors.background,    text: Colors.textMuted, dot: Colors.textMuted },
};

function col(subject: string): SubjectColor {
  const key = Object.keys(SUBJECT_COLORS).find(k => subject.startsWith(k));
  return key ? SUBJECT_COLORS[key] : { bg: Colors.background, text: Colors.secondary, dot: Colors.textMuted };
}

// ── Small components ──────────────────────────────────────────────

function SummaryCard({ icon, color: clr, label, value }: { icon: string; color: string; label: string; value: string }) {
  return (
    <View style={[summaryStyles.card, { borderTopColor: clr }]}>
      <View style={[summaryStyles.iconBg, { backgroundColor: clr + '22' }]}>
        <Ionicons name={icon as any} size={18} color={clr} />
      </View>
      <Text style={[summaryStyles.value, { color: clr }]}>{value}</Text>
      <Text style={summaryStyles.label}>{label}</Text>
    </View>
  );
}

function MetaChip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={metaStyles.chip}>
      <Ionicons name={icon as any} size={10} color={Colors.textMuted} />
      <Text style={metaStyles.text} numberOfLines={1}>{text}</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────

export default function TimetableScreen() {
  const { user } = useAuth();
  const displayName = user?.name ?? 'Mr. Lokesh M';

  const today      = JS_DAY_TO_KEY[new Date().getDay()] as DayKey | undefined ?? 'Mon';
  const [activeDay, setActiveDay] = useState<DayKey>(today);
  const isToday   = activeDay === today;
  const nowHour   = new Date().getHours() + new Date().getMinutes() / 60;

  const periods   = TIMETABLE[activeDay] ?? [];
  const teaching  = periods.filter(p => !BREAK_TYPES.has(p.subject));
  const done      = isToday ? teaching.filter(p => getPeriodStatus(p.time, nowHour, true) === 'done').length : 0;
  const remaining = isToday ? teaching.filter(p => getPeriodStatus(p.time, nowHour, true) === 'upcoming').length : teaching.length;
  const weeklyHrs = Object.values(TIMETABLE).reduce(
    (s, d) => s + d.filter(p => !['Break', 'Lunch'].includes(p.subject)).length, 0
  );

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>📅 Timetable</Text>
        <Text style={styles.pageSubtitle}>{displayName} · Sem 4 Bhaskara · Hall L308</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={styles.summaryRow}>
          <SummaryCard icon="today-outline"            color={Colors.primary} label="Today"     value={`${teaching.length} cls`} />
          <SummaryCard icon="checkmark-circle-outline" color={Colors.success} label="Done"      value={`${done} cls`} />
          <SummaryCard icon="time-outline"             color={Colors.warning} label="Remaining" value={`${remaining} cls`} />
          <SummaryCard icon="calendar-outline"         color={Colors.purple}  label="Weekly"    value={String(weeklyHrs)} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll} contentContainerStyle={styles.tabsContainer}>
          {DAYS.map(day => {
            const isActive   = activeDay === day;
            const isDayToday = day === today;
            return (
              <TouchableOpacity
                key={day}
                style={[styles.tab, isActive && styles.tabActive, isDayToday && !isActive && styles.tabToday]}
                onPress={() => setActiveDay(day)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{day}</Text>
                {isDayToday && <View style={[styles.todayDot, isActive && styles.todayDotActive]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.dayHeading}>
          <Text style={styles.dayTitle}>{DAY_FULL[activeDay]}</Text>
          {isToday && <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>TODAY</Text></View>}
          <Text style={styles.periodCount}>{periods.length} periods</Text>
        </View>

        <View style={styles.periodsContainer}>
          {periods.map((p, idx) => {
            if (['Break', 'Lunch'].includes(p.subject)) {
              return (
                <View key={idx} style={styles.breakRow}>
                  <View style={styles.breakLine} />
                  <Text style={styles.breakText}>{p.subject} · {p.time}</Text>
                  <View style={styles.breakLine} />
                </View>
              );
            }
            // Use actual start+end so 2-hour labs stay "now" for their full duration
            const status = getPeriodStatus(p.time, nowHour, isToday);
            const c = col(p.subject);

            return (
              <View key={idx} style={[
                styles.periodCard,
                { borderLeftColor: c.dot },
                status === 'done' && styles.cardDone,
                status === 'now'  && styles.cardNow,
              ]}>
                {status === 'now' && (
                  <View style={styles.nowBadge}><Text style={styles.nowBadgeText}>● NOW</Text></View>
                )}
                {status === 'done' && (
                  <View style={styles.doneBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
                    <Text style={styles.doneBadgeText}>Done</Text>
                  </View>
                )}
                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={12} color={c.dot} />
                  <Text style={[styles.timeText, { color: c.dot }]}>{p.time}</Text>
                </View>
                <View style={[styles.subjectPill, { backgroundColor: c.bg }]}>
                  <Text style={[styles.subjectText, { color: c.text }]} numberOfLines={1}>{p.subject}</Text>
                </View>
                <View style={styles.metaRow}>
                  {p.teacher && <MetaChip icon="person-outline"   text={STAFF[p.teacher] ?? p.teacher} />}
                  {p.room    && <MetaChip icon="location-outline" text={p.room} />}
                  {p.section && <MetaChip icon="people-outline"   text={p.section} />}
                </View>
              </View>
            );
          })}
        </View>

        {/* Staff reference */}
        <View style={styles.staffCard}>
          <Text style={styles.staffTitle}>📋 Staff Reference — Bhaskara</Text>
          {Object.entries(STAFF).map(([init, name]) => (
            <View key={init} style={styles.staffRow}>
              <View style={styles.initBadge}><Text style={styles.initText}>{init}</Text></View>
              <Text style={styles.staffName}>{name}</Text>
            </View>
          ))}
          <Text style={styles.staffNote}>
            Note: RTH and RTJ both refer to Mrs. Ranjana Thakuria —
            RTH teaches DBMS theory, RTJ supervises NSS/PT activities.
          </Text>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  pageHeader:       { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pageTitle:        { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  pageSubtitle:     { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  scrollContent:    { paddingBottom: 20 },
  summaryRow:       { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 14, gap: 8, justifyContent: 'space-between' },
  tabsScroll:       { marginTop: 14 },
  tabsContainer:    { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  tab:              { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  tabActive:        { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabToday:         { borderColor: Colors.primary },
  tabText:          { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive:    { color: Colors.white },
  todayDot:         { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary, marginTop: 2 },
  todayDotActive:   { backgroundColor: Colors.white },
  dayHeading:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 14, gap: 8 },
  dayTitle:         { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  periodCount:      { fontSize: 11, color: Colors.textMuted, marginLeft: 'auto' },
  todayBadge:       { backgroundColor: Colors.primaryLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  todayBadgeText:   { fontSize: 10, fontWeight: '800', color: Colors.primary },
  periodsContainer: { paddingHorizontal: 16, marginTop: 10, gap: 8 },
  periodCard: {
    backgroundColor: Colors.white, borderRadius: 12, padding: 14,
    borderLeftWidth: 4, gap: 6,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  cardDone:       { opacity: 0.6 },
  cardNow:        { borderWidth: 1, borderLeftWidth: 4, borderColor: Colors.primary + '55', elevation: 4, shadowOpacity: 0.12 },
  nowBadge:       { position: 'absolute', top: 10, right: 10, backgroundColor: Colors.primaryLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  nowBadgeText:   { fontSize: 10, fontWeight: '800', color: Colors.primary },
  doneBadge:      { position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.successLight, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  doneBadgeText:  { fontSize: 10, fontWeight: '700', color: Colors.success },
  timeRow:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText:       { fontSize: 11, fontWeight: '700' },
  subjectPill:    { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  subjectText:    { fontSize: 14, fontWeight: '700' },
  metaRow:        { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  breakRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2 },
  breakLine:      { flex: 1, height: 1, backgroundColor: Colors.border },
  breakText:      { fontSize: 11, color: Colors.textMuted },
  staffCard: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  staffTitle: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  staffRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  initBadge:  { width: 42, backgroundColor: Colors.primaryLight, borderRadius: 8, paddingVertical: 4, alignItems: 'center' },
  initText:   { fontSize: 12, fontWeight: '800', color: Colors.primary },
  staffName:  { fontSize: 13, color: Colors.textPrimary, flex: 1 },
  staffNote:  { fontSize: 11, color: Colors.textMuted, marginTop: 10, lineHeight: 17, fontStyle: 'italic' },
});

const summaryStyles = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 12,
    padding: 10, alignItems: 'center', borderTopWidth: 3, gap: 3,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2,
  },
  iconBg: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  value:  { fontSize: 13, fontWeight: '800' },
  label:  { fontSize: 9, color: Colors.textMuted },
});

const metaStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.background, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  text: { fontSize: 10, color: Colors.textSecondary, maxWidth: 100 },
});
