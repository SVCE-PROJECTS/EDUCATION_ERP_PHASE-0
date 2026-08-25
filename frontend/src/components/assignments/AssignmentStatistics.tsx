import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Assignment } from '../../types';
import Colors from '../../theme/colors';

interface AssignmentStatisticsProps {
  assignments: Pick<Assignment, 'status' | 'marks'>[];
}

export default function AssignmentStatistics({ assignments }: AssignmentStatisticsProps) {
  const total        = assignments.length;
  const open         = assignments.filter(a => a.status === 'Open').length;
  const closed       = assignments.filter(a => a.status === 'Closed').length;
  const averageMarks = total > 0
    ? (assignments.reduce((sum, a) => sum + Number(a.marks), 0) / total).toFixed(1)
    : 0;

  const stats = [
    { label: 'Total',     value: total,        color: Colors.primary },
    { label: 'Open',      value: open,         color: Colors.success },
    { label: 'Closed',    value: closed,       color: Colors.secondary },
    { label: 'Avg Marks', value: averageMarks, color: Colors.orange },
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
    width: '23%', backgroundColor: Colors.white, borderRadius: 12,
    padding: 12, alignItems: 'center',
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  label: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600', textAlign: 'center' },
  value: { fontSize: 22, fontWeight: '800', marginTop: 4 },
});
