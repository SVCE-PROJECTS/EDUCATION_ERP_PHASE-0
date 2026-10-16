// @ts-nocheck
/**
 * Admin Portal - Edit Meeting Screen
 * Edit existing meeting form
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Icon, TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
// Web-compatible date input fallback
import { TextInput as RNTextInput } from 'react-native';
import ScreenLayout from '../../../navigation/admin/ScreenLayout';
import { useMeetingById, useUpdateMeeting } from '../../../hooks/useMeetings';
import ParticipantPicker, { Participant } from '../../../components/meeting/ParticipantPicker';
import { showError, showSuccess } from '../../../utils/confirmDialog';
import { useTheme } from '../../../context/admin/ThemeContext';
import { spacing, radius, shadows } from '../../../theme';
import { formatDateShort, format12Hour, parseLocalDate, isFutureDateTime } from '../../../utils/dateHelpers';
import MeetingDatePicker from '../../../components/meeting/MeetingDatePicker';
import MeetingTimePicker from '../../../components/meeting/MeetingTimePicker';

export default function EditMeetingScreen({ route, navigation }: { route: any; navigation: any }) {
  const { meetingId } = route.params;
  const { colors } = useTheme();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalUrlError, setExternalUrlError] = useState('');
  const [dateTimeError, setDateTimeError] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  // Tracks the meeting's original date/time so the future-time check only
  // fires when the user actually reschedules it — editing an already-past
  // meeting's title without touching its time must still be saveable.
  const [originalDateTime, setOriginalDateTime] = useState<{ date: string; time: string } | null>(null);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);

  const { data: meeting, isLoading: loadingMeeting } = useMeetingById(meetingId);
  const { mutateAsync: updateMeeting, isPending: isUpdating } = useUpdateMeeting();

  // Initialize form with meeting data
  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title);
      setDescription(meeting.description || '');

      // Parse scheduled_date safely to avoid timezone shifts
      const meetingDate = parseLocalDate(meeting.scheduled_date);
      if (meetingDate) {
        setScheduledDate(meetingDate);
      }

      const [hours, minutes] = meeting.start_time.split(':');
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      setStartTime(timeDate);

      setDurationMinutes(meeting.duration_minutes.toString());
      setExternalUrl(meeting.external_meeting_url || '');
      setOriginalDateTime({ date: meeting.scheduled_date, time: meeting.start_time?.slice(0, 5) });

      // Convert participants to selected format
      if (meeting.participants) {
        const participants = meeting.participants.map(p => ({
          id: p.participant_employee_id || p.participant_id,
          name: p.participant_name || p.name,
          designation: p.designation,
          department_name: p.department_name || ''
        }));
        setSelectedParticipants(participants);
      }
    }
  }, [meeting]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'web') {
      // For web, event.target.value contains the date string
      if (event.target && event.target.value) {
        setScheduledDate(new Date(event.target.value));
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
      // For web, event.target.value contains the time string
      if (event.target && event.target.value) {
        const [hours, minutes] = event.target.value.split(':');
        const newTime = new Date();
        newTime.setHours(parseInt(hours), parseInt(minutes));
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

  const handleSubmit = async () => {
    setExternalUrlError('');
    setDateTimeError('');
    if (!title.trim()) {
      showError('Error', 'Please enter a meeting title');
      return;
    }

    if (!durationMinutes || parseInt(durationMinutes) <= 0) {
      showError('Error', 'Please enter a valid duration');
      return;
    }

    const newDateString = `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, '0')}-${String(scheduledDate.getDate()).padStart(2, '0')}`;
    const newTimeString = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
    const isRescheduled = originalDateTime && (newDateString !== originalDateTime.date || newTimeString !== originalDateTime.time);
    // Only enforce the future-time rule when the date/time actually changed
    // — saving other edits on an already-past meeting must still work.
    if (isRescheduled && !isFutureDateTime(newDateString, newTimeString)) {
      setDateTimeError('Please select a valid future meeting date and time.');
      return;
    }

    if (externalUrl.trim()) {
      try {
        const parsed = new URL(externalUrl.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('bad protocol');
      } catch {
        setExternalUrlError('Enter a valid http(s) meeting link, or leave this blank');
        return;
      }
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
        start_time: `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`,
        duration_minutes: parseInt(durationMinutes),
        external_url: externalUrl.trim() || '',
        participant_ids: selectedParticipants.map(p => p.id),
      };

      await updateMeeting({ id: meetingId, ...meetingData });
      // Navigate immediately rather than gating it behind an Alert button —
      // Alert.alert's buttons array never renders on react-native-web, so a
      // callback wired to "OK" would never fire there.
      showSuccess('Success', 'Meeting updated successfully');
      navigation.goBack();
    } catch (error: any) {
      showError('Error', error.message || 'Failed to update meeting');
    }
  };

  if (loadingMeeting) {
    return (
      <ScreenLayout navigation={navigation} activeScreen="EditMeeting">
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[s.loadingText, { color: colors.textMuted }]}>Loading meeting...</Text>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout navigation={navigation} activeScreen="EditMeeting">
      <ScrollView style={s.container} contentContainerStyle={s.scrollContent}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={navigation.goBack} style={s.backButton}>
            <Icon source="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.textPrimary }]}>Edit Meeting</Text>
        </View>

        <View style={[s.form, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
          {/* Title */}
          <View style={s.inputGroup}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Enter meeting title"
              mode="outlined"
              style={s.textInput}
              theme={{ colors: { primary: colors.primary } }}
            />
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
            <Text style={[s.errorText, { color: colors.error, marginBottom: spacing.md }]}>{dateTimeError}</Text>
          ) : null}

          {/* Duration */}
          <View style={s.inputGroup}>
            <Text style={[s.label, { color: colors.textSecondary }]}>Duration (minutes) *</Text>
            <TextInput
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              placeholder="60"
              mode="outlined"
              keyboardType="numeric"
              style={s.textInput}
              theme={{ colors: { primary: colors.primary } }}
            />
          </View>

          {/* Participants */}
          <View style={s.inputGroup}>
            <ParticipantPicker colors={colors} selected={selectedParticipants} onChange={setSelectedParticipants} />
          </View>

          {/* External meeting link */}
          <View style={s.inputGroup}>
            <Text style={[s.label, { color: colors.textSecondary }]}>External Meeting Link (Optional)</Text>
            <Text style={[s.helperText, { color: colors.textMuted }]}>
              Already created a meeting in another app? Paste its link here. If left blank, the system will use the generated Jitsi link.
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
            style={[s.submitButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon source="content-save" size={20} color="#FFFFFF" />
                <Text style={s.submitButtonText}>Update Meeting</Text>
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
  scrollContent: { padding: spacing.lg },

  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { fontSize: 16, marginTop: spacing.md },

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
  errorText: { fontSize: 12, marginTop: 4 },
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

  webDateInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 56,
  },

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
});