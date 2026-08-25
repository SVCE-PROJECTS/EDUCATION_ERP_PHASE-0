import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Assignment } from '../../types';
import Colors from '../../theme/colors';

interface AssignmentTableProps {
  assignments: Assignment[];
  onEdit:   (a: Assignment) => void;
  onDelete: (id: number) => void;
}

export default function AssignmentTable({ assignments, onEdit, onDelete }: AssignmentTableProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Assignment List</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.row, styles.headerRow]}>
            {['Title', 'Subject', 'Sem', 'Due Date', 'Marks', 'Status', 'Actions'].map(h => (
              <Text key={h} style={[styles.cell, styles.headerCell]}>{h}</Text>
            ))}
          </View>
          {assignments.map(a => (
            <View key={a.id} style={styles.row}>
              <Text style={[styles.cell, { minWidth: 130 }]} numberOfLines={1}>{a.title}</Text>
              <Text style={[styles.cell, { minWidth: 120 }]} numberOfLines={1}>{a.subject}</Text>
              <Text style={[styles.cell, { minWidth: 50 }]}>{a.semester}</Text>
              <Text style={[styles.cell, { minWidth: 90 }]}>{a.dueDate}</Text>
              <Text style={[styles.cell, { minWidth: 55 }]}>{a.marks}</Text>
              <View style={[styles.cell, { minWidth: 70 }]}>
                <View style={[styles.badge, { backgroundColor: a.status === 'Open' ? Colors.successLight : Colors.border }]}>
                  <Text style={[styles.badgeText, { color: a.status === 'Open' ? Colors.success : Colors.textSecondary }]}>
                    {a.status}
                  </Text>
                </View>
              </View>
              <View style={[styles.cell, styles.actions, { minWidth: 70 }]}>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: Colors.warningLight }]} onPress={() => onEdit(a)}>
                  <Ionicons name="create-outline" size={15} color={Colors.warning} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.iconBtn, { backgroundColor: Colors.dangerLight }]} onPress={() => onDelete(a.id)}>
                  <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    elevation: 3, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5,
  },
  heading:   { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  row:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerRow: { backgroundColor: Colors.primaryLight, borderRadius: 8, borderBottomWidth: 0, paddingVertical: 10 },
  cell:      { fontSize: 12, color: Colors.textPrimary, minWidth: 80, paddingHorizontal: 4 },
  headerCell:{ fontWeight: '700', color: Colors.primary },
  badge:     { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  actions:   { flexDirection: 'row', gap: 6 },
  iconBtn:   { width: 28, height: 28, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
});
