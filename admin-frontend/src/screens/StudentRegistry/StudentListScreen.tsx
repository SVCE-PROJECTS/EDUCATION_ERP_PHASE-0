// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FAB, Text, Snackbar } from 'react-native-paper';
import SearchBar from '../../components/SearchBar/SearchBar';
import StudentTable from '../../components/Table/StudentTable';
import BulkActionBar from '../../components/Table/BulkActionBar';
import CsvImportModal from '../../components/Table/CsvImportModal';
import LoadingIndicator from '../../components/Loading/LoadingIndicator';
import EmptyState from '../../components/EmptyState/EmptyState';
import CustomButton from '../../components/Button/CustomButton';
import CustomModal from '../../components/Modal/CustomModal';
import CustomDropdown from '../../components/Dropdown/CustomDropdown';
import ConfirmationDialog from '../../components/Dialog/ConfirmationDialog';
import ScreenLayout from '../../navigation/ScreenLayout';
import { useStudents, useUpdateStudent } from '../../hooks/useStudents';
import { useDropdown, useSectionsBySemester } from '../../hooks/useDropdowns';
import { PAGE_SIZE } from '../../constants';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography } from '../../theme';

const StudentListScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  // Selection spans pages, but `students` below only holds the rows for the
  // CURRENT page — so we keep the actual selected row objects here (keyed by
  // id) as they're selected, instead of re-deriving them from `students`
  // later (which would silently drop any selection made on another page).
  const [selectedStudents, setSelectedStudents] = useState(() => new Map());
  const [csvModalVisible, setCsvModalVisible] = useState(false);
  const [reassignVisible, setReassignVisible] = useState(false);
  const [promoteConfirmVisible, setPromoteConfirmVisible] = useState(false);
  const [reassignSemester, setReassignSemester] = useState();
  const [reassignSectionId, setReassignSectionId] = useState();
  const [bulkBusy, setBulkBusy] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  const { data, isLoading, isFetching } = useStudents({
    search: search || undefined, page, pageSize: PAGE_SIZE,
  });
  const updateMutation = useUpdateStudent();

  const { data: semesters = [] } = useDropdown('semester');
  const { data: reassignSections = [] } = useSectionsBySemester(reassignSemester);

  const students = data?.data || [];
  const meta = data?.meta;

  const toggleSelect = (id) => {
    const student = students.find((s) => s.id === id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setSelectedStudents((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id); else if (student) next.set(id, student);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allSelected = students.length > 0 && students.every((s) => selectedIds.has(s.id));
    setSelectedIds((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        students.forEach((s) => next.delete(s.id));
        return next;
      }
      const next = new Set(prev);
      students.forEach((s) => next.add(s.id));
      return next;
    });
    setSelectedStudents((prev) => {
      const next = new Map(prev);
      if (allSelected) {
        students.forEach((s) => next.delete(s.id));
      } else {
        students.forEach((s) => next.set(s.id, s));
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectedStudents(new Map());
  };

  const runBulkUpdate = async (buildPayload, successLabel) => {
    setBulkBusy(true);
    const targets = [...selectedStudents.values()];
    const results = await Promise.allSettled(
      targets.map((student) => {
        const payload = buildPayload(student);
        return payload ? updateMutation.mutateAsync({ id: student.id, form: payload }) : Promise.resolve();
      }),
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    const success = results.length - failed;
    setBulkBusy(false);
    clearSelection();
    setSnackbar(`${successLabel}: ${success} updated${failed ? `, ${failed} failed` : ''}.`);
  };

  const handleConfirmPromote = async () => {
    setPromoteConfirmVisible(false);
    await runBulkUpdate(
      (student) => (student.semester < 8 ? { semester: student.semester + 1 } : null),
      'Promote to next semester',
    );
  };

  const handleConfirmReassign = async () => {
    if (!reassignSemester || !reassignSectionId) {
      setSnackbar('Choose a semester and section first.');
      return;
    }
    setReassignVisible(false);
    await runBulkUpdate(
      () => ({ semester: reassignSemester, sectionId: reassignSectionId }),
      'Reassign section',
    );
    setReassignSemester(undefined);
    setReassignSectionId(undefined);
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="StudentList">
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Student Registry</Text>
            <Text style={styles.subtitle}>Manage all admitted students</Text>
          </View>
          <CustomButton label="Import CSV" variant="outline" onPress={() => setCsvModalVisible(true)} />
        </View>

        <View style={styles.searchWrap}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            onSubmit={() => setPage(1)}
            placeholder="Search by Library ID, USN, Name, or Email..."
          />
        </View>

        {selectedIds.size > 0 && (
          <BulkActionBar
            count={selectedIds.size}
            busy={bulkBusy}
            onPromote={() => setPromoteConfirmVisible(true)}
            onReassign={() => setReassignVisible(true)}
            onClear={clearSelection}
          />
        )}

        {isLoading ? (
          <LoadingIndicator label="Loading students..." />
        ) : students.length === 0 ? (
          <EmptyState
            icon="account-search-outline"
            title="No students found"
            description="Try adjusting your search, or add a new student to get started."
          />
        ) : (
          <>
            <StudentTable
              students={students}
              onRowPress={(item) => navigation.navigate('StudentDetails', { studentId: item.id })}
              selectable
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
            />
            {meta && (
              <View style={styles.paginationRow}>
                <Text
                  style={[styles.pageLink, page <= 1 && styles.pageLinkDisabled]}
                  onPress={() => page > 1 && setPage(page - 1)}
                >
                  Previous
                </Text>
                <Text style={styles.pageInfo}>
                  Page {meta.page} of {meta.totalPages || 1} · {meta.total} students
                  {isFetching ? ' · refreshing...' : ''}
                </Text>
                <Text
                  style={[styles.pageLink, page >= (meta.totalPages || 1) && styles.pageLinkDisabled]}
                  onPress={() => page < (meta.totalPages || 1) && setPage(page + 1)}
                >
                  Next
                </Text>
              </View>
            )}
          </>
        )}

        <FAB
          icon="plus"
          label="Add Student"
          style={styles.fab}
          color={colors.white}
          onPress={() => navigation.navigate('AddStudent')}
        />
      </View>

      <CsvImportModal
        visible={csvModalVisible}
        onDismiss={() => setCsvModalVisible(false)}
        onComplete={() => setSnackbar('Import finished — list refreshed.')}
      />

      <ConfirmationDialog
        visible={promoteConfirmVisible}
        title="Promote to Next Semester"
        message={`Move ${selectedIds.size} selected student(s) to their next semester? Students already at semester 8 are left unchanged.`}
        confirmLabel="Promote"
        onConfirm={handleConfirmPromote}
        onCancel={() => setPromoteConfirmVisible(false)}
      />

      <CustomModal visible={reassignVisible} onDismiss={() => setReassignVisible(false)} title="Reassign Section">
        <Text style={styles.modalHint}>
          Move {selectedIds.size} selected student(s) to a different semester and section.
        </Text>
        <CustomDropdown
          label="Semester"
          value={reassignSemester}
          options={semesters}
          onSelect={(v) => { setReassignSemester(v); setReassignSectionId(undefined); }}
          floatingLabel={false}
        />
        <CustomDropdown
          label="Section"
          value={reassignSectionId}
          options={reassignSections}
          onSelect={setReassignSectionId}
          floatingLabel={false}
        />
        <CustomButton
          label="Reassign"
          onPress={handleConfirmReassign}
          loading={bulkBusy}
          style={styles.reassignBtn}
        />
      </CustomModal>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={4000}>
        {snackbar}
      </Snackbar>
    </ScreenLayout>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    paddingBottom: 0,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  pageLink: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  pageLinkDisabled: {
    color: colors.textMuted,
  },
  pageInfo: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.primary,
  },
  modalHint: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  reassignBtn: {
    marginTop: spacing.sm,
  },
});

export default StudentListScreen;
