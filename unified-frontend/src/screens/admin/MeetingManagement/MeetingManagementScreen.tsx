// @ts-nocheck
/**
 * Admin Portal - Meeting Management Screen
 * Displays meetings with admin-level filtering and controls
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Icon, FAB, Menu, Divider } from 'react-native-paper';
import ScreenLayout from '../../../navigation/admin/ScreenLayout';
import { useMeetings, useDeleteMeeting, useApproveMeeting } from '../../../hooks/useMeetings';
import { useAuth } from '../../../context/admin/AuthContext';
import { useTheme } from '../../../context/admin/ThemeContext';
import { shadows, spacing, radius } from '../../../theme';
import { formatDateShort, format12Hour } from '../../../utils/dateHelpers';
import { confirmDelete, showError, showSuccess } from '../../../utils/confirmDialog';
import MeetingTypeSelector from '../../../components/meeting/MeetingTypeSelector';
import OfflineMeetingForm from '../../../components/meeting/OfflineMeetingForm';

const STATUS_COLORS = {
  pending_availability: { bg: '#FEF3C7', text: '#F59E0B' },
  pending_approval: { bg: '#FEF9C3', text: '#CA8A04' },
  confirmed: { bg: '#DCFCE7', text: '#16A34A' },
  rejected: { bg: '#FEE2E2', text: '#DC2626' },
  in_progress: { bg: '#DBEAFE', text: '#2563EB' },
  completed: { bg: '#F3E8FF', text: '#9333EA' },
  cancelled: { bg: '#F1F5F9', text: '#64748B' },
  missed: { bg: '#FEE2E2', text: '#B91C1C' },
};

const STATUS_LABELS = {
  pending_availability: 'Pending Availability',
  pending_approval: 'Pending Approval',
  confirmed: 'Confirmed',
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

// embedded: true when rendered as a tab inside the My Schedules / Meeting
// Management combined screen (skips its own ScreenLayout/sidebar, since the
// parent already provides one).
export default function MeetingManagementScreen({ navigation, embedded = false }: { navigation: any; embedded?: boolean }) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [menuVisible, setMenuVisible] = useState<number | null>(null);
  const [meetingType, setMeetingType] = useState<'online' | 'offline'>('online');
  const [showOfflineForm, setShowOfflineForm] = useState(false);

  // Admin can see all meetings - don't pass status to API, filter in frontend
  const { data: meetings = [], isLoading, error, refetch } = useMeetings({ meeting_type: meetingType });

  const { mutateAsync: deleteMeeting } = useDeleteMeeting();
  const { mutateAsync: approveMeeting } = useApproveMeeting();

  const filteredMeetings = useMemo(() => {
    let filtered = meetings;

    // Apply status filter - "All" should show all non-deleted meetings
    if (statusFilter !== 'all') {
      filtered = meetings.filter(meeting => {
        // "Pending" also surfaces missed meetings (confirmed, online, scheduled
        // time already passed, never started) — those never happened and
        // otherwise sit silently under "Confirmed" forever.
        if (statusFilter === 'pending_approval') {
          return ['pending_approval', 'pending_availability'].includes(meeting.status) || isMissedMeeting(meeting);
        }
        const statusMap = {
          'confirmed': ['confirmed'],
          'in_progress': ['in_progress'],
          'completed': ['completed']
        };

        const mappedStatuses = statusMap[statusFilter];
        return mappedStatuses ? mappedStatuses.includes(meeting.status) : meeting.status === statusFilter;
      });
    }

    return filtered.sort((a, b) => {
      // Sort by date desc, then by status priority
      if (a.scheduled_date !== b.scheduled_date) {
        return b.scheduled_date.localeCompare(a.scheduled_date);
      }
      const statusPriority = {
        pending_availability: 1,
        pending_approval: 2,
        confirmed: 3,
        in_progress: 4,
        completed: 5,
        rejected: 6,
        cancelled: 7
      };
      return (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
    });
  }, [meetings, statusFilter]);

  const handleCreateMeeting = () => {
    if (meetingType === 'offline') setShowOfflineForm(true);
    else navigation.navigate('CreateMeeting');
  };

  const handleMeetingPress = (meeting: any) => {
    navigation.navigate('MeetingDetails', { meetingId: meeting.meeting_id });
  };

  const handleEditMeeting = (meeting: any) => {
    if (['completed', 'cancelled', 'in_progress'].includes(meeting.status)) {
      showError('Cannot Edit', 'Cannot edit meeting in current status');
      return;
    }
    navigation.navigate('EditMeeting', { meetingId: meeting.meeting_id });
  };

  const handleDeleteMeeting = (meeting: any) => {
    confirmDelete(
      'Delete Meeting',
      `Delete "${meeting.title}"? This action cannot be undone.`,
      async () => {
        try {
          await deleteMeeting(meeting.meeting_id);
        } catch (error: any) {
          showError('Error', error.message || 'Failed to delete meeting');
        }
      }
    );
  };

  const handleApproveMeeting = async (meeting: any, action: 'approve' | 'reject') => {
    try {
      await approveMeeting({ id: meeting.meeting_id, action });
      showSuccess('Success', `Meeting ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
    } catch (error: any) {
      showError('Error', error.message || `Failed to ${action} meeting`);
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

  const renderMeetingCard = (meeting: any, index: number) => {
    // user_pending_approvals is scoped to approvals actually assigned to the
    // viewing admin — meeting.pending_approvals (global count) would also be
    // true for a Faculty -> HOD submission where the HOD, not Admin, is the
    // real approver.
    const canApprove = meeting.status === 'pending_approval' && Number(meeting.user_pending_approvals) > 0;

    return (
      <TouchableOpacity
        key={meeting.meeting_id}
        style={[s.meetingCard, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}
        onPress={() => handleMeetingPress(meeting)}
      >
        <View style={s.cardHeader}>
          <View style={s.titleRow}>
            <Text style={[s.meetingTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {meeting.title}
            </Text>
            <TouchableOpacity
              onPress={() => setMenuVisible(menuVisible === index ? null : index)}
              style={s.menuButton}
            >
              <Icon source="dots-vertical" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {getStatusBadge(isMissedMeeting(meeting) ? 'missed' : meeting.status)}
        </View>

        <View style={s.cardContent}>
          <View style={[s.typeBadge, { backgroundColor: meeting.meeting_type === 'offline' ? '#ECFDF5' : '#EFF6FF' }]}>
            <Text style={[s.typeBadgeText, { color: meeting.meeting_type === 'offline' ? '#047857' : '#1D4ED8' }]}>{meeting.meeting_type === 'offline' ? 'Offline' : 'Online'}</Text>
          </View>
          <View style={s.infoRow}>
            <Icon source="calendar" size={16} color={colors.textMuted} />
            <Text style={[s.infoText, { color: colors.textSecondary }]}>
              {formatDateShort(meeting.scheduled_date)} at {format12Hour(meeting.start_time)}
            </Text>
          </View>

          {meeting.duration_minutes ? <View style={s.infoRow}>
            <Icon source="clock-outline" size={16} color={colors.textMuted} />
            <Text style={[s.infoText, { color: colors.textSecondary }]}>
              {meeting.duration_minutes} minutes
            </Text>
          </View> : null}

          {meeting.meeting_type === 'offline' && meeting.location ? <View style={s.infoRow}>
            <Icon source="map-marker" size={16} color={colors.textMuted} />
            <Text style={[s.infoText, { color: colors.textSecondary }]} numberOfLines={1}>{meeting.location}</Text>
          </View> : null}

          <View style={s.infoRow}>
            <Icon source="domain" size={16} color={colors.textMuted} />
            <Text style={[s.infoText, { color: colors.textSecondary }]}>
              {meeting.department_code || 'All Departments'}
            </Text>
          </View>

          <View style={s.infoRow}>
            <Icon source="account-group" size={16} color={colors.textMuted} />
            <Text style={[s.infoText, { color: colors.textSecondary }]}>
              {meeting.participant_count || 0} participants
            </Text>
          </View>

          <View style={s.infoRow}>
            <Icon source="account-tie" size={16} color={colors.textMuted} />
            <Text style={[s.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
              Created by {meeting.created_by_name || 'Creator unavailable'}
            </Text>
          </View>

          {meeting.description && (
            <Text style={[s.description, { color: colors.textMuted }]} numberOfLines={2}>
              {meeting.description}
            </Text>
          )}

          {canApprove && (
            <View style={s.approvalActions}>
              <Text style={[s.approvalText, { color: colors.textSecondary }]}>
                Requires approval as Admin
              </Text>
              <View style={s.approvalButtons}>
                <TouchableOpacity
                  style={[s.approveButton, { backgroundColor: '#DCFCE7' }]}
                  onPress={() => handleApproveMeeting(meeting, 'approve')}
                >
                  <Icon source="check" size={16} color="#16A34A" />
                  <Text style={[s.approveButtonText, { color: '#16A34A' }]}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.rejectButton, { backgroundColor: '#FEE2E2' }]}
                  onPress={() => handleApproveMeeting(meeting, 'reject')}
                >
                  <Icon source="close" size={16} color="#DC2626" />
                  <Text style={[s.rejectButtonText, { color: '#DC2626' }]}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Action Menu */}
        {menuVisible === index && (
          <View style={[s.actionMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              style={s.menuItem}
              onPress={() => {
                setMenuVisible(null);
                handleEditMeeting(meeting);
              }}
            >
              <Icon source="pencil" size={18} color={colors.primary} />
              <Text style={[s.menuText, { color: colors.primary }]}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.menuItem}
              onPress={() => {
                setMenuVisible(null);
                handleMeetingPress(meeting);
              }}
            >
              <Icon source="eye" size={18} color={colors.textSecondary} />
              <Text style={[s.menuText, { color: colors.textSecondary }]}>View Details</Text>
            </TouchableOpacity>

            <Divider />
            <TouchableOpacity
              style={s.menuItem}
              onPress={() => {
                setMenuVisible(null);
                handleDeleteMeeting(meeting);
              }}
            >
              <Icon source="delete" size={18} color="#DC2626" />
              <Text style={[s.menuText, { color: '#DC2626' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const content = (
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Icon source="calendar-account" size={24} color={colors.primary} />
            <Text style={[s.title, { color: colors.textPrimary }]}>Meeting Management</Text>
          </View>
        </View>

        <MeetingTypeSelector value={meetingType} onChange={(type) => { setMeetingType(type); setShowOfflineForm(false); }} colors={colors} />

        {meetingType === 'offline' && showOfflineForm ? (
          <OfflineMeetingForm
            colors={colors}
            onCancel={() => setShowOfflineForm(false)}
            onCreated={(meeting) => {
              setShowOfflineForm(false);
              navigation.navigate('MeetingDetails', { meetingId: meeting.meeting_id });
            }}
          />
        ) : (
          <>
            {/* Status Filter - Only show for the selected meeting type */}
            <View style={s.filterTabContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterTabContent}
              >
                {/* Offline meetings never go through approval, so there's no
                    "Pending" state for them to filter by. */}
                {(meetingType === 'offline' ? [
                  { key: 'all', label: 'All' },
                  { key: 'confirmed', label: 'Confirmed' },
                  { key: 'in_progress', label: 'Active' },
                  { key: 'completed', label: 'Completed' }
                ] : [
                  { key: 'all', label: 'All' },
                  { key: 'pending_approval', label: 'Pending' },
                  { key: 'confirmed', label: 'Confirmed' },
                  { key: 'in_progress', label: 'Active' },
                  { key: 'completed', label: 'Completed' }
                ]).map((filter) => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      s.filterTab,
                      statusFilter === filter.key && s.filterTabActive,
                      { borderBottomColor: statusFilter === filter.key ? colors.primary : 'transparent' }
                    ]}
                    onPress={() => setStatusFilter(filter.key)}
                  >
                    <Text
                      style={[
                        s.filterTabText,
                        { color: statusFilter === filter.key ? colors.primary : colors.textSecondary }
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

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
                  <Icon source="alert-circle" size={48} color={colors.error} />
                  <Text style={[s.errorText, { color: colors.error }]}>Failed to load {meetingType} meetings</Text>
                  <Text style={[s.errorSubtext, { color: colors.textMuted }]}>Please check your connection and try again</Text>
                  <TouchableOpacity
                    style={[s.retryButton, { backgroundColor: colors.primary }]}
                    onPress={() => refetch()}
                  >
                    <Icon source="refresh" size={20} color="#FFFFFF" />
                    <Text style={s.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : filteredMeetings.length === 0 ? (
                <View style={s.centerContent}>
                  <Icon source="calendar-blank" size={64} color={colors.textMuted} />
                  <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>No {meetingType} meetings found</Text>
                  <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
                    {statusFilter === 'all'
                      ? `Create your first ${meetingType} meeting to get started`
                      : `No ${statusFilter === 'pending_approval' || statusFilter === 'pending' ? 'pending' : statusFilter === 'confirmed' ? 'confirmed' : statusFilter === 'in_progress' ? 'active' : statusFilter} ${meetingType} meetings found`
                    }
                  </Text>
                  {meetingType === 'offline' && (
                    <TouchableOpacity
                      style={[s.emptyButton, { backgroundColor: colors.primary }]}
                      onPress={() => setShowOfflineForm(true)}
                    >
                      <Icon source="calendar-plus" size={20} color="#FFFFFF" />
                      <Text style={[s.emptyButtonText, { color: '#FFFFFF' }]}>Arrange Offline Meeting</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={s.meetingsList}>
                  {filteredMeetings.map(renderMeetingCard)}
                </View>
              )}
            </ScrollView>

            {/* FAB — suppressed when the offline empty state already shows
                its own "Arrange Offline Meeting" button, to avoid showing
                the same action twice on screen. */}
            {!(meetingType === 'offline' && filteredMeetings.length === 0) && (
              <FAB
                icon="plus"
                style={[s.fab, { backgroundColor: colors.primary }]}
                onPress={handleCreateMeeting}
                label={meetingType === 'offline' ? 'Arrange Offline Meeting' : 'Create Meeting'}
              />
            )}
          </>
        )}
      </View>
  );

  if (embedded) return content;

  return (
    <ScreenLayout navigation={navigation} activeScreen="MySchedules">
      {content}
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  title: { fontSize: 24, fontWeight: '700' },
  typeBadge: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, marginBottom: spacing.sm },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },

  // New Filter Tab Styles
  filterTabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: spacing.md,
  },
  filterTabContent: {
    paddingHorizontal: spacing.lg,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomWidth: 3,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.md },

  centerContent: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: { fontSize: 16, marginTop: spacing.md },
  errorText: { fontSize: 16, marginTop: spacing.md },
  errorSubtext: { fontSize: 14, marginTop: spacing.xs, textAlign: 'center' },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: spacing.lg },
  emptySubtitle: { fontSize: 14, marginTop: spacing.sm, textAlign: 'center' },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  meetingsList: { gap: spacing.md },

  // Improved Meeting Card Styles
  meetingCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  meetingTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
    lineHeight: 20,
  },
  menuButton: { padding: 4 },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '600' },

  cardContent: { gap: spacing.xs },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
    color: '#64748B',
  },
  description: {
    fontSize: 13,
    marginTop: spacing.xs,
    color: '#64748B',
    lineHeight: 18,
  },

  approvalActions: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#FEF9C3',
    borderRadius: radius.sm,
  },
  approvalText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.xs,
    flex: 1,
    justifyContent: 'center',
  },
  approveButtonText: { fontSize: 12, fontWeight: '600' },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.xs,
    flex: 1,
    justifyContent: 'center',
  },
  rejectButtonText: { fontSize: 12, fontWeight: '600' },

  actionMenu: {
    position: 'absolute',
    top: 40,
    right: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    minWidth: 140,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  menuText: { fontSize: 13, fontWeight: '500' },

  fab: {
    position: 'absolute',
    margin: spacing.lg,
    right: 0,
    bottom: 0,
  },
});