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
import { useMyClasses } from '../../hooks/useClasses';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import SearchBar from '../../components/ui/SearchBar';
import Button from '../../components/ui/Button';
import ScreenWrapper from '../../layouts/ScreenWrapper';
import { formatDate } from '../../utils/formatters';
import { colors, shadows, primaryScale, ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { ROUTES } from '../../navigation/routes';

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

// ── Assignment card ───────────────────────────────────────────────────────────
function AssignmentCard({ item, onEdit, onDelete }: { item: AssignmentRow; onEdit: () => void; onDelete: () => void }) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
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
          {options.map((opt, i) => {
            const active = opt.label === value;
            return (
              <TouchableOpacity key={i} onPress={() => { onChange(opt); onClose(); }}
                style={[s.sheetOption, active && s.sheetOptionActive]} activeOpacity={0.75}>
                <Text style={[s.sheetOptionText, active && s.sheetOptionTextActive]} numberOfLines={2}>{opt.label}</Text>
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
interface FormState { classLabel: string; classId: number | null; title: string; description: string; dueDate: string; marks: string; status: string; }
const EMPTY_FORM: FormState = { classLabel: '', classId: null, title: '', description: '', dueDate: '', marks: '0', status: 'Open' };

interface FormSheetProps { visible: boolean; onClose: () => void; initial?: AssignmentRow | null; onSubmit: (d: AssignmentPayload) => void; loading: boolean; classes: any[]; }

function FormSheet({ visible, onClose, initial, onSubmit, loading, classes }: FormSheetProps) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
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
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}><X size={18} color={theme.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.formBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Class selector */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Class (Subject · Section) <Text style={s.required}>*</Text></Text>
                <TouchableOpacity style={[s.input, s.selectTrigger]} onPress={() => setClassSheet(true)} activeOpacity={0.8}>
                  <Text style={form.classLabel ? s.selectValue : s.selectPlaceholder} numberOfLines={1}>{form.classLabel || 'Select class…'}</Text>
                  <ChevronDown size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>
              {/* Title */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Title <Text style={s.required}>*</Text></Text>
                <TextInput style={s.input} value={form.title} onChangeText={set('title')} placeholder="Assignment title" placeholderTextColor={theme.placeholder} />
              </View>
              {/* Description */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Description</Text>
                <TextInput style={[s.input, s.inputMulti]} value={form.description} onChangeText={set('description')} placeholder="Optional details…" placeholderTextColor={theme.placeholder} multiline numberOfLines={3} textAlignVertical="top" />
              </View>
              {/* Due date */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Due Date</Text>
                <TextInput style={s.input} value={form.dueDate} onChangeText={set('dueDate')} placeholder="YYYY-MM-DD" placeholderTextColor={theme.placeholder} />
              </View>
              {/* Marks */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Marks</Text>
                <TextInput style={s.input} value={form.marks} onChangeText={set('marks')} placeholder="0" placeholderTextColor={theme.placeholder} keyboardType="numeric" />
              </View>
              {/* Status */}
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Status</Text>
                <TouchableOpacity style={[s.input, s.selectTrigger]} onPress={() => setStatusSheet(true)} activeOpacity={0.8}>
                  <Text style={s.selectValue}>{form.status}</Text>
                  <ChevronDown size={16} color={theme.textMuted} />
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
        onChange={(c: any) => { set('classId')(c.class_id); set('classLabel')(c.label); }} />
      <SelectSheet
        visible={statusSheet} onClose={() => setStatusSheet(false)} label="Status"
        options={STATUS_OPTIONS.map(s => ({ label: s }))} value={form.status}
        onChange={(o: { label: string }) => set('status')(o.label)} />
    </RNModal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function Assignments() {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const [search, setSearch]             = useState('');
  const [formVisible, setFormVisible]   = useState(false);
  const [editing, setEditing]           = useState<AssignmentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssignmentRow | null>(null);
  const qc = useQueryClient();

  // Fetch classes dynamically from /api/faculty/me/classes — no hardcoding
  const { data: classes = [] } = useMyClasses();

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
          {isFetching ? <ActivityIndicator size={16} color={theme.textMuted} /> : <RefreshCw size={16} color={theme.textMuted} />}
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
              <ClipboardList size={44} color={theme.border} />
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

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 12 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary },
  pageSubtitle: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: primaryScale[600], paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, ...shadows.card },
  addBtnText: { fontSize: 13, fontWeight: '600', color: colors.white },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  searchBar: { flex: 1 },
  refreshBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  card: { backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 14, gap: 10, ...shadows.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { flex: 1, minWidth: 0, marginRight: 8 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  cardSubject: { fontSize: 12, color: primaryScale[600], marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  actionBtnDanger: { borderColor: colors.red[100] },
  cardDesc: { fontSize: 12, color: theme.textSecondary, lineHeight: 17 },
  metaRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metaChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: theme.border },
  metaText: { fontSize: 11, color: theme.textSecondary, fontWeight: '500' },
  metaChipDue: { backgroundColor: colors.warningBg },
  metaTextDue: { color: colors.warning },
  empty: { padding: 48, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: theme.textSecondary },
  emptyDesc: { fontSize: 13, color: theme.textMuted, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'flex-end' },
  modalKav: { justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: theme.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border },
  modalTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  formBody: { padding: 20, gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: theme.textSecondary },
  required: { color: colors.red[500] },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: theme.textPrimary, backgroundColor: theme.surface, minHeight: 44 },
  inputMulti: { height: 80, textAlignVertical: 'top', paddingTop: 10 },
  selectTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectValue: { flex: 1, fontSize: 14, color: theme.textPrimary },
  selectPlaceholder: { flex: 1, fontSize: 14, color: theme.textMuted },
  modalFooter: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: theme.border },
  footerBtn: { flex: 1 },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.overlay },
  sheetContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 5 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: theme.textPrimary },
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: theme.border },
  sheetOptionActive: { backgroundColor: primaryScale[50], borderRadius: 10, paddingHorizontal: 10 },
  sheetOptionText: { flex: 1, fontSize: 14, color: theme.textSecondary, marginRight: 8 },
  sheetOptionTextActive: { color: primaryScale[600], fontWeight: '600' },
});
