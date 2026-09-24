/**
 * Faculty Portal — Attendance
 * DB truth: attendance.student_id is VARCHAR(50) = students.library_id (USN string).
 * Flow: pick class → load students → pick student → pick status → Save.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput, Modal as RNModal, KeyboardAvoidingView,
  Platform, ScrollView, useWindowDimensions, FlatList,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, CheckSquare, X, Check, ChevronDown } from '../../components/icons';
import Toast from '../../services/toast';
import { useAttendance, useMarkAttendance } from '../../hooks/useAttendance';
import { useMyClasses } from '../../hooks/useClasses';
import { AttendancePayload } from '../../services/academic.service';
import { studentService, StudentOption } from '../../services/student.service';
import Button from '../../components/ui/Button';
import ScreenWrapper from '../../layouts/ScreenWrapper';
import { formatDate } from '../../utils/formatters';
import { colors, shadows, primaryScale, ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { ROUTES } from '../../navigation/routes';

const STATUS_PAL = {
  Present: { bg: colors.successBg, text: colors.success, dot: colors.success },
  Absent:  { bg: colors.dangerBg,  text: colors.danger,  dot: colors.danger  },
};

interface AttendanceRow {
  attendance_id: number; student_id: string; class_id: number;
  attendance_date: string; status: 'Present' | 'Absent'; remarks?: string;
  student_name?: string; student_usn?: string;   // joined from backend
  subject_name: string; subject_code: string;
}

const COLS = [
  { key: 'sno',     label: '#',       flex: 0.3, minWidth: 40 },
  { key: 'student', label: 'Student', flex: 1.2, minWidth: 130 },
  { key: 'subject', label: 'Subject', flex: 1.3, minWidth: 140 },
  { key: 'date',    label: 'Date',    flex: 0.9, minWidth: 100 },
  { key: 'status',  label: 'Status',  flex: 0.8, minWidth: 95  },
] as const;
const MIN_W = COLS.reduce((a, c) => a + c.minWidth, 0);

function AttendanceTable({ records, myClasses }: { records: AttendanceRow[]; myClasses: any[] }) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const { width: sw } = useWindowDimensions();
  const tableW = Math.max(sw - 64, MIN_W);
  return (
    <View style={{ width: '100%' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator style={{ width: '100%' }}>
        <View style={{ width: Math.max(tableW, MIN_W) }}>
          <View style={s.tableHeader}>
            {COLS.map(col => (
              <View key={col.key} style={[s.tableCol, { flex: col.flex, minWidth: col.minWidth }]}>
                <Text style={s.tableHeaderCell}>{col.label}</Text>
              </View>
            ))}
          </View>
          {records.length > 0
            ? records.map((rec, i) => {
                const pal = STATUS_PAL[rec.status] ?? STATUS_PAL.Absent;
                const cls = myClasses.find(c => c.class_id === Number(rec.class_id));
                return (
                  <View key={rec.attendance_id} style={[s.tableRow, i % 2 === 1 && s.tableRowAlt]}>
                    <View style={[s.tableCol, { flex: 0.3, minWidth: 40 }]}><Text style={s.tableCell}>{i + 1}</Text></View>
                    <View style={[s.tableCol, { flex: 1.2, minWidth: 130 }]}>
                      <Text style={[s.tableCell, s.tableCellBold]} numberOfLines={1}>
                        {rec.student_name || rec.student_usn || rec.student_id}
                      </Text>
                    </View>
                    <View style={[s.tableCol, { flex: 1.3, minWidth: 140 }]}><Text style={s.tableCell} numberOfLines={1}>{rec.subject_name || cls?.label || '—'}</Text></View>
                    <View style={[s.tableCol, { flex: 0.9, minWidth: 100 }]}><Text style={s.tableCell}>{formatDate(rec.attendance_date)}</Text></View>
                    <View style={[s.tableCol, { flex: 0.8, minWidth: 95 }]}>
                      <View style={[s.statusBadge, { backgroundColor: pal.bg }]}>
                        <View style={[s.statusDot, { backgroundColor: pal.dot }]} />
                        <Text style={[s.statusText, { color: pal.text }]}>{rec.status}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            : Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={s.tableRow}>
                  <View style={[s.tableCol, { flex: 0.3, minWidth: 40 }]}><Text style={s.tableCell}>{i + 1}</Text></View>
                  {COLS.slice(1).map(col => <View key={col.key} style={[s.tableCol, { flex: col.flex, minWidth: col.minWidth }]} />)}
                </View>
              ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Generic select sheet ──────────────────────────────────────────────────────
function SelectSheet<T extends { label: string }>({ visible, onClose, label, options, value, onChange }: {
  visible: boolean; onClose: () => void; label: string;
  options: T[]; value: string; onChange: (v: T) => void;
}) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={s.sheetBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={s.sheetContainer}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{label}</Text>
          <TouchableOpacity onPress={onClose}><X size={18} color={theme.textMuted} /></TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
          {options.map((opt, i) => {
            const active = opt.label === value;
            return (
              <TouchableOpacity key={i} onPress={() => { onChange(opt); onClose(); }}
                style={[s.sheetOption, active && s.sheetOptionActive]} activeOpacity={0.75}>
                <Text style={[s.sheetOptionText, active && s.sheetOptionTextActive]} numberOfLines={1}>{opt.label}</Text>
                {active && <Check size={14} color={theme.primary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </RNModal>
  );
}

// ── Mark attendance modal ────────────────────────────────────────────────────
interface MarkForm {
  classId: number | null; classLabel: string;
  studentId: string; studentLabel: string;  // string = library_id (VARCHAR)
  date: string; status: 'Present' | 'Absent'; remarks: string;
}
const EMPTY_MARK: MarkForm = { classId: null, classLabel: '', studentId: '', studentLabel: '', date: new Date().toISOString().split('T')[0], status: 'Present', remarks: '' };

function MarkSheet({ visible, onClose, onSubmit, loading, myClasses }: {
  visible: boolean; onClose: () => void;
  onSubmit: (r: AttendancePayload) => void; loading: boolean;
  myClasses: any[]; // Updated from typeof MY_CLASSES to any[]
}) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const [form, setForm]           = useState<MarkForm>(EMPTY_MARK);
  const [classSheet, setClassSheet]     = useState(false);
  const [studentSheet, setStudentSheet] = useState(false);
  const [students, setStudents]         = useState<StudentOption[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => { if (visible) setForm(EMPTY_MARK); }, [visible]);

  const set = (k: keyof MarkForm) => (v: any) => setForm(f => ({ ...f, [k]: v }));

  // When class changes, fetch students for that semester/section
  const handleClassSelect = async (cls: any) => {
    set('classId')(cls.class_id);
    set('classLabel')(cls.label);
    set('studentId')(null);
    set('studentLabel')('');
    setLoadingStudents(true);
    const list = await studentService.getBySemesterSection(cls.semester, cls.section);
    setStudents(list);
    setLoadingStudents(false);
  };

  const handleSubmit = () => {
    if (!form.classId) {
      Toast.show({ type: 'error', text1: 'Select a class first' }); return;
    }
    if (!form.studentId) {
      Toast.show({ type: 'error', text1: 'Select a student' }); return;
    }
    if (!form.date) {
      Toast.show({ type: 'error', text1: 'Enter a date' }); return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      Toast.show({ type: 'error', text1: 'Date must be YYYY-MM-DD' }); return;
    }

    const payload: AttendancePayload = {
      student_id:      form.studentId,      // library_id string e.g. "1CS21CS001"
      class_id:        form.classId,
      attendance_date: form.date,
      status:          form.status,
      remarks:         form.remarks.trim() || undefined,
    };
    console.log('[Attendance] submitting:', payload);
    onSubmit(payload);
  };

  return (
    <RNModal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={s.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalKav}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Mark Attendance</Text>
              <TouchableOpacity onPress={onClose}><X size={18} color={theme.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.formBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* Class */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Class <Text style={s.required}>*</Text></Text>
                <TouchableOpacity style={[s.input, s.selectTrigger]} onPress={() => setClassSheet(true)} activeOpacity={0.8}>
                  <Text style={form.classLabel ? s.selectValue : s.selectPlaceholder} numberOfLines={1}>{form.classLabel || 'Select class…'}</Text>
                  <ChevronDown size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Student */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Student <Text style={s.required}>*</Text></Text>
                {loadingStudents ? (
                  <View style={[s.input, { justifyContent: 'center' }]}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                ) : (
                  <TouchableOpacity style={[s.input, s.selectTrigger]} onPress={() => form.classId && setStudentSheet(true)} activeOpacity={0.8}>
                    <Text style={form.studentLabel ? s.selectValue : s.selectPlaceholder} numberOfLines={1}>
                      {form.studentLabel || (form.classId ? 'Select student…' : 'Select class first')}
                    </Text>
                    <ChevronDown size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Date */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Date <Text style={s.required}>*</Text></Text>
                <TextInput style={s.input} value={form.date} onChangeText={set('date')} placeholder="YYYY-MM-DD" placeholderTextColor={theme.placeholder} />
              </View>

              {/* Status */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Status <Text style={s.required}>*</Text></Text>
                <View style={s.statusRow}>
                  {(['Present', 'Absent'] as const).map(st => {
                    const active = form.status === st;
                    const pal = STATUS_PAL[st];
                    return (
                      <TouchableOpacity key={st} onPress={() => set('status')(st)}
                        style={[s.statusOption, active && { borderColor: pal.dot, backgroundColor: pal.bg }]} activeOpacity={0.75}>
                        {active && <View style={[s.statusDot, { backgroundColor: pal.dot }]} />}
                        <Text style={[s.statusOptionText, active && { color: pal.text, fontWeight: '700' }]}>{st}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Remarks */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Remarks</Text>
                <TextInput style={s.input} value={form.remarks} onChangeText={set('remarks')} placeholder="Optional…" placeholderTextColor={theme.placeholder} />
              </View>

            </ScrollView>
            <View style={s.modalFooter}>
              <Button variant="outline" onPress={onClose} style={s.footerBtn}>Cancel</Button>
              <Button onPress={handleSubmit} loading={loading} style={s.footerBtn}>Save</Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Class sheet */}
      <SelectSheet visible={classSheet} onClose={() => setClassSheet(false)} label="Select Class"
        options={myClasses.map(c => ({ ...c, label: c.label }))} value={form.classLabel}
        onChange={(c: typeof myClasses[0]) => handleClassSelect(c)} />

      {/* Student sheet */}
      <SelectSheet visible={studentSheet} onClose={() => setStudentSheet(false)} label="Select Student"
        options={students} value={form.studentLabel}
        onChange={(st: StudentOption) => { set('studentId')(st.student_id); set('studentLabel')(st.label); }} />
    </RNModal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function Attendance() {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const [classFilter, setClassFilter] = useState<number | null>(null);
  const [markVisible, setMarkVisible] = useState(false);
  const qc = useQueryClient();

  // Fetch classes from API instead of hardcoded
  const { data: myClasses = [], isLoading: loadingClasses } = useMyClasses();

  const params = classFilter ? { class_id: classFilter } : {};
  const { data: rawData, isLoading, isFetching, refetch } = useAttendance(params);
  const records: AttendanceRow[] = Array.isArray(rawData) ? rawData : [];
  const markMutation = useMarkAttendance({ onSuccess: () => { setMarkVisible(false); refetch(); } });

  return (
    <ScreenWrapper route={ROUTES.ATTENDANCE} scrollable={false}>
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Attendance</Text>
          <Text style={s.pageSubtitle}>{records.length} record{records.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={() => setMarkVisible(true)} style={s.addBtn} activeOpacity={0.85}>
          <Plus size={16} color={colors.white} />
          <Text style={s.addBtnText}>Mark</Text>
        </TouchableOpacity>
      </View>

      {/* Class filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        <TouchableOpacity onPress={() => setClassFilter(null)} style={[s.chip, classFilter === null && s.chipActive]} activeOpacity={0.75}>
          <Text style={[s.chipText, classFilter === null && s.chipTextActive]}>All Classes</Text>
        </TouchableOpacity>
        {loadingClasses ? (
          <ActivityIndicator size="small" color={primaryScale[500]} />
        ) : (
          myClasses.map(c => (
            <TouchableOpacity key={c.class_id} onPress={() => setClassFilter(c.class_id)}
              style={[s.chip, classFilter === c.class_id && s.chipActive]} activeOpacity={0.75}>
              <Text style={[s.chipText, classFilter === c.class_id && s.chipTextActive]} numberOfLines={1}>{c.label}</Text>
            </TouchableOpacity>
          ))
        )}
        <TouchableOpacity onPress={() => qc.invalidateQueries({ queryKey: ['attendance'] })} style={s.refreshBtn}>
          {isFetching ? <ActivityIndicator size={14} color={theme.textMuted} /> : <RefreshCw size={14} color={theme.textMuted} />}
        </TouchableOpacity>
      </ScrollView>

      {/* Table */}
      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={theme.primary} /></View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={theme.primary} colors={[theme.primary]} />}
          contentContainerStyle={s.listContent}>
          <View style={s.tableCard}>
            <View style={s.tableCardHeader}>
              <CheckSquare size={15} color={theme.primary} />
              <Text style={s.tableCardTitle}>Attendance Records</Text>
            </View>
            <AttendanceTable records={records} myClasses={myClasses} />
            {records.length === 0 && (
              <View style={s.empty}>
                <CheckSquare size={44} color={theme.border} />
                <Text style={s.emptyTitle}>No records yet</Text>
                <Text style={s.emptyDesc}>Tap "Mark" to record attendance.</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      <MarkSheet visible={markVisible} onClose={() => setMarkVisible(false)}
        onSubmit={(r) => markMutation.mutate(r)} loading={markMutation.isPending} 
        myClasses={myClasses} />
    </ScreenWrapper>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const getStyles = (theme: ThemeColors) => StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  pageTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary, lineHeight: 24 },
  pageSubtitle: { fontSize: 12, color: theme.textSecondary, marginTop: 2, lineHeight: 16 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: primaryScale[600],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    ...shadows.card,
    minHeight: 40,
  },
  addBtnText: { fontSize: 13, fontWeight: '600', color: colors.white },
  chipRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: { backgroundColor: primaryScale[600], borderColor: primaryScale[600] },
  chipText: { fontSize: 12, fontWeight: '500', color: theme.textSecondary, textAlign: 'center' },
  chipTextActive: { color: colors.white, fontWeight: '600', textAlign: 'center' },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    marginLeft: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  tableCard: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    gap: 16,
    ...shadows.card,
  },
  tableCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 4,
  },
  tableCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textPrimary,
    lineHeight: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.background,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 40,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    minHeight: 48,
  },
  tableRowAlt: { backgroundColor: theme.background },
  tableCol: { justifyContent: 'center', paddingHorizontal: 6 },
  tableCell: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  tableCellBold: {
    fontWeight: '600',
    color: theme.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
    minWidth: 75,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  empty: {
    padding: 60,
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyDesc: {
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  modalOverlay: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'flex-end' },
  modalKav: { justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.background },
  modalTitle: { fontSize: 17, fontWeight: '700', color: theme.textPrimary, lineHeight: 22 },
  formBody: { padding: 20, gap: 16, paddingBottom: 10 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: theme.textSecondary, lineHeight: 18 },
  required: { color: colors.red[500] },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: theme.textPrimary, backgroundColor: theme.surface, minHeight: 48, lineHeight: 20 },
  selectTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12 },
  selectValue: { flex: 1, fontSize: 14, color: theme.textPrimary, lineHeight: 20 },
  selectPlaceholder: { flex: 1, fontSize: 14, color: theme.textMuted, lineHeight: 20 },
  statusRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  statusOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.background, minHeight: 52 },
  statusOptionText: { fontSize: 14, fontWeight: '600', color: theme.textSecondary },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.background },
  footerBtn: { flex: 1, minHeight: 48 },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.overlay },
  sheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.border },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, lineHeight: 22 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: theme.border, minHeight: 50 },
  sheetOptionActive: { backgroundColor: primaryScale[50], borderRadius: 12, paddingHorizontal: 12, borderBottomWidth: 0, marginVertical: 2 },
  sheetOptionText: { flex: 1, fontSize: 15, color: theme.textSecondary, marginRight: 12, lineHeight: 20 },
  sheetOptionTextActive: { color: primaryScale[700], fontWeight: '600' },
});
