import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, RefreshControl,
  Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { safeInitials } from '../../src/utils/numbers';
import { DashboardStats } from '../../src/types';
import Colors from '../../src/theme/colors';

interface InfoItem { icon: string; label: string; value: string; }
interface StatItem { label: string; value: string; color: string; icon: string; }

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [stats,       setStats]       = useState<DashboardStats | null>(null);
  const [refreshing,  setRefreshing]  = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);

  const loadStats = async (signal?: AbortSignal) => {
    try {
      const res = await api.get<DashboardStats>('/dashboard/stats', { signal });
      setStats(res.data);
    } catch {
      // stats are non-critical — fail silently
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const c = new AbortController();
    loadStats(c.signal);
    return () => c.abort();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out', style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const initials    = safeInitials(user?.name, 1);
  const displayName = user?.name   ?? 'Faculty';
  const role        = user?.designation ?? 'Faculty';
  const dept        = user?.department  ?? 'Department';
  const email       = user?.email       ?? '—';
  const phone       = user?.phone       ?? '—';
  const employeeId  = user?.employee_id ?? '—';
  const experience  = user?.experience  ?? '—';

  const profileInfo: InfoItem[] = [
    { icon: 'id-card-outline',   label: 'Employee ID', value: employeeId },
    { icon: 'mail-outline',      label: 'Email',       value: email },
    { icon: 'call-outline',      label: 'Phone',       value: phone },
    { icon: 'business-outline',  label: 'Department',  value: dept },
    { icon: 'school-outline',    label: 'College',     value: 'Sri Venkateshwara College of Engineering' },
    { icon: 'time-outline',      label: 'Experience',  value: experience },
  ];

  const quickStats: StatItem[] = [
    { label: 'Students',    value: stats ? String(stats.totalStudents)    : '—', color: Colors.primary, icon: 'school-outline' },
    { label: 'Attendance',  value: stats ? `${stats.attendancePercent}%`  : '—', color: Colors.success, icon: 'checkbox-outline' },
    { label: 'Assignments', value: stats ? String(stats.totalAssignments) : '—', color: Colors.orange,  icon: 'book-outline' },
    { label: 'IA Avg',      value: stats ? `${stats.iaAverage}%`          : '—', color: Colors.purple,  icon: 'bar-chart-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Faculty Profile</Text>
        <TouchableOpacity
          style={styles.logoutHeaderBtn}
          onPress={handleLogout}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadStats(); }}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.inner}>
          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{initials}</Text>
            </View>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.roleTxt}>{role}</Text>
            <View style={styles.badgeRow}>
              {[dept.split(' ')[0] + ' Dept', experience, 'SVCE'].map((t, i) => (
                <View key={i} style={styles.badge}>
                  <Text style={styles.badgeText}>{t}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Live stats */}
          <View style={styles.statsGrid}>
            {quickStats.map((s, i) => (
              <View key={i} style={[styles.statCard, { borderTopColor: s.color }]}>
                <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
                  <Ionicons name={s.icon as any} size={18} color={s.color} />
                </View>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Info card */}
          <View style={styles.infoCard}>
            <Text style={styles.sectionTitle}>Faculty Information</Text>
            {profileInfo.map((item, idx) => (
              <View key={idx} style={[styles.infoRow, idx % 2 === 0 && styles.infoRowAlt]}>
                <View style={styles.infoLabelWrap}>
                  <View style={styles.infoIconBg}>
                    <Ionicons name={item.icon as any} size={14} color={Colors.primary} />
                  </View>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                </View>
                <Text style={styles.infoValue} numberOfLines={2}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actionsCard}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setShowEdit(true)}
            >
              <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight }]}>
                <Ionicons name="create-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Edit Profile</Text>
                <Text style={styles.actionDesc}>Update your personal information</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/timetable')}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.successLight }]}>
                <Ionicons name="calendar-outline" size={20} color={Colors.success} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>View Timetable</Text>
                <Text style={styles.actionDesc}>Semester 4 class schedule</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.dangerLight }]}>
                <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
              </View>
              <View style={styles.actionText}>
                <Text style={[styles.actionTitle, { color: Colors.danger }]}>Sign Out</Text>
                <Text style={styles.actionDesc}>Log out of your account</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.danger} />
            </TouchableOpacity>
          </View>

          <Text style={styles.version}>Student ERP v1.0 · Expo SDK 54 · SVCE 2026</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        currentPhone={phone}
        currentName={displayName}
      />
    </View>
  );
}

