// @ts-nocheck
/**
 * Admin Portal - Meeting List Screen
 * Displays all meetings with role-based filtering and actions
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
import { Icon, Menu, Divider } from 'react-native-paper';
import ScreenLayout from '../../../navigation/admin/ScreenLayout';
import { useMeetings, useDeleteMeeting, useApproveMeeting } from '../../../hooks/useMeetings';
import { useTheme } from '../../../context/admin/ThemeContext';
import { spacing, radius, shadows } from '../../../theme';
import { formatDateShort, format12Hour } from '../../../utils/dateHelpers';
import { confirmDelete, showError } from '../../../utils/confirmDialog';

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

export default function MeetingListScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [menuVisible, setMenuVisible] = useState<number | null>(null);

  const { data: meetings = [], isLoading, error } = useMeetings({
    status: statusFilter === 'all' ? undefined : statusFilter
  });

  const { mutateAsync: deleteMeeting } = useDeleteMeeting();
  const { mutateAsync: approveMeeting } = useApproveMeeting();

  const filteredMeetings = useMemo(() => {
    return meetings.sort((a, b) => {
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
    navigation.navigate('CreateMeeting');
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
    const colors = STATUS_COLORS[status] || { bg: '#F1F5F9', text: '#64748B' };
    return (
      <View style={[s.statusBadge, { backgroundColor: colors.bg }]}>
        <Text style={[s.statusText, { color: colors.text }]}>
          {STATUS_LABELS[status] || status}
        </Text>
      </View>
    );
  };

  const renderMeetingCard = (meeting: any, index: number) => (
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

        {getStatusBadge(meeting.status)}
      </View>

      <View style={s.cardContent}>
        <View style={s.infoRow}>
          <Icon source="calendar" size={16} color={colors.textMuted} />
          <Text style={[s.infoText, { color: colors.textSecondary }]}>
            {formatDateShort(meeting.scheduled_date)} at {format12Hour(meeting.start_time)}
          </Text>
        </View>

        <View style={s.infoRow}>
          <Icon source="clock-outline" size={16} color={colors.textMuted} />
          <Text style={[s.infoText, { color: colors.textSecondary }]}>
            {meeting.duration_minutes} minutes
          </Text>
        </View>

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

          {meeting.status === 'pending_approval' && (
            <>
              <TouchableOpacity
                style={s.menuItem}
                onPress={() => {
                  setMenuVisible(null);
                  handleApproveMeeting(meeting, 'approve');
                }}
              >
                <Icon source="check" size={18} color="#16A34A" />
                <Text style={[s.menuText, { color: '#16A34A' }]}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.menuItem}
                onPress={() => {
                  setMenuVisible(null);
                  handleApproveMeeting(meeting, 'reject');
                }}
              >
                <Icon source="close" size={18} color="#DC2626" />
                <Text style={[s.menuText, { color: '#DC2626' }]}>Reject</Text>
              </TouchableOpacity>
            </>
          )}

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

  return (
    <ScreenLayout navigation={navigation} activeScreen="Meetings">
      <ScrollView style={s.container} contentContainerStyle={s.scrollContent}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Icon source="calendar-account" size={24} color={colors.primary} />
            <Text style={[s.title, { color: colors.textPrimary }]}>Meeting Management</Text>
          </View>
          <TouchableOpacity
            style={[s.createButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateMeeting}
          >
            <Icon source="plus" size={20} color="#FFFFFF" />
            <Text style={s.createButtonText}>Create Meeting</Text>
          </TouchableOpacity>
        </View>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterContainer}>
          {['all', 'pending_approval', 'approved', 'in_progress', 'completed'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                s.filterChip,
                statusFilter === status && { backgroundColor: colors.primary },
                { borderColor: colors.border }
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  s.filterText,
                  { color: statusFilter === status ? '#FFFFFF' : colors.textSecondary }
                ]}
              >
                {status === 'all' ? 'All' : STATUS_LABELS[status]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Content */}
        {isLoading ? (
          <View style={s.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[s.loadingText, { color: colors.textMuted }]}>Loading meetings...</Text>
          </View>
        ) : error ? (
          <View style={s.centerContent}>
            <Icon source="alert-circle" size={48} color={colors.error} />
            <Text style={[s.errorText, { color: colors.error }]}>Failed to load meetings</Text>
          </View>
        ) : filteredMeetings.length === 0 ? (
          <View style={s.centerContent}>
            <Icon source="calendar-blank" size={64} color={colors.textMuted} />
            <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>No meetings found</Text>
            <Text style={[s.emptySubtitle, { color: colors.textMuted }]}>
              {statusFilter === 'all'
                ? 'Create your first meeting to get started'
                : `No ${STATUS_LABELS[statusFilter]?.toLowerCase()} meetings`
              }
            </Text>
            <TouchableOpacity
              style={[s.emptyButton, { borderColor: colors.primary }]}
              onPress={handleCreateMeeting}
            >
              <Text style={[s.emptyButtonText, { color: colors.primary }]}>Create Meeting</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.meetingsList}>
            {filteredMeetings.map(renderMeetingCard)}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  title: { fontSize: 24, fontWeight: '700' },

  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  createButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  filterContainer: {
    marginBottom: spacing.lg,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  filterText: { fontSize: 14, fontWeight: '500' },

  centerContent: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: { fontSize: 16, marginTop: 12 },
  errorText: { fontSize: 16, marginTop: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  emptyButton: {
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginTop: 16,
  },
  emptyButtonText: { fontSize: 14, fontWeight: '600' },

  meetingsList: { gap: spacing.md },

  meetingCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    position: 'relative',
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
  meetingTitle: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: spacing.sm },
  menuButton: { padding: 4 },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  statusText: { fontSize: 12, fontWeight: '600' },

  cardContent: { gap: spacing.xs },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoText: { fontSize: 14, flex: 1 },
  description: { fontSize: 14, marginTop: spacing.xs },

  actionMenu: {
    position: 'absolute',
    top: 50,
    right: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    minWidth: 150,
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
  menuText: { fontSize: 14, fontWeight: '500' },
});