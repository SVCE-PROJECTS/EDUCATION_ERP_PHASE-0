// @ts-nocheck
import React from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import ScreenWrapper from '../../../layouts/faculty/ScreenWrapper';
import { useMeetingById } from '../../../hooks/useMeetings';
import { useTheme } from '../../../context/faculty/ThemeContext';
import { formatDateLong, format12Hour } from '../../../utils/dateHelpers';

export default function MeetingDetailsScreen({ route, navigation }: { route: any; navigation: any }) {
  const { colors } = useTheme();
  const { data: meeting, isLoading, error } = useMeetingById(route.params?.meetingId);

  return (
    <ScreenWrapper title="Meeting Details" scrollable={false} showTopbar={false}>
      {isLoading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : error || !meeting ? (
        <View style={styles.center}><Text style={{ color: colors.danger }}>Unable to load meeting details.</Text></View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.back} onPress={navigation.goBack}>
            <Icon source="arrow-left" size={20} color={colors.primary} /><Text style={{ color: colors.primary }}>Meetings</Text>
          </TouchableOpacity>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>{meeting.title}</Text>
          <Text style={[styles.type, { color: colors.primary }]}>{meeting.meeting_type === 'offline' ? 'Offline meeting' : 'Online meeting'}</Text>
          <View style={[styles.status, { backgroundColor: colors.primarySoft }]}><Text style={{ color: colors.primary, fontWeight: '700' }}>{meeting.status.replaceAll('_', ' ')}</Text></View>
          <View style={[styles.section, { borderColor: colors.border }]}>
            <Text style={[styles.info, { color: colors.textSecondary }]}>{formatDateLong(meeting.scheduled_date)} · {format12Hour(meeting.start_time)}</Text>
            {meeting.duration_minutes ? <Text style={[styles.info, { color: colors.textSecondary }]}>{meeting.duration_minutes} minutes</Text> : null}
            {meeting.location ? <Text style={[styles.info, { color: colors.textSecondary }]}>{meeting.location}</Text> : null}
            {meeting.description ? <Text style={[styles.description, { color: colors.textPrimary }]}>{meeting.description}</Text> : null}
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Participants ({meeting.participants?.length || 0})</Text>
          {(meeting.participants || []).map((person: any) => (
            <View key={person.participant_id} style={[styles.person, { borderColor: colors.border }]}>
              <View style={styles.personText}><Text style={[styles.personName, { color: colors.textPrimary }]}>{person.participant_name || person.name}</Text><Text style={{ color: colors.textSecondary }}>{person.designation || person.availability_status || 'Invited'}</Text></View>
              <Text style={{ color: colors.textSecondary }}>{person.availability_status || 'pending'}</Text>
            </View>
          ))}
          {meeting.meeting_url && meeting.status === 'in_progress' ? (
            <TouchableOpacity style={[styles.joinButton, { backgroundColor: colors.primary }]} onPress={() => Linking.openURL(meeting.meeting_url)}>
              <Icon source="video" size={20} color="#FFFFFF" /><Text style={styles.joinText}>Join meeting</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  heading: { fontSize: 22, fontWeight: '700' },
  type: { fontSize: 12, fontWeight: '700' },
  status: { alignSelf: 'flex-start', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  section: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 14, gap: 8 },
  info: { fontSize: 14 },
  description: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 6 },
  person: { minHeight: 48, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  personText: { flex: 1, minWidth: 0 },
  personName: { fontSize: 14, fontWeight: '600' },
  joinButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: 6, marginTop: 8 },
  joinText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});