// @ts-nocheck
/**
 * Admin Portal - My Schedules Screen
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, LayoutChangeEvent,
} from 'react-native';
import { Icon } from 'react-native-paper';
import ScreenLayout from '../../../navigation/admin/ScreenLayout';
import { MiniCalendar, SchedulePopup, ScheduleFormModal } from '../../../components/calendar';
import {
  useMonthSchedules,
  useCompleteSchedule,
  useMarkPendingSchedule,
  useDeleteSchedule,
  useToggleScheduleStatus,
} from '../../../hooks/useSchedules';
import { Schedule } from '../../../services/schedule.service';
import { useTheme } from '../../../context/admin/ThemeContext';
import { spacing, radius, shadows } from '../../../theme';
import { formatDateShort, format12Hour, getTodayString } from '../../../utils/dateHelpers';
import { confirmDelete, showError } from '../../../utils/confirmDialog';

const CAL_W = 340;
const BREAKPOINT = CAL_W + 220;

// embedded: true when rendered as a tab inside the My Schedules / Meeting
// Management combined screen (skips its own ScreenLayout/sidebar, since the
// parent already provides one). Does not change any schedule behavior.
export default function MySchedulesScreen({ navigation, embedded = false }: { navigation: any; embedded?: boolean }) {
  const { colors } = useTheme();

  const [contentWidth, setContentWidth] = useState(0);
  const isWide = contentWidth >= BREAKPOINT;
  const onRowLayout = useCallback((e: LayoutChangeEvent) => {
    setContentWidth(e.nativeEvent.layout.width);
  }, []);

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [popupVisible, setPopupVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const { schedules, loading } = useMonthSchedules(currentYear, currentMonth);
  const { completeSchedule } = useCompleteSchedule();
  const { markPendingSchedule } = useMarkPendingSchedule();
  const { deleteSchedule: deleteMutation } = useDeleteSchedule();
  const { toggleStatus } = useToggleScheduleStatus();

  const sortedSchedules = useMemo(() => {
    if (!schedules) return [];
    return [...schedules].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      return 0;
    });
  }, [schedules]);

  const handleDatePress = (d: string) => { setSelectedDate(d); setPopupVisible(true); };
  const handleAddNew = (date?: string) => {
    setEditingSchedule(null); setPopupVisible(false); setFormVisible(true);
  };
  const handleEdit = (s: Schedule) => {
    setEditingSchedule(s); setPopupVisible(false); setFormVisible(true);
  };

  const handleToggleStatus = async (schedule: Schedule) => {
    setProcessingId(schedule.id);
    try { await toggleStatus(schedule); }
    catch (err: any) { showError('Error', err.message || 'Failed to update'); }
    finally { setProcessingId(null); }
  };

  const handleDelete = (schedule: Schedule) => {
    confirmDelete(
      'Delete Schedule',
      `Delete "${schedule.title}"?`,
      async () => {
        setProcessingId(schedule.id);
        try { await deleteMutation(schedule); setPopupVisible(false); }
        catch (err: any) { showError('Error', err.message || 'Failed to delete'); }
        finally { setProcessingId(null); }
      },
    );
  };

  const content = (
    <>
      {/* ScreenLayout's content View is flex:1 — give it a ScrollView */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/*
          onLayout fires with actual content width.
          The admin sidebar (248px) is a sibling to main, not a parent,
          so layout.width already excludes it.
        */}
        <View
          style={isWide ? s.rowWide : s.rowNarrow}
          onLayout={onRowLayout}
        >

          {/* Calendar column — fixed 340, never shrinks */}
          <View style={isWide ? s.calColWide : s.calColNarrow}>
            <MiniCalendar
              selectedDate={selectedDate || undefined}
              schedules={schedules}
              onDatePress={handleDatePress}
              onMonthChange={(y, m) => { setCurrentYear(y); setCurrentMonth(m); }}
              theme={colors}
            />
          </View>

          {/* List card — takes remaining space */}
          <View style={[s.listCard, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>

            <View style={s.listHeader}>
              <View style={s.listHeaderLeft}>
                <Icon source="calendar-month" size={20} color={colors.primary} />
                <Text style={[s.listTitle, { color: colors.textPrimary }]}>All Schedules</Text>
              </View>
              <TouchableOpacity
                style={[s.addBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddNew}
              >
                <Icon source="plus" size={18} color="#FFFFFF" />
                <Text style={s.addBtnText}>Add New</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={s.empty}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : sortedSchedules.length === 0 ? (
              <View style={s.empty}>
                <Icon source="calendar-blank" size={48} color={colors.textMuted} />
                <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>No schedules yet</Text>
                <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
                  Create your first schedule to get started
                </Text>
              </View>
            ) : (
              sortedSchedules.map((schedule) => {
                const done = schedule.status === 'completed';
                const busy = processingId === schedule.id;
                return (
                  <View
                    key={schedule.id}
                    style={[s.scheduleItem, { borderBottomColor: colors.border }]}
                  >
                    <View style={[s.dateChip, { backgroundColor: colors.primarySoft }]}>
                      <Text style={[s.dateChipText, { color: colors.primary }]}>
                        {formatDateShort(schedule.date)}
                      </Text>
                    </View>
                    <View style={s.scheduleContent}>
                      <View style={s.titleRow}>
                        <Text
                          style={[s.scheduleTitle, { color: colors.textPrimary }, done && s.strikethrough]}
                          numberOfLines={2}
                        >
                          {schedule.title}
                        </Text>
                        <View style={[s.badge, done ? s.badgeDone : s.badgePending]}>
                          <Text style={[s.badgeText, done ? s.badgeTextDone : s.badgeTextPending]}>
                            {done ? 'Completed' : 'Pending'}
                          </Text>
                        </View>
                      </View>
                      {schedule.time && (
                        <Text style={[s.scheduleTime, { color: colors.textSecondary }, done && s.faded]}>
                          🕐 {format12Hour(schedule.time)}
                        </Text>
                      )}
                      {schedule.description && (
                        <Text
                          style={[s.scheduleDesc, { color: colors.textMuted }, done && s.faded]}
                          numberOfLines={2}
                        >
                          {schedule.description}
                        </Text>
                      )}
                      <View style={s.actions}>
                        <TouchableOpacity onPress={() => handleEdit(schedule)} disabled={busy}>
                          <Text style={[s.actionEdit, { color: colors.primary }]}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleToggleStatus(schedule)} disabled={busy}>
                          <Text style={[s.actionToggle, { color: colors.textSecondary }]}>
                            {busy ? '…' : done ? 'Mark Pending' : 'Mark Complete'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(schedule)} disabled={busy}>
                          <Text style={s.actionDelete}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      <SchedulePopup
        visible={popupVisible}
        date={selectedDate || getTodayString()}
        schedules={schedules || []}
        onClose={() => setPopupVisible(false)}
        onAddNew={handleAddNew}
        onEdit={handleEdit}
        theme={colors}
      />

      <ScheduleFormModal
        visible={formVisible}
        schedule={editingSchedule || undefined}
        initialDate={selectedDate || undefined}
        onClose={() => { setFormVisible(false); setEditingSchedule(null); }}
        theme={colors}
      />
    </>
  );

  if (embedded) return content;

  return (
    <ScreenLayout navigation={navigation} activeScreen="MySchedules">
      {content}
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md },

  rowNarrow: { flexDirection: 'column', gap: spacing.md },
  rowWide: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },

  calColNarrow: { width: '100%', maxWidth: CAL_W },
  calColWide: { width: CAL_W, flexShrink: 0, flexGrow: 0 },

  listCard: { flex: 1, minWidth: 0, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1 },

  listHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.lg,
  },
  listHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  listTitle: { fontSize: 18, fontWeight: '700' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.md,
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { fontSize: 14, marginTop: 4 },

  scheduleItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: spacing.md, borderBottomWidth: 1, gap: spacing.md,
  },
  dateChip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: radius.sm, alignSelf: 'flex-start', flexShrink: 0,
  },
  dateChipText: { fontSize: 12, fontWeight: '600' },

  scheduleContent: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 8, marginBottom: 4,
  },
  scheduleTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  strikethrough: { textDecorationLine: 'line-through', opacity: 0.5 },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexShrink: 0 },
  badgePending: { backgroundColor: '#FEF9C3' },
  badgeDone: { backgroundColor: '#DCFCE7' },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeTextPending: { color: '#CA8A04' },
  badgeTextDone: { color: '#16A34A' },

  scheduleTime: { fontSize: 13, marginBottom: 4 },
  scheduleDesc: { fontSize: 13 },
  faded: { opacity: 0.5 },

  actions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  actionEdit: { fontSize: 13, fontWeight: '600' },
  actionToggle: { fontSize: 13, fontWeight: '600' },
  actionDelete: { fontSize: 13, fontWeight: '600', color: '#DC2626' },
});
