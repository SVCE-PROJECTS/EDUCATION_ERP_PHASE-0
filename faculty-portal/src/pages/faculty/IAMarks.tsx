/**
 * Faculty Portal — IA Marks
 * DB truth: ia_marks.student_id is VARCHAR(50) = students.library_id (USN string).
 * Flow: pick class → load students for that class → pick student → enter marks → save.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, Modal as RNModal, KeyboardAvoidingView,
  Platform, ScrollView, TextInput,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, RefreshCw, Award, X, Check, ChevronDown } from '../../components/icons';
import Toast from '../../services/toast';
import { useIAMarks, useCreateIAMarks, useUpdateIAMarks, useDeleteIAMarks } from '../../hooks/useIAMarks';
import { useMyClasses } from '../../hooks/useClasses';
import { IAMarksPayload } from '../../services/academic.service';
import { studentService, StudentOption } from '../../services/student.service';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ScreenWrapper from '../../layouts/ScreenWrapper';
import { colors, shadows, primaryScale, ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { ROUTES } from '../../navigation/routes';

interface IARow {
  ia_id: number;
  student_id: string;   // VARCHAR(50) = library_id
  class_id: number;
  ia1: number | null;
  ia2: number | null;
  ia3: number | null;
  average: number | null;
  student_name?: string;
  usn?: string;
  subject_name: string;
  subject_code: string;
}

// ── Mark row ──────────────────────────────────────────────────────────────────
function MarkRow({ item, onEdit, onDelete }: { item: IARow; onEdit: () => void; onDelete: () => void }) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const avg = item.average ?? 0;
  const color = avg >= 20 ? colors.success : avg >= 12 ? colors.warning : colors.danger;
  const bg    = avg >= 20 ? colors.successBg : avg >= 12 ? colors.warningBg : colors.dangerBg;
  const displayName = item.student_name
    ? `${item.student_name} (${item.usn ?? item.student_id})`
    : (item.usn ?? item.student_id);

  return (
    <View style={s.row}>
      <View style={s.rowInfo}>
        <Text style={s.rowStudent} numberOfLines={1}>{displayName}</Text>
        <Text style={s.rowMeta} numberOfLines={1}>
          {item.subject_name} · IA1: {item.ia1 ?? '—'} · IA2: {item.ia2 ?? '—'} · IA3: {item.ia3 ?? '—'}
        </Text>
      </View>
      <View style={s.rowRight}>
        <View style={[s.scoreBadge, { backgroundColor: bg }]}>
          <Text style={[s.scoreText, { color }]}>Avg {item.average ?? '—'}</Text>
        </View>
        <View style={s.rowActions}>
          <TouchableOpacity onPress={onEdit} style={s.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Pencil size={14} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[s.actionBtn, s.actionBtnDanger]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Trash2 size={14} color={colors.red[500]} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Generic bottom-sheet picker ───────────────────────────────────────────────
function SelectSheet<T extends { label: string }>({
  visible, onClose, label, options, value, onChange, emptyMsg,
}: {
  visible: boolean; onClose: () => void; label: string;
  options: T[]; value: string; onChange: (v: T) => void; emptyMsg?: string;
}) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={s.sheetBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={s.sheetContainer}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{label}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
          {options.length === 0
            ? <Text style={s.sheetEmpty}>{emptyMsg ?? 'No options available'}</Text>
            : options.map((opt, i) => {
                const active = opt.label === value;
                return (
                  <TouchableOpacity key={i} onPress={() => { onChange(opt); onClose(); }}
                    style={[s.sheetOption, active && s.sheetOptionActive]} activeOpacity={0.75}>
                    <Text style={[s.sheetOptionText, active && s.sheetOptionTextActive]} numberOfLines={2}>
                      {opt.label}
                    </Text>
                    {active && <Check size={14} color={theme.primary} />}
                  </TouchableOpacity>
                );
              })}
        </ScrollView>
      </View>
    </RNModal>
  );
}

// ── Form sheet ────────────────────────────────────────────────────────────────
interface FormState {
  classId: number | null; classLabel: string;
  studentId: string; studentLabel: string;  // studentId = library_id VARCHAR
  ia1: string; ia2: string; ia3: string;
}
const EMPTY: FormState = {
  classId: null, classLabel: '',
  studentId: '', studentLabel: '',
  ia1: '', ia2: '', ia3: '',
};

function FormSheet({ visible, onClose, initial, onSubmit, loading, myClasses }: {
  visible: boolean; onClose: () => void; initial?: IARow | null;
  onSubmit: (d: IAMarksPayload) => void; loading: boolean; myClasses: any[];
}) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const [form, setForm]                 = useState<FormState>(EMPTY);
  const [classSheet, setClassSheet]     = useState(false);
  const [studentSheet, setStudentSheet] = useState(false);
  const [students, setStudents]         = useState<StudentOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      const cls = myClasses.find(c => c.class_id === initial.class_id);
      const displayName = initial.student_name
        ? `${initial.student_name} (${initial.usn ?? initial.student_id})`
        : (initial.usn ?? initial.student_id);
      setForm({
        classId:      initial.class_id,
        classLabel:   cls?.label ?? '',
        studentId:    initial.student_id,      // already a string (library_id)
        studentLabel: displayName,
        ia1: initial.ia1 != null ? String(initial.ia1) : '',
        ia2: initial.ia2 != null ? String(initial.ia2) : '',
        ia3: initial.ia3 != null ? String(initial.ia3) : '',
      });
      // Pre-load student list so the picker is usable
      if (cls) fetchStudents(cls);
    } else {
      setForm(EMPTY);
      setStudents([]);
    }
  }, [visible, initial]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof FormState) => (v: any) => setForm(f => ({ ...f, [k]: v }));

  const fetchStudents = async (cls: any) => {
    if (!cls?.semester || !cls?.section) return;
    setLoadingStudents(true);
    try {
      const list = await studentService.getBySemesterSection(cls.semester, cls.section);
      setStudents(list);
    } catch (e) {
      console.error('Failed to load students:', e);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleClassSelect = (cls: any) => {
    set('classId')(cls.class_id);
    set('classLabel')(cls.label);
    set('studentId')('');
    set('studentLabel')('');
    fetchStudents(cls);
  };

  const validateMark = (val: string) => {
    if (val === '') return true;
    const n = Number(val);
    return !isNaN(n) && n >= 0 && n <= 20;
  };

  const handleSubmit = () => {
    if (!form.classId) {
      Toast.show({ type: 'error', text1: 'Select a class first' }); return;
    }
    if (!form.studentId) {
      Toast.show({ type: 'error', text1: 'Select a student' }); return;
    }
    if (!validateMark(form.ia1)) {
      Toast.show({ type: 'error', text1: 'IA 1 must be between 0 and 20' }); return;
    }
    if (!validateMark(form.ia2)) {
      Toast.show({ type: 'error', text1: 'IA 2 must be between 0 and 20' }); return;
    }
    if (!validateMark(form.ia3)) {
      Toast.show({ type: 'error', text1: 'IA 3 must be between 0 and 20' }); return;
    }

    const payload: IAMarksPayload = {
      student_id: form.studentId,        // string: library_id
      class_id:   form.classId,
      ia1: form.ia1 !== '' ? Number(form.ia1) : undefined,
      ia2: form.ia2 !== '' ? Number(form.ia2) : undefined,
      ia3: form.ia3 !== '' ? Number(form.ia3) : undefined,
    };
    console.log('[IAMarks] submitting:', payload);
    onSubmit(payload);
  };

  return (
    <RNModal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={s.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalKav}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{initial ? 'Edit IA Marks' : 'Add IA Marks'}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.formBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Class picker */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Class <Text style={s.required}>*</Text></Text>
                <TouchableOpacity style={[s.input, s.selectTrigger]} onPress={() => setClassSheet(true)} activeOpacity={0.8}>
                  <Text style={form.classLabel ? s.selectValue : s.selectPlaceholder} numberOfLines={1}>
                    {form.classLabel || 'Select class…'}
                  </Text>
                  <ChevronDown size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Student picker */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Student <Text style={s.required}>*</Text></Text>
                {loadingStudents ? (
                  <View style={[s.input, { justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[s.input, s.selectTrigger]}
                    onPress={() => {
                      if (!form.classId) { Toast.show({ type: 'error', text1: 'Select a class first' }); return; }
                      setStudentSheet(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={form.studentLabel ? s.selectValue : s.selectPlaceholder} numberOfLines={1}>
                      {form.studentLabel || (form.classId ? 'Select student…' : 'Select class first')}
                    </Text>
                    <ChevronDown size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* IA mark fields */}
              {([
                { key: 'ia1' as const, label: 'IA 1 Marks (0–20)' },
                { key: 'ia2' as const, label: 'IA 2 Marks (0–20)' },
                { key: 'ia3' as const, label: 'IA 3 Marks (0–20)' },
              ]).map(({ key, label }) => (
                <View key={key} style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>{label}</Text>
                  <TextInput
                    style={s.input}
                    value={form[key]}
                    onChangeText={set(key)}
                    placeholder="Leave blank to skip"
                    placeholderTextColor={theme.placeholder}
                    keyboardType="numeric"
                  />
                </View>
              ))}

              <View style={s.infoBox}>
                <Text style={s.infoText}>Average is automatically calculated by the system.</Text>
              </View>
            </ScrollView>

            <View style={s.modalFooter}>
              <Button variant="outline" onPress={onClose} style={s.footerBtn}>Cancel</Button>
              <Button onPress={handleSubmit} loading={loading} style={s.footerBtn}>
                {initial ? 'Save' : 'Add'}
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      <SelectSheet
        visible={classSheet} onClose={() => setClassSheet(false)} label="Select Class"
        options={myClasses} value={form.classLabel}
        onChange={(c: any) => handleClassSelect(c)}
      />
      <SelectSheet
        visible={studentSheet} onClose={() => setStudentSheet(false)} label="Select Student"
        options={students} value={form.studentLabel}
        emptyMsg="No students found for this class"
        onChange={(st: StudentOption) => {
          set('studentId')(st.student_id);   // library_id string
          set('studentLabel')(st.label);
        }}
      />
    </RNModal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function IAMarks() {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const [classFilter, setClassFilter]   = useState<number | null>(null);
  const [formVisible, setFormVisible]   = useState(false);
  const [editing, setEditing]           = useState<IARow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IARow | null>(null);
  const qc = useQueryClient();

  const { data: myClasses = [], isLoading: loadingClasses } = useMyClasses();
  const params = classFilter ? { class_id: classFilter } : {};
  const { data: rawData, isLoading, isFetching, refetch } = useIAMarks(params);
  const marks: IARow[] = Array.isArray(rawData) ? rawData : [];

  const createMutation = useCreateIAMarks({ onSuccess: () => { setFormVisible(false); refetch(); } });
  const updateMutation = useUpdateIAMarks(editing?.ia_id ?? 0, {
    onSuccess: () => { setEditing(null); setFormVisible(false); refetch(); },
  });
  const deleteMutation = useDeleteIAMarks({ onSuccess: () => { setDeleteTarget(null); refetch(); } });

  const renderItem = useCallback(({ item, index }: { item: IARow; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 40).duration(300).springify()}>
      <MarkRow
        item={item}
        onEdit={() => { setEditing(item); setFormVisible(true); }}
        onDelete={() => setDeleteTarget(item)}
      />
    </Animated.View>
  ), []);

  return (
    <ScreenWrapper route={ROUTES.IA_MARKS} scrollable={false}>
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>IA Marks</Text>
          <Text style={s.pageSubtitle}>{marks.length} record{marks.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={() => { setEditing(null); setFormVisible(true); }} style={s.addBtn} activeOpacity={0.85}>
          <Plus size={16} color={colors.white} />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Class filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        <TouchableOpacity onPress={() => setClassFilter(null)} style={[s.chip, classFilter === null && s.chipActive]} activeOpacity={0.75}>
          <Text style={[s.chipText, classFilter === null && s.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {loadingClasses
          ? <ActivityIndicator size="small" color={primaryScale[500]} style={{ marginHorizontal: 8 }} />
          : myClasses.map(c => (
              <TouchableOpacity key={c.class_id} onPress={() => setClassFilter(c.class_id)}
                style={[s.chip, classFilter === c.class_id && s.chipActive]} activeOpacity={0.75}>
                <Text style={[s.chipText, classFilter === c.class_id && s.chipTextActive]} numberOfLines={1}>
                  {c.subject_name}
                </Text>
              </TouchableOpacity>
            ))}
        <TouchableOpacity onPress={() => qc.invalidateQueries({ queryKey: ['ia-marks'] })} style={s.refreshBtn}>
          {isFetching
            ? <ActivityIndicator size={14} color={theme.textMuted} />
            : <RefreshCw size={14} color={theme.textMuted} />}
        </TouchableOpacity>
      </ScrollView>

      {/* List */}
      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <View style={s.sectionCard}>
          <View style={s.cardHeader}>
            <View style={s.cardHeaderLeft}>
              <Award size={16} color={theme.primary} />
              <Text style={s.cardTitle}>Internal Assessment Records</Text>
            </View>
            <Text style={s.cardCount}>{marks.length} entries</Text>
          </View>
          {marks.length === 0 ? (
            <View style={s.empty}>
              <Award size={44} color={theme.border} />
              <Text style={s.emptyTitle}>No IA marks yet</Text>
              <Text style={s.emptyDesc}>Tap "Add" to enter marks for a student.</Text>
            </View>
          ) : (
            <FlatList
              data={marks}
              keyExtractor={item => String(item.ia_id)}
              renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={s.separator} />}
              refreshControl={
                <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch}
                  tintColor={theme.primary} colors={[theme.primary]} />
              }
            />
          )}
        </View>
      )}

      <FormSheet
        visible={formVisible}
        onClose={() => { setFormVisible(false); setEditing(null); }}
        initial={editing}
        onSubmit={(d) => editing
          ? updateMutation.mutate({ ia1: d.ia1, ia2: d.ia2, ia3: d.ia3 })
          : createMutation.mutate(d)}
        loading={createMutation.isPending || updateMutation.isPending}
        myClasses={myClasses}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.ia_id)}
        title="Delete IA marks?"
        message={`Marks for ${deleteTarget?.student_name ?? deleteTarget?.student_id} will be permanently deleted.`}
        confirmLabel="Delete" variant="danger" loading={deleteMutation.isPending}
      />
    </ScreenWrapper>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary },
  pageSubtitle: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: primaryScale[600], paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, ...shadows.card },
  addBtnText: { fontSize: 13, fontWeight: '600', color: colors.white },
  chipRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  chipActive: { backgroundColor: primaryScale[600], borderColor: primaryScale[600] },
  chipText: { fontSize: 12, fontWeight: '500', color: theme.textSecondary },
  chipTextActive: { color: colors.white, fontWeight: '600' },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  sectionCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, overflow: 'hidden', ...shadows.card, flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.background },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  cardCount: { fontSize: 12, color: theme.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowStudent: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  rowMeta: { fontSize: 11, color: theme.textMuted, marginTop: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  scoreText: { fontSize: 13, fontWeight: '700' },
  rowActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 7, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  actionBtnDanger: { borderColor: colors.red[100] },
  separator: { height: 1, backgroundColor: theme.border },
  empty: { padding: 48, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: theme.textSecondary },
  emptyDesc: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'flex-end' },
  modalKav: { justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.background },
  modalTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  formBody: { padding: 20, gap: 14, paddingBottom: 8 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  required: { color: colors.red[500] },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: theme.textPrimary, backgroundColor: theme.surface, minHeight: 46 },
  selectTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectValue: { flex: 1, fontSize: 14, color: theme.textPrimary },
  selectPlaceholder: { flex: 1, fontSize: 14, color: theme.textMuted },
  infoBox: { backgroundColor: primaryScale[50], borderRadius: 10, padding: 12, borderWidth: 1, borderColor: primaryScale[100] },
  infoText: { fontSize: 12, color: primaryScale[700], textAlign: 'center' },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.background },
  footerBtn: { flex: 1 },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.overlay },
  sheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary },
  sheetEmpty: { textAlign: 'center', color: theme.textMuted, padding: 24, fontSize: 14 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: theme.border, minHeight: 48 },
  sheetOptionActive: { backgroundColor: primaryScale[50], borderRadius: 10, paddingHorizontal: 10, borderBottomWidth: 0 },
  sheetOptionText: { flex: 1, fontSize: 14, color: theme.textSecondary, marginRight: 8 },
  sheetOptionTextActive: { color: primaryScale[700], fontWeight: '600' },
});
