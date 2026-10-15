// @ts-nocheck
/**
 * Admin Portal - Create Meeting Screen
 * Form to create new meetings with participant selection
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
import { Icon, TextInput, Menu } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
// Web-compatible date input fallback
import { TextInput as RNTextInput } from 'react-native';
import ScreenWrapper from '../../../layouts/hod/ScreenWrapper';
import { useCreateMeeting, useFacultyForInvitation } from '../../../hooks/useMeetings';
import { useQueryClient } from '@tanstack/react-query';
import { spacing, radius, shadows } from '../../../theme';
import { formatDateShort, format12Hour } from '../../../utils/dateHelpers';

import { useTheme } from '../../../context/hod/ThemeContext';
import MeetingDatePicker from '../../../components/meeting/MeetingDatePicker';
import MeetingTimePicker from '../../../components/meeting/MeetingTimePicker';
import { getTodayString } from '../../../utils/dateHelpers';

interface SelectedParticipant {
  id: string;
  name: string;
  designation: string;
  department_name: string;
}

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
  const [location, setLocation] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedParticipant[]>([]);

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showParticipantSearch, setShowParticipantSearch] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdMeeting, setCreatedMeeting] = useState<any>(null);

  const { mutateAsync: createMeeting, isPending: isCreating } = useCreateMeeting();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: facultyMembers = [], isLoading: isLoadingFaculty, error: facultyError } = useFacultyForInvitation({
    search: debouncedSearch.trim() || undefined
  });

  const handleSubmit = async () => {
    // Reset errors
    setTitleError('');
    setDurationError('');

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
        location: location.trim() || undefined,
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
      Alert.alert('Error', errorMessage);
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
    setLocation('');
    setDurationMinutes('60');
    setDurationError('');
    setSearchQuery('');
    setDebouncedSearch('');
    setCreatedMeeting(null);
    // Navigate back to meetings list
    navigation.goBack();
  };

  const handleOpenMeetingLink = () => {
    if (createdMeeting?.meeting_url) {
      if (Platform.OS === 'web') {
        window.open(createdMeeting.meeting_url, '_blank');
      } else {
        // For mobile, you might want to use Linking.openURL
        Alert.alert('Meeting Link', createdMeeting.meeting_url);
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

  const handleAddParticipant = (faculty: any) => {
    // Check by exact ID match to prevent duplicates
    if (selectedParticipants.find(p => p.id === faculty.id)) {
      return; // Already selected
    }

    setSelectedParticipants(prev => [...prev, {
      id: faculty.id,
      name: faculty.name,
      designation: faculty.designation,
      department_name: faculty.department_name,
    }]);

    // Keep search query to allow adding more faculty without clearing search
    setShowParticipantSearch(false);
  };

  const handleRemoveParticipant = (participantId: string) => {
    setSelectedParticipants(prev => prev.filter(p => p.id !== participantId));
  };

  const handleSearchInputFocus = () => {
    setShowParticipantSearch(true);
  };

  const handleSearchInputBlur = () => {
    // Delay closing to allow clicking on results
    setTimeout(() => {
      setShowParticipantSearch(false);
    }, 200); // Increased delay for better UX
  };

  // Filter out already selected faculty from search results
  const filteredFaculty = facultyMembers.filter(f =>
    !selectedParticipants.find(p => p.id === f.id)
  );

  return (
    <ScreenWrapper title="Create Meeting" scrollable={false} showTopbar={false}>
      <View style={s.container}>
        <ScrollView style={s.scrollView} contentContainerStyle={s.scrollContent}>
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

          {/* Duration and Location */}
          <View style={s.row}>
            <View style={[s.inputGroup, s.flex1]}>
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

            <View style={[s.inputGroup, s.flex1]}>
              <Text style={[s.label, { color: colors.textSecondary }]}>Location</Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Enter location (optional)"
                mode="outlined"
                style={s.textInput}
                theme={{ colors: { primary: colors.primary } }}
              />
            </View>
          </View>

          {/* Participants */}
          <View style={[s.inputGroup, { marginBottom: spacing.xl }]}>
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
                onFocus={handleSearchInputFocus}
                onBlur={handleSearchInputBlur}
              />

              {/* Search Results */}
              {showParticipantSearch && (
                <View style={[s.searchResultsContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <ScrollView
                    style={s.searchResults}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    {isLoadingFaculty ? (
                      <View style={s.searchLoading}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={[s.searchLoadingText, { color: colors.textMuted }]}>Searching faculty...</Text>
                      </View>
                    ) : facultyError ? (
                      <View style={s.searchError}>
                        <Text style={[s.errorText, { color: colors.error }]}>Failed to load faculty</Text>
                        <Text style={[s.errorSubtext, { color: colors.textMuted }]}>Please try again</Text>
                      </View>
                    ) : filteredFaculty.length === 0 ? (
                      <View style={s.noResultsContainer}>
                        {debouncedSearch ? (
                          <Text style={[s.noResults, { color: colors.textMuted }]}>
                            No faculty found matching "{debouncedSearch}"
                          </Text>
                        ) : (
                          <Text style={[s.noResults, { color: colors.textMuted }]}>
                            Start typing to search for faculty members
                          </Text>
                        )}
                      </View>
                    ) : (
                      filteredFaculty.slice(0, 8).map(faculty => (
                        <TouchableOpacity
                          key={faculty.id}
                          style={s.searchResultItem}
                          onPress={() => handleAddParticipant(faculty)}
                          activeOpacity={0.7}
                        >
                          <View style={s.facultyInfo}>
                            <Text style={[s.facultyName, { color: colors.textPrimary }]}>
                              {faculty.name}
                            </Text>
                            <Text style={[s.facultyDetails, { color: colors.textMuted }]}>
                              {faculty.designation} • {faculty.department_name}
                            </Text>
                          </View>
                          <Icon source="plus-circle" size={24} color={colors.primary} />
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Selected Participants */}
            {selectedParticipants.length > 0 && (
              <View style={s.selectedParticipants}>
                <Text style={[s.participantLabel, { color: colors.textSecondary }]}>
                  Selected Participants ({selectedParticipants.length})
                </Text>
                <View style={s.participantChips}>
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
                        activeOpacity={0.7}
                      >
                        <Icon source="close-circle" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
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

              {createdMeeting?.meeting_url && (
                <TouchableOpacity
                  style={[s.linkButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                  onPress={handleOpenMeetingLink}
                >
                  <Icon source="video" size={20} color={colors.primary} />
                  <Text style={[s.linkButtonText, { color: colors.primary }]}>
                    Open Jitsi Meeting
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
      </View>
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
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

  participantSearchContainer: {
    position: 'relative',
    zIndex: 10,
  },
  searchResultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: radius.md,
    borderWidth: 1,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  searchResults: {
    maxHeight: 200,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  searchLoadingText: { fontSize: 14 },
  searchError: {
    alignItems: 'center',
    padding: spacing.md,
  },
  errorText: { fontSize: 14, fontWeight: '600' },
  errorText: { fontSize: 12, marginTop: 4 },
  noResultsContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  noResults: {
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
  facultyInfo: {
    flex: 1,
  },
  facultyName: { fontSize: 15, fontWeight: '600' },
  facultyDetails: { fontSize: 13, marginTop: 2 },

  selectedParticipants: { marginTop: spacing.md },
  participantLabel: { fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
  participantChips: {
    flexDirection: 'column',
    gap: spacing.xs,
  },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 14, fontWeight: '600' },
  participantDesignation: { fontSize: 12, marginTop: 2 },
  removeButton: {
    padding: 4,
    marginLeft: spacing.sm,
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