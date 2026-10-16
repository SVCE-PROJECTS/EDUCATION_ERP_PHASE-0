// @ts-nocheck
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon, TextInput } from 'react-native-paper';
import ScreenWrapper from '../../../layouts/faculty/ScreenWrapper';
import { useCreateMeeting } from '../../../hooks/useMeetings';
import ParticipantPicker, { Participant } from '../../../components/meeting/ParticipantPicker';
import MeetingDatePicker from '../../../components/meeting/MeetingDatePicker';
import MeetingTimePicker from '../../../components/meeting/MeetingTimePicker';
import { useTheme } from '../../../context/faculty/ThemeContext';
import { showError } from '../../../utils/confirmDialog';
import { formatDateShort, format12Hour, isFutureDateTime } from '../../../utils/dateHelpers';
import { ROUTES } from '../../../navigation/faculty/routes';

const toDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const toTimeString = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export default function CreateMeetingScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => new Date());
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState('60');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalUrlError, setExternalUrlError] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const { mutateAsync: createMeeting, isPending } = useCreateMeeting();

  const submit = async () => {
    setExternalUrlError('');
    if (!title.trim()) {
      showError('Validation error', 'Meeting title is required.');
      return;
    }
    if (!duration.trim() || Number(duration) < 1) {
      showError('Validation error', 'Enter a duration greater than zero.');
      return;
    }
    if (!isFutureDateTime(toDateString(scheduledDate), toTimeString(startTime))) {
      showError('Validation error', 'Please select a valid future meeting date and time.');
      return;
    }
    if (selectedParticipants.length === 0) {
      showError('Validation error', 'Select at least one participant.');
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
    if (isPending) return;
    try {
      const meeting = await createMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_date: toDateString(scheduledDate),
        start_time: toTimeString(startTime),
        duration_minutes: Number(duration),
        external_url: externalUrl.trim() || undefined,
        participant_ids: selectedParticipants.map((participant) => participant.id),
      });
      navigation.replace(ROUTES.MEETING_DETAILS, { meetingId: meeting.meeting_id });
    } catch (error: any) {
      showError('Unable to create meeting', error.message || 'Please try again.');
    }
  };

  return (
    <ScreenWrapper title="Create Meeting" scrollable={false}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={[styles.backButton, { borderColor: colors.border }]} onPress={navigation.goBack}>
          <Icon source="arrow-left" size={18} color={colors.primary} /><Text style={{ color: colors.primary }}>Meetings</Text>
        </TouchableOpacity>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>New meeting</Text>
        <TextInput label="Title" value={title} onChangeText={setTitle} mode="outlined" style={styles.input} />
        <TextInput label="Description" value={description} onChangeText={setDescription} mode="outlined" multiline style={styles.input} />
        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Date</Text>
            <TouchableOpacity
              style={[styles.pickerButton, { borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon source="calendar" size={18} color={colors.textMuted} />
              <Text style={[styles.pickerText, { color: colors.textPrimary }]}>{formatDateShort(toDateString(scheduledDate))}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.half}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Start time</Text>
            <TouchableOpacity
              style={[styles.pickerButton, { borderColor: colors.border }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Icon source="clock-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.pickerText, { color: colors.textPrimary }]}>{format12Hour(toTimeString(startTime))}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TextInput label="Duration (minutes)" value={duration} onChangeText={setDuration} mode="outlined" keyboardType="numeric" style={styles.input} />
        <ParticipantPicker colors={colors} selected={selectedParticipants} onChange={setSelectedParticipants} label="Invite faculty" />
        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 4 }]}>External Meeting Link (Optional)</Text>
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          Already created a meeting in another app? Paste its link here. If left blank, the system will generate a Jitsi meeting link instead.
        </Text>
        <TextInput
          value={externalUrl}
          onChangeText={(text) => { setExternalUrl(text); if (externalUrlError) setExternalUrlError(''); }}
          placeholder="https://..."
          mode="outlined"
          autoCapitalize="none"
          keyboardType="url"
          style={styles.input}
          error={!!externalUrlError}
        />
        {externalUrlError ? <Text style={[styles.errorText, { color: colors.error }]}>{externalUrlError}</Text> : null}
        <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary, opacity: isPending ? 0.65 : 1 }]} onPress={submit} disabled={isPending}>
          {isPending ? <ActivityIndicator color="#FFFFFF" /> : <Icon source="calendar-plus" size={20} color="#FFFFFF" />}
          <Text style={styles.submitText}>{isPending ? 'Creating…' : 'Create meeting'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <MeetingDatePicker
        visible={showDatePicker}
        selectedDate={scheduledDate}
        onDateSelect={(d) => { setScheduledDate(d); setShowDatePicker(false); }}
        onClose={() => setShowDatePicker(false)}
        theme={colors}
      />
      <MeetingTimePicker
        visible={showTimePicker}
        selectedTime={startTime}
        onTimeSelect={(t) => { setStartTime(t); setShowTimePicker(false); }}
        onClose={() => setShowTimePicker(false)}
        theme={colors}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  backButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  input: { backgroundColor: 'transparent' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, minWidth: 0 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  helperText: { fontSize: 11, marginBottom: 4 },
  errorText: { fontSize: 12, fontWeight: '600' },
  pickerButton: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderRadius: 4 },
  pickerText: { fontSize: 14 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 6, marginTop: 8 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
