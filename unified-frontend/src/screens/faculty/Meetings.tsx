// @ts-nocheck
/**
 * Faculty Portal - Meetings Screen
 * Displays meetings for faculty with limited permissions
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Calendar, Clock, MapPin, Users, CheckCircle, XCircle, AlertTriangle } from '../../components/faculty/icons';
import ScreenWrapper from '../../layouts/faculty/ScreenWrapper';
import { useMeetings, useUpdateAvailability, useDeleteMeeting } from '../../hooks/useMeetings';
import { useAuth } from '../../context/faculty/AuthContext';
import { useTheme } from '../../context/faculty/ThemeContext';
import { shadows } from '../../theme/faculty/colors';
import { ROUTES } from '../../navigation/faculty/routes';
import { formatDateShort, format12Hour } from '../../utils/dateHelpers';
import { showError, confirmDelete } from '../../utils/confirmDialog';
import Toast from '../../services/faculty/toast';
import MeetingTypeSelector from '../../components/meeting/MeetingTypeSelector';
import OfflineMeetingForm from '../../components/meeting/OfflineMeetingForm';

const normalizeMeetingStatus = (status?: string) => {
  const value = status || 'pending_approval';
  if (value === 'pending_availability') return 'pending_approval';
  if (value === 'confirmed') return 'confirmed';
  return value;
};

const STATUS_COLORS = {
  pending_approval: { bg: '#FEF9C3', text: '#CA8A04' },
  confirmed: { bg: '#DCFCE7', text: '#16A34A' },
  approved: { bg: '#DCFCE7', text: '#16A34A' },
  rejected: { bg: '#FEE2E2', text: '#DC2626' },
  in_progress: { bg: '#DBEAFE', text: '#2563EB' },
  completed: { bg: '#F3E8FF', text: '#9333EA' },
  cancelled: { bg: '#F1F5F9', text: '#64748B' },
  missed: { bg: '#FEE2E2', text: '#B91C1C' },
};

const STATUS_LABELS = {
  pending_approval: 'Pending Approval',
  confirmed: 'Confirmed',
  approved: 'Approved',
  rejected: 'Rejected',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  missed: 'Missed',
};

// A confirmed online meeting whose scheduled end time has already passed
// without it ever being started — it never happened. Surfaced under the
// "Pending" filter so these don't just silently sit as "Confirmed" forever.
const isMissedMeeting = (meeting: any) => {
  if (meeting.meeting_type !== 'online' || meeting.status !== 'confirmed') return false;
  if (!meeting.scheduled_date || !meeting.start_time) return false;
  const start = new Date(`${meeting.scheduled_date}T${meeting.start_time}:00`);
  if (Number.isNaN(start.getTime())) return false;
  const end = new Date(start.getTime() + (Number(meeting.duration_minutes) || 0) * 60000);
  return end.getTime() < Date.now();
};

const AVAILABILITY_COLORS = {
  pending: { bg: '#FEF9C3', text: '#CA8A04' },
  available: { bg: '#DCFCE7', text: '#16A34A' },
  unavailable: { bg: '#FEE2E2', text: '#DC2626' },
  tentative: { bg: '#FEF3C7', text: '#D97706' },
};

// embedded: true when rendered as a tab inside the combined My Schedules /
// Meetings screen (skips its own ScreenWrapper, since the parent already
// provides one).
export default function Meetings({ navigation, embedded = false }: { navigation: any; embedded?: boolean }) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [meetingType, setMeetingType] = useState<'online' | 'offline'>('online');
  const [showOfflineForm, setShowOfflineForm] = useState(false);

  // Fetch meetings for faculty's department — status filtering now happens
  // client-side (see filteredMeetings) so the "Pending" tab can also surface
  // missed meetings, which the backend has no "status" value for.
  const { data: meetings = [], isLoading, error } = useMeetings({
    department_code: user?.departmentCode,
    meeting_type: meetingType,
  });

  const { mutateAsync: updateAvailability, isPending: isUpdatingAvailability } = useUpdateAvailability();
  const { mutateAsync: deleteMeeting } = useDeleteMeeting();

  const handleCreateMeeting = () => {
    if (meetingType === 'offline') setShowOfflineForm(true);
    else navigation.navigate(ROUTES.CREATE_MEETING);
  };

  const handleEditMeeting = (meeting: any) => {
    navigation.navigate(ROUTES.EDIT_MEETING, { meetingId: meeting.meeting_id });
  };

  const handleDeleteMeeting = (meeting: any) => {
    confirmDelete(
      'Delete Meeting',
      `Delete "${meeting.title}"? This action cannot be undone.`,
      async () => {
        try {
          await deleteMeeting(meeting.meeting_id);
          Toast.show({ type: 'success', text1: 'Meeting deleted successfully' });
        } catch (error: any) {
          showError('Error', error.message || 'Failed to delete meeting');
        }
      }
    );
  };

  const filteredMeetings = useMemo(() => {
    const withMissedFlag = meetings.map((meeting) => ({
      ...meeting,
      missed: isMissedMeeting(meeting),
      status: normalizeMeetingStatus(meeting.status),
    }));

    const filtered = statusFilter === 'all'
      ? withMissedFlag
      : withMissedFlag.filter((meeting) => {
        if (statusFilter === 'pending_approval') {
          return meeting.status === 'pending_approval' || meeting.missed;
        }
        if (statusFilter === 'confirmed' || statusFilter === 'approved') {
          return meeting.status === 'confirmed' && !meeting.missed;
        }
        return meeting.status === statusFilter;
      });

    return [...filtered].sort((a, b) => {
      if (a.scheduled_date !== b.scheduled_date) {
        return b.scheduled_date.localeCompare(a.scheduled_date);
      }
      const statusPriority = {
        pending_approval: 1,
        confirmed: 2,
        approved: 2,
        in_progress: 3,
        completed: 4,
        rejected: 5,
        cancelled: 6,
      };
      return (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
    });
  }, [meetings, statusFilter]);

  const handleUpdateAvailability = async (meetingId: number, status: string) => {
    try {
      await updateAvailability({ id: meetingId, status });
      Toast.show({ type: 'success', text1: 'Availability updated successfully' });
    } catch (error: any) {
      showError('Error', error.message || 'Failed to update availability');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = STATUS_COLORS[status] || { bg: '#F1F5F9', text: '#64748B' };
    return (
      <View style={[s.statusBadge, { backgroundColor: statusColors.bg }]}>
        <Text style={[s.statusText, { color: statusColors.text }]}>
          {STATUS_LABELS[status] || status}
        </Text>
      </View>
    );
  };

  const getAvailabilityBadge = (status: string) => {
    const availColors = AVAILABILITY_COLORS[status] || { bg: '#F1F5F9', text: '#64748B' };
    return (
      <View style={[s.availabilityBadge, { backgroundColor: availColors.bg }]}>
        <Text style={[s.availabilityText, { color: availColors.text }]}>
          {status === 'pending' ? 'Response Needed' :
           status === 'available' ? 'Available' :
           status === 'unavailable' ? 'Unavailable' :
           'Tentative'}
        </Text>
      </View>
    );
  };

  const renderMeetingCard = (meeting: any) => {
    const normalizedStatus = normalizeMeetingStatus(meeting.status);
    const isParticipant = meeting.participants?.some((p: any) => String(p.participant_user_id ?? p.participant_id ?? p.user_id ?? '') === String(user?.id ?? '')) ||
      meeting.created_by_employee_id === user?.id ||
      meeting.created_by === user?.id ||
      String(meeting.requester_user_id ?? '') === String(user?.id ?? '');
    const participantData = meeting.participants?.find((p: any) => String(p.participant_user_id ?? p.participant_id ?? p.user_id ?? '') === String(user?.id ?? ''));
    const canRespond = isParticipant && (normalizedStatus === 'approved' || normalizedStatus === 'confirmed') &&
      (participantData?.availability_status === 'pending' || !participantData?.availability_status);
    const isCreator = String(meeting.created_by_employee_id ?? meeting.created_by ?? '') === String(user?.id ?? '');
    const canEdit = isCreator && !['completed', 'cancelled'].includes(normalizedStatus);

    return (
      <View
        key={meeting.meeting_id}
        style={[s.meetingCard, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.card }]}
      >
        <View style={s.cardHeader}>
          <View style={s.titleRow}>
            <Text style={[s.meetingTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {meeting.title}
            </Text>
          </View>

          <View style={s.badgeRow}>
            {getStatusBadge(meeting.missed ? 'missed' : normalizedStatus)}
            {isParticipant && participantData && (
              getAvailabilityBadge(participantData.availability_status)
            )}
          </View>
        </View>

        <View style={s.cardContent}>
          <View style={[s.typeBadge, { backgroundColor: meeting.meeting_type === 'offline' ? '#ECFDF5' : '#EFF6FF' }]}>
            <Text style={[s.typeBadgeText, { color: meeting.meeting_type === 'offline' ? '#047857' : '#1D4ED8' }]}>{meeting.meeting_type === 'offline' ? 'Offline' : 'Online'}</Text>
          </View>
          <View style={s.infoRow}>
            <Calendar size={16} color={colors.textMuted} />
            <Text style={[s.infoText, { color: colors.textSecondary }]}>
              {formatDateShort(meeting.scheduled_date)} at {format12Hour(meeting.start_time)}
            </Text>
          </View>

          {meeting.duration_minutes ? <View style={s.infoRow}>
            <Clock size={16} color={colors.textMuted} />
            <Text style={[s.infoText, { color: colors.textSecondary }]}>
              {meeting.duration_minutes} minutes
            </Text>
          </View> : null}

          {meeting.location && (
            <View style={s.infoRow}>
              <MapPin size={16} color={colors.textMuted} />
              <Text style={[s.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                {meeting.location}
              </Text>
            </View>
          )}

          <View style={s.infoRow}>
            <Users size={16} color={colors.textMuted} />
            <Text style={[s.infoText, { color: colors.textSecondary }]}>
              {meeting.participant_count || 0} participants
            </Text>
          </View>

          {meeting.description && (
            <Text style={[s.description, { color: colors.textMuted }]} numberOfLines={2}>
              {meeting.description}
            </Text>
          )}

          <View style={s.cardActions}>
            <TouchableOpacity
              style={[s.detailsButton, { borderColor: colors.border }]}
              onPress={() => navigation.navigate(ROUTES.MEETING_DETAILS, { meetingId: meeting.meeting_id })}
            >
              <Text style={[s.detailsButtonText, { color: colors.primary }]}>View details</Text>
            </TouchableOpacity>

            {canEdit && (
              <TouchableOpacity
                style={[s.detailsButton, { borderColor: colors.primary }]}
                onPress={() => handleEditMeeting(meeting)}
              >
                <Text style={[s.detailsButtonText, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
            )}

            {isCreator && (
              <TouchableOpacity
                style={[s.detailsButton, { borderColor: '#DC2626' }]}
                onPress={() => handleDeleteMeeting(meeting)}
              >
                <Text style={[s.detailsButtonText, { color: '#DC2626' }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>

          {canRespond && (
            <View style={s.responseSection}>
              <Text style={[s.responseTitle, { color: colors.textSecondary }]}>
                Please confirm your availability:
              </Text>
              <View style={s.responseButtons}>
                <TouchableOpacity
                  style={[s.responseButton, s.availableButton]}
                  onPress={() => handleUpdateAvailability(meeting.meeting_id, 'available')}
                  disabled={isUpdatingAvailability}
                >
                  <CheckCircle size={16} color="#16A34A" />
                  <Text style={[s.responseButtonText, { color: '#16A34A' }]}>Available</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.responseButton, s.tentativeButton]}
                  onPress={() => handleUpdateAvailability(meeting.meeting_id, 'tentative')}
                  disabled={isUpdatingAvailability}
                >
                  <AlertTriangle size={16} color="#D97706" />
                  <Text style={[s.responseButtonText, { color: '#D97706' }]}>Tentative</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.responseButton, s.unavailableButton]}
                  onPress={() => handleUpdateAvailability(meeting.meeting_id, 'unavailable')}
                  disabled={isUpdatingAvailability}
                >
                  <XCircle size={16} color="#DC2626" />
                  <Text style={[s.responseButtonText, { color: '#DC2626' }]}>Unavailable</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {meeting.meeting_type !== 'offline' && (meeting.effective_meeting_url || meeting.meeting_url) && normalizedStatus === 'in_progress' && (
            <TouchableOpacity
              style={[s.joinButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                const url = meeting.effective_meeting_url || meeting.meeting_url;
                if (url) Linking.openURL(url);
              }}
            >
              <Text style={s.joinButtonText}>{meeting.external_meeting_url ? 'Open Meeting Link' : 'Join Meeting'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const content = (
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Calendar size={24} color={colors.primary} />
            <Text style={[s.title, { color: colors.textPrimary }]}>Meetings</Text>
          </View>
          <TouchableOpacity style={[s.createButton, { backgroundColor: colors.primary }]} onPress={handleCreateMeeting}>
            <Text style={s.createButtonText}>{meetingType === 'offline' ? 'Arrange Offline' : 'Create'}</Text>
          </TouchableOpacity>
        </View>

        <MeetingTypeSelector value={meetingType} onChange={(type) => { setMeetingType(type); setShowOfflineForm(false); }} colors={colors} />

        {meetingType === 'offline' && showOfflineForm ? (
          <OfflineMeetingForm
            colors={colors}
            onCancel={() => setShowOfflineForm(false)}
            onCreated={(meeting) => {
              setShowOfflineForm(false);
              navigation.navigate(ROUTES.MEETING_DETAILS, { meetingId: meeting.meeting_id });
            }}
          />
        ) : (
          <>
            {/* Status Filter - Only show for the selected meeting type */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterContainer}>
              {/* Offline meetings never go through approval, so there's no
                  "Pending" state for them to filter by. */}
              {(meetingType === 'offline' ? [
                { key: 'all', label: 'All' },
                { key: 'confirmed', label: 'Confirmed' },
                { key: 'in_progress', label: 'Active' },
                { key: 'completed', label: 'Completed' }
              ] : [
                'all', 'pending_approval', 'confirmed', 'approved', 'in_progress', 'completed'
              ].map(status => ({ key: status, label: status === 'all' ? 'All' : STATUS_LABELS[status] || status }))).map((status) => (
                <TouchableOpacity
                  key={status.key}
                  style={[
                    s.filterChip,
                    statusFilter === status.key && { backgroundColor: colors.primary },
                    { borderColor: colors.border }
                  ]}
                  onPress={() => setStatusFilter(status.key)}
                >
                  <Text
                    style={[
                      s.filterText,
                      { color: statusFilter === status.key ? '#FFFFFF' : colors.textSecondary }
                    ]}
                  >
                    {status.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Content - Only show meetings of the selected type */}
            <ScrollView
              style={s.scrollView}
              contentContainerStyle={s.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {isLoading ? (
                <View style={s.centerContent}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[s.loadingText, { color: colors.textMuted }]}>Loading {meetingType} meetings...</Text>
                </View>
              ) : error ? (
                <View style={s.centerContent}>
                  <AlertTriangle size={48} color={colors.error} />
                  <Text style={[s.errorText, { color: colors.error }]}>Failed to load {meetingType} meetings</Text>
                </View>
              ) : filteredMeetings.length === 0 ? (
                <View style={s.centerContent}>
                  <Calendar size={64} color={colors.textMuted} />
                  <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>No {meetingType} meetings found</Text>
                  <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
                    {statusFilter === 'all'
                      ? `You haven't been invited to any ${meetingType} meetings yet`
                      : `No ${statusFilter} ${meetingType} meetings found`
                    }
                  </Text>
                  {/* The header already has an "Arrange Offline" button —
                      no second one here to avoid showing the same action twice. */}
                </View>
              ) : (
                <View style={s.meetingsList}>
                  {filteredMeetings.map(renderMeetingCard)}
                </View>
              )}
            </ScrollView>
          </>
        )}
      </View>
  );

  if (embedded) return content;

  return (
    <ScreenWrapper route={ROUTES.MEETINGS} scrollable={false}>
      {content}
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  title: { fontSize: 24, fontWeight: '700' },
  typeBadge: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 7 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },

  filterContainer: {
    flexGrow: 0,
    flexShrink: 0,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 7,
    minHeight: 32,
    justifyContent: 'center',
  },
  filterText: { fontSize: 12, fontWeight: '600' },
  createButton: { minHeight: 36, paddingHorizontal: 14, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  createButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  detailsButton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  detailsButtonText: { fontSize: 12, fontWeight: '600' },

  scrollView: { flex: 1 },
  scrollContent: { padding: 12 },

  centerContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: { fontSize: 16, marginTop: 12 },
  errorText: { fontSize: 16, marginTop: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' },

  meetingsList: { gap: 12 },

  meetingCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  cardHeader: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  meetingTitle: { fontSize: 15, fontWeight: '600', flex: 1 },

  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  availabilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  availabilityText: { fontSize: 11, fontWeight: '600' },

  cardContent: { gap: 6 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: { fontSize: 13, flex: 1 },
  description: { fontSize: 13, marginTop: 6 },

  responseSection: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#FEF9C3',
    borderRadius: 10,
  },
  responseTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  responseButtons: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  responseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    minWidth: 85,
    justifyContent: 'center',
  },
  responseButtonText: { fontSize: 11, fontWeight: '600' },
  availableButton: { backgroundColor: '#DCFCE7' },
  tentativeButton: { backgroundColor: '#FEF3C7' },
  unavailableButton: { backgroundColor: '#FEE2E2' },

  joinButton: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  joinButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});