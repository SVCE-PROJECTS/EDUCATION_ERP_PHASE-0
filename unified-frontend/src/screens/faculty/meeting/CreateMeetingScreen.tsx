// @ts-nocheck
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon, TextInput } from 'react-native-paper';
import ScreenWrapper from '../../../layouts/faculty/ScreenWrapper';
import { useCreateMeeting, useFacultyForInvitation } from '../../../hooks/useMeetings';
import { useTheme } from '../../../context/faculty/ThemeContext';
import { ROUTES } from '../../../navigation/faculty/routes';

export default function CreateMeetingScreen({ navigation }: { navigation: any }) {
  const { colors } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState('60');
  const [search, setSearch] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<any[]>([]);
  const { data: faculty = [], isLoading: facultyLoading } = useFacultyForInvitation({ search: search.trim() || undefined });
  const { mutateAsync: createMeeting, isPending } = useCreateMeeting();
  const availableFaculty = faculty.filter((item: any) => !selectedParticipants.some((p) => p.id === item.id));

  const submit = async () => {
    if (!title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) || !/^\d{2}:\d{2}$/.test(startTime) || Number(duration) < 1) {
      Alert.alert('Check meeting details', 'Enter a title, valid date and time, and a duration greater than zero.');
      return;
    }
    try {
      const meeting = await createMeeting({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduled_date: scheduledDate,
        start_time: startTime,
        duration_minutes: Number(duration),
        participant_ids: selectedParticipants.map((participant) => participant.id),
      });
      navigation.replace(ROUTES.MEETING_DETAILS, { meetingId: meeting.meeting_id });
    } catch (error: any) {
      Alert.alert('Unable to create meeting', error.message || 'Please try again.');
    }
  };

  return (
    <ScreenWrapper title="Create Meeting" scrollable={false} showTopbar={false}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={[styles.backButton, { borderColor: colors.border }]} onPress={navigation.goBack}>
          <Icon source="arrow-left" size={18} color={colors.primary} /><Text style={{ color: colors.primary }}>Meetings</Text>
        </TouchableOpacity>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>New meeting</Text>
        <TextInput label="Title" value={title} onChangeText={setTitle} mode="outlined" style={styles.input} />
        <TextInput label="Description" value={description} onChangeText={setDescription} mode="outlined" multiline style={styles.input} />
        <View style={styles.row}>
          <TextInput label="Date (YYYY-MM-DD)" value={scheduledDate} onChangeText={setScheduledDate} mode="outlined" style={[styles.input, styles.half]} />
          <TextInput label="Start time" value={startTime} onChangeText={setStartTime} mode="outlined" style={[styles.input, styles.half]} />
        </View>
        <TextInput label="Duration (minutes)" value={duration} onChangeText={setDuration} mode="outlined" keyboardType="numeric" style={styles.input} />
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Invite faculty</Text>
        <TextInput label="Search faculty" value={search} onChangeText={setSearch} mode="outlined" style={styles.input} />
        {facultyLoading ? <ActivityIndicator color={colors.primary} /> : availableFaculty.slice(0, 8).map((person: any) => (
          <TouchableOpacity key={person.id} style={[styles.personRow, { borderColor: colors.border }]} onPress={() => setSelectedParticipants((items) => [...items, person])}>
            <View style={styles.personText}>
              <Text style={[styles.personName, { color: colors.textPrimary }]}>{person.name}</Text>
              <Text style={{ color: colors.textSecondary }}>{person.designation} · {person.department_name}</Text>
            </View>
            <Icon source="plus-circle-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        ))}
        {selectedParticipants.map((person) => (
          <TouchableOpacity key={person.id} style={[styles.selectedRow, { backgroundColor: colors.primarySoft }]} onPress={() => setSelectedParticipants((items) => items.filter((item) => item.id !== person.id))}>
            <Text style={{ color: colors.primary }}>{person.name}</Text><Text style={{ color: colors.primary }}>Remove</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary, opacity: isPending ? 0.65 : 1 }]} onPress={submit} disabled={isPending}>
          {isPending ? <ActivityIndicator color="#FFFFFF" /> : <Icon source="calendar-plus" size={20} color="#FFFFFF" />}
          <Text style={styles.submitText}>{isPending ? 'Creating…' : 'Create meeting'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  backButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 7 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  input: { backgroundColor: 'transparent' },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, minWidth: 0 },
  personRow: { minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  personText: { flex: 1, minWidth: 0 },
  personName: { fontSize: 14, fontWeight: '600' },
  selectedRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderRadius: 6 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 6, marginTop: 8 },
  submitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});