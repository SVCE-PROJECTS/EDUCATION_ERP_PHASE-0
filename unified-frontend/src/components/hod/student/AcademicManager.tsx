import React, { ReactNode, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button, { ButtonText } from '../ui/Button';
import Dropdown, { DropdownOption } from '../ui/Dropdown';
import Modal from '../ui/Modal';
import { Plus } from '../icons';
import { useTheme } from '../../../context/hod/ThemeContext';
import { ThemeColors } from '../../../theme/hod/colors';
import academicService from '../../../services/hod/academic.service';

type Mode = 'subjects' | 'timetable';

interface AcademicManagerProps {
  semester: number;
  sectionId: string;
  sectionName: string;
  mode: Mode;
  children: ReactNode;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AcademicManager({ semester, sectionId, sectionName, mode, children }: AcademicManagerProps) {
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<'subject' | 'assignment' | 'timetable' | null>(null);
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [credits, setCredits] = useState('');
  const [programId, setProgramId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [classId, setClassId] = useState('');
  const [day, setDay] = useState('Monday');
  const [period, setPeriod] = useState('1');
  const [roomNumber, setRoomNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: options } = useQuery({
    queryKey: ['hodAcademicOptions', semester],
    queryFn: () => academicService.getOptions(semester),
  });
  const { data: classes = [] } = useQuery({
    queryKey: ['hodAcademicClasses', semester, sectionId],
    queryFn: () => academicService.getClasses(semester, sectionId),
    enabled: !!sectionId,
  });
  const { data: slots = [] } = useQuery({
    queryKey: ['hodAcademicTimetable', semester, sectionId],
    queryFn: () => academicService.getTimetable(semester, sectionId),
    enabled: !!sectionId,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['hodAcademicOptions', semester] }),
      queryClient.invalidateQueries({ queryKey: ['hodAcademicClasses', semester, sectionId] }),
      queryClient.invalidateQueries({ queryKey: ['hodAcademicTimetable', semester, sectionId] }),
      queryClient.invalidateQueries({ queryKey: ['sectionDashboard', semester, sectionName] }),
    ]);
  };

  const close = () => {
    setModal(null);
    setError('');
  };

  const submit = async (action: () => Promise<unknown>) => {
    setSaving(true);
    setError('');
    try {
      await action();
      await refresh();
      close();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not save this change. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const programOptions: DropdownOption[] = (options?.programs ?? []).map((item) => ({ label: item.name, value: String(item.id) }));
  const subjectOptions: DropdownOption[] = (options?.subjects ?? []).map((item) => ({
    label: `${item.subjectName} (${item.subjectCode})`, value: String(item.id),
  }));
  const facultyOptions: DropdownOption[] = (options?.faculty ?? []).map((item) => ({
    label: item.name, value: String(item.id), meta: item.designation,
  }));
  const classOptions: DropdownOption[] = classes.map((item) => ({
    label: `${item.subjectName} (${item.subjectCode})`, value: String(item.id), meta: item.facultyName,
  }));
  const dayOptions = DAYS.map((item) => ({ label: item, value: item }));
  const periodOptions = Array.from({ length: 8 }, (_, index) => ({ label: `Period ${index + 1}`, value: String(index + 1) }));

  const openModal = (next: typeof modal) => {
    setError('');
    setModal(next);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.actions}>
        {mode === 'subjects' ? (
          <>
            <Button size="sm" variant="outline" onPress={() => openModal('subject')}>
              <Plus size={15} color={theme.textSecondary} /><ButtonText variant="outline" size="sm">Add Subject</ButtonText>
            </Button>
            <Button size="sm" onPress={() => openModal('assignment')}>
              <Plus size={15} color="#FFFFFF" /><ButtonText size="sm">Assign Faculty</ButtonText>
            </Button>
          </>
        ) : (
          <Button size="sm" onPress={() => openModal('timetable')}>
            <Plus size={15} color="#FFFFFF" /><ButtonText size="sm">Add Timetable Slot</ButtonText>
          </Button>
        )}
      </View>
      {children}

      {mode === 'timetable' && slots.length > 0 && (
        <View style={styles.slotList}>
          {slots.map((slot: any) => (
            <View key={String(slot.timetableId)} style={styles.slotRow}>
              <View style={styles.slotInfo}>
                <Text style={styles.slotTitle}>{slot.day}, Period {slot.period}</Text>
                <Text style={styles.slotMeta}>{slot.subject?.subjectName} · {slot.faculty?.name}{slot.roomNumber ? ` · ${slot.roomNumber}` : ''}</Text>
              </View>
              <Button size="sm" variant="ghost" disabled={saving} onPress={() => submit(() => academicService.deleteTimetable(slot.timetableId))}>
                <ButtonText variant="ghost" size="sm">Remove</ButtonText>
              </Button>
            </View>
          ))}
        </View>
      )}

      <Modal
        isOpen={modal === 'subject'}
        onClose={close}
        title={`Add subject · Semester ${semester}`}
        footer={(
          <>
            <Button variant="outline" onPress={close} disabled={saving}>Cancel</Button>
            <Button loading={saving} disabled={!subjectCode.trim() || !subjectName.trim() || !programId} onPress={() => submit(() => academicService.createSubject({
              subjectCode: subjectCode.trim(),
              subjectName: subjectName.trim(),
              credits: credits ? Number(credits) : null,
              programId,
              semesterNumber: semester,
            }))}>Save Subject</Button>
          </>
        )}
      >
        <Text style={styles.label}>Subject code</Text>
        <TextInput style={styles.input} value={subjectCode} onChangeText={setSubjectCode} placeholder="e.g. CS401" placeholderTextColor={theme.textMuted} autoCapitalize="characters" />
        <Text style={styles.label}>Subject name</Text>
        <TextInput style={styles.input} value={subjectName} onChangeText={setSubjectName} placeholder="Enter subject name" placeholderTextColor={theme.textMuted} />
        <Dropdown label="Program" placeholder="Select program" options={programOptions} value={programId} onChange={setProgramId} />
        <Text style={styles.label}>Credits</Text>
        <TextInput style={styles.input} value={credits} onChangeText={setCredits} placeholder="Optional" placeholderTextColor={theme.textMuted} keyboardType="numeric" />
        {!!error && <Text style={styles.error}>{error}</Text>}
      </Modal>

      <Modal
        isOpen={modal === 'assignment'}
        onClose={close}
        title={`Assign subject and faculty · Section ${sectionName}`}
        footer={(
          <>
            <Button variant="outline" onPress={close} disabled={saving}>Cancel</Button>
            <Button loading={saving} disabled={!subjectId || !facultyId} onPress={() => submit(() => academicService.createClass({
              semesterNumber: semester,
              sectionId,
              subjectId,
              facultyId,
              academicYear: options?.academicYear || '',
            }))}>Save Assignment</Button>
          </>
        )}
      >
        <Dropdown label="Subject" placeholder="Select subject" options={subjectOptions} value={subjectId} onChange={setSubjectId} emptyText="Add a subject first" />
        <Dropdown label="Designated faculty" placeholder="Select faculty" options={facultyOptions} value={facultyId} onChange={setFacultyId} emptyText="No active faculty found in this department" />
        {!!error && <Text style={styles.error}>{error}</Text>}
      </Modal>

      <Modal
        isOpen={modal === 'timetable'}
        onClose={close}
        title={`Add timetable slot · Section ${sectionName}`}
        footer={(
          <>
            <Button variant="outline" onPress={close} disabled={saving}>Cancel</Button>
            <Button loading={saving} disabled={!classId} onPress={() => submit(() => academicService.createTimetable({
              classId,
              dayOfWeek: day,
              period: Number(period),
              roomNumber: roomNumber.trim(),
            }))}>Save Slot</Button>
          </>
        )}
      >
        <Dropdown label="Assigned subject and faculty" placeholder="Select an assignment" options={classOptions} value={classId} onChange={setClassId} emptyText="Assign a subject and faculty first" />
        <Dropdown label="Day" options={dayOptions} value={day} onChange={setDay} />
        <Dropdown label="Period" options={periodOptions} value={period} onChange={setPeriod} />
        <Text style={styles.label}>Room (optional)</Text>
        <TextInput style={styles.input} value={roomNumber} onChangeText={setRoomNumber} placeholder="Room number" placeholderTextColor={theme.textMuted} />
        {!!error && <Text style={styles.error}>{error}</Text>}
      </Modal>
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  wrap: { gap: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 },
  label: { color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: theme.textPrimary, backgroundColor: theme.surface, marginBottom: 8 },
  error: { color: '#DC2626', fontSize: 12, marginTop: 10 },
  slotList: { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 4 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: theme.border, paddingVertical: 8 },
  slotInfo: { flex: 1, minWidth: 0 },
  slotTitle: { fontSize: 12, fontWeight: '600', color: theme.textPrimary },
  slotMeta: { fontSize: 11, color: theme.textMuted, marginTop: 3 },
});