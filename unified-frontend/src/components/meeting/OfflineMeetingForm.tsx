// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon, TextInput } from 'react-native-paper';
import { useCreateMeeting, useFacultyForInvitation } from '../../hooks/useMeetings';

const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const nextHour = () => {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default function OfflineMeetingForm({ colors, onCancel, onCreated }: {
  colors: any;
  onCancel: () => void;
  onCreated: (meeting: any) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => formatLocalDate(new Date()));
  const [time, setTime] = useState(nextHour);
  const [duration, setDuration] = useState('');
  const [venue, setVenue] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selected, setSelected] = useState<any[]>([]);
  const [formError, setFormError] = useState('');
  const { mutateAsync: createMeeting, isPending } = useCreateMeeting();
  const { data: faculty = [], isLoading: isSearching, error: searchError } = useFacultyForInvitation({
    search: debouncedSearch.trim() || undefined,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const candidates = faculty.filter((person: any) => !selected.some((item) => item.id === person.id));

  const submit = async () => {
    setFormError('');
    if (!title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !venue.trim()) {
      setFormError('Enter a title, valid date and time, and a venue.');
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

    try {
      const meeting = await createMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_date: date,
        start_time: time,
        duration_minutes: durationValue, // Send null if not provided
        location: venue.trim(),
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
        <TextInput label="Date (YYYY-MM-DD) *" value={date} onChangeText={setDate} mode="outlined" style={[styles.input, styles.flex]} />
        <TextInput label="Start time (HH:MM) *" value={time} onChangeText={setTime} mode="outlined" style={[styles.input, styles.flex]} />
      </View>
      <View style={styles.row}>
        <TextInput label="Duration (minutes, optional)" value={duration} onChangeText={setDuration} mode="outlined" keyboardType="numeric" style={[styles.input, styles.flex]} />
        <TextInput label="Venue *" value={venue} onChangeText={setVenue} mode="outlined" style={[styles.input, styles.flex]} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Invite participants</Text>
      <TextInput label="Search faculty by name" value={search} onChangeText={setSearch} mode="outlined" style={styles.input} />
      {isSearching ? <ActivityIndicator color={colors.primary} /> : null}
      {searchError ? <Text style={[styles.error, { color: colors.danger || colors.error }]}>Faculty search failed. Check the connection and retry.</Text> : null}
      {debouncedSearch.trim() && !isSearching && !searchError && candidates.length === 0 ? (
        <Text style={[styles.helper, { color: colors.textMuted }]}>No matching faculty found.</Text>
      ) : null}
      {candidates.slice(0, 8).map((person: any) => (
        <TouchableOpacity
          key={person.id}
          style={[styles.personRow, { borderColor: colors.border }]}
          onPress={() => setSelected((items) => [...items, person])}
        >
          <View style={styles.personInfo}>
            <Text style={[styles.personName, { color: colors.textPrimary }]}>{person.name}</Text>
            <Text style={[styles.helper, { color: colors.textSecondary }]}>{person.designation} · {person.department_name} ({person.department_code})</Text>
          </View>
          <Icon source="plus-circle-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      ))}
      {selected.length > 0 ? (
        <View style={styles.selectedSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Selected ({selected.length})</Text>
          {selected.map((person) => (
            <View key={person.id} style={[styles.selectedRow, { borderColor: colors.border }]}>
              <View style={styles.personInfo}>
                <Text style={[styles.personName, { color: colors.textPrimary }]}>{person.name}</Text>
                <Text style={[styles.helper, { color: colors.textSecondary }]}>{person.designation} · {person.department_name}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remove ${person.name}`} onPress={() => setSelected((items) => items.filter((item) => item.id !== person.id))}>
                <Icon source="close-circle-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

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
  flex: { minWidth: 0 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  personRow: { minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  personInfo: { flex: 1, minWidth: 0 },
  personName: { fontSize: 13, fontWeight: '600' },
  helper: { fontSize: 11, marginTop: 2 },
  selectedSection: { gap: 4, marginTop: 4 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 6, padding: 9, gap: 10 },
  error: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  cancelButton: { minHeight: 40, paddingHorizontal: 12, justifyContent: 'center', borderWidth: 1, borderRadius: 6 },
  submitButton: { minHeight: 40, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 6 },
  submitText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});