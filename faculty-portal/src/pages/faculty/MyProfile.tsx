/**
 * Faculty Portal — My Profile
 * Mirrors FacultyProfile.tsx from hod-portal exactly — same card layout,
 * gradient cover, InfoRow pattern, coordinator badges.
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Mail, Phone, Calendar, Award, Briefcase, BookOpen, type LucideIconType } from '../../components/icons';
import { facultyService } from '../../services/faculty.service';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/ui/Avatar';
import { RoleBadge, StatusBadge } from '../../components/ui/Badge';
import { formatDate, formatExperience } from '../../utils/formatters';
import { colors, shadows, primaryScale, neutral } from '../../theme/colors';
import { ROUTES } from '../../navigation/routes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Faculty } from '../../types';

// ── Info Row ──────────────────────────────────────────────────────────────────
interface InfoRowProps { icon: LucideIconType; label: string; value?: string | number | null; }

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  return (
    <View style={s.infoRow}>
      <Icon size={15} color={neutral[400]} style={s.infoIcon} />
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value ?? '—'}</Text>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function MyProfile() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // JWT stores id as employeeId (e.g. "EMP001") — GET /faculty/:id works with that
  // Also support numeric faculty_id as fallback
  const id = (user as any)?.employeeId
    ?? (user as any)?.employee_id
    ?? user?.id;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['my-profile', id],
    queryFn: () => facultyService.getById(id as string),
    enabled: !!id,
    retry: 1,
  });

  const f: Faculty | undefined = (data as any)?.data;

  if (isLoading) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={primaryScale[500]} />
      </View>
    );
  }

  if (isError || !f) {
    return (
      <View style={[s.center, { paddingTop: insets.top, padding: 24 }]}>
        <Text style={s.errorText}>Could not load your profile. Please try again.</Text>
        <TouchableOpacity onPress={() => navigation.navigate(ROUTES.FACULTY_DASHBOARD)} style={s.backBtn}>
          <Text style={s.backBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const personalInfo: InfoRowProps[] = [
    { icon: Mail,     label: 'Email',        value: f.email },
    { icon: Phone,    label: 'Phone',        value: f.phone || '—' },
    { icon: Briefcase, label: 'Designation', value: f.designation },
    { icon: BookOpen,  label: 'Qualification', value: f.qualification },
  ];

  const academicInfo: InfoRowProps[] = [
    { icon: Award,    label: 'Specialization', value: f.specialization || '—' },
    { icon: Calendar, label: 'Experience',     value: formatExperience(f.experience) },
    { icon: Calendar, label: 'Joining Date',   value: formatDate(f.joiningDate) },
    { icon: Briefcase, label: 'Employee ID',   value: f.employeeId },
  ];

  const coordRoles = f.roles?.filter(
    (fr) => !['HOD', 'FACULTY'].includes((fr.role || (fr as any)).slug),
  ) ?? [];

  return (
    <ScrollView style={[s.root, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>

      {/* Back row */}
      <TouchableOpacity style={s.backRow} onPress={() => navigation.goBack()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <ArrowLeft size={16} color={neutral[500]} />
        <Text style={s.backText}>Back to Dashboard</Text>
      </TouchableOpacity>

      {/* Profile card */}
      <View style={s.profileCard}>
        <LinearGradient colors={[primaryScale[500], colors.purple[600]]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.coverGradient} />
        <View style={s.profileBody}>
          <View style={s.profileTop}>
            <Avatar src={f.photo} name={f.name} size="2xl" style={s.profileAvatar} />
            <View style={s.profileActions}>
              <StatusBadge status={f.status} />
            </View>
          </View>
          <Text style={s.profileName}>{f.name}</Text>
          <Text style={s.profileSub}>{f.designation} · {f.department?.name}</Text>
          <View style={s.roleBadgeRow}>
            {f.roles?.map((fr) => {
              const role = fr.role || (fr as any);
              return <RoleBadge key={role.id || role.slug} slug={role.slug} name={role.name} />;
            })}
          </View>
        </View>
      </View>

      {/* Info grid */}
      <View style={s.infoGrid}>
        <View style={s.infoCard}>
          <Text style={s.infoSectionTitle}>PERSONAL INFORMATION</Text>
          {personalInfo.map((item) => <InfoRow key={item.label} {...item} />)}
        </View>
        <View style={s.infoCard}>
          <Text style={s.infoSectionTitle}>ACADEMIC DETAILS</Text>
          {academicInfo.map((item) => <InfoRow key={item.label} {...item} />)}
        </View>
      </View>

      {/* Coordinator roles */}
      {coordRoles.length > 0 && (
        <View style={[s.infoCard, s.coordCard]}>
          <Text style={s.infoSectionTitle}>COORDINATOR ROLES</Text>
          <View style={s.coordBadges}>
            {coordRoles.map((fr) => {
              const role = fr.role || (fr as any);
              return (
                <View key={role.id || role.slug} style={s.coordBadge}>
                  <RoleBadge slug={role.slug} name={role.name} size="lg" />
                  {fr.assignedAt && <Text style={s.coordSince}>since {formatDate(fr.assignedAt)}</Text>}
                </View>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: neutral[50], paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: neutral[50] },
  errorText: { fontSize: 14, color: neutral[500], textAlign: 'center', maxWidth: 280 },
  backBtn: { marginTop: 16 },
  backBtnText: { fontSize: 14, color: primaryScale[600] },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 16 },
  backText: { fontSize: 13, color: neutral[500] },

  profileCard: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: neutral[100], overflow: 'hidden', ...shadows.card },
  coverGradient: { height: 100 },
  profileBody: { padding: 20 },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -52, marginBottom: 12 },
  profileAvatar: { borderWidth: 4, borderColor: colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  profileActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 12, color: neutral[700] },
  profileName: { fontSize: 22, fontWeight: '700', color: neutral[900] },
  profileSub: { fontSize: 13, color: neutral[500], marginTop: 2 },
  roleBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },

  infoGrid: { gap: 12, marginTop: 12 },
  infoCard: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: neutral[100], padding: 20, gap: 12, ...shadows.card },
  infoSectionTitle: { fontSize: 10, fontWeight: '600', color: neutral[500], letterSpacing: 0.8, marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { marginTop: 2 },
  infoContent: {},
  infoLabel: { fontSize: 11, color: neutral[400] },
  infoValue: { fontSize: 13, fontWeight: '500', color: neutral[900], marginTop: 1 },

  coordCard: { marginTop: 0 },
  coordBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  coordBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: primaryScale[50], borderRadius: 14 },
  coordSince: { fontSize: 11, color: neutral[400] },
});
