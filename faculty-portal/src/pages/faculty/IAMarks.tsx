/**
 * Faculty Portal — IA Marks
 * Backend schema: ia_marks(ia_id, student_id, class_id, ia1, ia2, ia3, average [GENERATED])
 * average is auto-computed by DB — never send it in POST/PUT.
 * Response is a raw array with joined: student_name, usn, subject_name, subject_code
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput, Modal as RNModal, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, RefreshCw, Award, X, Check, ChevronDown } from '../../components/icons';
import { useIAMarks, useCreateIAMarks, useUpdateIAMarks, useDeleteIAMarks } from '../../hooks/useIAMarks';
import { IAMarksPayload } from '../../services/academic.service';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ScreenWrapper from '../../layouts/ScreenWrapper';
import { colors, shadows, primaryScale, neutral } from '../../theme/colors';
import { ROUTES } from '../../navigation/routes';

const MY_CLASSES = [
  { class_id: 1, label: 'Data Structures (CS301) · Sec A · Sem 3' },
  { class_id: 2, label: 'Operating Systems (CS302) · Sec A · Sem 3' },
  { class_id: 3, label: 'Database Management (CS401) · Sec A · Sem 4' },
  { class_id: 4, label: 'Computer Networks (CS402) · Sec A · Sem 4' },
];

interface IARow {
  ia_id: number;
  student_id: string;
  class_id: number;
  ia1: number | null;
  ia2: number | null;
  ia3: number | null;
  average: number | null;
  student_name: string;
  usn: string;
  subject_name: string;
  subject_code: string;
}

// ── Mark row ──────────────────────────────────────────────────────────────────
function MarkRow({ item, onEdit, onDelete }: { item: IARow; onEdit: () => void; onDelete: () => void }) {
  const avg = item.average ?? 0;
  const color = avg >= 20 ? colors.success : avg >= 12 ? colors.warning : colors.danger;
  const bg    = avg >= 20 ? colors.successBg : avg >= 12 ? colors.warningBg : colors.dangerBg;
  return (
    <View style={s.row}>
      <View style={s.rowInfo}>
        <Text style={s.rowStudent} numberOfLines={1}>{item.student_name || item.usn || item.student_id}</Text>
        <Text style={s.rowMeta} numberOfLines={1}>{item.subject_name} · IA1:{item.ia1 ?? '—'} IA2:{item.ia2 ?? '—'} IA3:{item.ia3 ?? '—'}</Text>
      </View>
      <View style={s.rowRight}>
        <View style={[s.scoreBadge, { backgroundColor: bg }]}>
          <Text style={[s.scoreText, { color }]}>Avg {item.average ?? '—'}</Text>
        </View>
        <View style={s.rowActions}>
          <TouchableOpacity onPress={onEdit} style={s.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Pencil size={14} color={primaryScale[500]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[s.actionBtn, s.actionBtnDanger]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Trash2 size={14} color={colors.red[500]} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Select sheet ──────────────────────────────────────────────────────────────
function SelectSheet({ visible, onClose, label, options, value, onChange }: {
  visible: boolean; onClose: () => void; label: string;
  options: { label: string; value: any }[]; value: string; onChange: (v: any) => void;
}) {
  return (
    <RNModal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={s.sheetBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={s.sheetContainer}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>{label}</Text>
          <TouchableOpacity onPress={onClose}><X size={18} color={neutral[400]} /></TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
          {options.map((opt, i) => {
            const active = String(opt.value) === String(value);
            return (
              <TouchableOpacity key={i} onPress={() => { onChange(opt.value); onClose(); }}
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
interface FormState { studentId: string; classId: number | null; classLabel: string; ia1: string; ia2: string; ia3: string; }
const EMPTY: FormState = { studentId: '', classId: null, classLabel: '', ia1: '', ia2: '', ia3: '' };

function FormSheet({ visible, onClose, initial, onSubmit, loading }: {
  visible: boolean; onClose: () => void; initial?: IARow | null;
  onSubmit: (d: IAMarksPayload) => void; loading: boolean;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [classSheet, setClassSheet] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    if (initial) {
      const cls = MY_CLASSES.find(c => c.class_id === initial.class_id);
      setForm({ studentId: initial.student_id, classId: initial.class_id, classLabel: cls?.label ?? '', ia1: initial.ia1 != null ? String(initial.ia1) : '', ia2: initial.ia2 != null ? String(initial.ia2) : '', ia3: initial.ia3 != null ? String(initial.ia3) : '' });
    } else {
      setForm(EMPTY);
    }
  }, [visible, initial]);

  const set = (k: keyof FormState) => (v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.studentId.trim() || !form.classId) return;
    onSubmit({ student_id: form.studentId.trim(), class_id: form.classId, ia1: form.ia1 !== '' ? Number(form.ia1) : undefined, ia2: form.ia2 !== '' ? Number(form.ia2) : undefined, ia3: form.ia3 !== '' ? Number(form.ia3) : undefined });
  };

  return (
    <RNModal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={s.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalKav}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{initial ? 'Edit IA Marks' : 'Add IA Marks'}</Text>
              <TouchableOpacity onPress={onClose}><X size={18} color={neutral[400]} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.formBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Student USN / ID <Text style={s.required}>*</Text></Text>
                <TextInput style={s.input} value={form.studentId} onChangeText={set('studentId')} placeholder="e.g. 1CS21CS001" placeholderTextColor={neutral[400]} autoCapitalize="characters" />
              </View>
              <View style={s.fieldGroup}>
                <Text style={s.fieldLabel}>Class <Text style={s.required}>*</Text></Text>
                <TouchableOpacity style={[s.input, s.selectTrigger]} onPress={() => setClassSheet(true)} activeOpacity={0.8}>
                  <Text style={form.classLabel ? s.selectValue : s.selectPlaceholder} numberOfLines={1}>{form.classLabel || 'Select class…'}</Text>
                  <ChevronDown size={16} color={neutral[400]} />
                </TouchableOpacity>
              </View>
              {[{ key: 'ia1', label: 'IA 1 Marks (0–20)' }, { key: 'ia2', label: 'IA 2 Marks (0–20)' }, { key: 'ia3', label: 'IA 3 Marks (0–20)' }].map(({ key, label }) => (
                <View key={key} style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>{label}</Text>
                  <TextInput style={s.input} value={(form as any)[key]} onChangeText={set(key as keyof FormState)}
                    placeholder="0 – 30" placeholderTextColor={neutral[400]} keyboardType="numeric" />
                </View>
              ))}
              <View style={s.infoBox}>
                <Text style={s.infoText}>Average is automatically calculated by the system.</Text>
              </View>
            </ScrollView>
            <View style={s.modalFooter}>
              <Button variant="outline" onPress={onClose} style={s.footerBtn}>Cancel</Button>
              <Button onPress={handleSubmit} loading={loading} style={s.footerBtn}>{initial ? 'Save' : 'Add'}</Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
      <SelectSheet visible={classSheet} onClose={() => setClassSheet(false)} label="Select Class"
        options={MY_CLASSES.map(c => ({ label: c.label, value: c.class_id }))} value={String(form.classId ?? '')}
        onChange={(v: number) => { set('classId')(v); set('classLabel')(MY_CLASSES.find(c => c.class_id === v)?.label ?? ''); }} />
    </RNModal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function IAMarks() {
  const [classFilter, setClassFilter] = useState<number | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing]         = useState<IARow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IARow | null>(null);
  const qc = useQueryClient();

  const params = classFilter ? { class_id: classFilter } : {};
  const { data: rawData, isLoading, isFetching, refetch } = useIAMarks(params);
  const marks: IARow[] = Array.isArray(rawData) ? rawData : [];

  const createMutation = useCreateIAMarks({ onSuccess: () => setFormVisible(false) });
  const updateMutation = useUpdateIAMarks(editing?.ia_id ?? 0, { onSuccess: () => { setEditing(null); setFormVisible(false); } });
  const deleteMutation = useDeleteIAMarks({ onSuccess: () => setDeleteTarget(null) });

  const renderItem = useCallback(({ item, index }: { item: IARow; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 40).duration(300).springify()}>
      <MarkRow item={item} onEdit={() => { setEditing(item); setFormVisible(true); }} onDelete={() => setDeleteTarget(item)} />
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
        {MY_CLASSES.map(c => (
          <TouchableOpacity key={c.class_id} onPress={() => setClassFilter(c.class_id)}
            style={[s.chip, classFilter === c.class_id && s.chipActive]} activeOpacity={0.75}>
            <Text style={[s.chipText, classFilter === c.class_id && s.chipTextActive]} numberOfLines={1}>{c.label.split(' ·')[0]}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => qc.invalidateQueries({ queryKey: ['ia-marks'] })} style={s.refreshBtn}>
          {isFetching ? <ActivityIndicator size={14} color={neutral[400]} /> : <RefreshCw size={14} color={neutral[400]} />}
        </TouchableOpacity>
      </ScrollView>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={primaryScale[500]} /></View>
      ) : (
        <View style={s.sectionCard}>
          <View style={s.cardHeader}>
            <View style={s.cardHeaderLeft}>
              <Award size={16} color={primaryScale[600]} />
              <Text style={s.cardTitle}>Internal Assessment Records</Text>
            </View>
            <Text style={s.cardCount}>{marks.length} entries</Text>
          </View>
          {marks.length === 0 ? (
            <View style={s.empty}>
              <Award size={44} color={neutral[200]} />
              <Text style={s.emptyTitle}>No IA marks yet</Text>
              <Text style={s.emptyDesc}>Tap "Add" to enter IA marks.</Text>
            </View>
          ) : (
            <FlatList data={marks} keyExtractor={item => String(item.ia_id)} renderItem={renderItem}
              ItemSeparatorComponent={() => <View style={s.separator} />}
              refreshControl={<RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={primaryScale[500]} colors={[primaryScale[500]]} />} />
          )}
        </View>
      )}

      <FormSheet visible={formVisible} onClose={() => { setFormVisible(false); setEditing(null); }} initial={editing}
        onSubmit={(d) => editing ? updateMutation.mutate({ ia1: d.ia1, ia2: d.ia2, ia3: d.ia3 }) : createMutation.mutate(d)}
        loading={createMutation.isPending || updateMutation.isPending} />

      <ConfirmDialog isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.ia_id)}
        title="Delete IA marks?" message={`Marks for ${deleteTarget?.student_name || deleteTarget?.student_id} will be deleted.`}
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
  chipRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: neutral[200], backgroundColor: colors.white },
  chipActive: { backgroundColor: primaryScale[600], borderColor: primaryScale[600] },
  chipText: { fontSize: 12, fontWeight: '500', color: neutral[600] },
  chipTextActive: { color: colors.white, fontWeight: '600' },
  refreshBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: neutral[200], alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  sectionCard: { marginHorizontal: 16, backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: neutral[100], overflow: 'hidden', ...shadows.card, flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: neutral[100] },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: neutral[900] },
  cardCount: { fontSize: 13, color: neutral[500] },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 },
  rowInfo: { flex: 1, minWidth: 0 },
  rowStudent: { fontSize: 13, fontWeight: '600', color: neutral[900] },
  rowMeta: { fontSize: 11, color: neutral[400], marginTop: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  scoreText: { fontSize: 13, fontWeight: '700' },
  rowActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6, borderRadius: 8, borderWidth: 1, borderColor: neutral[100], backgroundColor: colors.white },
  actionBtnDanger: { borderColor: colors.red[100] },
  separator: { height: 1, backgroundColor: neutral[50] },
  empty: { padding: 48, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: neutral[500] },
  emptyDesc: { fontSize: 13, color: neutral[400], textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalKav: { justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: neutral[100] },
  modalTitle: { fontSize: 16, fontWeight: '700', color: neutral[900] },
  formBody: { padding: 20, gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: neutral[700] },
  required: { color: colors.red[500] },
  input: { borderWidth: 1, borderColor: neutral[200], borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: neutral[900], backgroundColor: colors.white, minHeight: 44 },
  selectTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectValue: { flex: 1, fontSize: 14, color: neutral[900] },
  selectPlaceholder: { flex: 1, fontSize: 14, color: neutral[400] },
  infoBox: { backgroundColor: primaryScale[50], borderRadius: 12, padding: 12 },
  infoText: { fontSize: 12, color: primaryScale[700] },
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
