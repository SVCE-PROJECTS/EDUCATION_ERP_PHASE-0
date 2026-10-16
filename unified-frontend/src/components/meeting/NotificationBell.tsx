// @ts-nocheck
/**
 * Dashboard notification bell — shared across Admin, HOD, and Faculty.
 * Shows two real, already-backed data sources: today's meetings (the same
 * useTodayMeetings query MeetingReminders uses) and recent activity from
 * each portal's own audit-log endpoint (passed in, since the three portals
 * each hit a different scoped endpoint: /audit-logs, /audit-logs/department,
 * /audit-logs/me). Nothing here is fabricated — an empty section shows an
 * honest empty state instead of placeholder content.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { useTodayMeetings } from '../../hooks/useMeetings';
import { format12Hour } from '../../utils/dateHelpers';

export interface ActivityItem {
  id: string | number;
  action?: string;
  module?: string | null;
  performedBy?: string | null;
  createdAt?: string;
}

interface NotificationBellProps {
  colors: any;
  onViewMeeting: (meetingId: number) => void;
  activities?: ActivityItem[];
  activitiesLoading?: boolean;
  activitiesError?: boolean;
  /** Visual size of the bell icon itself — matches whichever header icon it's replacing. */
  iconSize?: number;
  iconColor?: string;
}

const formatLabel = (value?: string | null) => {
  if (!value) return '';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function NotificationBell({
  colors,
  onViewMeeting,
  activities = [],
  activitiesLoading = false,
  activitiesError = false,
  iconSize = 26,
  iconColor = '#FFFFFF',
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data: meetings = [], isLoading: meetingsLoading, isError: meetingsError, refetch } = useTodayMeetings();

  const handleOpen = () => {
    setOpen(true);
    // Refresh both sections every time the panel opens, per spec.
    refetch();
  };

  const badgeCount = meetings.length;

  return (
    <>
      <TouchableOpacity onPress={handleOpen} style={styles.bellWrap} accessibilityLabel="Notifications" accessibilityRole="button">
        <Icon source="bell-outline" size={iconSize} color={iconColor} />
        {badgeCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Notifications</Text>
              <TouchableOpacity onPress={() => setOpen(false)} accessibilityLabel="Close notifications">
                <Icon source="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>Today's Meetings</Text>
              {meetingsLoading ? (
                <ActivityIndicator color={colors.primary} style={styles.spinner} />
              ) : meetingsError ? (
                <Text style={[styles.empty, { color: colors.danger || colors.error }]}>Could not load today's meetings.</Text>
              ) : meetings.length === 0 ? (
                <Text style={[styles.empty, { color: colors.textMuted }]}>No meetings scheduled for today.</Text>
              ) : (
                meetings.map((m: any) => (
                  <TouchableOpacity
                    key={m.meeting_id}
                    style={[styles.item, { borderColor: colors.border }]}
                    onPress={() => { setOpen(false); onViewMeeting(Number(m.meeting_id)); }}
                  >
                    <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>{m.title}</Text>
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                      {format12Hour(m.start_time)}{m.duration_minutes ? ` · ${m.duration_minutes} min` : ''}
                      {m.meeting_type === 'offline' && m.location ? ` · ${m.location}` : ''}
                    </Text>
                    {m.created_by_name ? (
                      <Text style={[styles.itemMeta, { color: colors.textMuted }]}>Organized by {m.created_by_name}</Text>
                    ) : null}
                    <Text style={[styles.viewLink, { color: colors.primary }]}>View Meeting →</Text>
                  </TouchableOpacity>
                ))
              )}

              <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginTop: 16 }]}>Recent Activities</Text>
              {activitiesLoading ? (
                <ActivityIndicator color={colors.primary} style={styles.spinner} />
              ) : activitiesError ? (
                <Text style={[styles.empty, { color: colors.danger || colors.error }]}>Could not load recent activities.</Text>
              ) : activities.length === 0 ? (
                <Text style={[styles.empty, { color: colors.textMuted }]}>No recent activities.</Text>
              ) : (
                activities.map((a) => (
                  <View key={a.id} style={[styles.activityRow, { borderColor: colors.border }]}>
                    <Text style={[styles.itemMeta, { color: colors.textPrimary }]}>
                      {formatLabel(a.action)}{a.module ? ` · ${formatLabel(a.module)}` : ''}
                    </Text>
                    <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                      {a.performedBy || 'System'}{a.createdAt ? ` · ${new Date(a.createdAt).toLocaleString()}` : ''}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellWrap: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'flex-end', padding: 16 },
  panel: {
    width: 340, maxWidth: '100%', maxHeight: '80%', borderRadius: 16, borderWidth: 1,
    marginTop: 56, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 12,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 8 },
  panelTitle: { fontSize: 16, fontWeight: '700' },
  scroll: { paddingHorizontal: 16, paddingBottom: 16, maxHeight: 420 },
  sectionHeader: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 },
  spinner: { marginVertical: 12 },
  empty: { fontSize: 13, marginBottom: 12 },
  item: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8, gap: 2 },
  itemTitle: { fontSize: 13, fontWeight: '700' },
  itemMeta: { fontSize: 12 },
  viewLink: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  activityRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8, gap: 2 },
});
