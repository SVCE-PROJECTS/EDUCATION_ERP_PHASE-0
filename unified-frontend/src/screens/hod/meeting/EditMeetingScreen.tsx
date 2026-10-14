// @ts-nocheck
/**
 * HOD Portal - Edit Meeting Screen
 * Minimal editable HOD flow that mirrors the admin edit behaviour.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { Icon, TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import ScreenWrapper from '../../../layouts/hod/ScreenWrapper';
import { useMeetingById, useUpdateMeeting, useFacultyForInvitation } from '../../../hooks/useMeetings';
import { useTheme } from '../../../context/hod/ThemeContext';
import { spacing, radius, shadows } from '../../../theme';
import { formatDateShort, format12Hour, parseLocalDate } from '../../../utils/dateHelpers';
import MeetingDatePicker from '../../../components/meeting/MeetingDatePicker';
import MeetingTimePicker from '../../../components/meeting/MeetingTimePicker';

interface SelectedParticipant {
  id: string;
  name: string;
  designation: string;
  department_name: string;
}

export default function EditMeetingScreen({ route, navigation }: { route: any; navigation: any }) {
  const { meetingId } = route.params;
  const { colors } = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedParticipant[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showParticipantSearch, setShowParticipantSearch] = useState(false);

  const { data: meeting, isLoading: loadingMeeting } = useMeetingById(meetingId);
  const { mutateAsync: updateMeeting, isPending: isUpdating } = useUpdateMeeting();
  const { data: facultyMembers = [], isLoading: isLoadingFaculty } = useFacultyForInvitation({
    search: searchQuery.trim() || undefined,
  });

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
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a meeting title');
      return;
    }

    if (!durationMinutes || parseInt(durationMinutes, 10) <= 0) {
      Alert.alert('Error', 'Please enter a valid duration');
      return;
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
        participant_ids: selectedParticipants.map((p) => p.id),
      };

      await updateMeeting({ id: meetingId, ...meetingData });
      Alert.alert('Success', 'Meeting updated successfully', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update meeting');
    }
  };

  const handleAddParticipant = (faculty: any) => {
    if (selectedParticipants.find((p) => p.id === faculty.id)) {
      return;
    }

    setSelectedParticipants((prev) => [
      ...prev,
      {
        id: faculty.id,
        name: faculty.name,
        designation: faculty.designation,
        department_name: faculty.department_name,
      },
    ]);
    setSearchQuery('');
    setShowParticipantSearch(false);
  };

  const handleRemoveParticipant = (participantId: string) => {
    setSelectedParticipants((prev) => prev.filter((p) => p.id !== participantId));
  };

  const filteredFaculty = facultyMembers.filter((f) => !selectedParticipants.find((p) => p.id === f.id));

  if (loadingMeeting) {
    return (
      <ScreenWrapper title="Edit Meeting" scrollable={false} showTopbar={false}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading meeting...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper title="Edit Meeting" scrollable={false} showTopbar={false}>
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

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Duration (minutes) *</Text>
                <TextInput value={durationMinutes} onChangeText={setDurationMinutes} placeholder="60" mode="outlined" keyboardType="numeric" style={styles.textInput} theme={{ colors: { primary: colors.primary } }} />
              </View>
            </View>

            <View style={[styles.inputGroup, { marginBottom: spacing.xl }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Participants</Text>
              <View style={styles.participantSearchContainer}>
                <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search faculty to add as participants" mode="outlined" style={styles.textInput} theme={{ colors: { primary: colors.primary } }} right={<TextInput.Icon icon="magnify" />} onFocus={() => setShowParticipantSearch(true)} onBlur={() => setTimeout(() => setShowParticipantSearch(false), 180)} />

                {showParticipantSearch && (
                  <View style={[styles.searchResultsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <ScrollView style={styles.searchResults} nestedScrollEnabled showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
                      {isLoadingFaculty ? (
                        <View style={styles.searchLoading}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.searchLoadingText, { color: colors.textMuted }]}>Searching faculty...</Text></View>
                      ) : filteredFaculty.length === 0 ? (
                        <View style={styles.noResultsContainer}><Text style={[styles.noResults, { color: colors.textMuted }]}>No faculty found</Text></View>
                      ) : (
                        filteredFaculty.slice(0, 8).map((faculty) => (
                          <TouchableOpacity key={faculty.id} style={styles.searchResultItem} onPress={() => handleAddParticipant(faculty)} activeOpacity={0.7}>
                            <View style={styles.facultyInfo}><Text style={[styles.facultyName, { color: colors.textPrimary }]}>{faculty.name}</Text><Text style={[styles.facultyDetails, { color: colors.textMuted }]}>{faculty.designation} • {faculty.department_name}</Text></View>
                            <Icon source="plus-circle" size={24} color={colors.primary} />
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {selectedParticipants.length > 0 && (
                <View style={styles.selectedParticipants}>
                  <Text style={[styles.participantLabel, { color: colors.textSecondary }]}>Selected Participants ({selectedParticipants.length})</Text>
                  <View style={styles.participantChips}>
                    {selectedParticipants.map((participant) => (
                      <View key={participant.id} style={[styles.participantChip, { backgroundColor: colors.primarySoft }]}>
                        <View style={styles.participantInfo}><Text style={[styles.participantName, { color: colors.primary }]}>{participant.name}</Text><Text style={[styles.participantDesignation, { color: colors.textMuted }]}>{participant.designation}</Text></View>
                        <TouchableOpacity onPress={() => handleRemoveParticipant(participant.id)} style={styles.removeButton} activeOpacity={0.7}><Icon source="close-circle" size={20} color={colors.textMuted} /></TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              )}
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
  textInput: { fontSize: 16 },
  row: { flexDirection: 'row', gap: spacing.md },
  flex1: { flex: 1 },
  dateTimeButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, minHeight: 56 },
  dateTimeText: { fontSize: 16, flex: 1 },
  participantSearchContainer: { position: 'relative', zIndex: 10 },
  searchResultsContainer: { position: 'absolute', top: '100%', left: 0, right: 0, borderRadius: radius.md, borderWidth: 1, maxHeight: 200, zIndex: 1000, elevation: 10 },
  searchResults: { maxHeight: 200 },
  searchLoading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  searchLoadingText: { fontSize: 14 },
  noResultsContainer: { padding: spacing.md, alignItems: 'center' },
  noResults: { fontSize: 14, textAlign: 'center' },
  searchResultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  facultyInfo: { flex: 1 },
  facultyName: { fontSize: 15, fontWeight: '600' },
  facultyDetails: { fontSize: 13, marginTop: 2 },
  selectedParticipants: { marginTop: spacing.md },
  participantLabel: { fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
  participantChips: { flexDirection: 'column', gap: spacing.xs },
  participantChip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 14, fontWeight: '600' },
  participantDesignation: { fontSize: 12, marginTop: 2 },
  removeButton: { padding: 4, marginLeft: spacing.sm },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md, marginTop: spacing.md },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  loadingText: { fontSize: 14, marginTop: spacing.sm },
});