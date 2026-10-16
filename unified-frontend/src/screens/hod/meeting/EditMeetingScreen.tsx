// @ts-nocheck
/**
 * HOD Portal - Edit Meeting Screen
 * Minimal editable HOD flow that mirrors the admin edit behaviour.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Icon, TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import ScreenWrapper from '../../../layouts/hod/ScreenWrapper';
import { useMeetingById, useUpdateMeeting } from '../../../hooks/useMeetings';
import ParticipantPicker, { Participant } from '../../../components/meeting/ParticipantPicker';
import { showError, showSuccess } from '../../../utils/confirmDialog';
import { useTheme } from '../../../context/hod/ThemeContext';
import { spacing, radius, shadows } from '../../../theme';
import { formatDateShort, format12Hour, parseLocalDate, isFutureDateTime } from '../../../utils/dateHelpers';
import MeetingDatePicker from '../../../components/meeting/MeetingDatePicker';
import MeetingTimePicker from '../../../components/meeting/MeetingTimePicker';

export default function EditMeetingScreen({ route, navigation }: { route: any; navigation: any }) {
  const { meetingId } = route.params;
  const { colors } = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalUrlError, setExternalUrlError] = useState('');
  const [dateTimeError, setDateTimeError] = useState('');
  // Tracks the meeting's original date/time so the future-check only fires on an actual reschedule.
  const [originalDateTime, setOriginalDateTime] = useState<{ date: string; time: string } | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);

  const { data: meeting, isLoading: loadingMeeting } = useMeetingById(meetingId);
  const { mutateAsync: updateMeeting, isPending: isUpdating } = useUpdateMeeting();

  useEffect(() => {
    if (meeting) {
      setTitle(meeting.title || '');
      setDescription(meeting.description || '');

      const meetingDate = parseLocalDate(meeting.scheduled_date);
      if (meetingDate) setScheduledDate(meetingDate);

      const [hours, minutes] = (meeting.start_time || '09:00').split(':');
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      setStartTime(timeDate);
      setDurationMinutes(String(meeting.duration_minutes || 60));
      setExternalUrl(meeting.external_meeting_url || '');
      setOriginalDateTime({ date: meeting.scheduled_date, time: meeting.start_time?.slice(0, 5) });

      if (meeting.participants) {
        setSelectedParticipants(
          meeting.participants.map((p: any) => ({
            id: p.participant_employee_id || p.participant_id,
            name: p.participant_name || p.name,
            designation: p.designation || '',
            department_name: p.department_name || '',
          }))
        );
      }
    }
  }, [meeting]);

  const handleSubmit = async () => {
    setExternalUrlError('');
    setDateTimeError('');
    if (!title.trim()) {
      showError('Error', 'Please enter a meeting title');
      return;
    }

    if (!durationMinutes || parseInt(durationMinutes, 10) <= 0) {
      showError('Error', 'Please enter a valid duration');
      return;
    }

    const newDateString = `${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, '0')}-${String(scheduledDate.getDate()).padStart(2, '0')}`;
    const newTimeString = `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`;
    const isRescheduled = originalDateTime && (newDateString !== originalDateTime.date || newTimeString !== originalDateTime.time);
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
      const year = scheduledDate.getFullYear();
      const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
      const day = String(scheduledDate.getDate()).padStart(2, '0');
      const localDateString = `${year}-${month}-${day}`;

      const meetingData = {
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_date: localDateString,
        start_time: `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`,
        duration_minutes: parseInt(durationMinutes, 10),
        external_url: externalUrl.trim() || '',
        participant_ids: selectedParticipants.map((p) => p.id),
      };

      await updateMeeting({ id: meetingId, ...meetingData });
      // Navigate immediately rather than gating it behind an Alert button —
      // Alert.alert's buttons array never renders on react-native-web.
      showSuccess('Success', 'Meeting updated successfully');
      navigation.goBack();
    } catch (error: any) {
      showError('Error', error.message || 'Failed to update meeting');
    }
  };

  if (loadingMeeting) {
    return (
      <ScreenWrapper title="Edit Meeting" scrollable={false}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading meeting...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper title="Edit Meeting" scrollable={false}>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
              <Icon source="arrow-left" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Edit Meeting</Text>
          </View>

          <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border, ...shadows.sm }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Title *</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="Enter meeting title" mode="outlined" style={styles.textInput} theme={{ colors: { primary: colors.primary } }} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
              <TextInput value={description} onChangeText={setDescription} placeholder="Enter meeting description (optional)" mode="outlined" multiline numberOfLines={3} style={styles.textInput} theme={{ colors: { primary: colors.primary } }} />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Date *</Text>
                <TouchableOpacity style={[styles.dateTimeButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => (Platform.OS === 'web' ? setShowCustomDatePicker(true) : setShowDatePicker(true))}>
                  <Icon source="calendar" size={20} color={colors.textMuted} />
                  <Text style={[styles.dateTimeText, { color: colors.textPrimary }]}>{formatDateShort(`${scheduledDate.getFullYear()}-${String(scheduledDate.getMonth() + 1).padStart(2, '0')}-${String(scheduledDate.getDate()).padStart(2, '0')}`)}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Time *</Text>
                <TouchableOpacity style={[styles.dateTimeButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => (Platform.OS === 'web' ? setShowCustomTimePicker(true) : setShowTimePicker(true))}>
                  <Icon source="clock-outline" size={20} color={colors.textMuted} />
                  <Text style={[styles.dateTimeText, { color: colors.textPrimary }]}>{format12Hour(`${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {dateTimeError ? (
              <Text style={[styles.errorText, { color: colors.error, marginBottom: spacing.md }]}>{dateTimeError}</Text>
            ) : null}

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Duration (minutes) *</Text>
                <TextInput value={durationMinutes} onChangeText={setDurationMinutes} placeholder="60" mode="outlined" keyboardType="numeric" style={styles.textInput} theme={{ colors: { primary: colors.primary } }} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ParticipantPicker colors={colors} selected={selectedParticipants} onChange={setSelectedParticipants} />
            </View>

            <View style={[styles.inputGroup, { marginBottom: spacing.xl }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>External Meeting Link (Optional)</Text>
              <Text style={[styles.helperText, { color: colors.textMuted }]}>
                Already created a meeting in another app? Paste its link here. If left blank, the system will use the generated Jitsi link.
              </Text>
              <TextInput
                value={externalUrl}
                onChangeText={(text) => { setExternalUrl(text); if (externalUrlError) setExternalUrlError(''); }}
                placeholder="https://..."
                mode="outlined"
                autoCapitalize="none"
                keyboardType="url"
                style={styles.textInput}
                theme={{ colors: { primary: colors.primary } }}
                error={!!externalUrlError}
              />
              {externalUrlError ? (
                <Text style={[styles.errorText, { color: colors.error }]}>{externalUrlError}</Text>
              ) : null}
            </View>

            <TouchableOpacity style={[styles.submitButton, { backgroundColor: isUpdating ? colors.textMuted : colors.primary, opacity: isUpdating ? 0.7 : 1 }]} onPress={handleSubmit} disabled={isUpdating}>
              {isUpdating ? (
                <><ActivityIndicator size="small" color="#FFFFFF" /><Text style={[styles.submitButtonText, { marginLeft: spacing.sm }]}>Updating...</Text></>
              ) : (
                <><Icon source="content-save" size={20} color="#FFFFFF" /><Text style={styles.submitButtonText}>Save Changes</Text></>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {showDatePicker && Platform.OS !== 'web' && (
          <DateTimePicker value={scheduledDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={new Date()} onChange={(event, selectedDate) => { setShowDatePicker(false); if (selectedDate) setScheduledDate(selectedDate); }} />
        )}

        {showTimePicker && Platform.OS !== 'web' && (
          <DateTimePicker value={startTime} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(event, selectedTime) => { setShowTimePicker(false); if (selectedTime) setStartTime(selectedTime); }} />
        )}

        <MeetingDatePicker visible={showCustomDatePicker} selectedDate={scheduledDate} onDateSelect={(date) => { setScheduledDate(date); setShowCustomDatePicker(false); }} onClose={() => setShowCustomDatePicker(false)} theme={colors} />
        <MeetingTimePicker visible={showCustomTimePicker} selectedTime={startTime} onTimeSelect={(time) => { setStartTime(time); setShowCustomTimePicker(false); }} onClose={() => setShowCustomTimePicker(false)} theme={colors} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  backButton: { padding: 4 },
  title: { fontSize: 24, fontWeight: '700' },
  form: { borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1 },
  inputGroup: { marginBottom: spacing.md },
  label: { fontSize: 14, fontWeight: '600', marginBottom: spacing.xs },
  helperText: { fontSize: 12, marginBottom: spacing.xs },
  errorText: { fontSize: 12, marginTop: 4 },
  textInput: { fontSize: 16 },
  row: { flexDirection: 'row', gap: spacing.md },
  flex1: { flex: 1 },
  dateTimeButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, minHeight: 56 },
  dateTimeText: { fontSize: 16, flex: 1 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { fontSize: 14, marginTop: spacing.sm },
});