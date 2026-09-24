import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import ScreenWrapper from '../../layouts/ScreenWrapper';
import Dropdown from '../../components/ui/Dropdown';
import { ChevronLeft, ChevronRight } from '../../components/icons';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { getActionMeta, actionLabel, formatTimestamp, summarizeDetails, MODULE_OPTIONS } from '../../utils/auditFormat';
import { AuditLogEntry } from '../../services/audit.service';
import { useTheme } from '../../context/ThemeContext';
import { ThemeColors, shadows } from '../../theme/colors';
import { ROUTES } from '../../navigation/routes';

const PAGE_SIZE = 20;

export default function ActivityLog() {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState('');

  const { data, isLoading, isFetching } = useAuditLogs({
    page,
    pageSize: PAGE_SIZE,
    module: moduleFilter || undefined,
  });

  const entries = data?.data ?? [];
  const meta = data?.meta;

  const handleModuleChange = (value: string) => {
    setModuleFilter(value);
    setPage(1);
  };

  return (
    <ScreenWrapper route={ROUTES.HOD_ACTIVITY_LOG} scrollable={false}>
      <View style={s.filterRow}>
        <Dropdown
          placeholder="All modules"
          value={moduleFilter || null}
          options={MODULE_OPTIONS}
          onChange={handleModuleChange}
        />
      </View>

      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Recent Activity</Text>
          {meta ? <Text style={s.cardCount}>{meta.total} total</Text> : null}
        </View>

        {isLoading ? (
          <View style={s.loadingWrap}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={s.skeleton} />
            ))}
          </View>
        ) : entries.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>No activity recorded yet.</Text>
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <LogRow entry={item} theme={theme} styles={s} />}
            ItemSeparatorComponent={() => <View style={s.separator} />}
            scrollEnabled={false}
          />
        )}

        {meta && meta.totalPages > 1 && (
          <View style={s.pagination}>
            <TouchableOpacity
              style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}
              disabled={page <= 1 || isFetching}
              onPress={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} color={page <= 1 ? theme.textMuted : theme.primary} />
              <Text style={[s.pageBtnText, page <= 1 && s.pageBtnTextDisabled]}>Previous</Text>
            </TouchableOpacity>

            <Text style={s.pageIndicator}>
              Page {meta.page} of {meta.totalPages}
            </Text>

            <TouchableOpacity
              style={[s.pageBtn, page >= meta.totalPages && s.pageBtnDisabled]}
              disabled={page >= meta.totalPages || isFetching}
              onPress={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            >
              <Text style={[s.pageBtnText, page >= meta.totalPages && s.pageBtnTextDisabled]}>Next</Text>
              <ChevronRight size={16} color={page >= meta.totalPages ? theme.textMuted : theme.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────

function LogRow({
  entry, theme, styles,
}: { entry: AuditLogEntry; theme: ThemeColors; styles: ReturnType<typeof getStyles> }) {
  const meta = getActionMeta(entry.action);
  const Icon = meta.icon;
  const summary = summarizeDetails(entry);

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
        <Icon size={16} color={meta.fg} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {actionLabel(entry.action)}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {entry.recordId ? `#${entry.recordId} · ` : ''}
          {entry.performedBy || 'System'}
          {summary ? ` · ${summary}` : ''}
        </Text>
      </View>
      <Text style={styles.rowTime} numberOfLines={1}>
        {formatTimestamp(entry.createdAt)}
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  filterRow: {
    marginBottom: 12,
    maxWidth: 260,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  cardCount: {
    fontSize: 13,
    color: theme.textSecondary,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  rowMeta: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 2,
  },
  rowTime: {
    fontSize: 11,
    color: theme.textSecondary,
    flexShrink: 0,
    marginLeft: 8,
  },
  separator: {
    height: 1,
    backgroundColor: theme.border,
  },

  loadingWrap: {
    padding: 16,
    gap: 12,
  },
  skeleton: {
    height: 56,
    backgroundColor: theme.border,
    borderRadius: 12,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.textMuted,
  },

  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.primary,
  },
  pageBtnTextDisabled: {
    color: theme.textMuted,
  },
  pageIndicator: {
    fontSize: 12,
    color: theme.textMuted,
  },
});
