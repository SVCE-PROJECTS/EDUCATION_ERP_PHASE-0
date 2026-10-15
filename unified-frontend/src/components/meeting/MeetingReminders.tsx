// @ts-nocheck
import React from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { useTodayMeetings } from '../../hooks/useMeetings';
import { format12Hour } from '../../utils/dateHelpers';

export default function MeetingReminders({ colors, onOpenMeeting }: { colors: any; onOpenMeeting: (id: number) => void }) {
  const { data: meetings = [], isLoading, isError } = useTodayMeetings();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Today's Meetings</Text>
        {meetings.length > 0 ? <Text style={[styles.count, { color: colors.textSecondary }]}>{meetings.length}</Text> : null}
      </View>
      {isLoading ? (
        <View style={styles.state}><ActivityIndicator size="small" color={colors.primary} /></View>
      ) : isError ? (
        <Text style={[styles.stateText, { color: colors.danger || colors.error }]}>Could not load today's meetings.</Text>
      ) : meetings.length === 0 ? (
        <Text style={[styles.stateText, { color: colors.textMuted }]}>No meetings scheduled for today.</Text>
      ) : meetings.map((meeting: any) => (
        <TouchableOpacity
          key={meeting.meeting_id}
          onPress={() => onOpenMeeting(Number(meeting.meeting_id))}
          style={[styles.meetingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={styles.meetingMain}>
            <View style={styles.titleLine}>
              <Text style={[styles.meetingTitle, { color: colors.textPrimary }]} numberOfLines={1}>{meeting.title}</Text>
              <View style={[styles.typeBadge, { backgroundColor: meeting.meeting_type === 'offline' ? colors.primarySoft : colors.successBg || '#DCFCE7' }]}>
                <Text style={[styles.typeText, { color: meeting.meeting_type === 'offline' ? colors.primary : colors.success || '#15803D' }]}>
                  {meeting.meeting_type === 'offline' ? 'Offline' : 'Online'}
                </Text>
              </View>
            </View>
            <Text style={[styles.meetingMeta, { color: colors.textSecondary }]}>
              {format12Hour(meeting.start_time)}{meeting.duration_minutes ? ` · ${meeting.duration_minutes} min` : ''}
              {meeting.meeting_type === 'offline' && meeting.location ? ` · ${meeting.location}` : ''}
            </Text>
            {meeting.created_by_name ? <Text style={[styles.meetingMeta, { color: colors.textMuted }]}>Organized by {meeting.created_by_name}</Text> : null}
          </View>
          {meeting.meeting_type === 'online' && meeting.meeting_url && meeting.status === 'in_progress' ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Join online meeting" onPress={() => Linking.openURL(meeting.meeting_url)} style={styles.joinButton}>
              <Icon source="video-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          ) : <Icon source="chevron-right" size={20} color={colors.textMuted} />}
        </TouchableOpacity>
      ))}


    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  sectionHeader: { minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  count: { fontSize: 12, fontWeight: '600' },
  state: { minHeight: 36, alignItems: 'flex-start', justifyContent: 'center' },
  stateText: { fontSize: 12, paddingVertical: 5 },
  meetingRow: { minHeight: 60, borderWidth: 1, borderRadius: 7, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  meetingMain: { flex: 1, minWidth: 0, gap: 3 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meetingTitle: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '700' },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  typeText: { fontSize: 10, fontWeight: '700' },
  meetingMeta: { fontSize: 11 },
  joinButton: { minWidth: 34, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
});