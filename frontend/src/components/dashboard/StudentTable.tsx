import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Student } from '../../types';
import { safeInitials } from '../../utils/numbers';
import Colors from '../../theme/colors';

interface StudentTableProps {
  students: Student[];
  onEdit:   (s: Student) => void;
  onDelete: (id: number) => void;
}

export default function StudentTable({ students, onEdit, onDelete }: StudentTableProps) {
  const router = useRouter();

  if (students.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyText}>No students found</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>
        Student List
        <Text style={styles.tap}> · tap a row to view profile</Text>
      </Text>

      <View style={[styles.row, styles.headerRow]}>
        <Text style={[styles.cell, styles.headerCell, { flex: 1.8 }]}>USN</Text>
        <Text style={[styles.cell, styles.headerCell, { flex: 1.5 }]}>Name</Text>
        <Text style={[styles.cell, styles.headerCell, { flex: 0.6 }]}>Sem</Text>
        <Text style={[styles.cell, styles.headerCell, { flex: 0.8 }]}>Status</Text>
        <Text style={[styles.cell, styles.headerCell, { flex: 0.9, textAlign: 'center' }]}>Actions</Text>
      </View>

      {students.map((student, idx) => (
        <TouchableOpacity
          key={student.id}
          style={[styles.row, idx % 2 === 1 && styles.rowAlt]}
          onPress={() => router.push(`/students/${student.id}` as any)}
          activeOpacity={0.7}
        >
          <Text style={[styles.cell, { flex: 1.8 }]} numberOfLines={1}>{student.usn}</Text>
          <Text style={[styles.cell, { flex: 1.5 }]} numberOfLines={1}>{student.name}</Text>
          <Text style={[styles.cell, { flex: 0.6 }]}>{student.semester ?? '-'}</Text>
          <View style={{ flex: 0.8 }}>
            <View style={[styles.badge, { backgroundColor: student.status === 'Active' ? Colors.successLight : Colors.border }]}>
              <Text style={[styles.badgeText, { color: student.status === 'Active' ? Colors.success : Colors.textSecondary }]}>
                {student.status ?? 'Active'}
              </Text>
            </View>
          </View>
          <View style={[styles.actions, { flex: 0.9 }]}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: Colors.primaryLight }]}
              onPress={() => router.push(`/students/${student.id}` as any)}
            >
              <Ionicons name="eye-outline" size={14} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: Colors.warningLight }]}
              onPress={() => onEdit(student)}
            >
              <Ionicons name="create-outline" size={14} color={Colors.warning} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: Colors.dangerLight }]}
              onPress={() => onDelete(student.id)}
            >
              <Ionicons name="trash-outline" size={14} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5,
  },
  heading:   { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  tap:       { fontSize: 11, fontWeight: '400', color: Colors.textMuted },
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowAlt:    { backgroundColor: Colors.background },
  headerRow: { backgroundColor: Colors.primaryLight, borderRadius: 8, borderBottomWidth: 0, paddingVertical: 10, marginBottom: 2 },
  cell:      { fontSize: 12, color: Colors.textPrimary, paddingHorizontal: 2 },
  headerCell:{ fontWeight: '700', color: Colors.primary, fontSize: 11 },
  badge:     { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '600' },
  actions:   { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  iconBtn:   { width: 26, height: 26, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  empty:     { alignItems: 'center', padding: 40 },
  emptyText: { color: Colors.textMuted, fontSize: 15, marginTop: 10 },
});
