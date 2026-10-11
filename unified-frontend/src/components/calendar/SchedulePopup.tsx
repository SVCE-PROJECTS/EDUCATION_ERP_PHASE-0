// @ts-nocheck
/**
 * SchedulePopup Component
 * Modal displaying schedules for a selected date
 * Shared across all portals (Admin, HOD, Faculty)
 */

import React, { useState, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Schedule } from '../../services/schedule.service';
import { getSchedulesForDate, useDeleteSchedule, useToggleScheduleStatus } from '../../hooks/useSchedules';
import { formatDateWithDay, format12Hour, normalizeDateString } from '../../utils/dateHelpers';
import { confirmDelete, showError } from '../../utils/confirmDialog';

interface SchedulePopupProps {
  visible: boolean;
  date: string; // YYYY-MM-DD
  schedules: Schedule[]; // All schedules for the month
  onClose: () => void;
  onAddNew: (date: string) => void;
  onEdit: (schedule: Schedule) => void;
  theme: any;
}

export default function SchedulePopup({ 
  visible, 
  date, 
  schedules: allSchedules,
  onClose, 
  onAddNew, 
  onEdit,
  theme 
}: SchedulePopupProps) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURN
  const { deleteSchedule, loading: deleting } = useDeleteSchedule();
  const { toggleStatus, loading: toggling } = useToggleScheduleStatus();
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Safely default schedules to empty array and normalize date
  const safeSchedules = Array.isArray(allSchedules) ? allSchedules : [];
  const normalizedDate = date ? normalizeDateString(date) || date : '';

  const daySchedules = useMemo(() => {
    if (!normalizedDate) return [];
    return getSchedulesForDate(safeSchedules, normalizedDate).sort((a, b) => {
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [safeSchedules, normalizedDate]);

  const formattedDate = useMemo(() => {
    if (!normalizedDate) return 'No date';
    return formatDateWithDay(normalizedDate);
  }, [normalizedDate]);

  const s = useMemo(() => getStyles(theme), [theme]);

  // Early return AFTER all hooks
  if (!visible || !normalizedDate) {
    return null;
  }

  const handleDelete = (schedule: Schedule) => {
    confirmDelete(
      'Delete Schedule',
      `Are you sure you want to delete "${schedule.title}"?`,
      async () => {
        setProcessingId(schedule.id);
        try {
          await deleteSchedule(schedule);
        } catch (err: any) {
          showError('Error', err.message || 'Failed to delete schedule');
        } finally {
          setProcessingId(null);
        }
      },
    );
  };

  const handleToggleStatus = async (schedule: Schedule) => {
    setProcessingId(schedule.id);
    try {
      await toggleStatus(schedule);
    } catch (err: any) {
      showError('Error', err.message || 'Failed to update schedule status');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={s.popup} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={s.headerTitle}>{formattedDate}</Text>
              <Text style={s.headerSubtitle}>{daySchedules.length} schedule{daySchedules.length !== 1 ? 's' : ''}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Schedules list */}
          <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
            {daySchedules.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyText}>No schedules for this day</Text>
              </View>
            ) : (
              daySchedules.map((schedule) => {
                const isProcessing = processingId === schedule.id;
                const isCompleted = schedule.status === 'completed';

                return (
                  <View key={schedule.id} style={[s.item, isCompleted && s.itemCompleted]}>
                    <View style={s.itemHeader}>
                      <View style={s.itemTitleRow}>
                        <Text style={[s.itemTitle, isCompleted && s.itemTitleCompleted]} numberOfLines={2}>
                          {schedule.title}
                        </Text>
                        <View style={[s.badge, isCompleted ? s.badgeCompleted : s.badgePending]}>
                          <Text style={[s.badgeText, isCompleted ? s.badgeTextCompleted : s.badgeTextPending]}>
                            {isCompleted ? 'Completed' : 'Pending'}
                          </Text>
                        </View>
                      </View>
                      {schedule.time && (
                        <Text style={[s.itemTime, isCompleted && s.itemTimeCompleted]}>
                          🕐 {format12Hour(schedule.time)}
                        </Text>
                      )}
                    </View>

                    {schedule.description && (
                      <Text style={[s.itemDescription, isCompleted && s.itemDescriptionCompleted]} numberOfLines={3}>
                        {schedule.description}
                      </Text>
                    )}

                    <View style={s.itemActions}>
                      <TouchableOpacity
                        style={[s.actionBtn, s.actionBtnPrimary]}
                        onPress={() => onEdit(schedule)}
                        disabled={isProcessing}
                      >
                        <Text style={s.actionBtnTextPrimary}>Edit</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[s.actionBtn, s.actionBtnSecondary]}
                        onPress={() => handleToggleStatus(schedule)}
                        disabled={isProcessing}
                      >
                        <Text style={s.actionBtnTextSecondary}>
                          {isProcessing ? '...' : isCompleted ? 'Mark Pending' : 'Mark Complete'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[s.actionBtn, s.actionBtnDanger]}
                        onPress={() => handleDelete(schedule)}
                        disabled={isProcessing}
                      >
                        <Text style={s.actionBtnTextDanger}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            <TouchableOpacity style={s.addBtn} onPress={() => onAddNew(normalizedDate)}>
              <Text style={s.addBtnText}>+ Add New Schedule</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const getStyles = (theme: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  popup: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: theme.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: theme.textMuted,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 20,
    color: theme.textMuted,
  },
  body: {
    maxHeight: 400,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.textMuted,
  },
  item: {
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  itemCompleted: {
    opacity: 0.6,
  },
  itemHeader: {
    marginBottom: 8,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  itemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: theme.textMuted,
  },
  itemTime: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  itemTimeCompleted: {
    color: theme.textMuted,
  },
  itemDescription: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  itemDescriptionCompleted: {
    color: theme.textMuted,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgePending: {
    backgroundColor: '#FEF9C3',
  },
  badgeCompleted: {
    backgroundColor: '#DCFCE7',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextPending: {
    color: '#CA8A04',
  },
  badgeTextCompleted: {
    color: '#16A34A',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnPrimary: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderColor: theme.border,
  },
  actionBtnDanger: {
    backgroundColor: 'transparent',
    borderColor: '#DC2626',
  },
  actionBtnTextPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionBtnTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  actionBtnTextDanger: {
    fontSize: 13,
    fontWeight: '600',
    color: '#DC2626',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  addBtn: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
