import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert,
  ActivityIndicator, RefreshControl, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import mockIAMarks from '../../src/data/iaMarks';
import PageHeader from '../../src/components/common/PageHeader';
import SearchIAMarks from '../../src/components/iamarks/SearchIAMarks';
import IAStatistics from '../../src/components/iamarks/IAStatistics';
import IAMarksTable from '../../src/components/iamarks/IAMarksTable';
import AddIAMarksModal from '../../src/components/iamarks/AddIAMarksModal';
import { IARecord } from '../../src/types';
import { safeAverage } from '../../src/utils/numbers';
import Colors from '../../src/theme/colors';

export default function IAMarksScreen() {
  const [records,    setRecords]    = useState<IARecord[]>([]);
  const [search,     setSearch]     = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [editRecord, setEditRecord] = useState<IARecord | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingMock,  setUsingMock]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const fetchRecords = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await api.get<IARecord[]>('/iamarks', { signal });
      setRecords(res.data);
      setUsingMock(false);
      setError(null);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'CanceledError') return;
      // Fall back to mock data so UI still works while backend is starting
      setRecords(mockIAMarks as IARecord[]);
      setUsingMock(true);
      setError(null); // offline mode is expected — not an error for the user
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchRecords(controller.signal);
    return () => controller.abort();
  }, [fetchRecords]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRecords();
  }, [fetchRecords]);

  const filtered = records.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.usn?.toLowerCase().includes(search.toLowerCase())
  );

  const classAvgNum = filtered.length
    ? safeAverage(filtered.map(r => safeAverage([r.ia1, r.ia2, r.ia3])))
    : null;
  const classAvg = classAvgNum !== null ? classAvgNum.toFixed(1) : null;

  const handleSave = async (record: IARecord) => {
    if (usingMock) {
      if (editRecord) {
        setRecords(p => p.map(r => r.id === record.id ? record : r));
      } else {
        // In mock mode we don't have a real DB — use a UUID-style temp marker
        // so it's clearly a local-only record and won't collide with real IDs
        setRecords(p => [...p, { ...record, id: -(Date.now()) }]);
      }
      setShowModal(false);
      setEditRecord(null);
      return;
    }
    try {
      if (editRecord) {
        await api.put(`/iamarks/${record.id}`, record);
      } else {
        await api.post('/iamarks', record);
      }
      await fetchRecords();
      setShowModal(false);
      setEditRecord(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
        ?? 'Unable to save.';
      Alert.alert('Error', msg);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Delete Record', 'Remove this IA marks entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          if (usingMock) {
            setRecords(p => p.filter(r => r.id !== id));
            return;
          }
          try {
            await api.delete(`/iamarks/${id}`);
            fetchRecords();
          } catch {
            Alert.alert('Error', 'Unable to delete record.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <PageHeader
        title="IA Marks"
        subtitle={classAvg ? `Class avg: ${classAvg} / 20` : 'Internal assessment records'}
        iconName="bar-chart-outline"
        actionLabel="Add"
        actionIcon="add-circle-outline"
        onAction={() => { setEditRecord(null); setShowModal(true); }}
        badge={records.length || null}
      />

      {usingMock && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={14} color={Colors.warning} />
          <Text style={styles.offlineBannerText}>Backend offline — showing demo data</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
          <Text style={styles.errorBannerText}>{error}</Text>
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
          <SearchIAMarks search={search} setSearch={setSearch} />

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} size="large" />
              <Text style={styles.loadingText}>Loading IA marks...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="bar-chart-outline" size={64} color={Colors.border} />
              <Text style={styles.emptyTitle}>{search ? 'No results found' : 'No IA marks yet'}</Text>
              <Text style={styles.emptyDesc}>
                {search ? `No students match "${search}"` : 'Add IA marks for your students'}
              </Text>
              {!search && (
                <TouchableOpacity
                  style={styles.emptyAction}
                  onPress={() => { setEditRecord(null); setShowModal(true); }}
                >
                  <Ionicons name="add-circle-outline" size={16} color={Colors.white} />
                  <Text style={styles.emptyActionText}>Add IA Marks</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              <IAStatistics students={filtered} />
              <IAMarksTable
                students={filtered}
                onEdit={s => { setEditRecord(s); setShowModal(true); }}
                onDelete={handleDelete}
              />
            </>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => { setEditRecord(null); setShowModal(true); }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      <AddIAMarksModal
        show={showModal}
        onClose={() => { setShowModal(false); setEditRecord(null); }}
        onSave={handleSave}
        editStudent={editRecord}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.background },
  offlineBanner:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.warningLight, paddingHorizontal: 16, paddingVertical: 8 },
  offlineBannerText: { fontSize: 12, color: Colors.warning, fontWeight: '600' },
  errorBanner:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.dangerLight, paddingHorizontal: 16, paddingVertical: 8 },
  errorBannerText:   { fontSize: 12, color: Colors.danger, fontWeight: '600' },
  scroll:            { flex: 1 },
  inner:             { padding: 16, paddingBottom: 90 },
  loadingBox:        { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText:       { fontSize: 14, color: Colors.textSecondary },
  emptyBox:          { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle:        { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc:         { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  emptyAction: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.purple, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 8,
  },
  emptyActionText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  fab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.purple,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6, shadowColor: Colors.purple,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
  },
});
