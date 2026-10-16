// @ts-nocheck
import React from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import ScreenWrapper from '../../../layouts/faculty/ScreenWrapper';
import { useMeetingById } from '../../../hooks/useMeetings';
import { useAuth } from '../../../context/faculty/AuthContext';
import { useTheme } from '../../../context/faculty/ThemeContext';
import { spacing, radius, shadows } from '../../../theme';
import { formatDateLong, format12Hour } from '../../../utils/dateHelpers';
import { ROUTES } from '../../../navigation/faculty/routes';

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
  const { colors } = useTheme();
  const { user } = useAuth();
  const { data: meeting, isLoading, error } = useMeetingById(route.params?.meetingId);

  const handleOpenMeetingLink = () => {
    const url = meeting?.effective_meeting_url || meeting?.meeting_url;
    if (!url) return;
    if (Platform.OS === 'web') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url);
    }
  };

  if (isLoading) {
    return (
      <ScreenWrapper title="Meeting Details" scrollable={false}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading meeting...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  if (error || !meeting) {
    return (
      <ScreenWrapper title="Meeting Details" scrollable={false}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.danger }]}>Unable to load meeting details</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const statusColors = STATUS_COLORS[meeting.status] || { bg: '#F1F5F9', text: '#64748B' };
  const effectiveUrl = meeting.effective_meeting_url || meeting.meeting_url;
  const isCreator = String(meeting.created_by_employee_id ?? meeting.created_by ?? '') === String(user?.id ?? '');
  const canEdit = isCreator && !['completed', 'cancelled'].includes(meeting.status);

  return (
    <ScreenWrapper title="Meeting Details" scrollable={false}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Icon source="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>{meeting.title}</Text>
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
            <View style={styles.infoRow}>
              <Icon source="clock-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                {format12Hour(meeting.start_time)}{meeting.duration_minutes ? ` • ${meeting.duration_minutes} minutes` : ''}
              </Text>
            </View>
            {meeting.location ? (
              <View style={styles.infoRow}>
                <Icon source="map-marker" size={18} color={colors.textMuted} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>{meeting.location}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Icon source="account-tie" size={18} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>Created by {meeting.created_by_name || 'Creator unavailable'}</Text>
            </View>
            {meeting.meeting_type !== 'offline' && effectiveUrl ? (
              <View style={styles.infoRow}>
                <Icon source="video" size={18} color={colors.textMuted} />
                <TouchableOpacity onPress={handleOpenMeetingLink}>
                  <Text style={[styles.infoText, styles.linkText, { color: colors.primary }]}>Open meeting link</Text>
                </TouchableOpacity>
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
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Participants ({meeting.participants?.length || 0})</Text>
            {meeting.participants && meeting.participants.length > 0 ? (
              meeting.participants.map((person: any) => (
                <View key={person.participant_id} style={styles.participantRow}>
                  <View style={styles.participantInfo}>
                    <Text style={[styles.participantName, { color: colors.textPrimary }]}>{person.participant_name || person.name}</Text>
                    <Text style={[styles.participantMeta, { color: colors.textSecondary }]}>{person.designation || 'Faculty'} • {person.availability_status || 'pending'}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No participants added yet.</Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Summary</Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>Invited: {meeting.participants?.length || 0}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoText, { color: colors.textMuted, fontStyle: 'italic' }]}>Attendance not recorded</Text>
            </View>
          </View>

          {meeting.meeting_type !== 'offline' && effectiveUrl ? (
            <TouchableOpacity style={[styles.joinButton, { backgroundColor: colors.primary }]} onPress={handleOpenMeetingLink}>
              <Icon source="video" size={20} color="#FFFFFF" /><Text style={styles.joinText}>Open meeting link</Text>
            </TouchableOpacity>
          ) : null}

          {canEdit && (
            <TouchableOpacity
              style={[styles.editButton, { borderColor: colors.primary }]}
              onPress={() => navigation.navigate(ROUTES.EDIT_MEETING, { meetingId: meeting.meeting_id })}
            >
              <Icon source="pencil" size={18} color={colors.primary} />
              <Text style={[styles.buttonText, { color: colors.primary }]}>Edit Meeting</Text>
            </TouchableOpacity>
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
  linkText: { textDecorationLine: 'underline', fontWeight: '600' },
  section: { marginTop: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.sm },
  description: { fontSize: 14, lineHeight: 20 },
  participantRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.xs },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 14, fontWeight: '600' },
  participantMeta: { fontSize: 12, marginTop: 2 },
  emptyText: { fontSize: 14 },
  joinButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  joinText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  buttonText: { fontSize: 14, fontWeight: '600' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { fontSize: 14, marginTop: spacing.sm },
  errorText: { fontSize: 14, fontWeight: '600' },
});
