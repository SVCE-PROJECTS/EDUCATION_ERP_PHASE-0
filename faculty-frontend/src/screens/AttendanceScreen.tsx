/**
 * Attendance Screen
 *
 * Flow:
 *   1. Faculty picks a class from ClassesContext (GET /api/faculty/me/classes)
 *   2. Date picker shown (defaults to today)
 *   3. Students loaded via GET /api/students/by-section/:semester/:section
 *   4. Existing attendance loaded via GET /api/attendance?class_id=X&date=YYYY-MM-DD
 *      so previously saved records are pre-populated
 *   5. Faculty marks Present/Absent per student
 *   6. Save → POST /api/attendance/bulk  { records: [...] }
 *      Backend uses ON CONFLICT DO UPDATE — re-saving is safe (upsert)
 *
 * Persistence guarantee: after leaving and returning, step 4 re-fetches from
 * the database, so the latest saved state is always shown.
 *
 * Backend schema:
 *   attendance(attendance_id, student_id[library_id], class_id,
 *              attendance_date, status CHECK('Present','Absent'), remarks)
 *   UNIQUE(student_id, class_id, attendance_date)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ScreenLayout from '../components/ScreenLayout';
import ClassPicker from '../components/ClassPicker';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import CustomButton from '../components/CustomButton';
import Card from '../components/Card';
import { useClasses } from '../context/ClassesContext';
import { getAttendance, saveAttendanceBulk } from '../services/attendanceApi';
import { getStudentsBySection } from '../services/studentsApi';
import type { FacultyClass } from '../types/faculty';
import type { AttendanceEntry, AttendanceStatus, SaveAttendanceRequest } from '../types/attendance';
import type { StudentBrief } from '../types/student';
import { colors, spacing, typography, radius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Attendance'>;

// Format a Date to 'YYYY-MM-DD'
const toDateStr = (d: Date): string => d.toISOString().split('T')[0];

const AttendanceScreen: React.FC<Props> = ({ navigation }) => {
  const { classes, loading: classesLoading } = useClasses();

  const [selectedClass, setSelectedClass] = useState<FacultyClass | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Derived: summary counts
  const presentCount = entries.filter((e) => e.status === 'Present').length;
  const absentCount = entries.filter((e) => e.status === 'Absent').length;

  /**
   * Load students + existing attendance for the selected class + date.
   * Students come from by-section endpoint; existing records overlay status.
   */
  const loadData = useCallback(async (cls: FacultyClass, d: Date) => {
    setLoadingData(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const dateStr = toDateStr(d);

      // 1. Get students for this section
      const students: StudentBrief[] = await getStudentsBySection(
        cls.semester_number,
        cls.section_name,
      );

      // 2. Get existing attendance for this class+date
      const existing = await getAttendance({
        class_id: cls.class_id,
        date: dateStr,
      });

      // Build a map student_id → status from existing records
      const existingMap = new Map<string, { status: AttendanceStatus; remarks: string }>();
      existing.forEach((rec) => {
        existingMap.set(rec.student_id, {
          status: rec.status,
          remarks: rec.remarks ?? '',
        });
      });

      // Merge: default new students to 'Present', overlay saved records
      const merged: AttendanceEntry[] = students.map((s) => ({
        student_id: s.student_id,
        name: s.name,
        usn: s.usn,
        status: existingMap.get(s.student_id)?.status ?? 'Present',
        remarks: existingMap.get(s.student_id)?.remarks ?? '',
      }));

      setEntries(merged);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to load attendance data.');
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, []);

  // Reload when class or date changes
  useEffect(() => {
    if (selectedClass) loadData(selectedClass, date);
  }, [selectedClass, date, loadData]);

  const onRefresh = () => {
    if (!selectedClass) return;
    setRefreshing(true);
    loadData(selectedClass, date);
  };

  const toggleStatus = (studentId: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.student_id === studentId
          ? { ...e, status: e.status === 'Present' ? 'Absent' : 'Present' }
          : e,
      ),
    );
  };

  const updateRemarks = (studentId: string, remarks: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.student_id === studentId ? { ...e, remarks } : e)),
    );
  };

  const markAll = (status: AttendanceStatus) => {
    setEntries((prev) => prev.map((e) => ({ ...e, status })));
  };

  /**
   * Save — POST /api/attendance/bulk
   * Backend upserts on UNIQUE(student_id, class_id, attendance_date).
   */
  const handleSave = async () => {
    if (!selectedClass || entries.length === 0) return;

    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const records: SaveAttendanceRequest[] = entries.map((e) => ({
        student_id: e.student_id,
        class_id: selectedClass.class_id,
        attendance_date: toDateStr(date),
        status: e.status,
        remarks: e.remarks || undefined,
      }));

      await saveAttendanceBulk(records);
      setSaveSuccess(true);
      // Auto-dismiss success banner after 3 s
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="Attendance">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>Attendance</Text>

        {/* Class picker */}
        <ClassPicker
          classes={classes}
          loading={classesLoading}
          selectedClassId={selectedClass?.class_id ?? null}
          onSelect={(cls) => setSelectedClass(cls)}
          label="Select Class / Subject"
        />

        {/* Date picker */}
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>Date</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowDatePicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Select date"
          >
            <Text style={styles.dateBtnText}>📅  {toDateStr(date)}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(_, selected) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selected) setDate(selected);
            }}
          />
        )}

        {/* Controls */}
        {selectedClass && !loadingData && entries.length > 0 && (
          <Card style={styles.controlCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryPresent}>✓ {presentCount} Present</Text>
              </View>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryAbsent}>✗ {absentCount} Absent</Text>
              </View>
              <Text style={styles.summaryTotal}>/ {entries.length}</Text>
            </View>
            <View style={styles.markAllRow}>
              <Text style={styles.markAllLabel}>Mark all:</Text>
              <TouchableOpacity
                style={styles.markAllPresent}
                onPress={() => markAll('Present')}
                accessibilityRole="button"
              >
                <Text style={styles.markAllPresentText}>All Present</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.markAllAbsent}
                onPress={() => markAll('Absent')}
                accessibilityRole="button"
              >
                <Text style={styles.markAllAbsentText}>All Absent</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Loading / Error */}
        {loadingData && <LoadingIndicator message="Loading students…" />}
        {error && <ErrorMessage message={error} onRetry={() => selectedClass && loadData(selectedClass, date)} />}

        {/* Success banner */}
        {saveSuccess && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ Attendance saved successfully!</Text>
          </View>
        )}

        {/* No class selected */}
        {!selectedClass && !classesLoading && (
          <View style={styles.emptyHint}>
            <Text style={styles.emptyHintIcon}>📋</Text>
            <Text style={styles.emptyHintText}>Select a class above to start marking attendance.</Text>
          </View>
        )}

        {/* Student list */}
        {!loadingData && entries.length > 0 && (
          <Card noPadding style={styles.listCard}>
            {entries.map((entry, idx) => (
              <View
                key={entry.student_id}
                style={[
                  styles.studentRow,
                  idx < entries.length - 1 && styles.rowBorder,
                  entry.status === 'Absent' && styles.absentRow,
                ]}
              >
                {/* Left: name + usn */}
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{entry.name}</Text>
                  {entry.usn ? (
                    <Text style={styles.studentUsn}>{entry.usn}</Text>
                  ) : null}
                </View>

                {/* Remarks */}
                <TextInput
                  style={styles.remarksInput}
                  placeholder="Remarks"
                  placeholderTextColor={colors.placeholder}
                  value={entry.remarks}
                  onChangeText={(t) => updateRemarks(entry.student_id, t)}
                  accessibilityLabel={`Remarks for ${entry.name}`}
                />

                {/* Toggle button */}
                <TouchableOpacity
                  style={[
                    styles.statusToggle,
                    entry.status === 'Present' ? styles.presentToggle : styles.absentToggle,
                  ]}
                  onPress={() => toggleStatus(entry.student_id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${entry.name} is ${entry.status}. Tap to toggle.`}
                  accessibilityState={{ checked: entry.status === 'Present' }}
                >
                  <Text style={styles.statusToggleText}>
                    {entry.status === 'Present' ? 'P' : 'A'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        )}

        {/* Save button */}
        {entries.length > 0 && (
          <CustomButton
            title={saving ? 'Saving…' : `Save Attendance (${entries.length} students)`}
            onPress={handleSave}
            loading={saving}
            style={styles.saveBtn}
          />
        )}
      </ScrollView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  pageTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  dateLabel: { ...typography.smallBold, color: colors.textPrimary, width: 40 },
  dateBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dateBtnText: { ...typography.body, color: colors.textPrimary },

  controlCard: { marginBottom: spacing.md },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  summaryPresent: { ...typography.smallBold, color: colors.success },
  summaryAbsent: { ...typography.smallBold, color: colors.danger },
  summaryTotal: { ...typography.small, color: colors.textSecondary },
  markAllRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  markAllLabel: { ...typography.small, color: colors.textSecondary },
  markAllPresent: {
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  markAllPresentText: { ...typography.smallBold, color: colors.success },
  markAllAbsent: {
    backgroundColor: colors.dangerBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  markAllAbsentText: { ...typography.smallBold, color: colors.danger },

  successBanner: {
    backgroundColor: colors.successBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successText: { ...typography.bodyBold, color: colors.success, textAlign: 'center' },

  emptyHint: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyHintIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyHintText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  listCard: { marginBottom: spacing.md },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  absentRow: { backgroundColor: '#FFF5F5' },
  studentInfo: { flex: 1.5, minWidth: 0 },
  studentName: { ...typography.bodyBold, color: colors.textPrimary },
  studentUsn: { ...typography.caption, color: colors.textSecondary },
  remarksInput: {
    flex: 1,
    ...typography.small,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    minHeight: 32,
  },
  statusToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presentToggle: { backgroundColor: colors.success },
  absentToggle: { backgroundColor: colors.danger },
  statusToggleText: { ...typography.bodyBold, color: colors.white },

  saveBtn: { marginTop: spacing.md },
});

export default AttendanceScreen;
