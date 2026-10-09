// @ts-nocheck
/**
 * Faculty Portal — Activity Log Screen
 *
 * Shows only the logged-in faculty member's own activity.
 * Layout mirrors the HOD Activity Log screen.
 * Data comes from GET /api/audit-logs/me — actor is resolved server-side
 * from the verified JWT, never from a client-supplied parameter.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, TextInput,
} from 'react-native';
import ScreenWrapper from '../../layouts/faculty/ScreenWrapper';
import {
  ChevronLeft, ChevronRight, Search, RefreshCw,
  Plus, Pencil, Trash2, Calendar,
} from '../../components/faculty/icons';
import { useTheme } from '../../context/faculty/ThemeContext';
import { colors as themeColors, shadows, ThemeColors } from '../../theme/faculty/colors';
import { ROUTES } from '../../navigation/faculty/routes';
import { activityLogService, ActivityLogEntry } from '../../services/faculty/activityLog.service';

const PAGE_SIZE = 20;

// ── Action metadata ───────────────────────────────────────────────────────────

interface ActionMeta {
  bg: string;
  fg: string;
}

function getActionMeta(action?: string): ActionMeta {
  if (!action) return { bg: themeColors.blue[100], fg: themeColors.blue[600] };
  const a = action.toUpperCase();
  if (a.startsWith('CREATE') || a.startsWith('ADD'))
    return { bg: themeColors.green[100], fg: themeColors.green[600] };
  if (a.startsWith('UPDATE') || a.startsWith('EDIT'))
    return { bg: themeColors.blue[100], fg: themeColors.blue[600] };
  if (a.startsWith('DELETE') || a.startsWith('REMOVE'))
    return { bg: themeColors.red[100], fg: themeColors.red[600] };
  return { bg: themeColors.amber[100], fg: themeColors.amber[600] };
}

function actionLabel(action = ''): string {
  return action
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function formatTimestamp(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return sameDay
    ? `Today, ${time}`
    : `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}, ${time}`;
}

// ── Row component ─────────────────────────────────────────────────────────────

function LogRow({
  entry, theme, styles,
}: { entry: ActivityLogEntry; theme: ThemeColors; styles: ReturnType<typeof getStyles> }) {
  const meta = getActionMeta(entry.action);

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
        <Calendar size={15} color={meta.fg} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {actionLabel(entry.action)}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {entry.module ? `${entry.module} · ` : ''}
          {entry.recordId ? `#${entry.recordId} · ` : ''}
          {entry.performedBy || 'You'}
        </Text>
      </View>
      <Text style={styles.rowTime} numberOfLines={1}>
        {formatTimestamp(entry.createdAt)}
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ActivityLog() {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);

  const [page, setPage]       = useState(1);
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [meta, setMeta]       = useState<{ total: number; totalPages: number; page: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Stable fetch — no auto-retry on terminal errors
  const isMounted = useRef(true);
  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  const fetchPage = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await activityLogService.getMyLogs({ page: p, pageSize: PAGE_SIZE });
      if (!isMounted.current) return;
      setEntries(res.data ?? []);
      setMeta(res.meta ?? null);
    } catch (err: any) {
      if (!isMounted.current) return;
      setError(err?.response?.data?.message || err?.message || 'Failed to load activity log');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // Fetch once on mount and whenever page changes
  useEffect(() => {
    fetchPage(page);
  }, [fetchPage, page]);

  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(meta?.totalPages ?? 1, p + 1));
  const handleRetry = () => fetchPage(page);

  return (
    <ScreenWrapper route={ROUTES.ACTIVITY_LOG} scrollable={false}>

      {/* Card */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>My Activity</Text>
          {meta ? (
            <Text style={s.cardCount}>{meta.total} total</Text>
          ) : null}
        </View>

        {loading ? (
          <View style={s.loadingWrap}>
            {[0, 1, 2, 3].map((i) => <View key={i} style={s.skeleton} />)}
          </View>
        ) : error ? (
          <View style={s.empty}>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity style={[s.retryBtn, { borderColor: theme.primary }]} onPress={handleRetry}>
              <RefreshCw size={14} color={theme.primary} />
              <Text style={[s.retryBtnText, { color: theme.primary }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : entries.length === 0 ? (
          <View style={s.empty}>
            <Calendar size={40} color={theme.textMuted} />
            <Text style={s.emptyTitle}>No activity yet</Text>
            <Text style={s.emptySubtitle}>
              Actions like marking attendance, editing assignments, and creating schedules will appear here.
            </Text>
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

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <View style={s.pagination}>
            <TouchableOpacity
              style={[s.pageBtn, page <= 1 && s.pageBtnDisabled]}
              disabled={page <= 1 || loading}
              onPress={handlePrev}
            >
              <ChevronLeft size={16} color={page <= 1 ? theme.textMuted : theme.primary} />
              <Text style={[s.pageBtnText, page <= 1 && s.pageBtnTextDisabled]}>Previous</Text>
            </TouchableOpacity>

            <Text style={s.pageIndicator}>
              Page {meta.page} of {meta.totalPages}
            </Text>

            <TouchableOpacity
              style={[s.pageBtn, page >= meta.totalPages && s.pageBtnDisabled]}
              disabled={page >= meta.totalPages || loading}
              onPress={handleNext}
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

// ── Styles ────────────────────────────────────────────────────────────────────

const getStyles = (theme: ThemeColors) => StyleSheet.create({
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
    textTransform: 'capitalize',
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
    padding: 48,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.textMuted,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    color: theme.danger,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
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
  pageBtnDisabled: { opacity: 0.5 },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.primary,
  },
  pageBtnTextDisabled: { color: theme.textMuted },
  pageIndicator: {
    fontSize: 12,
    color: theme.textMuted,
  },
});
