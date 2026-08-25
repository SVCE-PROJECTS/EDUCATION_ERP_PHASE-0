import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Student } from '../../types';
import Colors from '../../theme/colors';

interface StudentForm {
  id?: number;
  usn: string;
  name: string;
  email: string;
  phone: string;
  semester: string;
  section: string;
  status: string;
  counsellor: string;
}

interface AddStudentModalProps {
  show:        boolean;
  onClose:     () => void;
  onSave:      (student: Student) => void;
  editStudent: Student | null;
}

export default function AddStudentModal({ show, onClose, onSave, editStudent }: AddStudentModalProps) {
  const [formData, setFormData] = useState<StudentForm>({
    usn: '', name: '', email: '', phone: '', semester: '', section: '', status: 'Active', counsellor: '',
  });

  useEffect(() => {
    if (editStudent) {
      setFormData({
        id:         editStudent.id,
        usn:        editStudent.usn ?? '',
        name:       editStudent.name ?? '',
        email:      editStudent.email ?? '',
        phone:      editStudent.phone ?? '',
        semester:   editStudent.semester?.toString() ?? '',
        section:    editStudent.section ?? '',
        status:     editStudent.status ?? 'Active',
        counsellor: editStudent.counsellor ?? '',
      });
    } else {
      setFormData({ usn: '', name: '', email: '', phone: '', semester: '', section: '', status: 'Active', counsellor: '' });
    }
  }, [editStudent, show]);

  const set = (key: keyof StudentForm) => (val: string) =>
    setFormData(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    if (!formData.usn || !formData.name || !formData.semester || !formData.section) {
      Alert.alert('Validation', 'Please fill all required fields.');
      return;
    }
    onSave({
      id:         formData.id ?? 0,
      usn:        formData.usn,
      name:       formData.name,
      email:      formData.email || undefined,
      phone:      formData.phone || undefined,
      semester:   formData.semester,
      section:    formData.section,
      status:     formData.status,
      counsellor: formData.counsellor || undefined,
    });
  };

  const fields: { key: keyof StudentForm; placeholder: string; keyboardType?: any }[] = [
    { key: 'usn',        placeholder: 'USN *' },
    { key: 'name',       placeholder: 'Student Name *' },
    { key: 'email',      placeholder: 'Email',     keyboardType: 'email-address' },
    { key: 'phone',      placeholder: 'Phone',     keyboardType: 'phone-pad' },
    { key: 'semester',   placeholder: 'Semester *', keyboardType: 'numeric' },
    { key: 'section',    placeholder: 'Section *' },
    { key: 'counsellor', placeholder: 'Counsellor / Mentor Name' },
  ];

  return (
    <Modal visible={show} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.centred}>
          <View style={styles.card}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editStudent ? 'Edit Student' : 'Add Student'}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {fields.map(field => (
                <TextInput
                  key={field.key}
                  style={styles.input}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.textMuted}
                  value={formData[field.key] as string}
                  onChangeText={set(field.key)}
                  keyboardType={field.keyboardType ?? 'default'}
                  autoCapitalize="none"
                />
              ))}

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status</Text>
                {['Active', 'Inactive'].map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusChip, formData.status === s && styles.statusChipActive]}
                    onPress={() => set('status')(s)}
                  >
                    <Text style={[styles.statusChipText, formData.status === s && styles.statusChipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>{editStudent ? 'Update' : 'Save'}</Text>
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
  backdrop:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  centred:           { width: '92%', maxWidth: 480 },
  card:              { backgroundColor: Colors.white, borderRadius: 18, padding: 22, maxHeight: '90%', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
  modalHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle:        { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  input:             { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: Colors.textPrimary, marginBottom: 12 },
  statusRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 10 },
  statusLabel:       { fontSize: 14, color: Colors.textSecondary, marginRight: 4 },
  statusChip:        { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  statusChipActive:  { backgroundColor: Colors.primary, borderColor: Colors.primary },
  statusChipText:    { fontSize: 14, color: Colors.textSecondary },
  statusChipTextActive:{ color: Colors.white, fontWeight: '600' },
  btnRow:            { flexDirection: 'row', gap: 10 },
  saveBtn:           { flex: 1, backgroundColor: Colors.success, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveBtnText:       { color: Colors.white, fontWeight: '700', fontSize: 15 },
  cancelBtn:         { flex: 1, backgroundColor: Colors.background, borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelBtnText:     { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
});
