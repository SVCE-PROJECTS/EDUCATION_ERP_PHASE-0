import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp, Pencil, Trash2, Users } from '../../components/icons';
import { colors, shadows, primaryScale, neutral } from '../../theme/colors';

export interface ActivityStudent {
  id?: string | number | null;
  // The real activities.activity_id for the row this student's data came
  // from — present when that row can be independently edited/deleted.
  activityId?: string | number | null;
  name?: string | null;
  usn?: string | null;
  semester?: string | number | null;
  section?: string | null;
}

export interface ActivityCardChip {
  label: string;
  value?: string | number | null;
  highlight?: boolean;
}

export interface ActivityCardProps {
  title?: string;
  subtitle?: string;
  chips?: ActivityCardChip[];
  students?: ActivityStudent[];
  accentColor?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  // Optional per-student actions — only rendered for a given row when the
  // student carries an activityId (i.e. their own independently addressable
  // record).
  onEditStudent?: (student: ActivityStudent) => void;
  onDeleteStudent?: (student: ActivityStudent) => void;
}

const display = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
};

export default function ActivityCard({
  title,
  subtitle,
  chips = [],
  students = [],
  accentColor = primaryScale[600],
  onEdit,
  onDelete,
  onEditStudent,
  onDeleteStudent,
}: ActivityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleStudents = students.filter((student) => student.name || student.usn);

  return (
    <View style={[s.card, { borderLeftColor: accentColor }]}> 
      <View style={s.top}>
        <View style={s.info}>
          <Text style={s.title} numberOfLines={2}>{display(title)}</Text>
          {subtitle ? <Text style={s.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
        </View>
      </View>

      {chips.some((c) => c.value !== null && c.value !== undefined && c.value !== '') && (
        <View style={s.chips}>
          {chips
            .filter((c) => c.value !== null && c.value !== undefined && c.value !== '')
            .map((c, i) => (
              <View key={`${c.label}-${i}`} style={s.chip}>
                <Text style={s.chipLabel}>{c.label}</Text>
                <Text style={[s.chipValue, c.highlight ? { color: accentColor } : undefined]}>
                  {display(c.value)}
                </Text>
              </View>
            ))}
        </View>
      )}

      <TouchableOpacity
        style={s.studentToggle}
        onPress={() => setExpanded((value) => !value)}
        activeOpacity={0.75}
      >
        <View style={s.studentToggleLeft}>
          <Users size={15} color={accentColor} />
          <Text style={s.studentCount}>STUDENTS ({visibleStudents.length})</Text>
        </View>
        {expanded ? <ChevronUp size={16} color={neutral[500]} /> : <ChevronDown size={16} color={neutral[500]} />}
      </TouchableOpacity>

      {expanded && (
        <View style={s.studentTableWrap}>
          {visibleStudents.length === 0 ? (
            <Text style={s.noStudents}>No students are linked to this activity in the database.</Text>
          ) : (
            <View style={s.studentTable}>
              <View style={s.studentHeaderRow}>
                <Text style={[s.studentHeader, s.colName]}>STUDENT NAME</Text>
                <Text style={[s.studentHeader, s.colUsn]}>USN</Text>
                <Text style={[s.studentHeader, s.colSem]}>SEM</Text>
                <Text style={[s.studentHeader, s.colSection]}>SECTION</Text>
                {(onEditStudent || onDeleteStudent) && (
                  <Text style={[s.studentHeader, s.colActions]}></Text>
                )}
              </View>

              {visibleStudents.map((student, index) => {
                const canAct = student.activityId != null;
                return (
                  <View key={`${student.id ?? student.usn ?? student.name ?? 'student'}-${index}`} style={s.studentRow}>
                    <Text style={[s.studentCell, s.colName]} numberOfLines={1}>{display(student.name)}</Text>
                    <Text style={[s.studentCell, s.colUsn]} numberOfLines={1}>{display(student.usn)}</Text>
                    <Text style={[s.studentCell, s.colSem]} numberOfLines={1}>{display(student.semester)}</Text>
                    <Text style={[s.studentCell, s.colSection]} numberOfLines={1}>{display(student.section)}</Text>
                    {(onEditStudent || onDeleteStudent) && (
                      <View style={[s.colActions, s.studentActions]}>
                        {onEditStudent && canAct && (
                          <TouchableOpacity
                            onPress={() => onEditStudent(student)}
                            style={s.studentActionBtn}
                            hitSlop={6}
                          >
                            <Pencil size={12} color={primaryScale[500]} />
                          </TouchableOpacity>
                        )}
                        {onDeleteStudent && canAct && (
                          <TouchableOpacity
                            onPress={() => onDeleteStudent(student)}
                            style={[s.studentActionBtn, s.deleteBtn]}
                            hitSlop={6}
                          >
                            <Trash2 size={12} color={colors.red[500]} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: neutral[100],
    borderLeftWidth: 3,
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 14,
    gap: 10,
    ...shadows.card,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: '600', color: neutral[900] },
  subtitle: { fontSize: 12, color: neutral[500] },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6, borderRadius: 8, backgroundColor: primaryScale[50] },
  deleteBtn: { backgroundColor: colors.red[50] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: neutral[50], borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  chipLabel: { fontSize: 10, color: neutral[400], fontWeight: '500' },
  chipValue: { fontSize: 11, color: neutral[700], fontWeight: '600' },
  studentToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: neutral[100], paddingTop: 10,
  },
  studentToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  studentCount: { fontSize: 11, fontWeight: '700', color: neutral[700], letterSpacing: 0.2 },
  studentTableWrap: { borderWidth: 1, borderColor: neutral[100], borderRadius: 10, overflow: 'hidden' },
  studentTable: { width: '100%' },
  studentHeaderRow: { flexDirection: 'row', backgroundColor: neutral[50], borderBottomWidth: 1, borderBottomColor: neutral[100], paddingVertical: 9, paddingHorizontal: 8 },
  studentRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: neutral[50], paddingVertical: 10, paddingHorizontal: 8 },
  studentHeader: { fontSize: 9, fontWeight: '700', color: neutral[500] },
  studentCell: { fontSize: 11, color: neutral[800] },
  colName: { flex: 1.55 },
  colUsn: { flex: 1.05 },
  colSem: { flex: 0.55, textAlign: 'center' },
  colSection: { flex: 0.65, textAlign: 'center' },
  colActions: { flex: 0.7, flexDirection: 'row', justifyContent: 'center' },
  studentActions: { flexDirection: 'row', gap: 4 },
  studentActionBtn: { padding: 5, borderRadius: 7, backgroundColor: primaryScale[50] },
  noStudents: { padding: 14, fontSize: 12, color: neutral[400], textAlign: 'center' },
});
