/**
 * IA Marks Screen
 *
 * Flow:
 *   1. Pick class from ClassesContext (GET /api/faculty/me/classes)
 *   2. Load students: GET /api/students/by-section/:semester/:section
 *   3. Load existing marks: GET /api/ia-marks?class_id=X
 *   4. Merge → editable table with ia1, ia2, ia3 columns
 *   5. Save → POST /api/ia-marks (upserts on student_id+class_id conflict)
 *
 * CRITICAL: `average` is DB-generated — never sent in request body.
 * The backend uses ON CONFLICT DO UPDATE, so re-saving is always safe.
 *
 * Backend schema:
 *   ia_marks(ia_id, student_id[library_id], class_id, ia1, ia2, ia3,
 *            average[GENERATED STORED], created_at, updated_at)
 *   UNIQUE(student_id, class_id)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ScreenLayout from '../components/ScreenLayout';
import ClassPicker from '../components/ClassPicker';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import CustomButton from '../components/CustomButton';
import Card from '../components/Card';
import { useClasses } from '../context/ClassesContext';
import { getIAMarks, addIAMarks } from '../services/iaMarksApi';
import { getStudentsBySection } from '../services/studentsApi';
import type { FacultyClass } from '../types/faculty';
import type { IAMarkEntry } from '../types/iaMarks';
import type { StudentBrief } from '../types/student';
import { colors, spacing, typography, radius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'IAMarks'>;

/** Clamp a numeric text value to 0–100 */
const clampMark = (val: string): string => {
  const n = parseInt(val, 10);
  if (isNaN(n)) return '';
  return String(Math.min(100, Math.max(0, n)));
};