// ── Edit Profile Modal ────────────────────────────────────────────

function EditProfileModal({
  visible, onClose, currentPhone, currentName,
}: {
  visible: boolean;
  onClose: () => void;
  currentPhone: string;
  currentName: string;
}) {
  const [phone,   setPhone]   = useState(currentPhone !== '—' ? currentPhone : '');
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    setPhone(currentPhone !== '—' ? currentPhone : '');
  }, [currentPhone, visible]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', { phone });
      Alert.alert('Saved', 'Profile updated.');
      onClose();
    } catch {
      Alert.alert('Error', 'Unable to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={editStyles.backdrop}>
        <View style={editStyles.card}>
          <View style={editStyles.header}>
            <Text style={editStyles.title}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={editStyles.label}>Name</Text>
          <View style={editStyles.readOnly}>
            <Text style={editStyles.readOnlyText}>{currentName}</Text>
            <Text style={editStyles.readOnlyNote}>Contact admin to change your name</Text>
          </View>
          <Text style={editStyles.label}>Phone</Text>
          <TextInput
            style={editStyles.input}
            placeholder="+91 XXXXXXXXXX"
            placeholderTextColor={Colors.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <View style={editStyles.btnRow}>
            <TouchableOpacity style={editStyles.saveBtn} onPress={save} disabled={saving}>
              {saving
                ? <ActivityIndicator color={Colors.white} size="small" />
                : <Text style={editStyles.saveBtnText}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={editStyles.cancelBtn} onPress={onClose}>
              <Text style={editStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const editStyles = StyleSheet.create({
  backdrop:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  card:            { width: '88%', backgroundColor: Colors.white, borderRadius: 18, padding: 22, elevation: 8 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:           { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  label:           { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  input:           { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: Colors.textPrimary, marginBottom: 14 },
  readOnly:        { backgroundColor: Colors.background, borderRadius: 10, padding: 12, marginBottom: 14 },
  readOnlyText:    { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  readOnlyNote:    { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  btnRow:          { flexDirection: 'row', gap: 10 },
  saveBtn:         { flex: 1, backgroundColor: Colors.success, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveBtnText:     { color: Colors.white, fontWeight: '700', fontSize: 15 },
  cancelBtn:       { flex: 1, backgroundColor: Colors.background, borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  cancelBtnText:   { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
});

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  pageHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pageTitle:       { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  logoutHeaderBtn: { padding: 4 },
  scroll:          { flex: 1 },
  inner:           { padding: 16, paddingBottom: 30 },
  heroCard: {
    backgroundColor: Colors.primary, borderRadius: 20,
    alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, marginBottom: 16,
    elevation: 4, shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: Colors.white, marginBottom: 12,
  },
  avatarInitial: { fontSize: 36, fontWeight: '900', color: Colors.white },
  name:          { fontSize: 20, fontWeight: '800', color: Colors.white },
  roleTxt:       { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 3, marginBottom: 12 },
  badgeRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  badge:         { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText:     { fontSize: 11, color: Colors.white, fontWeight: '600' },
  statsGrid:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14,
    padding: 12, alignItems: 'center', borderTopWidth: 3,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  statIcon:  { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  infoCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    overflow: 'hidden', marginBottom: 14,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  sectionTitle:  { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  infoRow:       { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border, alignItems: 'flex-start' },
  infoRowAlt:    { backgroundColor: Colors.background },
  infoLabelWrap: { flexDirection: 'row', alignItems: 'center', width: 130 },
  infoIconBg: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  infoLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  infoValue: { flex: 1, fontSize: 12, color: Colors.textPrimary, lineHeight: 18 },
  actionsCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    overflow: 'hidden', marginBottom: 20,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3,
  },
  actionRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  actionDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
  actionIcon:    { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionText:    { flex: 1 },
  actionTitle:   { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  actionDesc:    { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  version:       { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
});
