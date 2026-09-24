// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import ScreenLayout from '../../navigation/ScreenLayout';
import CustomDropdown from '../../components/Dropdown/CustomDropdown';
import LoadingIndicator from '../../components/Loading/LoadingIndicator';
import EmptyState from '../../components/EmptyState/EmptyState';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { useTheme } from '../../context/ThemeContext';
import { getModuleMeta, actionLabel, formatTimestamp } from '../../utils/auditFormat';
import {
  spacing, typography, radius, shadows,
} from '../../theme';

const MODULE_OPTIONS = [
  { id: 'student', name: 'Student' },
  { id: 'transfer', name: 'Transfer' },
  { id: 'faculty', name: 'Faculty' },
  { id: 'admin_user', name: 'Admin User' },
];

const LogRow = ({ entry }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const meta = getModuleMeta(entry.module);
  const palette = colors.accent[meta.accent] || colors.accent.blue;

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        <Icon source={meta.icon} size={18} color={palette.icon} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowAction}>{actionLabel(entry.action)}</Text>
        <Text style={styles.rowMeta}>
          {entry.module ? `${entry.module} · ` : ''}
          {entry.recordId ? `#${entry.recordId} · ` : ''}
          {entry.performedBy || 'System'}
        </Text>
      </View>
      <Text style={styles.rowTime}>{formatTimestamp(entry.createdAt)}</Text>
    </View>
  );
};

const ActivityLogScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [moduleFilter, setModuleFilter] = useState();
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useAuditLogs({
    module: moduleFilter || undefined, page, pageSize: 20,
  });

  const logs = data?.data || [];
  const meta = data?.meta;

  return (
    <ScreenLayout navigation={navigation} activeScreen="ActivityLog">
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Activity Log</Text>
          <Text style={styles.subtitle}>Who changed what, and when — across the student registry and transfers</Text>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterField}>
            <CustomDropdown
              label="Module"
              placeholder="All modules"
              value={moduleFilter}
              options={MODULE_OPTIONS}
              onSelect={(value) => { setModuleFilter(value); setPage(1); }}
              floatingLabel={false}
            />
          </View>
        </View>

        <View style={styles.listCard}>
          {isLoading ? (
            <LoadingIndicator label="Loading activity..." />
          ) : logs.length === 0 ? (
            <EmptyState
              icon="clipboard-text-clock-outline"
              title="No activity yet"
              description="Actions like adding, editing, deleting or transferring students will show up here."
            />
          ) : (
            logs.map((entry) => <LogRow key={entry.id} entry={entry} />)
          )}
        </View>

        {meta && logs.length > 0 && (
          <View style={styles.paginationRow}>
            <Text
              style={[styles.pageLink, page <= 1 && styles.pageLinkDisabled]}
              onPress={() => page > 1 && setPage(page - 1)}
            >
              Previous
            </Text>
            <Text style={styles.pageInfo}>
              Page {meta.page} of {meta.totalPages || 1} · {meta.total} entries
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
      </ScrollView>
    </ScreenLayout>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  header: { marginBottom: spacing.lg },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  filterRow: { flexDirection: 'row', marginBottom: spacing.md },
  filterField: { width: 240 },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowAction: { ...typography.bodyBold, color: colors.textPrimary },
  rowMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  rowTime: { ...typography.caption, color: colors.textMuted },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageLink: { ...typography.bodyBold, color: colors.primary },
  pageLinkDisabled: { color: colors.textMuted },
  pageInfo: { ...typography.caption, color: colors.textSecondary },
});

export default ActivityLogScreen;
