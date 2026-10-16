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
import ExportMenu from '../../../components/admin/ExportMenu';
import { useFaculty } from '../../../hooks/admin/useFaculty';
import { useDropdown } from '../../../hooks/admin/useDropdowns';
import { PAGE_SIZE } from '../../../constants';
import { useTheme } from '../../../context/admin/ThemeContext';
import { spacing, typography } from '../../../theme';

// embedded: true when rendered as a tab inside RegistryScreen (skips its own
// ScreenLayout/sidebar, since the parent already provides one).
const FacultyListScreen = ({ navigation, embedded = false }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Column filter state
  const [filterDeptId, setFilterDeptId]   = useState(undefined);
  const [filterDesig, setFilterDesig]     = useState('');
  const [filterStatus, setFilterStatus]   = useState('');

  const facultyParams = {
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
    departmentId: filterDeptId || undefined,
    designation: filterDesig || undefined,
    status: filterStatus || undefined,
  };
  const { data, isLoading, isFetching } = useFaculty(facultyParams);

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

  const content = (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Faculty Registry</Text>
            <Text style={styles.subtitle}>Manage all faculty members</Text>
          </View>
          <ExportMenu
            entity="faculty"
            filenameBase="faculty"
            filters={{
              search: search || undefined,
              departmentId: filterDeptId || undefined,
              designation: filterDesig || undefined,
              status: filterStatus || undefined,
            }}
          />
        </View>

        <View style={styles.searchWrap}>
          <SearchBar
            value={search}
            onChangeText={(t) => { setSearch(t); setPage(1); }}
            onSubmit={() => setPage(1)}
            placeholder="Search by Employee ID, Name, Email or Designation..."
          />
        </View>

        {isLoading && !data ? (
          <LoadingIndicator label="Loading faculty..." />
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
            <View style={styles.paginationRow}>
              <Text
                style={[styles.pageLink, page <= 1 && styles.pageLinkDisabled]}
                onPress={() => page > 1 && setPage(page - 1)}
              >
                Previous
              </Text>
              <Text style={styles.pageInfo}>
                Page {meta?.page || 1} of {meta?.totalPages || 1} · {meta?.total || 0} members
                {isFetching ? ' · refreshing...' : ''}
              </Text>
              <Text
                style={[styles.pageLink, page >= (meta?.totalPages || 1) && styles.pageLinkDisabled]}
                onPress={() => page < (meta?.totalPages || 1) && setPage(page + 1)}
              >
                Next
              </Text>
            </View>
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
    </>
  );

  if (embedded) return content;

  return (
    <ScreenLayout navigation={navigation} activeScreen="Registry">
      {content}
    </ScreenLayout>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container:       { flex: 1, backgroundColor: colors.background },
  header:          {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: spacing.lg, paddingBottom: 0,
  },
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
