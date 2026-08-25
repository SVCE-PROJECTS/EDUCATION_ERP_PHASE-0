import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import PageHeader from '../../src/components/common/PageHeader';
import Colors from '../../src/theme/colors';

// ── Types ─────────────────────────────────────────────────────────

interface StudentAttendance {
  id: number;
  usn: string;
  name: string;
  status: 'Present' | 'Absent';
}

interface CalendarItem {
  value: string;
  label: string;
}

// ── Constants ─────────────────────────────────────────────────────

const SUBJECTS = ['ADA', 'MC', 'DBMS', 'DMS', 'BCE', 'GITS', 'UHV'];

// ── Date helpers ──────────────────────────────────────────────────

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function buildCalendar(n = 30): CalendarItem[] {
  const days: CalendarItem[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const str = d.toISOString().split('T')[0];
    days.push({
      value: str,
      label: formatDisplay(str) + (i === 0 ? ' (Today)' : i === 1 ? ' (Yesterday)' : ''),
    });
  }
  return days;
}

const CALENDAR = buildCalendar(30);

// ── Screen ────────────────────────────────────────────────────────

export default function AttendanceScreen() {
  const [students,        setStudents]        = useState<StudentAttendance[]>([]);
  const [subject,         setSubject]         = useState('ADA');
  const [date,            setDate]            = useState(todayString());
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [lastSaved,       setLastSaved]       = useState<string | null>(null);
  const [showDatePicker,  setShowDatePicker]  = useState(false);
  const [hasUnsaved,      setHasUnsaved]      = useState(false);
  // Store original state to detect unsaved changes
  const savedStateRef = useRef<string>('');

  const fetchAttendance = useCallback(async (subj: string, dt: string) => {
    setLoading(true);
    try {
      const res = await api.get('/attendance', { params: { subject: subj, date: dt } });
      const loaded: StudentAttendance[] = res.data.map((r: any) => ({
        id:     r.student_id,
        usn:    r.usn,
        name:   r.name,
        status: r.status,
      }));
      setStudents(loaded);
      // Record the saved state so we can detect unsaved changes
      savedStateRef.current = JSON.stringify(loaded.map(s => ({ id: s.id, status: s.status })));
      setHasUnsaved(false);
    } catch {
      Alert.alert('Error', 'Could not load students. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { fetchAttendance(subject, date); }, [subject, date, fetchAttendance])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAttendance(subject, date).finally(() => setRefreshing(false));
  }, [subject, date, fetchAttendance]);

  const toggleAttendance = (id: number) => {
    setStudents(prev => {
      const next = prev.map(s =>
        s.id === id ? { ...s, status: s.status === 'Present' ? 'Absent' : 'Present' } : s
      ) as StudentAttendance[];
      // Check if current state differs from saved state
      const currentKey = JSON.stringify(next.map(s => ({ id: s.id, status: s.status })));
      setHasUnsaved(currentKey !== savedStateRef.current);
      return next;
    });
  };

  const markAll = (status: 'Present' | 'Absent') => {
    setStudents(prev => {
      const next = prev.map(s => ({ ...s, status }));
      const currentKey = JSON.stringify(next.map(s => ({ id: s.id, status: s.status })));
      setHasUnsaved(currentKey !== savedStateRef.current);
      return next;
    });
  };

  const saveAttendance = async () => {
    if (!students.length) { Alert.alert('No Students', 'No students loaded.'); return; }
    if (saving) return; // prevent duplicate saves
    setSaving(true);
    try {
      // Await the save — never fetch before this completes
      await api.post('/attendance/bulk', {
        records: students.map(s => ({
          student_id: s.id, subject, attendance_date: date, status: s.status,
        })),
      });
      // Only fetch after save succeeds
      await fetchAttendance(subject, date);
      setLastSaved(new Date().toLocaleTimeString());
      // hasUnsaved is reset by fetchAttendance via savedStateRef
      Alert.alert('✅ Saved', `Attendance saved for ${students.length} students on ${formatDisplay(date)}.`);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message ?? 'Unable to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubjectOrDateChange = (newSubj: string, newDate: string) => {
    if (hasUnsaved) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved attendance changes. Leave without saving?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave', style: 'destructive',
            onPress: () => {
              setHasUnsaved(false);
              fetchAttendance(newSubj, newDate);
            },
          },
        ]
      );
    } else {
      fetchAttendance(newSubj, newDate);
    }
  };

  const handleSubjectChange = (val: string) => {
    setSubject(val);
    handleSubjectOrDateChange(val, date);
  };
  const handleDateChange = (val: string) => {
    setDate(val);
    handleSubjectOrDateChange(subject, val);
    setShowDatePicker(false);
  };

  const presentCount = students.filter(s => s.status === 'Present').length;
  const absentCount  = students.length - presentCount;

  return (
    <View style={styles.container}>
      <PageHeader
        title="Attendance"
        subtitle={`${formatDisplay(date)} · ${subject}`}
        iconName="checkbox-outline"
        badge={students.length || null}
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >
        <View style={styles.inner}>

          {/* Filter card */}
          <View style={styles.filterCard}>
            <Text style={styles.label}>Subject</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={subject}
                onValueChange={handleSubjectChange}
                style={styles.picker}
                dropdownIconColor={Colors.textSecondary}
                enabled={!loading && !saving}
              >
                {SUBJECTS.map(s => <Picker.Item key={s} label={s} value={s} />)}
              </Picker>
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>Date</Text>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setShowDatePicker(true)}
              disabled={loading || saving}
            >
              <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              <Text style={styles.dateBtnText}>{formatDisplay(date)}</Text>
              <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.dateNav}>
              <TouchableOpacity
                style={styles.dateNavBtn}
                onPress={() => { const d = addDays(date, -1); setDate(d); fetchAttendance(subject, d); }}
                disabled={loading || saving}
              >
                <Ionicons name="chevron-back" size={16} color={Colors.primary} />
                <Text style={styles.dateNavText}>Prev Day</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.dateNavBtn, styles.todayBtn]}
                onPress={() => { setDate(todayString()); fetchAttendance(subject, todayString()); }}
                disabled={date === todayString() || loading || saving}
              >
                <Text style={styles.todayBtnText}>Today</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateNavBtn}
                onPress={() => {
                  if (date < todayString()) {
                    const d = addDays(date, 1);
                    setDate(d); fetchAttendance(subject, d);
                  }
                }}
                disabled={date >= todayString() || loading || saving}
              >
                <Text style={styles.dateNavText}>Next Day</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary chips */}
          <View style={styles.summary}>
            <View style={[styles.chip, { backgroundColor: Colors.successLight }]}>
              <Text style={[styles.chipText, { color: Colors.success }]}>✓ Present: {presentCount}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: Colors.dangerLight }]}>
              <Text style={[styles.chipText, { color: Colors.danger }]}>✗ Absent: {absentCount}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: Colors.primaryLight }]}>
              <Text style={[styles.chipText, { color: Colors.primary }]}>Total: {students.length}</Text>
            </View>
          </View>

          {/* Mark All row */}
          {!loading && students.length > 0 && (
            <View style={styles.markAllRow}>
              <Text style={styles.markAllLabel}>Quick Mark:</Text>
              <TouchableOpacity
                style={[styles.markAllBtn, { backgroundColor: Colors.successLight }]}
                onPress={() => markAll('Present')}
              >
                <Text style={[styles.markAllBtnText, { color: Colors.success }]}>All Present</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.markAllBtn, { backgroundColor: Colors.dangerLight }]}
                onPress={() => markAll('Absent')}
              >
                <Text style={[styles.markAllBtnText, { color: Colors.danger }]}>All Absent</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Student list */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.loadingText}>Loading students...</Text>
            </View>
          ) : students.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={48} color={Colors.border} />
              <Text style={styles.emptyText}>No students found.</Text>
            </View>
          ) : (
            <>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.cell, styles.headerCell, { flex: 0.5 }]}>#</Text>
                <Text style={[styles.cell, styles.headerCell, { flex: 1.8 }]}>USN</Text>
                <Text style={[styles.cell, styles.headerCell, { flex: 1.6 }]}>Name</Text>
                <Text style={[styles.cell, styles.headerCell, { flex: 1, textAlign: 'center' }]}>Status</Text>
              </View>
              {students.map((student, idx) => (
                <View
                  key={student.id}
                  style={[styles.tableRow, idx % 2 === 0 && { backgroundColor: Colors.background }]}
                >
                  <Text style={[styles.cell, { flex: 0.5, color: Colors.textMuted }]}>{idx + 1}</Text>
                  <Text style={[styles.cell, { flex: 1.8 }]} numberOfLines={1}>{student.usn}</Text>
                  <Text style={[styles.cell, { flex: 1.6 }]} numberOfLines={1}>{student.name}</Text>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[styles.statusBtn, {
                        backgroundColor: student.status === 'Present' ? Colors.success : Colors.danger,
                      }]}
                      onPress={() => toggleAttendance(student.id)}
                      disabled={saving}
                    >
                      <Text style={styles.statusBtnText}>
                        {student.status === 'Present' ? 'P' : 'A'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {lastSaved && (
            <View style={styles.savedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.savedText}>Last saved at {lastSaved}</Text>
            </View>
          )}

          {hasUnsaved && (
            <View style={styles.unsavedBadge}>
              <Ionicons name="alert-circle-outline" size={14} color={Colors.warning} />
              <Text style={styles.unsavedText}>Unsaved changes — tap Save to keep them</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, (saving || loading) && { opacity: 0.6 }]}
            onPress={saveAttendance}
            disabled={saving || loading}
          >
            {saving ? (
              <View style={styles.savingRow}>
                <ActivityIndicator color={Colors.white} size="small" />
                <Text style={[styles.saveBtnText, { marginLeft: 10 }]}>Saving...</Text>
              </View>
            ) : (
              <View style={styles.savingRow}>
                <Ionicons name="save-outline" size={20} color={Colors.white} />
                <Text style={[styles.saveBtnText, { marginLeft: 8 }]}>
                  Save Attendance ({students.length} students)
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        />
        <View style={styles.datePickerSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Select Date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.calendarScroll} showsVerticalScrollIndicator={false}>
            {CALENDAR.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[styles.calendarRow, item.value === date && styles.calendarRowActive]}
                onPress={() => handleDateChange(item.value)}
              >
                <Ionicons
                  name={item.value === date ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={item.value === date ? Colors.primary : Colors.border}
                />
                <Text style={[styles.calendarLabel, item.value === date && styles.calendarLabelActive]}>
                  {item.label}
                </Text>
                {item.value === todayString() && (
                  <View style={styles.todayTag}>
                    <Text style={styles.todayTagText}>Today</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  scroll:      { flex: 1 },
  inner:       { padding: 16, paddingBottom: 40 },
  filterCard: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 16,
    marginBottom: 14, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  label:        { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6 },
  pickerWrapper:{ borderWidth: 1, borderColor: Colors.border, borderRadius: 10, overflow: 'hidden', backgroundColor: Colors.background },
  picker:       { height: 52, color: Colors.textPrimary },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.primaryLight,
  },
  dateBtnText:   { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.primary },
  dateNav:       { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  dateNavBtn:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  dateNavText:   { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  todayBtn:      { flex: 1, justifyContent: 'center', backgroundColor: Colors.primary, borderColor: Colors.primary },
  todayBtnText:  { fontSize: 12, color: Colors.white, fontWeight: '700', textAlign: 'center' },
  summary:       { flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  chip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  chipText:      { fontWeight: '700', fontSize: 12 },
  markAllRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  markAllLabel:  { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  markAllBtn:    { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  markAllBtnText:{ fontSize: 12, fontWeight: '700' },
  loadingBox:    { alignItems: 'center', paddingVertical: 40 },
  loadingText:   { marginTop: 10, color: Colors.textSecondary, fontSize: 14 },
  emptyBox:      { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText:     { color: Colors.textMuted, fontSize: 15 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.white, paddingHorizontal: 10,
  },
  tableHeader:   { backgroundColor: Colors.primaryLight, borderRadius: 8, borderBottomWidth: 0, marginBottom: 2 },
  cell:          { fontSize: 12, color: Colors.textPrimary, paddingHorizontal: 2 },
  headerCell:    { fontWeight: '700', color: Colors.primary, fontSize: 11 },
  statusBtn:     { width: 36, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statusBtnText: { color: Colors.white, fontWeight: '800', fontSize: 13 },
  savedBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 12 },
  savedText:     { fontSize: 12, color: Colors.success, fontWeight: '600' },
  unsavedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 8, backgroundColor: Colors.warningLight, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  unsavedText:   { fontSize: 12, color: Colors.warning, fontWeight: '600' },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 14, elevation: 3,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6,
  },
  saveBtnText:  { color: Colors.white, fontWeight: '700', fontSize: 16 },
  savingRow:    { flexDirection: 'row', alignItems: 'center' },
  modalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  datePickerSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 34, maxHeight: '70%' as any,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sheetTitle:          { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  calendarScroll:      { paddingHorizontal: 16 },
  calendarRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border },
  calendarRowActive:   { backgroundColor: Colors.primaryLight, borderRadius: 10, paddingHorizontal: 8 },
  calendarLabel:       { flex: 1, fontSize: 14, color: Colors.textPrimary },
  calendarLabelActive: { fontWeight: '700', color: Colors.primary },
  todayTag:            { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  todayTagText:        { fontSize: 10, color: Colors.white, fontWeight: '700' },
});
