import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IARecord } from '../../types';
import { safeNumber, safeAverage, formatMark } from '../../utils/numbers';
import Colors from '../../theme/colors';

interface IAMarksTableProps {
  students: IARecord[];
  onEdit:   (s: IARecord) => void;
  onDelete: (id: number) => void;
}

function getResult(avg: number | null): { label: string; bg: string; color: string } {
  if (avg === null) return { label: 'No data', bg: Colors.border, color: Colors.textMuted };
  if (avg >= 18)   return { label: 'Excellent',         bg: Colors.successLight, color: Colors.success };
  if (avg >= 15)   return { label: 'Pass',              bg: Colors.primaryLight, color: Colors.primary };
  return               { label: 'Needs Improvement', bg: Colors.dangerLight,  color: Colors.danger  };
}

export default function IAMarksTable({ students, onEdit, onDelete }: IAMarksTableProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>IA Marks</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.row, styles.headerRow]}>
            {['USN', 'Name', 'IA1', 'IA2', 'IA3', 'Average', 'Result', 'Actions'].map(h => (
              <Text key={h} style={[styles.cell, styles.headerCell]}>{h}</Text>
            ))}
          </View>
          {students.map(s => {
            const avg    = safeAverage([s.ia1, s.ia2, s.ia3]);
            const result = getResult(avg);
            return (
              <View key={s.id} style={styles.row}>
                <Text style={[styles.cell, { minWidth: 110 }]} numberOfLines={1}>{s.usn}</Text>
                <Text style={[styles.cell, { minWidth: 90 }]}  numberOfLines={1}>{s.name}</Text>
                <Text style={[styles.cell, { minWidth: 45 }]}>{formatMark(s.ia1)}</Text>
                <Text style={[styles.cell, { minWidth: 45 }]}>{formatMark(s.ia2)}</Text>
                <Text style={[styles.cell, { minWidth: 45 }]}>{formatMark(s.ia3)}</Text>
                <Text style={[styles.cell, { minWidth: 70 }]}>
                  {avg !== null ? avg.toFixed(2) : '—'}
                </Text>
                <View style={[styles.cell, { minWidth: 130 }]}>
                  <View style={[styles.badge, { backgroundColor: result.bg }]}>
                    <Text style={[styles.badgeText, { color: result.color }]}>{result.label}</Text>
                  </View>
                </View>
                <View style={[styles.cell, styles.actions, { minWidth: 70 }]}>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: Colors.warningLight }]}
                    onPress={() => onEdit(s)}
                  >
                    <Ionicons name="create-outline" size={15} color={Colors.warning} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: Colors.dangerLight }]}
                    onPress={() => onDelete(s.id)}
                  >
                    <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card:       { backgroundColor: Colors.white, borderRadius: 14, padding: 14, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5 },
  heading:    { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerRow:  { backgroundColor: Colors.primaryLight, borderRadius: 8, borderBottomWidth: 0, paddingVertical: 10 },
  cell:       { fontSize: 12, color: Colors.textPrimary, minWidth: 80, paddingHorizontal: 4 },
  headerCell: { fontWeight: '700', color: Colors.primary },
  badge:      { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  badgeText:  { fontSize: 11, fontWeight: '600' },
  actions:    { flexDirection: 'row', gap: 6 },
  iconBtn:    { width: 28, height: 28, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
});
