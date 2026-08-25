import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IARecord } from '../../types';
import { safeAverage } from '../../utils/numbers';
import Colors from '../../theme/colors';

interface IAStatisticsProps {
  students: IARecord[];
}

export default function IAStatistics({ students }: IAStatisticsProps) {
  // Compute per-student averages, skipping any with no valid marks
  const averages: number[] = students
    .map(s => safeAverage([s.ia1, s.ia2, s.ia3]))
    .filter((v): v is number => v !== null);

  const classAvg = averages.length > 0
    ? (averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(2)
    : null;
  const highest = averages.length > 0 ? Math.max(...averages).toFixed(2) : null;
  const lowest  = averages.length > 0 ? Math.min(...averages).toFixed(2) : null;

  const stats = [
    { label: 'Total',     value: students.length > 0 ? String(students.length) : '—', color: Colors.primary },
    { label: 'Highest',   value: highest  ?? '—', color: Colors.success },
    { label: 'Lowest',    value: lowest   ?? '—', color: Colors.danger },
    { label: 'Class Avg', value: classAvg ?? '—', color: Colors.purple },
  ];

  return (
    <View style={styles.row}>
      {stats.map((s, i) => (
        <View key={i} style={[styles.card, { borderTopColor: s.color, borderTopWidth: 3 }]}>
          <Text style={styles.label}>{s.label}</Text>
          <Text style={[styles.value, { color: s.color }]}>{s.value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  card: {
    width: '23%', backgroundColor: Colors.white, borderRadius: 12, padding: 12, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  label: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  value: { fontSize: 20, fontWeight: '800', marginTop: 4 },
});
