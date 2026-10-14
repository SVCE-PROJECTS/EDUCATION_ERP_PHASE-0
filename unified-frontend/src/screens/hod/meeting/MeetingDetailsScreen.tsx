// @ts-nocheck
/**
 * HOD Portal - Meeting Details Screen
 * Displays the selected meeting and allows HOD approval actions.
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Icon } from 'react-native-paper';
import ScreenWrapper from '../../../layouts/hod/ScreenWrapper';
import { useMeetingById, useApproveMeeting } from '../../../hooks/useMeetings';
import { useAuth } from '../../../context/hod/AuthContext';
import { useTheme } from '../../../context/hod/ThemeContext';
import { spacing, radius, shadows } from '../../../theme';
import { formatDateShort, formatDateLong, format12Hour } from '../../../utils/dateHelpers';

const STATUS_COLORS = {
  pending_availability: { bg: '#FEF3C7', text: '#F59E0B' },
  pending_approval: { bg: '#FEF9C3', text: '#CA8A04' },
  confirmed: { bg: '#DCFCE7', text: '#16A34A' },
  rejected: { bg: '#FEE2E2', text: '#DC2626' },
  in_progress: { bg: '#DBEAFE', text: '#2563EB' },
  completed: { bg: '#F3E8FF', text: '#9333EA' },
  cancelled: { bg: '#F1F5F9', text: '#64748B' },
};

const STATUS_LABELS = {
  pending_availability: 'Pending Availability',
  pending_approval: 'Pending Approval',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function MeetingDetailsScreen({ route, navigation }: { route: any; navigation: any }) {
  const { meetingId } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();
  const { data: meeting, isLoading, error } = useMeetingById(meetingId);
  const { mutateAsync: approveMeeting } = useApproveMeeting();

  const handleApprove = async (action: 'approve' | 'reject') => {
    try {
      await approveMeeting({ id: meetingId, action });
      Alert.alert('Success', `Meeting ${action}d successfully`);
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${action} meeting`);
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper title="Meeting Details" scrollable={false} showTopbar={false}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading meeting...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error || !meeting) {
    return (
      <ScreenWrapper title="Meeting Details" scrollable={false} showTopbar={false}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.error }]}>Unable to load meeting details</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const statusColors = STATUS_COLORS[meeting.status] || { bg: '#F1F5F9', text: '#64748B' };
  const canApprove = meeting.status === 'pending_approval' && meeting.approvals?.some(
    (approval: any) => String(approval.approver_employee_id ?? '') === String(user?.id ?? '')
  );

  return (
    <ScreenWrapper title="Meeting Details" scrollable={false} showTopbar={false}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Icon source="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{meeting.title}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>{STATUS_LABELS[meeting.status] || meeting.status}</Text>
            </View>
          </View>

          <View style={styles.infoBlock}>
            <View style={styles.infoRow}>
              <Icon source={meeting.meeting_type === 'offline' ? 'map-marker' : 'video'} size={18} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{meeting.meeting_type === 'offline' ? 'Offline meeting' : 'Online meeting'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Icon source="calendar" size={18} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{formatDateLong(meeting.scheduled_date)}</Text>
            </View>
            {meeting.duration_minutes ? <View style={styles.infoRow}>
              <Icon source="clock-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>{format12Hour(meeting.start_time)} • {meeting.duration_minutes} minutes</Text>
            </View> : <View style={styles.infoRow}><Icon source="clock-outline" size={18} color={colors.textMuted} /><Text style={[styles.infoText, { color: colors.textSecondary }]}>{format12Hour(meeting.start_time)}</Text></View>}
            {meeting.location ? (
              <View style={styles.infoRow}>
                <Icon source="map-marker" size={18} color={colors.textMuted} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{meeting.location}</Text>
              </View>
            ) : null}
          </View>

          {meeting.description ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Description</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>{meeting.description}</Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Participants</Text>
            {meeting.participants && meeting.participants.length > 0 ? (
              meeting.participants.map((participant: any) => (
                <View key={participant.participant_id || participant.id} style={styles.participantRow}>
                  <View style={styles.participantInfo}>
                    <Text style={[styles.participantName, { color: colors.textPrimary }]}>{participant.name || participant.participant_name}</Text>
                    <Text style={[styles.participantMeta, { color: colors.textSecondary }]}>{participant.designation || 'Faculty'} • {participant.availability_status || 'pending'}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No participants added yet.</Text>
            )}
          </View>

          {canApprove && (
            <View style={styles.approvalSection}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Approval</Text>
              <View style={styles.approvalButtons}>
                <TouchableOpacity style={[styles.approveButton, { backgroundColor: '#DCFCE7' }]} onPress={() => handleApprove('approve')}>
                  <Icon source="check" size={16} color="#16A34A" />
                  <Text style={[styles.buttonText, { color: '#16A34A' }]}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.rejectButton, { backgroundColor: '#FEE2E2' }]} onPress={() => handleApprove('reject')}>
                  <Icon source="close" size={16} color="#DC2626" />
                  <Text style={[styles.buttonText, { color: '#DC2626' }]}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  backButton: { padding: 4 },
  title: { fontSize: 24, fontWeight: '700', flexShrink: 1 },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg },
  cardHeader: { marginBottom: spacing.md },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  infoBlock: { gap: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoText: { fontSize: 14, flexShrink: 1 },
  section: { marginTop: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  description: { fontSize: 14, lineHeight: 20 },
  participantRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 14, fontWeight: '600' },
  participantMeta: { fontSize: 12, marginTop: 2 },
  emptyText: { fontSize: 14 },
  approvalSection: { marginTop: spacing.lg },
  approvalButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  approveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md },
  rejectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md },
  buttonText: { fontSize: 14, fontWeight: '600' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { fontSize: 14, marginTop: spacing.sm },
  errorText: { fontSize: 14, fontWeight: '600' },
});