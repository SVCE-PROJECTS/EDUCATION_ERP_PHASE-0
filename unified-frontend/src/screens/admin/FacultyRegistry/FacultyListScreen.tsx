// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FAB, Text } from 'react-native-paper';
import SearchBar from '../../../components/SearchBar/SearchBar';
import FacultyTable from '../../../components/Table/FacultyTable';
import LoadingIndicator from '../../../components/Loading/LoadingIndicator';
import EmptyState from '../../../components/EmptyState/EmptyState';
import CustomDropdown from '../../../components/Dropdown/CustomDropdown';
import ScreenLayout from '../../../navigation/admin/ScreenLayout';
import { useFaculty } from '../../../hooks/admin/useFaculty';
import { useDropdown } from '../../../hooks/admin/useDropdowns';
import { PAGE_SIZE } from '../../../constants';
import { colors, spacing, typography } from '../../../theme';

const FacultyListScreen = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Column filter state
  const [filterDeptId, setFilterDeptId]   = useState(undefined);
  const [filterDesig, setFilterDesig]     = useState('');
  const [filterStatus, setFilterStatus]   = useState('');

  const { data, isLoading, isFetching } = useFaculty({
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
    departmentId: filterDeptId || undefined,
    designation: filterDesig || undefined,
    status: filterStatus || undefined,
  });

  const members = data?.data || [];
  const meta    = data?.meta;

  // Dropdown data
  const { data: departments = [] } = useDropdown('department');

  // For designation and status, we'll create options from all fetched data
  // (ideally the API would provide these, but we'll work with what we have)
  const desigOptions = React.useMemo(() => {
    const designations = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Lab Assistant'];
    return designations.map(d => ({ id: d, name: d }));
  }, []);

  const statusOptions = React.useMemo(() => [
    { id: 'ACTIVE', name: 'Active' },
    { id: 'ON_LEAVE', name: 'On Leave' },
    { id: 'INACTIVE', name: 'Inactive' },
  ], []);

  return (
    <ScreenLayout navigation={navigation} activeScreen="FacultyList">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Faculty Registry</Text>
          <Text style={styles.subtitle}>Manage all faculty members</Text>
        </View>

        <View style={styles.searchWrap}>
          <SearchBar
            value={search}
            onChangeText={(t) => { setSearch(t); setPage(1); }}
            onSubmit={() => setPage(1)}
            placeholder="Search by Employee ID, Name, Email or Designation..."
          />
        </View>

        {isLoading ? (
          <LoadingIndicator label="Loading faculty..." />
        ) : members.length === 0 ? (
          <EmptyState
            icon="account-tie-outline"
            title="No faculty found"
            description="Try adjusting your search, or add a new faculty member."
          />
        ) : (
          <>
            <FacultyTable
              faculty={members}
              onRowPress={(item) => navigation.navigate('FacultyDetails', { facultyId: item.id ?? item.facultyId })}
              filterOptions={{
                designation: desigOptions,
                department: departments,
                status: statusOptions,
              }}
              filterValues={{
                designation: filterDesig || undefined,
                department: filterDeptId,
                status: filterStatus || undefined,
              }}
              onFilterChange={(key, value) => {
                if (key === 'designation') setFilterDesig(value || '');
                else if (key === 'department') setFilterDeptId(value);
                else if (key === 'status') setFilterStatus(value || '');
                setPage(1);
              }}
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
                  Page {meta.page} of {meta.totalPages || 1} · {meta.total} members
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
          label="Add Faculty"
          style={styles.fab}
          color={colors.white}
          onPress={() => navigation.navigate('AddFaculty')}
        />
      </View>
    </ScreenLayout>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  header:          { padding: spacing.lg, paddingBottom: 0 },
  title:           { ...typography.h1, color: colors.textPrimary },
  subtitle:        { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  searchWrap:      { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  paginationRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
  },
  pageLink:        { ...typography.bodyBold, color: colors.primary },
  pageLinkDisabled:{ color: colors.textMuted },
  pageInfo:        { ...typography.caption, color: colors.textSecondary },
  fab: {
    position: 'absolute', right: spacing.lg, bottom: spacing.lg,
    backgroundColor: colors.primary,
  },
});

export default FacultyListScreen;
