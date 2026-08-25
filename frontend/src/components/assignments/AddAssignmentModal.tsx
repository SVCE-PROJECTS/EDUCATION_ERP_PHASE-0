import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { Assignment } from '../../types';
import Colors from '../../theme/colors';

interface AssignmentForm {
  id: number;
  title: string;
  subject: string;
  semester: string;
  dueDate: string;
  marks: string;
  status:  'Open' | 'Closed' | 'Graded';
}

interface AddAssignmentModalProps {
  show:           boolean;
  onClose:        () => void;
  onSave:         (assignment: Assignment) => void;
  editAssignment: Assignment | null;
}

export default function AddAssignmentModal({ show, onClose, onSave, editAssignment }: AddAssignmentModalProps) {
  const [title,    setTitle]    = useState('');
  const [subject,  setSubject]  = useState('');
  const [semester, setSemester] = useState('');
  const [dueDate,  setDueDate]  = useState('');
  const [marks,    setMarks]    = useState('');
  const [status,   setStatus]   = useState<'Open' | 'Closed' | 'Graded'>('Open');

  useEffect(() => {
    if (editAssignment) {
      setTitle(editAssignment.title);
      setSubject(editAssignment.subject);
      setSemester(editAssignment.semester?.toString() ?? '');
      setDueDate(editAssignment.dueDate ?? '');
      setMarks(editAssignment.marks?.toString() ?? '');
      setStatus(editAssignment.status as 'Open' | 'Closed' | 'Graded');
    } else {
      setTitle(''); setSubject(''); setSemester(''); setDueDate(''); setMarks(''); setStatus('Open');
    }
  }, [editAssignment, show]);

  const handleSave = () => {
    if (!title || !subject || !semester || !dueDate || !marks) {
      Alert.alert('Validation', 'Please fill all fields.'); return;
    }
    onSave({
      id:       editAssignment ? editAssignment.id : 0,
      title, subject, semester, dueDate, marks: Number(marks), status,
    });
    onClose();
  };

  const fields: { val: string; set: (v: string) => void; placeholder: string; keyboardType?: any }[] = [
    { val: title,    set: setTitle,    placeholder: 'Assignment Title' },
    { val: subject,  set: setSubject,  placeholder: 'Subject' },
    { val: semester, set: setSemester, placeholder: 'Semester',             keyboardType: 'numeric' },
    { val: dueDate,  set: setDueDate,  placeholder: 'Due Date (YYYY-MM-DD)' },
    { val: marks,    set: setMarks,    placeholder: 'Maximum Marks',        keyboardType: 'numeric' },
  ];

  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.centred}>
          <View style={styles.card}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editAssignment ? 'Edit Assignment' : 'Create Assignment'}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {fields.map((f, i) => (
                <TextInput
                  key={i}
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={Colors.textMuted}
                  value={f.val}
                  onChangeText={f.set}
                  keyboardType={f.keyboardType ?? 'default'}
                />
              ))}
              <Text style={styles.pickerLabel}>Status</Text>
              <View style={styles.pickerWrapper}>
                <Picker selectedValue={status} onValueChange={setStatus} style={styles.picker}>
                  <Picker.Item label="Open" value="Open" />
                  <Picker.Item label="Closed" value="Closed" />
                </Picker>
              </View>
              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  centred:       { width: '92%', maxWidth: 480 },
  card:          { backgroundColor: Colors.white, borderRadius: 18, padding: 22, maxHeight: '90%', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:    { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  input:         { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: Colors.textPrimary, marginBottom: 12 },
  pickerLabel:   { fontSize: 13, color: Colors.textSecondary, fontWeight: '600', marginBottom: 6 },
  pickerWrapper: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, overflow: 'hidden', backgroundColor: Colors.background, marginBottom: 18 },
  picker:        { height: 50, color: Colors.textPrimary },
  btnRow:        { flexDirection: 'row', gap: 10 },
  saveBtn:       { flex: 1, backgroundColor: Colors.success, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveBtnText:   { color: Colors.white, fontWeight: '700', fontSize: 15 },
  cancelBtn:     { flex: 1, backgroundColor: Colors.background, borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
});
