// @ts-nocheck
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon, TextInput } from 'react-native-paper';
import { useCreateMeeting } from '../../hooks/useMeetings';
import ParticipantPicker, { Participant } from './ParticipantPicker';
import VenuePicker from './VenuePicker';
import MeetingDatePicker from './MeetingDatePicker';
import MeetingTimePicker from './MeetingTimePicker';
import { formatDateShort, format12Hour, isFutureDateTime } from '../../utils/dateHelpers';

const nextHour = () => {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
};

const toDateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const toTimeString = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export default function OfflineMeetingForm({ colors, onCancel, onCreated }: {
  colors: any;
  onCancel: () => void;
  onCreated: (meeting: any) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [time, setTime] = useState(nextHour);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState('');
  const [venue, setVenue] = useState('');
  const [selected, setSelected] = useState<Participant[]>([]);
  const [formError, setFormError] = useState('');
  const { mutateAsync: createMeeting, isPending } = useCreateMeeting();

  const submit = async () => {
    setFormError('');
    if (!title.trim()) {
      setFormError('Meeting title is required.');
      return;
    }
    if (!venue) {
      setFormError('Venue is required.');
      return;
    }
    if (!isFutureDateTime(toDateString(date), toTimeString(time))) {
      setFormError('Please select a valid future meeting date and time.');
      return;
    }
    if (selected.length === 0) {
      setFormError('Select at least one participant.');
      return;
    }

    // Duration is optional for offline meetings
    let durationValue = null;
    if (duration.trim()) {
      durationValue = Number(duration);
      if (!Number.isInteger(durationValue) || durationValue < 1 || durationValue > 480) {
        setFormError('Duration must be between 1 and 480 minutes, or left blank.');
        return;
      }
    }

    if (isPending) return;
    try {
      const meeting = await createMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_date: toDateString(date),
        start_time: toTimeString(time),
        duration_minutes: durationValue, // Send null if not provided
        location: venue,
        participant_ids: selected.map((person) => person.id),
        meeting_type: 'offline',
      });
      onCreated(meeting);
    } catch (error: any) {
      setFormError(error?.message || 'Could not arrange the offline meeting. Please retry.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Arrange offline meeting</Text>
          <Text style={[styles.subheading, { color: colors.textSecondary }]}>Participants will receive an in-app notification.</Text>
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cancel offline meeting" onPress={onCancel} style={styles.iconButton}>
          <Icon source="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <TextInput label="Meeting title *" value={title} onChangeText={setTitle} mode="outlined" style={styles.input} />
      <TextInput label="Description (optional)" value={description} onChangeText={setDescription} mode="outlined" multiline style={styles.input} />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Date *</Text>
          <TouchableOpacity
            style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.background || 'transparent' }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon source="calendar" size={18} color={colors.textMuted} />
            <Text style={[styles.pickerText, { color: colors.textPrimary }]}>{formatDateShort(toDateString(date))}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.flex}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Start time *</Text>
          <TouchableOpacity
            style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.background || 'transparent' }]}
            onPress={() => setShowTimePicker(true)}
          >
            <Icon source="clock-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.pickerText, { color: colors.textPrimary }]}>{format12Hour(toTimeString(time))}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.row}>
        <TextInput label="Duration (minutes, optional)" value={duration} onChangeText={setDuration} mode="outlined" keyboardType="numeric" style={[styles.input, styles.flex]} />
      </View>
      <VenuePicker colors={colors} value={venue} onChange={setVenue} />

      <ParticipantPicker colors={colors} selected={selected} onChange={setSelected} />

      {formError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger || colors.error }]}>{formError}</Text> : null}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.border }]} onPress={onCancel} disabled={isPending}>
          <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Back to meetings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary, opacity: isPending ? 0.65 : 1 }]} onPress={submit} disabled={isPending}>
          {isPending ? <ActivityIndicator color="#FFFFFF" /> : <Icon source="bell-check-outline" size={18} color="#FFFFFF" />}
          <Text style={styles.submitText}>{isPending ? 'Sending…' : 'Send Meeting Notification'}</Text>
        </TouchableOpacity>
      </View>

      <MeetingDatePicker
        visible={showDatePicker}
        selectedDate={date}
        onDateSelect={(d) => { setDate(d); setShowDatePicker(false); }}
        onClose={() => setShowDatePicker(false)}
        theme={colors}
      />
      <MeetingTimePicker
        visible={showTimePicker}
        selectedTime={time}
        onTimeSelect={(t) => { setTime(t); setShowTimePicker(false); }}
        onClose={() => setShowTimePicker(false)}
        theme={colors}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 10, padding: 14, paddingBottom: 24 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 2 },
  headingText: { flex: 1 },
  heading: { fontSize: 18, fontWeight: '700' },
  subheading: { fontSize: 12, marginTop: 3 },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  input: { backgroundColor: 'transparent', flex: 1 },
  row: { flexDirection: 'row', gap: 8 },
  flex: { minWidth: 0, flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  pickerButton: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderRadius: 4 },
  pickerText: { fontSize: 14 },
  error: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  cancelButton: { minHeight: 40, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderRadius: 6 },
  submitButton: { minHeight: 40, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 6 },
  submitText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});