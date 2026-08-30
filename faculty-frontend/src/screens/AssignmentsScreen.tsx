/**
 * Assignments Screen
 *
 * APIs:
 *   GET    /api/assignments?class_id=X&status=Open  → Assignment[]
 *   POST   /api/assignments                         → Assignment  (create)
 *   PUT    /api/assignments/:id                     → Assignment  (update)
 *   DELETE /api/assignments/:id
 *
 * Flow:
 *   1. Faculty picks a class from ClassesContext
 *   2. Load assignments for that class (+ optional status filter)
 *   3. Create / Edit / Delete assignments
 *   4. Tap assignment row → AssignmentDetailScreen
 *
 * Backend schema:
 *   assignments(assignment_id, class_id, title, description,
 *               due_date, marks, attachment_url, status[Open|Closed])
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ScreenLayout from '../components/ScreenLayout';
import ClassPicker from '../components/ClassPicker';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import CustomButton from '../components/CustomButton';
import CustomInput from '../components/CustomInput';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import { useClasses } from '../context/ClassesContext';
import {
  getAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from '../services/assignmentsApi';
import type { FacultyClass } from '../types/faculty';
import type { Assignment, AssignmentStatus } from '../types/assignment';
import { colors, spacing, typography, radius } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Assignments'>;

interface AssignmentForm {
  title: string;
  description: string;
  due_date: string;
  marks: string;
  status: AssignmentStatus;
}

const EMPTY_FORM: AssignmentForm = {
  title: '',
  description: '',
  due_date: '',
  marks: '0',
  status: 'Open',
};

const AssignmentsScreen: React.FC<Props> = ({ navigation }) => {
  const { classes, loading: classesLoading } = useClasses();

  const [selectedClass, setSelectedClass] = useState<FacultyClass | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | 'All'>('All');
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AssignmentForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<AssignmentForm>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAssignments = useCallback(async (cls: FacultyClass) => {
    setLoadingData(true);
    setError(null);
    try {
      const data = await getAssignments({ class_id: cls.class_id });
      setAssignments(data);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to load assignments.');
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClass) loadAssignments(selectedClass);
  }, [selectedClass, loadAssignments]);

  const onRefresh = () => {
    if (!selectedClass) return;
    setRefreshing(true);
    loadAssignments(selectedClass);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormError(null);
    setModalVisible(true);
  };

  const openEdit = (a: Assignment) => {
    setEditingId(a.assignment_id);
    setForm({
      title: a.title,
      description: a.description ?? '',
      due_date: a.due_date ?? '',
      marks: String(a.marks),
      status: a.status,
    });
    setFormErrors({});
    setFormError(null);
    setModalVisible(true);
  };

  const validateForm = (): boolean => {
    const errs: Partial<AssignmentForm> = {};
    if (!form.title.trim()) errs.title = 'Title is required.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!selectedClass || !validateForm()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        class_id: selectedClass.class_id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        due_date: form.due_date.trim() || undefined,
        marks: parseInt(form.marks, 10) || 0,
        status: form.status,
      };

      if (editingId != null) {
        await updateAssignment(editingId, { ...payload, title: payload.title, status: payload.status });
      } else {
        await createAssignment(payload);
      }
      setModalVisible(false);
      loadAssignments(selectedClass);
    } catch (err: unknown) {
      setFormError((err as { message?: string }).message ?? 'Failed to save assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteTargetId == null || !selectedClass) return;
    setDeleting(true);
    try {
      await deleteAssignment(deleteTargetId);
      setDeleteTargetId(null);
      loadAssignments(selectedClass);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to delete assignment.');
      setDeleteTargetId(null);
    } finally {
      setDeleting(false);
    }
  };

  const displayed = statusFilter === 'All'
    ? assignments
    : assignments.filter((a) => a.status === statusFilter);

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <ScreenLayout navigation={navigation} activeScreen="Assignments">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>Assignments</Text>
          {selectedClass && (
            <CustomButton
              title="+ New"
              onPress={openCreate}
              style={styles.newBtn}
            />
          )}
        </View>

        <ClassPicker
          classes={classes}
          loading={classesLoading}
          selectedClassId={selectedClass?.class_id ?? null}
          onSelect={setSelectedClass}
          label="Select Class / Subject"
        />

        {/* Status filter tabs */}
        {selectedClass && (
          <View style={styles.filterRow}>
            {(['All', 'Open', 'Closed'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, statusFilter === f && styles.filterTabActive]}
                onPress={() => setStatusFilter(f)}
                accessibilityRole="tab"
                accessibilityState={{ selected: statusFilter === f }}
              >
                <Text style={[styles.filterTabText, statusFilter === f && styles.filterTabTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {loadingData && <LoadingIndicator message="Loading assignments…" />}
        {error && <ErrorMessage message={error} onRetry={() => selectedClass && loadAssignments(selectedClass)} />}

        {!selectedClass && !classesLoading && (
          <View style={styles.emptyHint}>
            <Text style={styles.emptyHintIcon}>📝</Text>
            <Text style={styles.emptyHintText}>Select a class to view and manage assignments.</Text>
          </View>
        )}

        {!loadingData && selectedClass && displayed.length === 0 && (
          <View style={styles.emptyHint}>
            <Text style={styles.emptyHintIcon}>📭</Text>
            <Text style={styles.emptyHintText}>No {statusFilter !== 'All' ? statusFilter.toLowerCase() : ''} assignments yet.</Text>
          </View>
        )}

        {displayed.map((a) => (
          <Card key={a.assignment_id} style={styles.assignCard}>
            <View style={styles.assignHeader}>
              <View style={styles.assignTitleWrap}>
                <Text style={styles.assignTitle} numberOfLines={2}>{a.title}</Text>
                <Text style={styles.assignMeta}>
                  {a.subject_name} · Sem {a.semester_number} · Sec {a.section_name}
                </Text>
              </View>
              <StatusBadge
                label={a.status}
                variant={a.status === 'Open' ? 'success' : 'muted'}
              />
            </View>

            {a.description ? (
              <Text style={styles.assignDesc} numberOfLines={3}>{a.description}</Text>
            ) : null}

            <View style={styles.assignFooter}>
              <Text style={styles.assignMeta2}>Due: {formatDate(a.due_date)}</Text>
              <Text style={styles.assignMeta2}>Marks: {a.marks}</Text>
            </View>

            <View style={styles.assignActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => openEdit(a)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${a.title}`}
              >
                <Text style={styles.editBtnText}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => setDeleteTargetId(a.assignment_id)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${a.title}`}
              >
                <Text style={styles.deleteBtnText}>🗑 Delete</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* Create / Edit modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
        accessibilityViewIsModal
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId != null ? 'Edit Assignment' : 'New Assignment'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} accessibilityLabel="Close">
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <CustomInput
                label="Title *"
                value={form.title}
                onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
                placeholder="Assignment title"
                error={formErrors.title}
              />
              <CustomInput
                label="Description"
                value={form.description}
                onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
                placeholder="Optional description"
                multiline
                numberOfLines={3}
              />
              <CustomInput
                label="Due Date (YYYY-MM-DD)"
                value={form.due_date}
                onChangeText={(t) => setForm((f) => ({ ...f, due_date: t }))}
                placeholder="e.g. 2025-12-31"
                keyboardType="numeric"
              />
              <CustomInput
                label="Max Marks"
                value={form.marks}
                onChangeText={(t) => setForm((f) => ({ ...f, marks: t.replace(/[^0-9]/g, '') }))}
                keyboardType="numeric"
                placeholder="0"
              />

              {/* Status toggle */}
              <Text style={styles.fieldLabel}>Status</Text>
              <View style={styles.statusRow}>
                {(['Open', 'Closed'] as AssignmentStatus[]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusOption,
                      form.status === s && styles.statusOptionActive,
                    ]}
                    onPress={() => setForm((f) => ({ ...f, status: s }))}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: form.status === s }}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      form.status === s && styles.statusOptionTextActive,
                    ]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {formError && (
                <View style={styles.formError}>
                  <Text style={styles.formErrorText}>⚠️ {formError}</Text>
                </View>
              )}

              <CustomButton
                title={submitting ? 'Saving…' : editingId != null ? 'Update Assignment' : 'Create Assignment'}
                onPress={handleSubmit}
                loading={submitting}
                style={styles.submitBtn}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        visible={deleteTargetId != null}
        title="Delete Assignment"
        message="This assignment and all its submissions will be permanently deleted. Are you sure?"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
        destructive
      />
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  pageTitle: { ...typography.h2, color: colors.textPrimary },
  newBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },

  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterTabText: { ...typography.smallBold, color: colors.textSecondary },
  filterTabTextActive: { color: colors.white },

  emptyHint: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyHintIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyHintText: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },

  assignCard: { marginBottom: spacing.md },
  assignHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.xs },
  assignTitleWrap: { flex: 1 },
  assignTitle: { ...typography.bodyBold, color: colors.textPrimary },
  assignMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  assignDesc: { ...typography.small, color: colors.textSecondary, marginBottom: spacing.sm },
  assignFooter: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.sm },
  assignMeta2: { ...typography.caption, color: colors.textMuted },
  assignActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  editBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.infoBg,
  },
  editBtnText: { ...typography.smallBold, color: colors.info },
  deleteBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerBg,
  },
  deleteBtnText: { ...typography.smallBold, color: colors.danger },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  modalClose: { fontSize: 20, color: colors.textSecondary, padding: spacing.sm },
  fieldLabel: { ...typography.smallBold, color: colors.textPrimary, marginBottom: spacing.xs },
  statusRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statusOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  statusOptionText: { ...typography.bodyBold, color: colors.textSecondary },
  statusOptionTextActive: { color: colors.primary },
  formError: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  formErrorText: { ...typography.small, color: colors.danger },
  submitBtn: { marginTop: spacing.sm },
});

export default AssignmentsScreen;
