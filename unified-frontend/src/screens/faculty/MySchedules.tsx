// @ts-nocheck
/**
 * Faculty Portal - My Schedules Screen
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, LayoutChangeEvent,
} from 'react-native';
import { Calendar, Edit, Plus } from '../../components/faculty/icons';
import ScreenWrapper from '../../layouts/faculty/ScreenWrapper';
import { MiniCalendar, SchedulePopup, ScheduleFormModal } from '../../components/calendar';
import {
  useMonthSchedules,
  useDeleteSchedule,
  useToggleScheduleStatus,
  getSchedulesForDate,
} from '../../hooks/useSchedules';
import { Schedule } from '../../services/schedule.service';
import { useTheme } from '../../context/faculty/ThemeContext';
import { shadows } from '../../theme/faculty/colors';
import { ROUTES } from '../../navigation/faculty/routes';
import { formatDateShort, format12Hour, getTodayString } from '../../utils/dateHelpers';
import { confirmDelete, showError } from '../../utils/confirmDialog';

/** Calendar column fixed width */
const CAL_W = 340;
/** Minimum extra space needed for the list card before going side-by-side */
const BREAKPOINT = CAL_W + 220; // 560px

export default function MySchedules() {
  const { colors } = useTheme();

  // ── Measure actual content width (excludes sidebar, safe-area, padding) ──
  const [contentWidth, setContentWidth] = useState(0);
  const isWide = contentWidth >= BREAKPOINT;
  const onRowLayout = useCallback((e: LayoutChangeEvent) => {
    setContentWidth(e.nativeEvent.layout.width);
  }, []);

  // ── Month state ───────────────────────────────────────────────────────────
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [popupVisible, setPopupVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formDate, setFormDate] = useState<string | undefined>(undefined);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { schedules, loading, error } = useMonthSchedules(currentYear, currentMonth);
  const { deleteSchedule } = useDeleteSchedule();
  const { toggleStatus } = useToggleScheduleStatus();

  const displaySchedules = useMemo(() => {
    if (!schedules) return [];
    const list = selectedDate
      ? getSchedulesForDate(schedules, selectedDate)
      : schedules;
    return [...list].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });
  }, [schedules, selectedDate]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDatePress = (d: string) => { setSelectedDate(d); setPopupVisible(true); };
  const handleAddNew = (date?: string) => {
    setFormDate(date); setEditingSchedule(null);
    setPopupVisible(false); setFormVisible(true);
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
        try { await deleteSchedule(schedule); }
        catch (err: any) { showError('Error', err.message || 'Failed to delete'); }
        finally { setProcessingId(null); }
      },
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // Pass scrollable=false: we own the ScrollView to avoid nested-scroll glitch
    <ScreenWrapper route={ROUTES.MY_SCHEDULES} scrollable={false}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/*
          onLayout gives the real content width after padding.
          isWide is derived from it so sidebar (admin: 248px) is already excluded.
        */}
        <View
          style={isWide ? s.rowWide : s.rowNarrow}
          onLayout={onRowLayout}
        >

          {/* ── Calendar column ── fixed 340, never shrinks ──────────────── */}
          <View style={isWide ? s.calColWide : s.calColNarrow}>
            <MiniCalendar
              selectedDate={selectedDate || undefined}
              onDatePress={handleDatePress}
              onMonthChange={(y, m) => { setCurrentYear(y); setCurrentMonth(m); }}
              theme={colors}
            />
          </View>

          {/* ── Schedule list ── flex:1, minWidth:0 ──────────────────────── */}
          <View style={[s.listCard, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.card }]}>

            {/* Header */}
            <View style={s.listHeader}>
              <View style={s.listHeaderLeft}>
                <Calendar size={20} color={colors.primary} />
                <Text style={[s.listTitle, { color: colors.textPrimary }]}>
                  {selectedDate
                    ? `Schedules for ${formatDateShort(selectedDate)}`
                    : 'All Schedules'}
                </Text>
              </View>
              <View style={s.listHeaderRight}>
                {selectedDate && (
                  <TouchableOpacity
                    style={[s.showAllBtn, { borderColor: colors.border }]}
                    onPress={() => setSelectedDate(null)}
                  >
                    <Text style={[s.showAllBtnText, { color: colors.textPrimary }]}>Show All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[s.addBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleAddNew()}
                >
                  <Plus size={18} color="#FFFFFF" />
                  <Text style={s.addBtnText}>Add New</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Body */}
            {loading ? (
              <View style={s.empty}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : error ? (
              <View style={s.empty}><Text style={s.errorText}>{error}</Text></View>
            ) : displaySchedules.length === 0 ? (
              <View style={s.empty}>
                <Calendar size={48} color={colors.textMuted} />
                <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>
                  {selectedDate ? 'No schedules for this date' : 'No schedules yet'}
                </Text>
                <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
                  {selectedDate ? 'Try a different date' : 'Create your first schedule to get started'}
                </Text>
              </View>
            ) : (
              displaySchedules.map((schedule) => {
                const done = schedule.status === 'completed';
                const busy = processingId === schedule.id;
                return (
                  <View
                    key={schedule.id}
                    style={[s.scheduleItem, { borderBottomColor: colors.border }]}
                  >
                    {/* Date chip */}
                    <View style={[s.dateChip, { backgroundColor: colors.primarySoft }]}>
                      <Text style={[s.dateChipText, { color: colors.primary }]}>
                        {formatDateShort(schedule.date)}
                      </Text>
                    </View>

                    {/* Content */}
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
        initialDate={formDate}
        schedule={editingSchedule || undefined}
        onClose={() => { setFormVisible(false); setEditingSchedule(null); setFormDate(undefined); }}
        theme={colors}
      />
    </ScreenWrapper>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
// Structural / non-themed styles are static. Themed colours are applied inline.
const s = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  // Layout rows
  rowNarrow: {
    flexDirection: 'column',
    gap: 16,
  },
  rowWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },

  // Calendar column — narrow: full width up to 340; wide: fixed 340
  calColNarrow: {
    width: '100%',
    maxWidth: CAL_W,
  },
  calColWide: {
    width: CAL_W,
    flexShrink: 0,
    flexGrow: 0,
  },

  // List card — takes all remaining space, never collapses
  listCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 180,
  },
  listHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listTitle: { fontSize: 18, fontWeight: '700', flex: 1 },

  showAllBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1,
  },
  showAllBtnText: { fontSize: 13, fontWeight: '600' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
  },
  addBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubtitle: { fontSize: 14, marginTop: 4 },
  errorText: { fontSize: 14, color: '#DC2626' },

  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  dateChip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, alignSelf: 'flex-start', flexShrink: 0,
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
