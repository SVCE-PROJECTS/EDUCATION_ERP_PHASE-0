// @ts-nocheck
/**
 * Admin Portal - Create Meeting Screen
 * Form to create new meetings with participant selection
 */

import React, { useState } from 'react';
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
import { Icon, TextInput, Menu } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
// Web-compatible date input fallback
import { TextInput as RNTextInput } from 'react-native';
import ScreenLayout from '../../../navigation/admin/ScreenLayout';
import { useCreateMeeting } from '../../../hooks/useMeetings';
import ParticipantPicker, { Participant } from '../../../components/meeting/ParticipantPicker';
import { showError } from '../../../utils/confirmDialog';
import { useQueryClient } from '@tanstack/react-query';
import { spacing, radius, shadows } from '../../../theme';
import { formatDateShort, format12Hour, isFutureDateTime } from '../../../utils/dateHelpers';

import { useTheme } from '../../../context/admin/ThemeContext';
import MeetingDatePicker from '../../../components/meeting/MeetingDatePicker';
import MeetingTimePicker from '../../../components/meeting/MeetingTimePicker';
import { getTodayString } from '../../../utils/dateHelpers';

export default function CreateMeetingScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0); // Default to next hour
    return now;
  });
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [durationError, setDurationError] = useState('');
  const [dateTimeError, setDateTimeError] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalUrlError, setExternalUrlError] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState<any>(null);

  const { mutateAsync: createMeeting, isPending: isCreating } = useCreateMeeting();

  const handleSubmit = async () => {
    // Reset errors
    setTitleError('');
    setDurationError('');
    setExternalUrlError('');
    setDateTimeError('');

    let hasErrors = false;

    // Validate title
    if (!title.trim()) {
      setTitleError('Meeting title is required');
      hasErrors = true;
    }

    // Validate duration
    if (!durationMinutes || parseInt(durationMinutes) <= 0) {
      setDurationError('Please enter a valid duration (minimum 1 minute)');
      hasErrors = true;
    }

    // Reject a meeting scheduled in the past — checked fresh against "now"
    // at submit time, never a value captured when the screen first mounted.
    const localDateStringCheck = `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, '0')}-${String(scheduledDate.getDate()).padStart(2, '0')}`;
    const startTimeStringCheck = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
    if (!isFutureDateTime(localDateStringCheck, startTimeStringCheck)) {
      setDateTimeError('Please select a valid future meeting date and time.');
      hasErrors = true;
    }

    // External link is optional, but if provided it must be a real http(s) URL
    if (externalUrl.trim()) {
      try {
        const parsed = new URL(externalUrl.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('bad protocol');
      } catch {
        setExternalUrlError('Enter a valid http(s) meeting link, or leave this blank');
        hasErrors = true;
      }
    }

    if (hasErrors) {
      return;
    }

    // Prevent duplicate submissions
    if (isCreating) {
      return;
    }

    try {
      // Use safe local date formatting to avoid timezone shifts
      const year = scheduledDate.getFullYear();
      const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
      const day = String(scheduledDate.getDate()).padStart(2, '0');
      const localDateString = `${year}-${month}-${day}`;

      const meetingData = {
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_date: localDateString, // YYYY-MM-DD format in local timezone
        start_time: `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`, // HH:MM format
        duration_minutes: parseInt(durationMinutes),
        external_url: externalUrl.trim() || undefined,
        participant_ids: selectedParticipants.map(p => p.id),
      };

      const result = await createMeeting(meetingData);

      // Store meeting data for success modal
      setCreatedMeeting({
        ...result,
        participantCount: selectedParticipants.length
      });

      // Show success modal - the mutation's onSuccess will handle query invalidation
      setShowSuccessModal(true);

    } catch (error: any) {
      console.error('Meeting creation error:', error);
      const errorMessage = error?.message || 'Failed to create meeting. Please try again.';
      showError('Error', errorMessage);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    // Navigate back without clearing form in case user wants to create similar meeting
    navigation.goBack();
  };

  const handleViewMeetings = () => {
    setShowSuccessModal(false);
    // Clear form state only when user explicitly chooses to view meetings
    setTitle('');
    setTitleError('');
    setDescription('');
    setSelectedParticipants([]);
    setExternalUrl('');
    setExternalUrlError('');
    setDurationMinutes('60');
    setDurationError('');
    setCreatedMeeting(null);
    // Navigate back to meetings list
    navigation.goBack();
  };

  const handleOpenMeetingLink = () => {
    const url = createdMeeting?.effective_meeting_url || createdMeeting?.meeting_url;
    if (url) {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
      } else {
        // For mobile, you might want to use Linking.openURL
        Alert.alert('Meeting Link', url);
      }
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'web') {
      // For web, event.target.value contains the date string in YYYY-MM-DD format
      if (event.target && event.target.value) {
        // Parse as local date to avoid timezone shifts
        const [year, month, day] = event.target.value.split('-').map(Number);
        const localDate = new Date(year, month - 1, day); // month is 0-indexed
        setScheduledDate(localDate);
      }
    } else {
      // For mobile platforms
      setShowDatePicker(false);
      if (selectedDate) {
        setScheduledDate(selectedDate);
      }
    }
  };

  const handleCustomDateSelect = (date: Date) => {
    setScheduledDate(date);
    setShowCustomDatePicker(false);
  };

  const handleCustomTimeSelect = (time: Date) => {
    setStartTime(time);
    setShowCustomTimePicker(false);
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'web') {
      // For web, event.target.value contains the time string in HH:MM format
      if (event.target && event.target.value) {
        const [hours, minutes] = event.target.value.split(':').map(Number);
        const newTime = new Date();
        newTime.setHours(hours, minutes, 0, 0); // Set seconds and milliseconds to 0
        setStartTime(newTime);
      }
    } else {
      // For mobile platforms
      setShowTimePicker(false);
      if (selectedTime) {
        setStartTime(selectedTime);
      }
    }
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="CreateMeeting">
      <ScrollView style={s.container} contentContainerStyle={s.scrollContent}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={navigation.goBack} style={s.backButton}>
            <Icon source="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.textPrimary }]}>Create Meeting</Text>
        </View>

        <View style={[s.form, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
          {/* Title */}
          <View style={s.inputGroup}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Title *</Text>
            <TextInput
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (titleError) setTitleError(''); // Clear error when user types
              }}
              placeholder="Enter meeting title"
              mode="outlined"
              style={s.textInput}
              theme={{ colors: { primary: colors.primary } }}
              error={!!titleError}
            />
            {titleError ? (
              <Text style={[s.errorText, { color: colors.error }]}>{titleError}</Text>
            ) : null}
          </View>

          {/* Description */}
          <View style={s.inputGroup}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Enter meeting description (optional)"
              mode="outlined"
              multiline
              numberOfLines={3}
              style={s.textInput}
              theme={{ colors: { primary: colors.primary } }}
            />
          </View>

          {/* Date and Time */}
          <View style={s.row}>
            <View style={[s.inputGroup, s.flex1]}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Date *</Text>
              <TouchableOpacity
                style={[s.dateTimeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => Platform.OS === 'web' ? setShowCustomDatePicker(true) : setShowDatePicker(true)}
              >
                <Icon source="calendar" size={20} color={colors.textMuted} />
                <Text style={[s.dateTimeText, { color: colors.textPrimary }]}>
                  {formatDateShort(`${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, '0')}-${String(scheduledDate.getDate()).padStart(2, '0')}`)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[s.inputGroup, s.flex1]}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Time *</Text>
              <TouchableOpacity
                style={[s.dateTimeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => Platform.OS === 'web' ? setShowCustomTimePicker(true) : setShowTimePicker(true)}
              >
                <Icon source="clock-outline" size={20} color={colors.textMuted} />
                <Text style={[s.dateTimeText, { color: colors.textPrimary }]}>
                  {format12Hour(`${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          {dateTimeError ? (
            <Text style={[s.errorText, { color: colors.error, marginTop: -spacing.sm, marginBottom: spacing.md }]}>{dateTimeError}</Text>
          ) : null}

          {/* Duration */}
          <View style={s.inputGroup}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Duration (minutes) *</Text>
            <TextInput
              value={durationMinutes}
              onChangeText={(text) => {
                setDurationMinutes(text);
                if (durationError) setDurationError(''); // Clear error when user types
              }}
              placeholder="60"
              mode="outlined"
              keyboardType="numeric"
              style={s.textInput}
              theme={{ colors: { primary: colors.primary } }}
              error={!!durationError}
            />
            {durationError ? (
              <Text style={[s.errorText, { color: colors.error }]}>{durationError}</Text>
            ) : null}
          </View>

          {/* Participants */}
          <View style={s.inputGroup}>
            <ParticipantPicker colors={colors} selected={selectedParticipants} onChange={setSelectedParticipants} />
          </View>

          {/* External meeting link */}
          <View style={[s.inputGroup, { marginBottom: spacing.xl }]}>
            <Text style={[s.label, { color: colors.textSecondary }]}>External Meeting Link (Optional)</Text>
            <Text style={[s.helperText, { color: colors.textMuted }]}>
              Already created a meeting in another app? Paste its link here. If left blank, the system will generate a Jitsi meeting link instead.
            </Text>
            <TextInput
              value={externalUrl}
              onChangeText={(text) => { setExternalUrl(text); if (externalUrlError) setExternalUrlError(''); }}
              placeholder="https://..."
              mode="outlined"
              autoCapitalize="none"
              keyboardType="url"
              style={s.textInput}
              theme={{ colors: { primary: colors.primary } }}
              error={!!externalUrlError}
            />
            {externalUrlError ? (
              <Text style={[s.errorText, { color: colors.error }]}>{externalUrlError}</Text>
            ) : null}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              s.submitButton,
              {
                backgroundColor: isCreating ? colors.textMuted : colors.primary,
                opacity: isCreating ? 0.7 : 1,
              }
            ]}
            onPress={handleSubmit}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={[s.submitButtonText, { marginLeft: spacing.sm }]}>Creating...</Text>
              </>
            ) : (
              <>
                <Icon source="calendar-plus" size={20} color="#FFFFFF" />
                <Text style={s.submitButtonText}>Create Meeting</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker - Mobile Only */}
      {showDatePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={scheduledDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          maximumDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)} // 3 months ahead
          onChange={handleDateChange}
        />
      )}

      {/* Time Picker - Mobile Only */}
      {showTimePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={startTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.surface }]}>
            <View style={s.modalHeader}>
              <View style={[s.successIcon, { backgroundColor: colors.primary }]}>
                <Icon source="check" size={32} color="#FFFFFF" />
              </View>
              <Text style={[s.modalTitle, { color: colors.textPrimary }]}>
                Meeting Created Successfully
              </Text>
            </View>

            <View style={s.modalBody}>
              <Text style={[s.meetingTitle, { color: colors.textPrimary }]}>
                {createdMeeting?.title}
              </Text>

              <View style={s.meetingDetails}>
                <View style={s.detailRow}>
                  <Icon source="calendar" size={20} color={colors.textSecondary} />
                  <Text style={[s.detailText, { color: colors.textSecondary }]}>
                    {createdMeeting?.scheduled_date ? formatDateShort(createdMeeting.scheduled_date) : ''}
                  </Text>
                </View>

                <View style={s.detailRow}>
                  <Icon source="clock-outline" size={20} color={colors.textSecondary} />
                  <Text style={[s.detailText, { color: colors.textSecondary }]}>
                    {createdMeeting?.start_time ? format12Hour(createdMeeting.start_time) : ''}
                  </Text>
                </View>

                <View style={s.detailRow}>
                  <Icon source="account-group" size={20} color={colors.textSecondary} />
                  <Text style={[s.detailText, { color: colors.textSecondary }]}>
                    {createdMeeting?.participantCount || 0} participants
                  </Text>
                </View>
              </View>

              {(createdMeeting?.effective_meeting_url || createdMeeting?.meeting_url) && (
                <TouchableOpacity
                  style={[s.linkButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                  onPress={handleOpenMeetingLink}
                >
                  <Icon source="video" size={20} color={colors.primary} />
                  <Text style={[s.linkButtonText, { color: colors.primary }]}>
                    {createdMeeting?.external_meeting_url ? 'Open Meeting Link' : 'Join Jitsi Meeting'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.secondaryButton, { borderColor: colors.border }]}
                onPress={handleSuccessModalClose}
              >
                <Text style={[s.secondaryButtonText, { color: colors.textSecondary }]}>
                  Close
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleViewMeetings}
              >
                <Text style={s.primaryButtonText}>View Meetings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Date Picker - Web Only */}
      <MeetingDatePicker
        visible={showCustomDatePicker}
        selectedDate={scheduledDate}
        onDateSelect={handleCustomDateSelect}
        onClose={() => setShowCustomDatePicker(false)}
        theme={colors}
      />

      {/* Custom Time Picker - Web Only */}
      <MeetingTimePicker
        visible={showCustomTimePicker}
        selectedTime={startTime}
        onTimeSelect={handleCustomTimeSelect}
        onClose={() => setShowCustomTimePicker(false)}
        theme={colors}
      />
    </ScreenLayout>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: { padding: 4 },
  title: { fontSize: 24, fontWeight: '700' },

  form: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
  },

  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: '600', marginBottom: spacing.xs },
  helperText: { fontSize: 12, marginBottom: spacing.xs },
  textInput: { fontSize: 16 },

  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  flex1: { flex: 1 },

  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    minHeight: 56,
  },
  dateTimeText: { fontSize: 16, flex: 1 },

  errorText: { fontSize: 12, marginTop: 4 },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },

  // Web-specific styles
  webDateTimeInput: {
    border: 'none',
    outline: 'none',
    fontSize: 16,
    flex: 1,
    backgroundColor: 'transparent',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    maxWidth: 400,
    width: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalBody: {
    marginBottom: spacing.xl,
  },
  meetingTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  meetingDetails: {
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    justifyContent: 'center',
  },
  detailText: {
    fontSize: 14,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});