const IAMarksScreen: React.FC<Props> = ({ navigation }) => {
  const { classes, loading: classesLoading } = useClasses();

  const [selectedClass, setSelectedClass] = useState<FacultyClass | null>(null);
  const [entries, setEntries] = useState<IAMarkEntry[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadData = useCallback(async (cls: FacultyClass) => {
    setLoadingData(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const [students, existingMarks] = await Promise.all([
        getStudentsBySection(cls.semester_number, cls.section_name),
        getIAMarks({ class_id: cls.class_id }),
      ]);

      // Build lookup: student_id → existing IAMark row
      const markMap = new Map(existingMarks.map((m) => [m.student_id, m]));

      const merged: IAMarkEntry[] = students.map((s: StudentBrief) => {
        const existing = markMap.get(s.student_id);
        return {
          student_id: s.student_id,
          name: s.name,
          usn: s.usn,
          ia_id: existing?.ia_id ?? null,
          ia1: existing?.ia1 != null ? String(existing.ia1) : '',
          ia2: existing?.ia2 != null ? String(existing.ia2) : '',
          ia3: existing?.ia3 != null ? String(existing.ia3) : '',
          average: existing?.average ?? null,
        };
      });

      setEntries(merged);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to load IA marks.');
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClass) loadData(selectedClass);
  }, [selectedClass, loadData]);

  const onRefresh = () => {
    if (!selectedClass) return;
    setRefreshing(true);
    loadData(selectedClass);
  };

  const updateMark = (
    studentId: string,
    field: 'ia1' | 'ia2' | 'ia3',
    value: string,
  ) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.student_id === studentId ? { ...e, [field]: value } : e,
      ),
    );
  };

  const onBlurMark = (studentId: string, field: 'ia1' | 'ia2' | 'ia3') => {
    setEntries((prev) =>
      prev.map((e) =>
        e.student_id === studentId
          ? { ...e, [field]: e[field] !== '' ? clampMark(e[field]) : '' }
          : e,
      ),
    );
  };

  /**
   * Save all entries.
   * Uses POST /api/ia-marks which upserts on UNIQUE(student_id, class_id).
   * Never sends `average` — it's DB-generated.
   */
  const handleSave = async () => {
    if (!selectedClass || entries.length === 0) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      await Promise.all(
        entries.map((e) =>
          addIAMarks({
            student_id: e.student_id,
            class_id: selectedClass.class_id,
            ia1: e.ia1 !== '' ? parseInt(e.ia1, 10) : null,
            ia2: e.ia2 !== '' ? parseInt(e.ia2, 10) : null,
            ia3: e.ia3 !== '' ? parseInt(e.ia3, 10) : null,
          }),
        ),
      );
      setSaveSuccess(true);
      // Reload to get DB-generated averages
      await loadData(selectedClass);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to save IA marks.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="IAMarks">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>IA Marks</Text>

          <ClassPicker
            classes={classes}
            loading={classesLoading}
            selectedClassId={selectedClass?.class_id ?? null}
            onSelect={setSelectedClass}
            label="Select Class / Subject"
          />

          {selectedClass && (
            <View style={styles.classInfo}>
              <Text style={styles.classInfoText}>
                {selectedClass.subject_name} · Sem {selectedClass.semester_number} · Sec {selectedClass.section_name}
              </Text>
            </View>
          )}

          {loadingData && <LoadingIndicator message="Loading marks…" />}
          {error && (
            <ErrorMessage
              message={error}
              onRetry={() => selectedClass && loadData(selectedClass)}
            />
          )}

          {saveSuccess && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✓ IA Marks saved successfully!</Text>
            </View>
          )}

          {!selectedClass && !classesLoading && (
            <View style={styles.emptyHint}>
              <Text style={styles.emptyHintIcon}>📊</Text>
              <Text style={styles.emptyHintText}>
                Select a class above to enter or view IA marks.
              </Text>
            </View>
          )}

          {!loadingData && entries.length > 0 && (
            <>
              {/* Table header */}
              <Card noPadding style={styles.tableCard}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.colName, styles.headerText]}>Student</Text>
                  <Text style={[styles.colMark, styles.headerText]}>IA 1</Text>
                  <Text style={[styles.colMark, styles.headerText]}>IA 2</Text>
                  <Text style={[styles.colMark, styles.headerText]}>IA 3</Text>
                  <Text style={[styles.colAvg, styles.headerText]}>Avg</Text>
                </View>

                {entries.map((entry, idx) => (
                  <View
                    key={entry.student_id}
                    style={[
                      styles.tableRow,
                      idx < entries.length - 1 && styles.rowBorder,
                      idx % 2 === 1 && styles.altRow,
                    ]}
                  >
                    {/* Student info */}
                    <View style={styles.colName}>
                      <Text style={styles.studentName} numberOfLines={1}>
                        {entry.name}
                      </Text>
                      {entry.usn ? (
                        <Text style={styles.studentUsn}>{entry.usn}</Text>
                      ) : null}
                    </View>

                    {/* IA1 */}
                    <TextInput
                      style={styles.markInput}
                      value={entry.ia1}
                      onChangeText={(v) => updateMark(entry.student_id, 'ia1', v.replace(/[^0-9]/g, ''))}
                      onBlur={() => onBlurMark(entry.student_id, 'ia1')}
                      keyboardType="numeric"
                      maxLength={3}
                      placeholder="—"
                      placeholderTextColor={colors.placeholder}
                      accessibilityLabel={`IA1 for ${entry.name}`}
                    />

                    {/* IA2 */}
                    <TextInput
                      style={styles.markInput}
                      value={entry.ia2}
                      onChangeText={(v) => updateMark(entry.student_id, 'ia2', v.replace(/[^0-9]/g, ''))}
                      onBlur={() => onBlurMark(entry.student_id, 'ia2')}
                      keyboardType="numeric"
                      maxLength={3}
                      placeholder="—"
                      placeholderTextColor={colors.placeholder}
                      accessibilityLabel={`IA2 for ${entry.name}`}
                    />

                    {/* IA3 */}
                    <TextInput
                      style={styles.markInput}
                      value={entry.ia3}
                      onChangeText={(v) => updateMark(entry.student_id, 'ia3', v.replace(/[^0-9]/g, ''))}
                      onBlur={() => onBlurMark(entry.student_id, 'ia3')}
                      keyboardType="numeric"
                      maxLength={3}
                      placeholder="—"
                      placeholderTextColor={colors.placeholder}
                      accessibilityLabel={`IA3 for ${entry.name}`}
                    />

                    {/* Average (DB-computed, read-only) */}
                    <View style={styles.colAvg}>
                      <Text
                        style={[
                          styles.avgText,
                          entry.average != null && Number(entry.average) >= 80
                            ? styles.avgHigh
                            : entry.average != null && Number(entry.average) >= 60
                            ? styles.avgMid
                            : styles.avgLow,
                        ]}
                      >
                        {entry.average != null ? Number(entry.average).toFixed(1) : '—'}
                      </Text>
                    </View>
                  </View>
                ))}
              </Card>

              <Text style={styles.note}>
                * Average is calculated automatically by the database after saving.
              </Text>

              <CustomButton
                title={saving ? 'Saving…' : `Save Marks (${entries.length} students)`}
                onPress={handleSave}
                loading={saving}
                style={styles.saveBtn}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  pageTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg },
  classInfo: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  classInfoText: { ...typography.smallBold, color: colors.primaryDark },
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

  tableCard: { marginBottom: spacing.xs, overflow: 'hidden' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  tableHeader: {
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  altRow: { backgroundColor: '#F8FAFC' },
  headerText: { ...typography.smallBold, color: colors.primaryDark },

  colName: { flex: 2.5, minWidth: 0 },
  colMark: { flex: 1, alignItems: 'center' },
  colAvg: { flex: 1, alignItems: 'center' },

  studentName: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 12 },
  studentUsn: { ...typography.caption, color: colors.textSecondary },

  markInput: {
    flex: 1,
    textAlign: 'center',
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 4,
    paddingHorizontal: 4,
    minHeight: 34,
    backgroundColor: colors.surface,
  },
  avgText: { ...typography.bodyBold, fontSize: 13 },
  avgHigh: { color: colors.success },
  avgMid: { color: colors.warning },
  avgLow: { color: colors.danger },

  note: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
  saveBtn: { marginTop: spacing.sm },
});

export default IAMarksScreen;
