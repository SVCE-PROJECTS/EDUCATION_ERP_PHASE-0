import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import mockAssignments from '../../data/assignments';
import { Assignment } from '../../types';
import Colors from '../../theme/colors';

interface PendingAssignmentsProps {
  refreshKey: number;
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return 99;
  const due = new Date(dateStr);
  const now = new Date();
  due.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyColor(days: number): { bg: string; text: string; label: string } {
  if (days <= 2) return { bg: Colors.dangerLight,  text: Colors.danger,  label: `${days}d left!` };
  if (days <= 7) return { bg: Colors.warningLight, text: Colors.warning, label: `${days}d left` };
  return           { bg: Colors.successLight, text: Colors.success, label: `${days}d left` };
}

export default function PendingAssignments({ refreshKey }: PendingAssignmentsProps) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    api.get('/assignments')
      .then(res => {
        const open = (res.data as Assignment[])
          .filter(a => a.status === 'Open')
          .map(a => ({ ...a, dueDate: a.dueDate || a.due_date || '' }))
          .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))
          .slice(0, 4);
        setAssignments(open);
      })
      .catch(() => {
        setAssignments(
          (mockAssignments as Assignment[])
            .filter(a => a.status === 'Open')
            .slice(0, 4)
        );
      });
  }, [refreshKey]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <Ionicons name="book-outline" size={18} color={Colors.orange} />
          <Text style={styles.title}>Pending Assignments</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/assignments')}>
          <Text style={styles.link}>All →</Text>
        </TouchableOpacity>
      </View>

      {assignments.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle-outline" size={32} color={Colors.success} />
          <Text style={styles.emptyText}>No pending assignments!</Text>
        </View>
      ) : (
        assignments.map((a, idx) => {
          const days = daysUntil(a.dueDate);
          const urg  = urgencyColor(days);
          return (
            <TouchableOpacity
              key={a.id ?? idx}
              style={styles.row}
              onPress={() => router.push('/assignments')}
              activeOpacity={0.7}
            >
              <View style={[styles.urgBadge, { backgroundColor: urg.bg }]}>
                <Text style={[styles.urgText, { color: urg.text }]}>{urg.label}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.assignTitle} numberOfLines={1}>{a.title}</Text>
                <Text style={styles.assignMeta}>{a.subject} • {a.marks} marks</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, flex: 1,
  },
  headerRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleWrap:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title:       { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  link:        { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  empty:       { alignItems: 'center', paddingVertical: 16, gap: 6 },
  emptyText:   { fontSize: 12, color: Colors.success, fontWeight: '600' },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  urgBadge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, minWidth: 60, alignItems: 'center' },
  urgText:     { fontSize: 10, fontWeight: '700' },
  info:        { flex: 1 },
  assignTitle: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  assignMeta:  { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
});
