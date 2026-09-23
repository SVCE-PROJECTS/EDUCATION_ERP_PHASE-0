import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, Star, CheckSquare } from '../../components/icons';
import Modal from '../ui/Modal';
import ProgressBar from '../ui/ProgressBar';
import { colors, primaryScale, neutral } from '../../theme/colors';

export interface PerformanceCellStudent {
  name: string;
  usn?: string;
  performance?: number | null;
  /**
   * These two fields are not yet returned by the current
   * `/hod/student-list/:semester/:section` backend response — the UI is
   * ready to display them the moment the backend adds them to each
   * student record. Until then it shows a friendly "not available" state.
   */
  iaMarks?: number | null;
  assignmentMarks?: number | null;
}

interface PerformanceCellProps {
  student: PerformanceCellStudent;
  textStyle?: any;
}

/** Tappable "Performance %" table cell — opens a breakdown popup on tap. */
export default function PerformanceCell({ student, textStyle }: PerformanceCellProps) {
  const [open, setOpen] = useState(false);
  const performance = student.performance != null ? `${student.performance}%` : '—';
  const hasBreakdown = student.iaMarks != null || student.assignmentMarks != null;

  return (
    <>
      <TouchableOpacity
        style={s.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.65}
        accessibilityLabel={`View performance breakdown for ${student.name}`}
      >
        <Text style={textStyle}>{performance}</Text>
        <ChevronDown size={12} color={primaryScale[400]} />
      </TouchableOpacity>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Performance Breakdown" size="sm">
        <Text style={s.studentName} numberOfLines={1}>
          {student.name} {student.usn ? `· ${student.usn}` : ''}
        </Text>

        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Overall Performance</Text>
          <Text style={s.totalValue}>{performance}</Text>
        </View>

        <View style={s.breakdown}>
          <View style={s.breakdownRow}>
            <View style={s.breakdownIcon}>
              <Star size={15} color={colors.blue[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <ProgressBar
                label="IA Marks"
                percent={student.iaMarks ?? 0}
                color={colors.blue[600]}
                valueLabel={student.iaMarks != null ? `${student.iaMarks}%` : 'Not available'}
              />
            </View>
          </View>

          <View style={s.breakdownRow}>
            <View style={s.breakdownIcon}>
              <CheckSquare size={15} color={colors.green[600]} />
            </View>
            <View style={{ flex: 1 }}>
              <ProgressBar
                label="Assignments"
                percent={student.assignmentMarks ?? 0}
                color={colors.green[600]}
                valueLabel={student.assignmentMarks != null ? `${student.assignmentMarks}%` : 'Not available'}
              />
            </View>
          </View>
        </View>

        {!hasBreakdown && (
          <Text style={s.hint}>
            IA marks and assignment scores will appear here once the backend includes them in the student record.
          </Text>
        )}
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  studentName: { fontSize: 12, color: neutral[500], marginBottom: 12 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: primaryScale[50],
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  totalLabel: { fontSize: 12, fontWeight: '600', color: primaryScale[700] },
  totalValue: { fontSize: 18, fontWeight: '700', color: primaryScale[700] },
  breakdown: { gap: 16 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  breakdownIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: neutral[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontSize: 11, color: neutral[400], marginTop: 16, lineHeight: 16 },
});
