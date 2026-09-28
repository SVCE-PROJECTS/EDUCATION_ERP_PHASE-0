/**
 * Faculty Portal — Attendance (Bulk Mark)
 * Select class + date → all students appear → tap to toggle Present/Absent → Save All
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, ScrollView, FlatList, useWindowDimensions,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckSquare, Check, X, ChevronDown } from '../../components/faculty/icons';
import Toast from '../../services/faculty/toast';
import { useAttendance, useMarkAttendanceBulk } from '../../hooks/faculty/useAttendance';
import { useMyClasses } from '../../hooks/faculty/useClasses';
import { AttendancePayload } from '../../services/faculty/academic.service';
import { studentService, StudentOption } from '../../services/faculty/student.service';
import Button from '../../components/faculty/ui/Button';
import ScreenWrapper from '../../layouts/faculty/ScreenWrapper';
import { formatDate } from '../../utils/faculty/formatters';
import { colors, shadows, primaryScale, ThemeColors } from '../../theme/faculty/colors';
import { useTheme } from '../../context/faculty/ThemeContext';
import { ROUTES } from '../../navigation/faculty/routes';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AttendanceRow {
  attendance_id: number; student_id: string; class_id: number;
  attendance_date: string; status: 'Present' | 'Absent'; remarks?: string;
  student_name?: string; student_usn?: string;
  subject_name: string; subject_code: string;
}

type StatusMap = Record<string, 'Present' | 'Absent'>;

const TODAY = new Date().toISOString().split('T')[0];

// ── Attendance records table ──────────────────────────────────────────────────
const COLS = [
  { key: 'sno',     label: '#',       flex: 0.3, minWidth: 40 },
  { key: 'student', label: 'Student', flex: 1.4, minWidth: 140 },
  { key: 'subject', label: 'Subject', flex: 1.3, minWidth: 140 },
  { key: 'date',    label: 'Date',    flex: 0.9, minWidth: 100 },
  { key: 'status',  label: 'Status',  flex: 0.8, minWidth: 95  },
] as const;
const MIN_W = COLS.reduce((a, c) => a + c.minWidth, 0);

function RecordsTable({ records, myClasses }: { records: AttendanceRow[]; myClasses: any[] }) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const { width: sw } = useWindowDimensions();
  const tableW = Math.max(sw - 64, MIN_W);
  const PAL = { Present: { bg: colors.successBg, text: colors.success, dot: colors.success }, Absent: { bg: colors.dangerBg, text: colors.danger, dot: colors.danger } };
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={{ width: '100%' }}>
      <View style={{ width: Math.max(tableW, MIN_W) }}>
        <View style={s.tableHeader}>
          {COLS.map(col => (
            <View key={col.key} style={[s.tableCol, { flex: col.flex, minWidth: col.minWidth }]}>
              <Text style={s.tableHeaderCell}>{col.label}</Text>
            </View>
          ))}
        </View>
        {records.length > 0 ? records.map((rec, i) => {
          const pal = PAL[rec.status] ?? PAL.Absent;
          const cls = myClasses.find(c => c.class_id === Number(rec.class_id));
          return (
            <View key={rec.attendance_id} style={[s.tableRow, i % 2 === 1 && s.tableRowAlt]}>
              <View style={[s.tableCol, { flex: 0.3, minWidth: 40 }]}><Text style={s.tableCell}>{i + 1}</Text></View>
              <View style={[s.tableCol, { flex: 1.4, minWidth: 140 }]}>
                <Text style={[s.tableCell, s.tableCellBold]} numberOfLines={1}>{rec.student_name || rec.student_usn || rec.student_id}</Text>
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
        }) : null}
      </View>
    </ScrollView>
  );
}

// ── Bulk mark panel ───────────────────────────────────────────────────────────
function BulkMarkPanel({
  myClasses, onSaved,
}: { myClasses: any[]; onSaved: () => void }) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);

  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [date, setDate]                   = useState(TODAY);
  const [students, setStudents]           = useState<StudentOption[]>([]);
  const [statusMap, setStatusMap]         = useState<StatusMap>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [classOpen, setClassOpen]         = useState(false);

  const bulkMutation = useMarkAttendanceBulk({ onSuccess: () => {
    Toast.show({ type: 'success', text1: `Attendance saved for ${students.length} students` });
    onSaved();
    setStatusMap({});
    setStudents([]);
    setSelectedClass(null);
  }});

  // Load students whenever class changes
  useEffect(() => {
    if (!selectedClass) { setStudents([]); setStatusMap({}); return; }
    setLoadingStudents(true);
    studentService.getBySemesterSection(selectedClass.semester, selectedClass.section)
      .then(list => {
        setStudents(list);
        // default everyone to Present
        const map: StatusMap = {};
        list.forEach(st => { map[st.student_id] = 'Present'; });
        setStatusMap(map);
      })
      .catch(() => Toast.show({ type: 'error', text1: 'Failed to load students' }))
      .finally(() => setLoadingStudents(false));
  }, [selectedClass]);

  const toggle = (studentId: string) => {
    setStatusMap(m => ({ ...m, [studentId]: m[studentId] === 'Present' ? 'Absent' : 'Present' }));
  };

  const markAll = (status: 'Present' | 'Absent') => {
    const map: StatusMap = {};
    students.forEach(st => { map[st.student_id] = status; });
    setStatusMap(map);
  };

  const handleSave = () => {
    if (!selectedClass || students.length === 0) {
      Toast.show({ type: 'error', text1: 'Select a class first' }); return;
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Toast.show({ type: 'error', text1: 'Date must be YYYY-MM-DD' }); return;
    }
    const records: AttendancePayload[] = students.map(st => ({
      student_id: st.student_id,
      class_id: selectedClass.class_id,
      attendance_date: date,
      status: statusMap[st.student_id] ?? 'Present',
    }));
    bulkMutation.mutate(records);
  };

  const presentCount = Object.values(statusMap).filter(s => s === 'Present').length;
  const absentCount  = students.length - presentCount;

  return (
    <View style={s.bulkPanel}>
      {/* Header */}
      <Text style={s.bulkTitle}>Mark Attendance</Text>

      {/* Class + Date row */}
      <View style={s.bulkTopRow}>
        {/* Class dropdown */}
        <View style={s.bulkField}>
          <Text style={s.bulkLabel}>Class</Text>
          <TouchableOpacity style={s.bulkDropdown} onPress={() => setClassOpen(v => !v)} activeOpacity={0.8}>
            <Text style={[s.bulkDropdownText, !selectedClass && s.bulkDropdownPlaceholder]} numberOfLines={1}>
              {selectedClass ? selectedClass.subject_name : 'Select class…'}
            </Text>
            <ChevronDown size={15} color={theme.textMuted} />
          </TouchableOpacity>
          {classOpen && (
            <View style={s.dropdownList}>
              {myClasses.map(cls => (
                <TouchableOpacity key={cls.class_id} style={[s.dropdownItem, selectedClass?.class_id === cls.class_id && s.dropdownItemActive]}
                  onPress={() => { setSelectedClass(cls); setClassOpen(false); }} activeOpacity={0.75}>
                  <Text style={[s.dropdownItemText, selectedClass?.class_id === cls.class_id && s.dropdownItemTextActive]} numberOfLines={1}>{cls.label}</Text>
                  {selectedClass?.class_id === cls.class_id && <Check size={13} color={theme.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Date input */}
        <View style={s.bulkField}>
          <Text style={s.bulkLabel}>Date</Text>
          <View style={s.bulkDateWrap}>
            <Text style={s.bulkDateText}>{date}</Text>
          </View>
        </View>
      </View>

      {/* Quick mark all row */}
      {students.length > 0 && (
        <View style={s.quickMarkRow}>
          <Text style={s.quickMarkLabel}>{students.length} students</Text>
          <View style={s.quickMarkBtns}>
            <TouchableOpacity style={s.quickAllPresent} onPress={() => markAll('Present')} activeOpacity={0.8}>
              <Check size={13} color={colors.success} />
              <Text style={[s.quickMarkBtnText, { color: colors.success }]}>All Present</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.quickAllAbsent} onPress={() => markAll('Absent')} activeOpacity={0.8}>
              <X size={13} color={colors.danger} />
              <Text style={[s.quickMarkBtnText, { color: colors.danger }]}>All Absent</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Student toggle list */}
      {loadingStudents ? (
        <View style={s.bulkLoading}><ActivityIndicator color={theme.primary} /></View>
      ) : students.length > 0 ? (
        <View style={s.studentList}>
          {students.map((st, i) => {
            const status = statusMap[st.student_id] ?? 'Present';
            const isPresent = status === 'Present';
            return (
              <TouchableOpacity key={st.student_id} onPress={() => toggle(st.student_id)}
                style={[s.studentRow, isPresent ? s.studentRowPresent : s.studentRowAbsent]}
                activeOpacity={0.75}>
                <View style={[s.studentIndex, isPresent ? s.studentIndexPresent : s.studentIndexAbsent]}>
                  <Text style={[s.studentIndexText, { color: isPresent ? colors.success : colors.danger }]}>{i + 1}</Text>
                </View>
                <Text style={s.studentName} numberOfLines={1}>{st.label}</Text>
                <View style={[s.toggleBadge, isPresent ? s.togglePresent : s.toggleAbsent]}>
                  {isPresent
                    ? <Check size={13} color={colors.success} />
                    : <X size={13} color={colors.danger} />}
                  <Text style={[s.toggleText, { color: isPresent ? colors.success : colors.danger }]}>
                    {isPresent ? 'Present' : 'Absent'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : selectedClass ? (
        <Text style={s.bulkEmpty}>No students found for this class.</Text>
      ) : (
        <Text style={s.bulkEmpty}>Select a class to load students.</Text>
      )}

      {/* Summary + Save */}
      {students.length > 0 && (
        <View style={s.bulkFooter}>
          <View style={s.bulkSummary}>
            <View style={s.summaryItem}>
              <View style={[s.summaryDot, { backgroundColor: colors.success }]} />
              <Text style={s.summaryText}>{presentCount} Present</Text>
            </View>
            <View style={s.summaryItem}>
              <View style={[s.summaryDot, { backgroundColor: colors.danger }]} />
              <Text style={s.summaryText}>{absentCount} Absent</Text>
            </View>
          </View>
          <Button onPress={handleSave} loading={bulkMutation.isPending} style={s.saveBtn}>
            Save Attendance
          </Button>
        </View>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function Attendance() {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const [classFilter, setClassFilter] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data: myClasses = [], isLoading: loadingClasses } = useMyClasses();
  const params = classFilter ? { class_id: classFilter } : {};
  const { data: rawData, isLoading, isFetching, refetch } = useAttendance(params);
  const records: AttendanceRow[] = Array.isArray(rawData) ? rawData : [];

  return (
    <ScreenWrapper route={ROUTES.ATTENDANCE} scrollable={false}>
      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={theme.primary} colors={[theme.primary]} />}
        contentContainerStyle={s.scrollContent}>

        {/* ── Bulk mark panel ─────────────────────────────────────────── */}
        {!loadingClasses && (
          <BulkMarkPanel myClasses={myClasses} onSaved={() => { refetch(); setClassFilter(null); }} />
        )}

        {/* ── Records section ─────────────────────────────────────────── */}
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>Attendance Records</Text>
          <Text style={s.pageSubtitle}>{records.length} record{records.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Class filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          <TouchableOpacity onPress={() => setClassFilter(null)} style={[s.chip, classFilter === null && s.chipActive]} activeOpacity={0.75}>
            <Text style={[s.chipText, classFilter === null && s.chipTextActive]}>All Classes</Text>
          </TouchableOpacity>
          {myClasses.map(c => (
            <TouchableOpacity key={c.class_id} onPress={() => setClassFilter(c.class_id)}
              style={[s.chip, classFilter === c.class_id && s.chipActive]} activeOpacity={0.75}>
              <Text style={[s.chipText, classFilter === c.class_id && s.chipTextActive]} numberOfLines={1}>{c.subject_name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => qc.invalidateQueries({ queryKey: ['attendance'] })} style={s.refreshBtn}>
            {isFetching ? <ActivityIndicator size={14} color={theme.textMuted} /> : <RefreshCw size={14} color={theme.textMuted} />}
          </TouchableOpacity>
        </ScrollView>

        {/* Records table */}
        {isLoading ? (
          <View style={s.center}><ActivityIndicator size="large" color={theme.primary} /></View>
        ) : (
          <View style={s.tableCard}>
            <View style={s.tableCardHeader}>
              <CheckSquare size={15} color={theme.primary} />
              <Text style={s.tableCardTitle}>Attendance Records</Text>
            </View>
            <RecordsTable records={records} myClasses={myClasses} />
            {records.length === 0 && (
              <View style={s.empty}>
                <CheckSquare size={44} color={theme.border} />
                <Text style={s.emptyTitle}>No records yet</Text>
                <Text style={s.emptyDesc}>Use the panel above to mark attendance.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const getStyles = (theme: ThemeColors) => StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 48, gap: 16 },

  // ── Bulk panel ──────────────────────────────────────────────────────────────
  bulkPanel: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
    gap: 14,
    ...shadows.card,
  },
  bulkTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },

  bulkTopRow: { flexDirection: 'row', gap: 12 },
  bulkField: { flex: 1, gap: 6, position: 'relative' },
  bulkLabel: { fontSize: 12, fontWeight: '600', color: theme.textSecondary },
  bulkDropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: theme.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: theme.background,
    minHeight: 42,
  },
  bulkDropdownText: { flex: 1, fontSize: 13, color: theme.textPrimary, marginRight: 6 },
  bulkDropdownPlaceholder: { color: theme.textMuted },
  dropdownList: {
    position: 'absolute', top: 68, left: 0, right: 0, zIndex: 100,
    backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1,
    borderColor: theme.border, ...shadows.card, maxHeight: 220,
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  dropdownItemActive: { backgroundColor: primaryScale[50] },
  dropdownItemText: { flex: 1, fontSize: 13, color: theme.textSecondary, marginRight: 8 },
  dropdownItemTextActive: { color: primaryScale[700], fontWeight: '600' },

  bulkDateWrap: {
    borderWidth: 1, borderColor: theme.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: theme.background,
    minHeight: 42, justifyContent: 'center',
  },
  bulkDateText: { fontSize: 13, color: theme.textPrimary },

  quickMarkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quickMarkLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary },
  quickMarkBtns: { flexDirection: 'row', gap: 8 },
  quickAllPresent: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.successBg, borderWidth: 1, borderColor: colors.success },
  quickAllAbsent: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.danger },
  quickMarkBtnText: { fontSize: 12, fontWeight: '600' },

  bulkLoading: { paddingVertical: 24, alignItems: 'center' },
  bulkEmpty: { fontSize: 13, color: theme.textMuted, textAlign: 'center', paddingVertical: 16 },

  studentList: { gap: 6 },
  studentRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
  },
  studentRowPresent: { backgroundColor: colors.successBg, borderColor: colors.success },
  studentRowAbsent:  { backgroundColor: colors.dangerBg,  borderColor: colors.danger },
  studentIndex: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  studentIndexPresent: { backgroundColor: 'rgba(34,197,94,0.15)' },
  studentIndexAbsent:  { backgroundColor: 'rgba(239,68,68,0.15)' },
  studentIndexText: { fontSize: 11, fontWeight: '700' },
  studentName: { flex: 1, fontSize: 13, fontWeight: '500', color: theme.textPrimary },
  toggleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  togglePresent: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: colors.success },
  toggleAbsent:  { backgroundColor: 'rgba(239,68,68,0.12)',  borderColor: colors.danger },
  toggleText: { fontSize: 12, fontWeight: '600' },

  bulkFooter: { gap: 10, marginTop: 4 },
  bulkSummary: { flexDirection: 'row', gap: 16 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryDot: { width: 8, height: 8, borderRadius: 4 },
  summaryText: { fontSize: 13, color: theme.textSecondary, fontWeight: '500' },
  saveBtn: { minHeight: 46 },

  // ── Records section ─────────────────────────────────────────────────────────
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  pageTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  pageSubtitle: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },

  chipRow: { paddingVertical: 4, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  chipActive: { backgroundColor: primaryScale[600], borderColor: primaryScale[600] },
  chipText: { fontSize: 12, fontWeight: '500', color: theme.textSecondary },
  chipTextActive: { color: colors.white, fontWeight: '600' },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface },
  center: { paddingVertical: 40, alignItems: 'center' },

  tableCard: { backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 12, ...shadows.card },
  tableCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tableCardTitle: { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
  tableHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.background, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 6 },
  tableHeaderCell: { fontSize: 11, fontWeight: '700', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: theme.border },
  tableRowAlt: { backgroundColor: theme.background },
  tableCol: { justifyContent: 'center', paddingHorizontal: 5 },
  tableCell: { fontSize: 13, color: theme.textSecondary },
  tableCellBold: { fontWeight: '600', color: theme.textPrimary },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  empty: { padding: 48, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: theme.textSecondary, textAlign: 'center' },
  emptyDesc: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },
});
