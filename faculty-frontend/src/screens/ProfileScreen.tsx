/**
 * Profile Screen — logged-in faculty's own profile
 *
 * API: GET /api/faculty/me  → FacultyProfile
 *      (No HOD restriction — any faculty can access their own profile)
 *
 * Displays: personal info, department, designation, roles, status.
 * Logout button calls AuthContext.logout() which clears token + storage.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import ScreenLayout from '../components/ScreenLayout';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import CustomButton from '../components/CustomButton';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { getMyProfile } from '../services/facultyApi';
import type { FacultyProfile } from '../types/faculty';
import { colors, spacing, typography, radius } from '../theme';
import { API_ORIGIN } from '../config/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { faculty: cachedFaculty, logout } = useAuth();
  const [profile, setProfile] = useState<FacultyProfile | null>(cachedFaculty);
  const [loading, setLoading] = useState(!cachedFaculty);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoutDialog, setLogoutDialog] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getMyProfile();
      setProfile(data);
    } catch (err: unknown) {
      setError((err as { message?: string }).message ?? 'Failed to load profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleLogout = async () => {
    setLogoutDialog(false);
    setLoggingOut(true);
    await logout();
    // Navigation handled by AppNavigator detecting isAuthenticated = false
  };

  const photoUrl = profile?.photoUrl ?? profile?.photo_url;
  const fullPhotoUrl = photoUrl
    ? photoUrl.startsWith('http') ? photoUrl : `${API_ORIGIN}${photoUrl}`
    : null;

  if (loading) return (
    <ScreenLayout navigation={navigation} activeScreen="Profile">
      <LoadingIndicator fullScreen message="Loading profile…" />
    </ScreenLayout>
  );

  return (
    <ScreenLayout navigation={navigation} activeScreen="Profile">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>My Profile</Text>

        {error && <ErrorMessage message={error} onRetry={load} />}

        {profile && (
          <>
            {/* Avatar banner */}
            <View style={styles.avatarBanner}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {profile.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileDesignation}>{profile.designation}</Text>
              <View style={styles.badgeRow}>
                <StatusBadge
                  label={profile.status}
                  variant={
                    profile.status === 'ACTIVE' ? 'success'
                    : profile.status === 'ON_LEAVE' ? 'warning'
                    : 'danger'
                  }
                />
                {profile.isHOD && (
                  <StatusBadge label="HOD" variant="info" />
                )}
              </View>
            </View>

            {/* Personal info */}
            <Card>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <InfoRow label="Employee ID" value={profile.employeeId} />
              <InfoRow label="Username" value={profile.username} />
              <InfoRow label="Email" value={profile.email} />
              <InfoRow label="Phone" value={profile.phone ?? '—'} />
              <InfoRow label="Gender" value="—" />
            </Card>

            {/* Academic info */}
            <Card>
              <Text style={styles.sectionTitle}>Academic Details</Text>
              <InfoRow label="Department" value={profile.department?.name ?? profile.departmentCode ?? '—'} />
              <InfoRow label="Dept Code" value={profile.departmentCode ?? '—'} />
              <InfoRow label="Designation" value={profile.designation} />
              <InfoRow label="Qualification" value={profile.qualification ?? '—'} />
              <InfoRow label="Specialization" value={profile.specialization ?? '—'} />
              <InfoRow label="Experience" value={`${profile.experience_years ?? 0} years`} />
            </Card>

            {/* Roles */}
            {profile.roles && profile.roles.length > 0 && (
              <Card>
                <Text style={styles.sectionTitle}>Roles & Responsibilities</Text>
                <View style={styles.rolesWrap}>
                  {profile.roles.map((r, idx) => (
                    <View key={idx} style={styles.roleChip}>
                      <Text style={styles.roleText}>{r.role.name}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* Logout */}
            <CustomButton
              title="Sign Out"
              onPress={() => setLogoutDialog(true)}
              variant="danger"
              loading={loggingOut}
              style={styles.logoutBtn}
              accessibilityLabel="Sign out of Faculty Portal"
            />
          </>
        )}
      </ScrollView>

      <ConfirmDialog
        visible={logoutDialog}
        title="Sign Out"
        message="Are you sure you want to sign out of the Faculty Portal?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        onConfirm={handleLogout}
        onCancel={() => setLogoutDialog(false)}
        destructive
      />
    </ScreenLayout>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={infoStyles.row}>
    <Text style={infoStyles.label}>{label}</Text>
    <Text style={infoStyles.value}>{value}</Text>
  </View>
);

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { ...typography.small, color: colors.textSecondary, flex: 1 },
  value: { ...typography.bodyBold, color: colors.textPrimary, flex: 2, textAlign: 'right' },
});

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  pageTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg },

  avatarBanner: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { ...typography.h2, color: colors.primary },
  profileName: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.xs },
  profileDesignation: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  badgeRow: { flexDirection: 'row', gap: spacing.sm },

  sectionTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: spacing.md },

  rolesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  roleChip: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  roleText: { ...typography.smallBold, color: colors.primaryDark },

  logoutBtn: { marginTop: spacing.lg },
});

export default ProfileScreen;
