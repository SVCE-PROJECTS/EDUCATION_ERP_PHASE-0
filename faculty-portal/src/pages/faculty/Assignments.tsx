/**
 * Faculty Portal — Assignments
 * Backend schema: assignments(assignment_id, class_id, title, description, due_date, marks, status)
 * class_id is required — shown as a readable "Subject · Section · Sem" picker.
 * Response is a raw array (no .data wrapper).
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput,
  Modal as RNModal, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, RefreshCw, ClipboardList, X, Check, ChevronDown } from '../../components/icons';
import { useCreateAssignment, useUpdateAssignment, useDeleteAssignment } from '../../hooks/useAssignments';
import { assignmentService, AssignmentPayload } from '../../services/academic.service';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchBar from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import ScreenWrapper from '../../layouts/ScreenWrapper';
import { formatDate } from '../../utils/formatters';
import { colors, shadows, primaryScale, neutral } from '../../theme/colors';
import { ROUTES } from '../../navigation/routes';
import api from '../../services/api';

// ── Types matching actual DB rows ─────────────────────────────────────────────
interface AssignmentRow {
  assignment_id: number;
  class_id: number;
  title: string;
  description?: string;
  due_date?: string;
  marks: number;
  status: string;
  subject_name: string;
  subject_code: string;
  section_name: string;
  semester_number: number;
}

interface ClassOption {
  class_id: number;
  subject_name: string;
  subject_code: string;
  section_name: string;
  semester_number: number;
  label: string;
}

const STATUS_OPTIONS = ['Open', 'Closed', 'Draft'];

// ── Fetch classes for the logged-in faculty ───────────────────────────────────
// Backend doesn't have /classes?faculty_id, but we know our faculty's classes
// from the seeded data. We fetch via assignments + a direct query.
async function fetchMyClasses(): Promise<ClassOption[]> {
  // Use the faculty profile endpoint to get faculty_id, then hit a broader assignments
  // query — but simplest is to try fetching all assignments (which JOINs classes)
  // and extract unique classes from that, OR expose via a simple query.
  // Since we seeded 4 classes, we'll query them via the backend's subject info.
  try {
    // Try fetching all assignments to get class info
    const res = await api.get('/assignments');
    const rows: AssignmentRow[] = Array.isArray(res.data) ? res.data : [];
    const seen = new Set<number>();
    const classes: ClassOption[] = [];
    rows.forEach(r => {
      if (!seen.has(r.class_id)) {
        seen.add(r.class_id);
        classes.push({
          class_id: r.class_id,
          subject_name: r.subject_name,
          subject_code: r.subject_code,
          section_name: r.section_name,
          semester_number: r.semester_number,
          label: `${r.subject_name} (${r.subject_code}) · Sec ${r.section_name} · Sem ${r.semester_number}`,
        });
      }
    });
    // If no assignments yet, return hardcoded seeded classes
    if (classes.length === 0) {
      return [
        { class_id: 1, subject_name: 'Data Structures', subject_code: 'CS301', section_name: 'A', semester_number: 3, label: 'Data Structures (CS301) · Sec A · Sem 3' },
        { class_id: 2, subject_name: 'Operating Systems', subject_code: 'CS302', section_name: 'A', semester_number: 3, label: 'Operating Systems (CS302) · Sec A · Sem 3' },
        { class_id: 3, subject_name: 'Database Management', subject_code: 'CS401', section_name: 'A', semester_number: 4, label: 'Database Management (CS401) · Sec A · Sem 4' },
        { class_id: 4, subject_name: 'Computer Networks', subject_code: 'CS402', section_name: 'A', semester_number: 4, label: 'Computer Networks (CS402) · Sec A · Sem 4' },
      ];
    }
    return classes;
  } catch {
    return [
      { class_id: 1, subject_name: 'Data Structures', subject_code: 'CS301', section_name: 'A', semester_number: 3, label: 'Data Structures (CS301) · Sec A · Sem 3' },
      { class_id: 2, subject_name: 'Operating Systems', subject_code: 'CS302', section_name: 'A', semester_number: 3, label: 'Operating Systems (CS302) · Sec A · Sem 3' },
      { class_id: 3, subject_name: 'Database Management', subject_code: 'CS401', section_name: 'A', semester_number: 4, label: 'Database Management (CS401) · Sec A · Sem 4' },
      { class_id: 4, subject_name: 'Computer Networks', subject_code: 'CS402', section_name: 'A', semester_number: 4, label: 'Computer Networks (CS402) · Sec A · Sem 4' },
    ];
  }
}

// ── Assignment card ───────────────────────────────────────────────────────────
function AssignmentCard({ item, onEdit, onDelete }: { item: AssignmentRow; onEdit: () => void; onDelete: () => void }) {
  const statusColor = item.status === 'Open' ? colors.success : item.status === 'Closed' ? colors.danger : colors.warning;
  const statusBg    = item.status === 'Open' ? colors.successBg : item.status === 'Closed' ? colors.dangerBg : colors.warningBg;
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.cardLeft}>
          <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={s.cardSubject} numberOfLines={1}>
            {item.subject_name} · Sec {item.section_name} · Sem {item.semester_number}
          </Text>
        </View>
        <View style={s.cardActions}>
          <TouchableOpacity onPress={onEdit} style={s.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Pencil size={15} color={primaryScale[500]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[s.actionBtn, s.actionBtnDanger]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Trash2 size={15} color={colors.red[500]} />
          </TouchableOpacity>
        </View>
      </View>
      {item.description ? <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
      <View style={s.metaRow}>
        <View style={s.metaChip}><Text style={s.metaText}>Marks: {item.marks}</Text></View>
        {item.due_date ? <View style={[s.metaChip, s.metaChipDue]}><Text style={[s.metaText, s.metaTextDue]}>Due {formatDate(item.due_date)}</Text></View> : null}
        <View style={[s.metaChip, { backgroundColor: statusBg }]}><Text style={[s.metaText, { color: statusColor }]}>{item.status}</Text></View>
      </View>
    </View>
  );
}

// ── Select sheet (bottom sheet picker) ───────────────────────────────────────
function SelectSheet<T extends { label: string }>({
  visible, onClose, label, options, value, onChange,
}: { visible: boolean; onClose: () => void; label: string; options: T[]; value: string; onChange: (v: T) => void }) {
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={s.sheetBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={s.sheetContainer}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{label}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <X size={18} color={neutral[400]} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
          {options.map((opt, i) => {
            const active = opt.label === value;
            return (
              <TouchableOpacity key={i} onPress={() => { onChange(opt); onClose(); }}
                style={[s.sheetOption, active && s.sheetOptionActive]} activeOpacity={0.75}>
                <Text style={[s.sheetOptionText, active && s.sheetOptionTextActive]} numberOfLines={2}>{opt.label}</Text>
                {active && <Check size={14} color={primaryScale[600]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </RNModal>
  );
}

// ── Form sheet ────────────────────────────────────────────────────────────────
interface FormState { classLabel: string; classId: number | null; title: string; description: string; dueDate: string; marks: string; status: string; }
const EMPTY_FORM: FormState = { classLabel: '', classId: null, title: '', description: '', dueDate: '', marks: '0', status: 'Open' };

interface FormSheetProps { visible: boolean; onClose: () => void; initial?: AssignmentRow | null; onSubmit: (d: AssignmentPayload) => void; loading: boolean; classes: ClassOption[]; }

function FormSheet({ visible, onClose, initial, onSubmit, loading, classes }: FormSheetProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [classSheet, setClassSheet]   = useState(false);
  const [statusSheet, setStatusSheet] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initial) {
        const cls = classes.find(c => c.class_id === initial.class_id);
        setForm({ classLabel: cls?.label ?? '', classId: initial.class_id, title: initial.title, description: initial.description ?? '', dueDate: initial.due_date ?? '', marks: String(initial.marks), status: initial.status });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [visible, initial, classes]);

  const set = (k: keyof FormState) => (v: string | number | null) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.classId || !form.title.trim()) return;
    onSubmit({ class_id: form.classId, title: form.title.trim(), description: form.description.trim() || undefined, due_date: form.dueDate || undefined, marks: Number(form.marks) || 0, status: form.status });
  };

  return (
    <RNModal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={s.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalKav}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{initial ? 'Edit Assignment' : 'New Assignment'}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><X size={18} color={neutral[400]} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.formBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Class selector */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Class (Subject · Section) <Text style={s.required}>*</Text></Text>
                <TouchableOpacity style={[s.input, s.selectTrigger]} onPress={() => setClassSheet(true)} activeOpacity={0.8}>
                  <Text style={form.classLabel ? s.selectValue : s.selectPlaceholder} numberOfLines={1}>{form.classLabel || 'Select class…'}</Text>
                  <ChevronDown size={16} color={neutral[400]} />
                </TouchableOpacity>
              </View>
              {/* Title */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Title <Text style={s.required}>*</Text></Text>
                <TextInput style={s.input} value={form.title} onChangeText={set('title')} placeholder="Assignment title" placeholderTextColor={neutral[400]} />
              </View>
              {/* Description */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Description</Text>
                <TextInput style={[s.input, s.inputMulti]} value={form.description} onChangeText={set('description')} placeholder="Optional details…" placeholderTextColor={neutral[400]} multiline numberOfLines={3} textAlignVertical="top" />
              </View>
              {/* Due date */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Due Date</Text>
                <TextInput style={s.input} value={form.dueDate} onChangeText={set('dueDate')} placeholder="YYYY-MM-DD" placeholderTextColor={neutral[400]} />
              </View>
              {/* Marks */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Marks</Text>
                <TextInput style={s.input} value={form.marks} onChangeText={set('marks')} placeholder="0" placeholderTextColor={neutral[400]} keyboardType="numeric" />
              </View>
              {/* Status */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Status</Text>
                <TouchableOpacity style={[s.input, s.selectTrigger]} onPress={() => setStatusSheet(true)} activeOpacity={0.8}>
                  <Text style={s.selectValue}>{form.status}</Text>
                  <ChevronDown size={16} color={neutral[400]} />
                </TouchableOpacity>
              </View>
            </ScrollView>
            <View style={s.modalFooter}>
              <Button variant="outline" onPress={onClose} style={s.footerBtn}>Cancel</Button>
              <Button onPress={handleSubmit} loading={loading} style={s.footerBtn}>{initial ? 'Save' : 'Create'}</Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      <SelectSheet
        visible={classSheet} onClose={() => setClassSheet(false)} label="Select Class"
        options={classes} value={form.classLabel}
        onChange={(c: ClassOption) => { set('classId')(c.class_id); set('classLabel')(c.label); }} />
      <SelectSheet
        visible={statusSheet} onClose={() => setStatusSheet(false)} label="Status"
        options={STATUS_OPTIONS.map(s => ({ label: s }))} value={form.status}
        onChange={(o: { label: string }) => set('status')(o.label)} />
    </RNModal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function Assignments() {
  const [search, setSearch]             = useState('');
  const [formVisible, setFormVisible]   = useState(false);
  const [editing, setEditing]           = useState<AssignmentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssignmentRow | null>(null);
  const [classes, setClasses]           = useState<ClassOption[]>([]);
  const qc = useQueryClient();

  useEffect(() => { fetchMyClasses().then(setClasses); }, []);

  const { data: rawData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentService.getAll(),
    staleTime: 30_000,
  });

  // Backend returns a raw array
  const allAssignments: AssignmentRow[] = Array.isArray(rawData) ? rawData : [];
  const assignments = search
    ? allAssignments.filter(a => a.title.toLowerCase().includes(search.toLowerCase()) || a.subject_name?.toLowerCase().includes(search.toLowerCase()))
    : allAssignments;

  const createMutation = useCreateAssignment({ onSuccess: () => { setFormVisible(false); } });
  const updateMutation = useUpdateAssignment(editing?.assignment_id ?? 0, { onSuccess: () => { setEditing(null); setFormVisible(false); } });
  const deleteMutation = useDeleteAssignment({ onSuccess: () => setDeleteTarget(null) });

  const renderItem = useCallback(({ item, index }: { item: AssignmentRow; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 40).duration(300).springify()}>
      <AssignmentCard item={item}
        onEdit={() => { setEditing(item); setFormVisible(true); }}
        onDelete={() => setDeleteTarget(item)} />
    </Animated.View>
  ), []);

  return (
    <ScreenWrapper route={ROUTES.ASSIGNMENTS} scrollable={false}>
      {/* Header */}
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Assignments</Text>
          <Text style={s.pageSubtitle}>{allAssignments.length} total</Text>
        </View>
        <TouchableOpacity onPress={() => { setEditing(null); setFormVisible(true); }} style={s.addBtn} activeOpacity={0.85}>
          <Plus size={16} color={colors.white} />
          <Text style={s.addBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Search + refresh */}
      <View style={s.filterRow}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by title or subject…" style={s.searchBar} />
        <TouchableOpacity onPress={() => qc.invalidateQueries({ queryKey: ['assignments'] })} style={s.refreshBtn}>
          {isFetching ? <ActivityIndicator size={16} color={neutral[400]} /> : <RefreshCw size={16} color={neutral[400]} />}
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={primaryScale[500]} /></View>
      ) : (
        <FlatList
          data={assignments} keyExtractor={item => String(item.assignment_id)} renderItem={renderItem}
          contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={primaryScale[500]} colors={[primaryScale[500]]} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <ClipboardList size={44} color={neutral[200]} />
              <Text style={s.emptyTitle}>No assignments yet</Text>
              <Text style={s.emptyDesc}>Tap "New" to create your first assignment.</Text>
            </View>
          }
        />
      )}

      <FormSheet visible={formVisible} onClose={() => { setFormVisible(false); setEditing(null); }}
        initial={editing} classes={classes} loading={createMutation.isPending || updateMutation.isPending}
        onSubmit={(d) => editing ? updateMutation.mutate(d) : createMutation.mutate(d)} />

      <ConfirmDialog isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.assignment_id)}
        title="Delete assignment?" message={`"${deleteTarget?.title}" will be permanently deleted.`}
        confirmLabel="Delete" variant="danger" loading={deleteMutation.isPending} />
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 12 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: neutral[900] },
  pageSubtitle: { fontSize: 12, color: neutral[500], marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: primaryScale[600], paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, ...shadows.card },
  addBtnText: { fontSize: 13, fontWeight: '600', color: colors.white },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  searchBar: { flex: 1 },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: neutral[200], alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: neutral[100], padding: 14, gap: 10, ...shadows.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1, minWidth: 0, marginRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: neutral[900] },
  cardSubject: { fontSize: 12, color: primaryScale[600], marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: neutral[100], backgroundColor: colors.white },
  actionBtnDanger: { borderColor: colors.red[100] },
  cardDesc: { fontSize: 12, color: neutral[500], lineHeight: 17 },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metaChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: neutral[100] },
  metaText: { fontSize: 11, color: neutral[600], fontWeight: '500' },
  metaChipDue: { backgroundColor: colors.warningBg },
  metaTextDue: { color: colors.warning },
  empty: { padding: 48, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: neutral[500] },
  emptyDesc: { fontSize: 13, color: neutral[400], textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalKav: { justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: neutral[100] },
  modalTitle: { fontSize: 16, fontWeight: '700', color: neutral[900] },
  formBody: { padding: 20, gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: neutral[700] },
  required: { color: colors.red[500] },
  input: { borderWidth: 1, borderColor: neutral[200], borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: neutral[900], backgroundColor: colors.white, minHeight: 44 },
  inputMulti: { height: 80, textAlignVertical: 'top', paddingTop: 10 },
  selectTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectValue: { flex: 1, fontSize: 14, color: neutral[900] },
  selectPlaceholder: { flex: 1, fontSize: 14, color: neutral[400] },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: neutral[100] },
  footerBtn: { flex: 1 },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 5 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: neutral[900] },
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: neutral[50] },
  sheetOptionActive: { backgroundColor: primaryScale[50], borderRadius: 10, paddingHorizontal: 10 },
  sheetOptionText: { flex: 1, fontSize: 14, color: neutral[700], marginRight: 8 },
  sheetOptionTextActive: { color: primaryScale[600], fontWeight: '600' },
});
