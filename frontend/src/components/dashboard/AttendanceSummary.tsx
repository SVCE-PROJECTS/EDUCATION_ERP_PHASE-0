import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import Colors from '../../theme/colors';

interface AttendanceSummaryProps {
  refreshKey: number;
}

interface SummaryData {
  total:   number;
  present: number;
  absent:  number;
  pct:     number;
}

type LoadState = 'loading' | 'success' | 'error' | 'empty';

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export default function AttendanceSummary({ refreshKey }: AttendanceSummaryProps) {
  const router = useRouter();
  const [data,  setData]  = useState<SummaryData | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    setState('loading');
    const controller = new AbortController();

    api.get<{ student_id: number; status: string }[]>(
      '/attendance',
      { params: { date: todayString() }, signal: controller.signal }
    )
      .then(res => {
        const records = res.data;
        if (!records.length) {
          setState('empty');
          setData(null);
          return;
        }
        const total   = records.length;
        const present = records.filter(r => r.status === 'Present').length;
        const absent  = total - present;
        const pct     = Math.round((present / total) * 100);
        setData({ total, present, absent, pct });
        setState('success');
      })
      .catch(err => {
        if (err.name === 'CanceledError') return;
        setState('error');
      });

    return () => controller.abort();
  }, [refreshKey]);

  if (state === 'loading') {
    return (
      <View style={[styles.card, styles.centred]}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push('/attendance')} activeOpacity={0.85}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Ionicons name="checkbox-outline" size={18} color={Colors.primary} />
            <Text style={styles.title}>Today's Attendance</Text>
          </View>
          <Text style={styles.link}>Mark →</Text>
        </View>
        <Text style={styles.errorText}>Could not load attendance data.</Text>
      </TouchableOpacity>
    );
  }

  if (state === 'empty' || !data) {
    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push('/attendance')} activeOpacity={0.85}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Ionicons name="checkbox-outline" size={18} color={Colors.primary} />
            <Text style={styles.title}>Today's Attendance</Text>
          </View>
          <Text style={styles.link}>Mark →</Text>
        </View>
        <Text style={styles.emptyText}>No attendance marked today yet.</Text>
      </TouchableOpacity>
    );
  }

  const { pct, present, absent, total } = data;
  const barColor = pct >= 75 ? Colors.success : pct >= 50 ? Colors.warning : Colors.danger;

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push('/attendance')} activeOpacity={0.85}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Ionicons name="checkbox-outline" size={18} color={Colors.primary} />
          <Text style={styles.title}>Today's Attendance</Text>
        </View>
        <Text style={styles.link}>Mark →</Text>
      </View>

      <View style={styles.statsRow}>
        <Text style={[styles.bigPct, { color: barColor }]}>{pct}%</Text>
        <View style={styles.counters}>
          <View style={[styles.chip, { backgroundColor: Colors.successLight }]}>
            <Text style={[styles.chipNum, { color: Colors.success }]}>{present}</Text>
            <Text style={[styles.chipLabel, { color: Colors.success }]}>Present</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: Colors.dangerLight }]}>
            <Text style={[styles.chipNum, { color: Colors.danger }]}>{absent}</Text>
            <Text style={[styles.chipLabel, { color: Colors.danger }]}>Absent</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: Colors.primaryLight }]}>
            <Text style={[styles.chipNum, { color: Colors.primary }]}>{total}</Text>
            <Text style={[styles.chipLabel, { color: Colors.primary }]}>Total</Text>
          </View>
        </View>
      </View>

      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={styles.barLabel}>{present} of {total} students present</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginHorizontal: 16, marginTop: 12,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5,
  },
  centred:    { alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 80 },
  loadingText:{ fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  errorText:  { fontSize: 13, color: Colors.danger, textAlign: 'center', paddingVertical: 12 },
  emptyText:  { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  headerRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleWrap:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title:      { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  link:       { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  statsRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  bigPct:     { fontSize: 40, fontWeight: '900', minWidth: 72 },
  counters:   { flex: 1, gap: 6 },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  chipNum:    { fontSize: 16, fontWeight: '800' },
  chipLabel:  { fontSize: 11, fontWeight: '500' },
  barBg:      { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill:    { height: '100%', borderRadius: 4 },
  barLabel:   { fontSize: 11, color: Colors.textMuted, marginTop: 6 },
});
