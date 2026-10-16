// @ts-nocheck
/**
 * Admin Portal - Meeting Details Screen
 * Shows detailed meeting information with admin controls
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { Icon, TextInput, Button } from 'react-native-paper';
import ScreenLayout from '../../../navigation/admin/ScreenLayout';
import {
  useMeetingById,
  useApproveMeeting,
  useStartMeeting,
  useCompleteMeeting,
  useSaveMeetingMinutes,
  useMeetingMinutes,
  useUploadDocument,
  useMeetingDocuments
} from '../../../hooks/useMeetings';
import { useAuth } from '../../../context/admin/AuthContext';
import { useTheme } from '../../../context/admin/ThemeContext';
import { showError, showSuccess } from '../../../utils/confirmDialog';
import { shadows, spacing, radius } from '../../../theme';
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

export default function MeetingDetailsScreen({ route, navigation }: { route: any; navigation: any }) {
  const { meetingId } = route.params;
  const { colors } = useTheme();
  const { user } = useAuth();

  const { data: meeting, isLoading, error } = useMeetingById(meetingId);
  const { data: meetingMinutes } = useMeetingMinutes(meetingId);
  const { data: documents } = useMeetingDocuments(meetingId);

  const { mutateAsync: approveMeeting } = useApproveMeeting();
  const { mutateAsync: startMeeting } = useStartMeeting();
  const { mutateAsync: completeMeeting } = useCompleteMeeting();
  const { mutateAsync: saveMeetingMinutes } = useSaveMeetingMinutes();
  const { mutateAsync: uploadDocument } = useUploadDocument();

  // Meeting Summary State
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSavingSummary, setIsSavingSummary] = useState(false);

  // Initialize summary from existing minutes
  useEffect(() => {
    if (meetingMinutes?.minutes) {
      setSummary(meetingMinutes.minutes.summary || meetingMinutes.minutes.content || '');
    }
  }, [meetingMinutes]);

  const handleApprove = async (action: 'approve' | 'reject') => {
    try {
      await approveMeeting({ id: meetingId, action });
      showSuccess('Success', `Meeting ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
    } catch (error: any) {
      showError('Error', error.message || `Failed to ${action} meeting`);
    }
  };

  const handleStartMeeting = async () => {
    if (meeting?.meeting_type === 'offline') return;
    try {
      const result = await startMeeting(meetingId);

      // Open the effective meeting link (external link if the creator
      // supplied one, otherwise the generated Jitsi URL)
      const meetingUrl = result.effective_meeting_url || result.meeting_url || meeting?.effective_meeting_url || meeting?.meeting_url;
      if (meetingUrl) {
        if (Platform.OS === 'web') {
          window.open(meetingUrl, '_blank', 'noopener,noreferrer');
        } else {
          // For mobile, you might want to use Linking.openURL
          Alert.alert('Meeting Started', `Meeting URL: ${meetingUrl}`, [
            { text: 'Copy URL', onPress: () => console.log('Copy:', meetingUrl) },
            { text: 'OK' }
          ]);
        }
        showSuccess('Success', 'Meeting started successfully and opened in new tab');
      } else {
        showSuccess('Meeting Started', 'Meeting status updated to In Progress');
      }
    } catch (error: any) {
      showError('Error', error.message || 'Failed to start meeting');
    }
  };

  const handleOpenMeetingLink = () => {
    const meetingUrl = meeting?.effective_meeting_url || meeting?.meeting_url;
    if (!meetingUrl) {
      showError('No Meeting URL', 'Meeting URL not available');
      return;
    }

    if (Platform.OS === 'web') {
      window.open(meetingUrl, '_blank', 'noopener,noreferrer');
    } else {
      Alert.alert('Meeting URL', meetingUrl, [
        { text: 'Copy URL', onPress: () => console.log('Copy:', meetingUrl) },
        { text: 'OK' }
      ]);
    }
  };

  const handleCompleteMeeting = async () => {
    try {
      await completeMeeting(meetingId);
      showSuccess('Success', 'Meeting marked as completed');
    } catch (error: any) {
      showError('Error', error.message || 'Failed to complete meeting');
    }
  };

  const handleSaveSummary = async () => {
    if (!summary.trim()) {
      showError('Validation Error', 'Please enter a meeting summary');
      return;
    }

    setIsSavingSummary(true);
    try {
      // No real attendance-tracking mechanism exists for meetings, so this
      // no longer invents a "present" status for every participant — the
      // summary itself (content) is the only thing actually being recorded.
      await saveMeetingMinutes({
        id: meetingId,
        content: summary.trim(),
      });

      showSuccess('Success', 'Meeting summary saved successfully');
      setShowSummaryModal(false);
    } catch (error: any) {
      showError('Error', error.message || 'Failed to save meeting summary');
    } finally {
      setIsSavingSummary(false);
    }
  };

  const handleFileUpload = async () => {
    // For web, we'll use a file input
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png';
      input.onchange = async (event: any) => {
        const file = event.target.files?.[0];
        if (file) {
          try {
            await uploadDocument({
              id: meetingId,
              file,
              documentType: 'attachment',
              description: 'Meeting attachment'
            });
            showSuccess('Success', 'File uploaded successfully');
          } catch (error: any) {
            showError('Error', error.message || 'Failed to upload file');
          }
        }
      };
      input.click();
    } else {
      Alert.alert('File Upload', 'File upload not implemented for mobile yet');
    }
  };

  // The backend now resolves created_by_name for every requester (faculty,
  // HOD, or admin — via COALESCE(f.name, u.username)), so a missing value
  // here means the creator record genuinely can't be resolved (e.g. a
  // deleted account) — never substitute the current viewer's own name.
  const getCreatorDisplay = () => meeting?.created_by_name || 'Creator unavailable';

  const getStatusBadge = (status: string) => {
    const statusColors = STATUS_COLORS[status] || { bg: '#F1F5F9', text: '#64748B' };
    return (
      <View style={[s.statusBadge, { backgroundColor: statusColors.bg }]}>
        <Text style={[s.statusText, { color: statusColors.text }]}>
          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <ScreenLayout navigation={navigation} activeScreen="MeetingDetails">
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[s.loadingText, { color: colors.textMuted }]}>Loading meeting details...</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (error || !meeting) {
    return (
      <ScreenLayout navigation={navigation} activeScreen="MeetingDetails">
        <View style={s.centerContent}>
          <Icon source="alert-circle" size={48} color={colors.error} />
          <Text style={[s.errorText, { color: colors.error }]}>Failed to load meeting details</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backButton}>
            <Text style={[s.backButtonText, { color: colors.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenLayout>
    );
  }

  // Admin is not a blanket approver for every meeting — only for the ones
  // where Admin is the actual designated approver (e.g. HOD -> Admin
  // submissions). A Faculty -> HOD submission's approver is the HOD, and
  // must stay theirs to decide.
  const canApprove = meeting.status === 'pending_approval' && meeting.approvals?.some(
    (approval: any) => approval.approval_status === 'pending' && String(approval.approver_user_id ?? '') === String(user?.id ?? '')
  );
  const canStart = meeting.status === 'confirmed' && meeting.meeting_type !== 'offline';
  const canComplete = meeting.status === 'in_progress';

  return (
    <ScreenLayout navigation={navigation} activeScreen="MeetingDetails">
      <ScrollView style={s.container} contentContainerStyle={s.scrollContent}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={navigation.goBack} style={s.backButton}>
            <Icon source="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.textPrimary }]}>Meeting Details</Text>
        </View>

        {/* Meeting Info Card */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
          <View style={s.cardHeader}>
            <Text style={[s.meetingTitle, { color: colors.textPrimary }]}>{meeting.title}</Text>
            {getStatusBadge(meeting.status)}
          </View>

          {meeting.description && (
            <Text style={[s.description, { color: colors.textSecondary }]}>
              {meeting.description}
            </Text>
          )}

          <View style={s.infoGrid}>
            <View style={s.infoRow}>
              <Icon source="calendar" size={20} color={colors.textMuted} />
              <Text style={[s.infoLabel, { color: colors.textMuted }]}>Date</Text>
              <Text style={[s.infoValue, { color: colors.textPrimary }]}>
                {formatDateLong(meeting.scheduled_date)}
              </Text>
            </View>

            <View style={s.infoRow}>
              <Icon source="clock-outline" size={20} color={colors.textMuted} />
              <Text style={[s.infoLabel, { color: colors.textMuted }]}>Time</Text>
              <Text style={[s.infoValue, { color: colors.textPrimary }]}>
                {format12Hour(meeting.start_time)}
              </Text>
            </View>

            <View style={s.infoRow}>
              <Icon source={meeting.meeting_type === 'offline' ? 'map-marker' : 'video'} size={20} color={colors.textMuted} />
              <Text style={[s.infoLabel, { color: colors.textMuted }]}>Type</Text>
              <Text style={[s.infoValue, { color: colors.textPrimary }]}>{meeting.meeting_type === 'offline' ? 'Offline' : 'Online'}</Text>
            </View>

            {meeting.meeting_type === 'offline' && meeting.location ? (
              <View style={s.infoRow}>
                <Icon source="map-marker" size={20} color={colors.textMuted} />
                <Text style={[s.infoLabel, { color: colors.textMuted }]}>Venue</Text>
                <Text style={[s.infoValue, { color: colors.textPrimary }]}>{meeting.location}</Text>
              </View>
            ) : null}

            {meeting.duration_minutes ? <View style={s.infoRow}>
              <Icon source="timer" size={20} color={colors.textMuted} />
              <Text style={[s.infoLabel, { color: colors.textMuted }]}>Duration</Text>
              <Text style={[s.infoValue, { color: colors.textPrimary }]}>
                {meeting.duration_minutes} minutes
              </Text>
            </View> : null}

            <View style={s.infoRow}>
              <Icon source="domain" size={20} color={colors.textMuted} />
              <Text style={[s.infoLabel, { color: colors.textMuted }]}>Department</Text>
              <Text style={[s.infoValue, { color: colors.textPrimary }]}>
                {meeting.department_code || 'All Departments'}
              </Text>
            </View>

            <View style={s.infoRow}>
              <Icon source="account-tie" size={20} color={colors.textMuted} />
              <Text style={[s.infoLabel, { color: colors.textMuted }]}>Created by</Text>
              <Text style={[s.infoValue, { color: colors.textPrimary }]}>
                {getCreatorDisplay()}
              </Text>
            </View>

            {(meeting.effective_meeting_url || meeting.meeting_url) && (
              <View style={s.infoRow}>
                <Icon source="video" size={20} color={colors.textMuted} />
                <Text style={[s.infoLabel, { color: colors.textMuted }]}>Meeting Link</Text>
                <TouchableOpacity onPress={handleOpenMeetingLink}>
                  <Text style={[s.linkText, { color: colors.primary }]}>
                    {meeting.external_meeting_url ? 'Open meeting link' : 'Click to open Jitsi meeting'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Participants */}
        {meeting.participants && meeting.participants.length > 0 && (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
              Participants ({meeting.participants.length})
            </Text>
            {meeting.participants.map((participant: any, index: number) => (
              <View key={index} style={s.participantRow}>
                <Icon source="account" size={20} color={colors.textMuted} />
                <View style={s.participantInfo}>
                  <Text style={[s.participantName, { color: colors.textPrimary }]}>
                    {participant.participant_name || participant.name}
                  </Text>
                  <Text style={[s.participantDetails, { color: colors.textMuted }]}>
                    {participant.designation} • {participant.availability_status || 'pending'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Approvals */}
        {meeting.approvals && meeting.approvals.length > 0 && (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
              Approvals ({meeting.approvals.length})
            </Text>
            {meeting.approvals.map((approval: any, index: number) => (
              <View key={index} style={s.approvalRow}>
                <Icon
                  source={
                    approval.approval_status === 'approved' ? 'check-circle' :
                    approval.approval_status === 'rejected' ? 'close-circle' : 'clock'
                  }
                  size={20}
                  color={
                    approval.approval_status === 'approved' ? '#16A34A' :
                    approval.approval_status === 'rejected' ? '#DC2626' : colors.textMuted
                  }
                />
                <View style={s.approvalInfo}>
                  <Text style={[s.approverName, { color: colors.textPrimary }]}>
                    {approval.approver_name}
                  </Text>
                  <Text style={[s.approvalStatus, { color: colors.textMuted }]}>
                    Status: {approval.approval_status}
                  </Text>
                  {approval.rejection_reason && (
                    <Text style={[s.rejectionReason, { color: colors.error }]}>
                      Reason: {approval.rejection_reason}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Admin Actions */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Admin Actions</Text>

          {canApprove && (
            <View style={s.actionButtons}>
              <TouchableOpacity
                style={[s.approveButton, { backgroundColor: '#DCFCE7' }]}
                onPress={() => handleApprove('approve')}
              >
                <Icon source="check" size={20} color="#16A34A" />
                <Text style={[s.actionButtonText, { color: '#16A34A' }]}>Approve Meeting</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.rejectButton, { backgroundColor: '#FEE2E2' }]}
                onPress={() => handleApprove('reject')}
              >
                <Icon source="close" size={20} color="#DC2626" />
                <Text style={[s.actionButtonText, { color: '#DC2626' }]}>Reject Meeting</Text>
              </TouchableOpacity>
            </View>
          )}

          {canStart && meeting.meeting_type !== 'offline' && (
            <TouchableOpacity
              style={[s.startButton, { backgroundColor: colors.primary }]}
              onPress={handleStartMeeting}
            >
              <Icon source="play" size={20} color="#FFFFFF" />
              <Text style={[s.actionButtonText, { color: '#FFFFFF' }]}>Start Meeting</Text>
            </TouchableOpacity>
          )}

          {canComplete && (
            <TouchableOpacity
              style={[s.completeButton, { backgroundColor: '#9333EA' }]}
              onPress={handleCompleteMeeting}
            >
              <Icon source="check-all" size={20} color="#FFFFFF" />
              <Text style={[s.actionButtonText, { color: '#FFFFFF' }]}>Mark as Completed</Text>
            </TouchableOpacity>
          )}

          {/* Edit Button - Always available for non-completed meetings */}
          {!['completed', 'cancelled'].includes(meeting.status) && (
            <TouchableOpacity
              style={[s.editButton, { borderColor: colors.primary }]}
              onPress={() => navigation.navigate('EditMeeting', { meetingId })}
            >
              <Icon source="pencil" size={20} color={colors.primary} />
              <Text style={[s.actionButtonText, { color: colors.primary }]}>Edit Meeting</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Meeting Summary Section */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Meeting Summary</Text>

          {/* Summary Info */}
          <View style={s.summaryGrid}>
            <View style={s.summaryRow}>
              <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Invited Participants:</Text>
              <Text style={[s.summaryValue, { color: colors.textPrimary }]}>
                {meeting.participants?.length || 0}
              </Text>
            </View>

            {meetingMinutes?.minutes && (
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Meeting Summary:</Text>
                <Text style={[s.summaryText, { color: colors.textSecondary }]} numberOfLines={3}>
                  {meetingMinutes.minutes.summary || meetingMinutes.minutes.content || 'No summary available'}
                </Text>
              </View>
            )}

            {documents && documents.length > 0 && (
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: colors.textMuted }]}>Supporting Files:</Text>
                <View style={s.documentsContainer}>
                  {documents.map((doc: any, index: number) => (
                    <TouchableOpacity key={index} style={s.documentItem}>
                      <Icon source="file-document" size={16} color={colors.primary} />
                      <Text style={[s.documentName, { color: colors.primary }]} numberOfLines={1}>
                        {doc.original_filename || doc.file_name || `Document ${index + 1}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={s.summaryActions}>
            <TouchableOpacity
              style={[s.summaryButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
              onPress={() => setShowSummaryModal(true)}
            >
              <Icon source="pencil" size={18} color={colors.primary} />
              <Text style={[s.summaryButtonText, { color: colors.primary }]}>
                {meetingMinutes?.minutes ? 'Edit Summary' : 'Add Summary'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.summaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleFileUpload}
            >
              <Icon source="upload" size={18} color={colors.textSecondary} />
              <Text style={[s.summaryButtonText, { color: colors.textSecondary }]}>Upload File</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Meeting Summary Modal */}
      <Modal
        visible={showSummaryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSummaryModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.surface }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.textPrimary }]}>
                {meetingMinutes?.minutes ? 'Edit Meeting Summary' : 'Add Meeting Summary'}
              </Text>
              <TouchableOpacity onPress={() => setShowSummaryModal(false)}>
                <Icon source="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody}>
              <View style={s.modalField}>
                <Text style={[s.modalLabel, { color: colors.textSecondary }]}>
                  Meeting Summary/Conclusion *
                </Text>
                <TextInput
                  value={summary}
                  onChangeText={setSummary}
                  placeholder="Enter meeting summary, key decisions, and outcomes..."
                  multiline
                  numberOfLines={8}
                  style={s.modalTextArea}
                  mode="outlined"
                  theme={{ colors: { primary: colors.primary } }}
                />
              </View>

              <View style={s.modalField}>
                <Text style={[s.modalLabel, { color: colors.textSecondary }]}>
                  Meeting Statistics
                </Text>
                <View style={s.statsRow}>
                  <View style={s.statItem}>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>Invited:</Text>
                    <Text style={[s.statValue, { color: colors.textPrimary }]}>
                      {meeting?.participants?.length || 0}
                    </Text>
                  </View>
                  <View style={s.statItem}>
                    <Text style={[s.statLabel, { color: colors.textMuted }]}>Attended:</Text>
                    {/* No attendance-tracking mechanism exists for meetings
                        (only student class attendance does) — show that
                        honestly instead of a number nothing ever saves. */}
                    <Text style={[s.statValue, { color: colors.textMuted, fontStyle: 'italic' }]}>
                      Attendance not recorded
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalSecondaryButton, { borderColor: colors.border }]}
                onPress={() => setShowSummaryModal(false)}
                disabled={isSavingSummary}
              >
                <Text style={[s.modalSecondaryButtonText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.modalPrimaryButton, {
                  backgroundColor: isSavingSummary ? colors.textMuted : colors.primary,
                  opacity: isSavingSummary ? 0.7 : 1
                }]}
                onPress={handleSaveSummary}
                disabled={isSavingSummary}
              >
                {isSavingSummary ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Icon source="content-save" size={18} color="#FFFFFF" />
                )}
                <Text style={s.modalPrimaryButtonText}>
                  {isSavingSummary ? 'Saving...' : 'Save Summary'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.lg },

  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: { fontSize: 16, marginTop: spacing.md },
  errorText: { fontSize: 16, marginTop: spacing.md },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 24, fontWeight: '700' },

  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  meetingTitle: { fontSize: 20, fontWeight: '700', flex: 1, marginRight: spacing.md },

  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  statusText: { fontSize: 12, fontWeight: '600' },

  description: { fontSize: 16, lineHeight: 24, marginBottom: spacing.md },

  infoGrid: { gap: spacing.md },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoLabel: { fontSize: 14, fontWeight: '500', minWidth: 80 },
  infoValue: { fontSize: 14, flex: 1 },
  linkText: { fontSize: 14, textDecorationLine: 'underline' },

  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: spacing.md },

  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 15, fontWeight: '600' },
  participantDetails: { fontSize: 13, marginTop: 2 },

  approvalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  approvalInfo: { flex: 1 },
  approverName: { fontSize: 15, fontWeight: '600' },
  approvalStatus: { fontSize: 13, marginTop: 2 },
  rejectionReason: { fontSize: 13, marginTop: 4, fontStyle: 'italic' },

  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    flex: 1,
    justifyContent: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
  actionButtonText: { fontSize: 16, fontWeight: '600' },

  backButtonText: { fontSize: 16, fontWeight: '600' },

  // Meeting Summary Styles
  summaryGrid: { gap: spacing.md },
  summaryRow: { marginBottom: spacing.md },
  summaryLabel: { fontSize: 14, fontWeight: '600', marginBottom: spacing.xs },
  summaryValue: { fontSize: 16, fontWeight: '500' },
  summaryText: { fontSize: 14, lineHeight: 20 },

  documentsContainer: { gap: spacing.xs },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  documentName: { fontSize: 14, flex: 1 },

  summaryActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  summaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
  },
  summaryButtonText: { fontSize: 14, fontWeight: '600' },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '80%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: {
    flex: 1,
    padding: spacing.lg,
  },
  modalField: { marginBottom: spacing.lg },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
  modalTextArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statLabel: { fontSize: 14, fontWeight: '500' },
  statValue: { fontSize: 16, fontWeight: '600' },
  statInput: {
    width: 80,
    height: 40,
  },

  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalSecondaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryButtonText: { fontSize: 16, fontWeight: '600' },
  modalPrimaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    justifyContent: 'center',
  },
  modalPrimaryButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});