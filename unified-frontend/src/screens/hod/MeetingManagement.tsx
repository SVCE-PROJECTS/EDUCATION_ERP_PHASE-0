// @ts-nocheck
/**
 * HOD Portal - Meeting Management Screen
 * Displays meetings for HOD with department filtering and approval actions
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Icon, Menu, Divider, FAB } from 'react-native-paper';
import ScreenWrapper from '../../layouts/hod/ScreenWrapper';
import { useMeetings, useDeleteMeeting, useApproveMeeting } from '../../hooks/useMeetings';
import { useAuth } from '../../context/hod/AuthContext';
import { useTheme } from '../../context/hod/ThemeContext';
import { shadows } from '../../theme/hod/colors';
import { ROUTES } from '../../navigation/hod/routes';
import { formatDateShort, format12Hour } from '../../utils/dateHelpers';
import { confirmDelete, showError } from '../../utils/confirmDialog';
import MeetingTypeSelector from '../../components/meeting/MeetingTypeSelector';
import OfflineMeetingForm from '../../components/meeting/OfflineMeetingForm';

const STATUS_COLORS = {
  pending_approval: { bg: '#FEF9C3', text: '#CA8A04' },
  approved: { bg: '#DCFCE7', text: '#16A34A' },
  rejected: { bg: '#FEE2E2', text: '#DC2626' },
  in_progress: { bg: '#DBEAFE', text: '#2563EB' },
  completed: { bg: '#F3E8FF', text: '#9333EA' },
  cancelled: { bg: '#F1F5F9', text: '#64748B' },
};

const STATUS_LABELS = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function MeetingManagement({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [menuVisible, setMenuVisible] = useState<number | null>(null);
  const [meetingType, setMeetingType] = useState<'online' | 'offline'>('online');
  const [showOfflineForm, setShowOfflineForm] = useState(false);

  // Fetch meetings for HOD's department
  const { data: meetings = [], isLoading, error } = useMeetings({
    status: statusFilter === 'all' ? undefined : statusFilter,
    department_code: user?.departmentCode,
    meeting_type: meetingType,
  });

  const { mutateAsync: deleteMeeting } = useDeleteMeeting();
  const { mutateAsync: approveMeeting } = useApproveMeeting();

  const filteredMeetings = useMemo(() => {
    return [...meetings].sort((a, b) => { // Create copy to avoid mutating React Query cache
      // Sort by date desc, then by status priority
      if (a.scheduled_date !== b.scheduled_date) {
        return b.scheduled_date.localeCompare(a.scheduled_date);
      }
      const statusPriority = {
        pending_approval: 1,
        approved: 2,
        in_progress: 3,
        completed: 4,
        rejected: 5,
        cancelled: 6
      };
      return (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
    });
  }, [meetings]);

  const handleCreateMeeting = () => {
    if (meetingType === 'offline') setShowOfflineForm(true);
    else navigation.navigate('CreateMeeting');
  };

  const handleMeetingPress = (meeting: any) => {
    navigation.navigate('MeetingDetails', { meetingId: meeting.meeting_id });
  };

  const handleEditMeeting = (meeting: any) => {
    if (['completed', 'cancelled', 'in_progress'].includes(meeting.status)) {
      Alert.alert('Cannot Edit', 'Cannot edit meeting in current status');
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
    const isCreator = String(meeting.created_by_employee_id ?? meeting.created_by ?? '') === String(user?.id ?? '');
    const canApprove = meeting.status === 'pending_approval' && Number(meeting.user_pending_approvals) > 0 && !isCreator;

    return (
      <TouchableOpacity
        key={meeting.meeting_id}
        style={[s.meetingCard, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.card }]}
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

          {getStatusBadge(meeting.status)}
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

          {meeting.location && (
            <View style={s.infoRow}>
              <Icon source="map-marker" size={16} color={colors.textMuted} />
              <Text style={[s.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
                {meeting.location}
              </Text>
            </View>
          )}

          <View style={s.infoRow}>
            <Icon source="account-group" size={16} color={colors.textMuted} />
            <Text style={[s.infoText, { color: colors.textSecondary }]}>
              {meeting.participant_count || 0} participants
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
                Requires your approval
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
            {isCreator && (
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
            )}

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

            {isCreator && (
              <>
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
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper route={ROUTES.HOD_MEETINGS} scrollable={false}>
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
                style={s.filterScrollView}
              >
                {(meetingType === 'offline' ? [
                  { key: 'all', label: 'All' },
                  { key: 'pending', label: 'Pending' },
                  { key: 'confirmed', label: 'Confirmed' },
                  { key: 'in_progress', label: 'Active' },
                  { key: 'completed', label: 'Completed' }
                ] : [
                  { key: 'all', label: 'All' },
                  { key: 'pending_approval', label: 'Pending' },
                  { key: 'approved', label: 'Approved' },
                  { key: 'in_progress', label: 'Active' },
                  { key: 'completed', label: 'Completed' }
                ]).map((filter) => (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      s.filterTab,
                      statusFilter === filter.key && s.filterTabActive,
                      {
                        backgroundColor: statusFilter === filter.key ? colors.primary : 'transparent',
                        borderColor: statusFilter === filter.key ? colors.primary : colors.border
                      }
                    ]}
                    onPress={() => setStatusFilter(filter.key)}
                  >
                    <Text
                      style={[
                        s.filterTabText,
                        { color: statusFilter === filter.key ? '#FFFFFF' : colors.textSecondary }
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
                </View>
              ) : filteredMeetings.length === 0 ? (
                <View style={s.centerContent}>
                  <Icon source="calendar-blank" size={64} color={colors.textMuted} />
                  <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>No {meetingType} meetings found</Text>
                  <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
                    {statusFilter === 'all'
                      ? `Create your first ${meetingType} meeting to get started`
                      : `No ${statusFilter === 'pending_approval' || statusFilter === 'pending' ? 'pending' : statusFilter === 'approved' ? 'approved' : statusFilter === 'in_progress' ? 'active' : statusFilter} ${meetingType} meetings`
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

            {/* FAB - Different labels for different types */}
            <FAB
              icon="plus"
              style={[s.fab, { backgroundColor: colors.primary }]}
              onPress={handleCreateMeeting}
              label={meetingType === 'offline' ? 'Arrange Offline Meeting' : 'Create Meeting'}
            />
          </>
        )}
      </View>
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
  typeBadge: { alignSelf: 'flex-start', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 6 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },

  // New Filter Tab Styles
  filterTabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  filterScrollView: {
    maxHeight: 50, // Constrain height
  },
  filterTabContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    // Active state handled in component with backgroundColor
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Remove old filter styles
  filterContainer: {
    // Remove this old style
  },
  filterChip: {
    // Remove this old style
  },
  filterText: {
    // Remove this old style
  },

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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  meetingsList: { gap: 12 },

  meetingCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    position: 'relative',
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
  meetingTitle: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  menuButton: { padding: 2 },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: { fontSize: 11, fontWeight: '600' },

  cardContent: { gap: 6 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: { fontSize: 13, flex: 1 },
  description: { fontSize: 13, marginTop: 6 },

  approvalActions: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#FEF9C3',
    borderRadius: 10,
  },
  approvalText: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  approvalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
  },
  approveButtonText: { fontSize: 13, fontWeight: '600' },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
  },
  rejectButtonText: { fontSize: 13, fontWeight: '600' },

  actionMenu: {
    position: 'absolute',
    top: 40,
    right: 12,
    borderRadius: 10,
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
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuText: { fontSize: 13, fontWeight: '500' },

  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});