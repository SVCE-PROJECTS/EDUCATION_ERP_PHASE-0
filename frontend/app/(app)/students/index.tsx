import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert,
  ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../src/services/api';
import mockStudents from '../../../src/data/students';
import PageHeader from '../../../src/components/common/PageHeader';
import SearchBar from '../../../src/components/dashboard/SearchBar';
import StudentTable from '../../../src/components/dashboard/StudentTable';
import AddStudentModal from '../../../src/components/dashboard/AddStudentModal';
import { Student } from '../../../src/types';
import Colors from '../../../src/theme/colors';

export default function StudentsScreen() {
  const [students,    setStudents]    = useState<Student[]>([]);
  const [search,      setSearch]      = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [usingMock,   setUsingMock]   = useState(false);

  const fetchStudents = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await api.get<Student[]>('/students', { signal });
      setStudents(res.data);
      setUsingMock(false);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'CanceledError') return;
      setStudents(mockStudents as Student[]);
      setUsingMock(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchStudents(controller.signal);
    return () => controller.abort();
  }, [fetchStudents]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStudents();
  }, [fetchStudents]);

  const filtered = students.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.usn?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (student: Student) => {
    if (usingMock) {
      if (editStudent) {
        setStudents(p => p.map(s => s.id === student.id ? { ...s, ...student } : s));
      } else {
        // Negative ID marks this as a locally-created record not yet persisted
        setStudents(p => [...p, { ...student, id: -(Date.now()) }]);
      }
      setShowModal(false);
      setEditStudent(null);
      return;
    }
    try {
      if (editStudent) {
        await api.put(`/students/${student.id}`, student);
      } else {
        await api.post('/students', student);
      }
      await fetchStudents();
      setShowModal(false);
      setEditStudent(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
        ?? 'Unable to save student.';
      Alert.alert('Error', msg);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Student', 'Are you sure you want to remove this student?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          if (usingMock) {
            setStudents(p => p.filter(s => s.id !== id));
            return;
          }
          try {
            await api.delete(`/students/${id}`);
            fetchStudents();
          } catch {
            Alert.alert('Error', 'Unable to delete student.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="Students"
        subtitle={`${students.length} enrolled • Sem 4 Bhaskara`}
        iconName="people-outline"
        actionLabel="Add"
        actionIcon="person-add-outline"
        onAction={() => { setEditStudent(null); setShowModal(true); }}
        badge={students.length || null}
      />

      {usingMock && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color={Colors.warning} />
          <Text style={styles.offlineBannerText}>Backend offline — showing demo data</Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            colors={[Colors.primary]} tintColor={Colors.primary} />
        }
      >
        <View style={styles.inner}>
          <SearchBar search={search} setSearch={setSearch} />

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.loadingText}>Loading students...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={64} color={Colors.border} />
              <Text style={styles.emptyTitle}>{search ? 'No results found' : 'No students yet'}</Text>
              <Text style={styles.emptyDesc}>
                {search
                  ? `No students match "${search}"`
                  : 'Tap the Add button to enrol your first student'}
              </Text>
              {!search && (
                <TouchableOpacity
                  style={styles.emptyAction}
                  onPress={() => { setEditStudent(null); setShowModal(true); }}
                >
                  <Ionicons name="person-add-outline" size={16} color={Colors.white} />
                  <Text style={styles.emptyActionText}>Add Student</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <StudentTable
              students={filtered}
              onEdit={s => { setEditStudent(s); setShowModal(true); }}
              onDelete={handleDelete}
            />
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => { setEditStudent(null); setShowModal(true); }}
        activeOpacity={0.85}
      >
        <Ionicons name="person-add" size={24} color={Colors.white} />
      </TouchableOpacity>

      <AddStudentModal
        show={showModal}
        onClose={() => { setShowModal(false); setEditStudent(null); }}
        onSave={handleSave}
        editStudent={editStudent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.background },
  offlineBanner:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.warningLight, paddingHorizontal: 16, paddingVertical: 8 },
  offlineBannerText: { fontSize: 12, color: Colors.warning, fontWeight: '600' },
  scroll:            { flex: 1 },
  inner:             { padding: 16, paddingBottom: 90 },
  loadingBox:        { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText:       { fontSize: 14, color: Colors.textSecondary },
  emptyBox:          { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle:        { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc:         { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  emptyAction: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 8,
  },
  emptyActionText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
});
