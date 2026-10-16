// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { FAB, Text } from 'react-native-paper';
import SearchBar from '../../../components/SearchBar/SearchBar';
import NonTeachingStaffTable from '../../../components/Table/NonTeachingStaffTable';
import LoadingIndicator from '../../../components/Loading/LoadingIndicator';
import EmptyState from '../../../components/EmptyState/EmptyState';
import ScreenLayout from '../../../navigation/admin/ScreenLayout';
import ExportMenu from '../../../components/admin/ExportMenu';
import { useNonTeachingStaff } from '../../../hooks/admin/useNonTeachingStaff';
import { PAGE_SIZE } from '../../../constants';
import { useTheme } from '../../../context/admin/ThemeContext';
import { spacing, typography } from '../../../theme';

// embedded: true when rendered as a tab inside RegistryScreen (skips its own
// ScreenLayout/sidebar, since the parent already provides one).
const NonTeachingStaffListScreen = ({ navigation, embedded = false }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);

  const { data, isLoading, isFetching } = useNonTeachingStaff({
    search: search || undefined, page, pageSize: PAGE_SIZE,
  });

  const members = data?.data || [];
  const meta    = data?.meta;

  const content = (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Non-Teaching Staff Registry</Text>
            <Text style={styles.subtitle}>Manage all non-teaching staff members</Text>
          </View>
          <ExportMenu
            entity="non-teaching-staff"
            filenameBase="non-teaching-staff"
            filters={{ search: search || undefined }}
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

        {isLoading ? (
          <LoadingIndicator label="Loading staff..." />
        ) : members.length === 0 ? (
          <EmptyState
            icon="account-hard-hat-outline"
            title="No staff members found"
            description="Try adjusting your search, or add a new staff member."
            actionLabel={search ? 'Clear search' : undefined}
            onAction={search ? () => { setSearch(''); setPage(1); } : undefined}
          />
        ) : (
          <>
            <NonTeachingStaffTable
              staff={members}
              onRowPress={(item) => navigation.navigate('NonTeachingStaffDetails', { staffId: item.id ?? item.staffId })}
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
          label="Add Staff Member"
          style={styles.fab}
          color={colors.white}
          onPress={() => navigation.navigate('AddNonTeachingStaff')}
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
  container:        { flex: 1, backgroundColor: colors.background },
  header:           {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: spacing.lg, paddingBottom: 0,
  },
  title:            { ...typography.h1, color: colors.textPrimary },
  subtitle:         { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  searchWrap:       { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  paginationRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface,
  },
  pageLink:         { ...typography.bodyBold, color: colors.primary },
  pageLinkDisabled: { color: colors.textMuted },
  pageInfo:         { ...typography.caption, color: colors.textSecondary },
  fab: {
    position: 'absolute', right: spacing.lg, bottom: spacing.lg,
    backgroundColor: colors.primary,
  },
});

export default NonTeachingStaffListScreen;
