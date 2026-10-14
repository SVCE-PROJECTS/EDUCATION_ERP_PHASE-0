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
  Alert,
  Platform,
} from 'react-native';
import { Icon, TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
// Web-compatible date input fallback
import { TextInput as RNTextInput } from 'react-native';
import ScreenLayout from '../../../navigation/admin/ScreenLayout';
import { useMeetingById, useUpdateMeeting, useFacultyForInvitation } from '../../../hooks/useMeetings';
import { useTheme } from '../../../context/admin/ThemeContext';
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

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedParticipant[]>([]);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showParticipantSearch, setShowParticipantSearch] = useState(false);

  const { data: meeting, isLoading: loadingMeeting } = useMeetingById(meetingId);
  const { mutateAsync: updateMeeting, isPending: isUpdating } = useUpdateMeeting();
  const { data: facultyMembers = [], isLoading: isLoadingFaculty } = useFacultyForInvitation({
    search: searchQuery.trim() || undefined
  });

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
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a meeting title');
      return;
    }

    if (!durationMinutes || parseInt(durationMinutes) <= 0) {
      Alert.alert('Error', 'Please enter a valid duration');
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
        start_time: `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}`,
        duration_minutes: parseInt(durationMinutes),
        participant_ids: selectedParticipants.map(p => p.id),
      };

      await updateMeeting({ id: meetingId, ...meetingData });
      Alert.alert('Success', 'Meeting updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update meeting');
    }
  };

  const handleAddParticipant = (faculty: any) => {
    if (selectedParticipants.find(p => p.id === faculty.id)) {
      return; // Already selected
    }

    setSelectedParticipants(prev => [...prev, {
      id: faculty.id,
      name: faculty.name,
      designation: faculty.designation,
      department_name: faculty.department_name,
    }]);
    setSearchQuery('');
    setShowParticipantSearch(false);
  };

  const handleRemoveParticipant = (participantId: string) => {
    setSelectedParticipants(prev => prev.filter(p => p.id !== participantId));
  };

  const filteredFaculty = facultyMembers.filter(f =>
    !selectedParticipants.find(p => p.id === f.id)
  );

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
            <Text style={[s.label, { color: colors.textSecondary }]}>Participants</Text>

            {/* Search Input */}
            <View style={s.participantSearchContainer}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search faculty to add as participants"
                mode="outlined"
                style={s.textInput}
                theme={{ colors: { primary: colors.primary } }}
                right={<TextInput.Icon icon="magnify" />}
                onFocus={() => setShowParticipantSearch(true)}
              />

              {/* Search Results */}
              {showParticipantSearch && searchQuery && (
                <View style={[s.searchResults, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {isLoadingFaculty ? (
                    <View style={s.searchLoading}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={[s.searchLoadingText, { color: colors.textMuted }]}>Searching...</Text>
                    </View>
                  ) : filteredFaculty.length === 0 ? (
                    <Text style={[s.noResults, { color: colors.textMuted }]}>
                      No faculty found matching "{searchQuery}"
                    </Text>
                  ) : (
                    filteredFaculty.slice(0, 10).map(faculty => (
                      <TouchableOpacity
                        key={faculty.id}
                        style={s.searchResultItem}
                        onPress={() => handleAddParticipant(faculty)}
                      >
                        <View>
                          <Text style={[s.facultyName, { color: colors.textPrimary }]}>
                            {faculty.name}
                          </Text>
                          <Text style={[s.facultyDetails, { color: colors.textMuted }]}>
                            {faculty.designation} • {faculty.department_name}
                          </Text>
                        </View>
                        <Icon source="plus" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* Selected Participants */}
            {selectedParticipants.length > 0 && (
              <View style={s.selectedParticipants}>
                <Text style={[s.participantLabel, { color: colors.textSecondary }]}>
                  Selected Participants ({selectedParticipants.length})
                </Text>
                {selectedParticipants.map(participant => (
                  <View key={participant.id} style={[s.participantChip, { backgroundColor: colors.primarySoft }]}>
                    <View style={s.participantInfo}>
                      <Text style={[s.participantName, { color: colors.primary }]}>
                        {participant.name}
                      </Text>
                      <Text style={[s.participantDesignation, { color: colors.textMuted }]}>
                        {participant.designation}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveParticipant(participant.id)}
                      style={s.removeButton}
                    >
                      <Icon source="close" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
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

  participantSearchContainer: { position: 'relative' },
  searchResults: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: radius.md,
    borderWidth: 1,
    maxHeight: 200,
    zIndex: 1000,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  searchLoadingText: { fontSize: 14 },
  noResults: {
    padding: spacing.md,
    fontSize: 14,
    textAlign: 'center',
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  facultyName: { fontSize: 15, fontWeight: '600' },
  facultyDetails: { fontSize: 13, marginTop: 2 },

  selectedParticipants: { marginTop: spacing.md },
  participantLabel: { fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 14, fontWeight: '600' },
  participantDesignation: { fontSize: 12, marginTop: 2 },
  removeButton: { padding: 4 },

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