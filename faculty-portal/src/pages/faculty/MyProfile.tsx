/**
 * Faculty Portal — My Profile
 * Mirrors FacultyProfile.tsx from hod-portal exactly — same card layout,
 * gradient cover, InfoRow pattern, coordinator badges.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Mail, Phone, Calendar, Award, Briefcase, BookOpen, type LucideIconType } from '../../components/icons';
import { facultyService } from '../../services/faculty.service';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/ui/Avatar';
import { RoleBadge, StatusBadge } from '../../components/ui/Badge';
import DocumentUpload from '../../components/ui/DocumentUpload';
import RoleAllotmentModal from '../../components/ui/RoleAllotmentModal';
import { formatDate, formatExperience } from '../../utils/formatters';
import { getRoleResponsibilities } from '../../utils/roleUtils';
import { colors, shadows, primaryScale, ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';
import { ROUTES } from '../../navigation/routes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Faculty } from '../../types';

// ── Info Row ──────────────────────────────────────────────────────────────────
interface InfoRowProps { icon: LucideIconType; label: string; value?: string | number | null; }

function InfoRow({ icon: Icon, label, value }: InfoRowProps) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  return (
    <View style={s.infoRow}>
      <Icon size={15} color={theme.textMuted} style={s.infoIcon} />
      <View style={s.infoContent}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value ?? '—'}</Text>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function MyProfile() {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
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

  // Roles newly allotted since the last time this device saw this profile —
  // popped up one at a time via RoleAllotmentModal below. On the very first
  // load for a faculty we baseline their current roles instead of announcing
  // roles they've always had.
  const [pendingRoleSlugs, setPendingRoleSlugs] = useState<string[]>([]);

  useEffect(() => {
    if (!f || !id) return;
    const slugs = (f.roles ?? []).map((fr) => (fr.role || (fr as any)).slug);
    const storageKey = `faculty-erp-acked-roles-${id}`;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        if (raw === null) {
          await AsyncStorage.setItem(storageKey, JSON.stringify(slugs));
          return;
        }
        const acked: string[] = JSON.parse(raw);
        const newSlugs = slugs.filter((slug) => !acked.includes(slug));
        if (newSlugs.length) setPendingRoleSlugs(newSlugs);
      } catch {
        // Corrupt/unavailable storage — skip the popup this session.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f?.roles, id]);

  const handleAcknowledgeRole = async () => {
    const [current, ...rest] = pendingRoleSlugs;
    setPendingRoleSlugs(rest);
    if (!current || !id) return;
    const storageKey = `faculty-erp-acked-roles-${id}`;
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      const acked: string[] = raw ? JSON.parse(raw) : [];
      if (!acked.includes(current)) {
        await AsyncStorage.setItem(storageKey, JSON.stringify([...acked, current]));
      }
    } catch {
      // Ignore — worst case the popup reappears next visit.
    }
  };

  if (isLoading) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.primary} />
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

  const allRoles = f.roles ?? [];

  return (
    <ScrollView style={[s.root, { paddingTop: insets.top }]} showsVerticalScrollIndicator={false}>

      {/* Back row */}
      <TouchableOpacity style={s.backRow} onPress={() => navigation.goBack()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <ArrowLeft size={16} color={theme.textSecondary} />
        <Text style={s.backText}>Back to Dashboard</Text>
      </TouchableOpacity>

      {/* Profile card */}
      <View style={s.profileCard}>
        <LinearGradient colors={theme.gradientPrimary}
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

      {/* Roles & responsibilities */}
      {allRoles.length > 0 && (
        <View style={[s.infoCard, s.coordCard]}>
          <Text style={s.infoSectionTitle}>ROLES & RESPONSIBILITIES</Text>
          <View style={s.roleRespList}>
            {allRoles.map((fr) => {
              const role = fr.role || (fr as any);
              return (
                <View key={role.id || role.slug} style={s.roleRespItem}>
                  <View style={s.coordBadge}>
                    <RoleBadge slug={role.slug} name={role.name} size="lg" />
                    {fr.assignedAt && <Text style={s.coordSince}>since {formatDate(fr.assignedAt)}</Text>}
                  </View>
                  <View style={s.respList}>
                    {getRoleResponsibilities(role.slug).map((item) => (
                      <View key={item} style={s.respRow}>
                        <View style={s.respDot} />
                        <Text style={s.respText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Document upload */}
      <View style={{ marginTop: 12 }}>
        <DocumentUpload />
      </View>

      <View style={{ height: 32 }} />

      <RoleAllotmentModal
        visible={pendingRoleSlugs.length > 0}
        slug={pendingRoleSlugs[0] ?? null}
        onAcknowledge={handleAcknowledgeRole}
      />
    </ScrollView>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background, paddingHorizontal: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background },
  errorText: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', maxWidth: 280 },
  backBtn: { marginTop: 16 },
  backBtnText: { fontSize: 14, color: theme.primary },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 16 },
  backText: { fontSize: 13, color: theme.textSecondary },

  profileCard: { backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, overflow: 'hidden', ...shadows.card },
  coverGradient: { height: 100 },
  profileBody: { padding: 20 },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -52, marginBottom: 12 },
  profileAvatar: { borderWidth: 4, borderColor: colors.white, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  profileActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 12, color: theme.textSecondary },
  profileName: { fontSize: 22, fontWeight: '700', color: theme.textPrimary },
  profileSub: { fontSize: 13, color: theme.textSecondary, marginTop: 2 },
  roleBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },

  infoGrid: { gap: 12, marginTop: 12 },
  infoCard: { backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, padding: 20, gap: 12, ...shadows.card },
  infoSectionTitle: { fontSize: 10, fontWeight: '600', color: theme.textSecondary, letterSpacing: 0.8, marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { marginTop: 2 },
  infoContent: {},
  infoLabel: { fontSize: 11, color: theme.textMuted },
  infoValue: { fontSize: 13, fontWeight: '500', color: theme.textPrimary, marginTop: 1 },

  coordCard: { marginTop: 0 },
  coordBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.primarySoft, borderRadius: 14, alignSelf: 'flex-start' },
  coordSince: { fontSize: 11, color: theme.textMuted },

  roleRespList: { gap: 16 },
  roleRespItem: { gap: 8 },
  respList: { gap: 6, paddingLeft: 4 },
  respRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  respDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: primaryScale[400], marginTop: 6 },
  respText: { flex: 1, fontSize: 12, color: theme.textSecondary, lineHeight: 17 },
});
