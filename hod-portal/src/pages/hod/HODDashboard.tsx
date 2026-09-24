import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, BookOpen, Award, ChevronRight, LayoutDashboard, GraduationCap, Flame } from '../../components/icons';
import { dashboardService, facultyService } from '../../services/faculty.service';
import studentListService from '../../services/studentList.service';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatRelativeTime, formatActionLabel } from '../../utils/formatters';
import Avatar from '../../components/ui/Avatar';
import RoleNotifications from '../../components/ui/RoleNotifications';
import ScreenWrapper from '../../layouts/ScreenWrapper';
import { colors, ThemeColors, shadows, primaryScale } from '../../theme/colors';
import { ROUTES } from '../../navigation/routes';
import { AuditLog } from '../../types';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W =
  SCREEN_W > 600
    ? (SCREEN_W - 48 - 16) / 3
    : SCREEN_W - 32;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const QUICK_ACTIONS = [
  { key: 'faculty', label: 'Faculty List', icon: Users, color: 'indigo' as const, route: ROUTES.HOD_FACULTY },
  { key: 'students', label: 'Student List', icon: BookOpen, color: 'blue' as const, route: ROUTES.HOD_STUDENTS },
  { key: 'coordinators', label: 'Coordinators', icon: Award, color: 'purple' as const, route: ROUTES.HOD_COORDINATORS },
  { key: 'activities', label: 'Activities', icon: Flame, color: 'blue' as const, route: ROUTES.HOD_ACTIVITIES },
];

// ── Management card ───────────────────────────────────────────────────────────

type MgmtColor = 'indigo' | 'blue' | 'purple';

const COLOR_MAP: Record<MgmtColor, { light: string; icon: string; border: string }> = {
  indigo: { light: primaryScale[50], icon: primaryScale[600], border: primaryScale[100] },
  blue: { light: colors.blue[50], icon: colors.blue[600], border: colors.blue[100] },
  purple: { light: colors.purple[50], icon: colors.purple[600], border: colors.purple[100] },
};

interface ManagementCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: MgmtColor;
  route: string;
  stat?: number | string;
  statLabel?: string;
  theme: ThemeColors;
  styles: ReturnType<typeof getStyles>;
}

function ManagementCard({ title, description, icon: Icon, color, route, stat, statLabel, theme, styles }: ManagementCardProps) {
  const navigation = useNavigation<any>();
  const c = COLOR_MAP[color] ?? COLOR_MAP.indigo;

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate(route)}
      activeOpacity={0.85}
      style={[styles.mgmtCard, { width: CARD_W }]}
    >
      <View>
        <View style={styles.mgmtCardTop}>
          <View style={[styles.mgmtIconWrap, { backgroundColor: c.light, borderColor: c.border }]}>
            <Icon size={22} color={c.icon} />
          </View>
          <ChevronRight size={16} color={theme.textMuted} />
        </View>

        <Text style={styles.mgmtTitle}>{title}</Text>
        <Text style={styles.mgmtDesc}>{description}</Text>
      </View>

      {stat !== undefined && (
        <View style={styles.mgmtStat}>
          <Text style={styles.mgmtStatValue}>{stat ?? '—'}</Text>
          <Text style={styles.mgmtStatLabel}>{statLabel}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Quick action chip ─────────────────────────────────────────────────────────

interface QuickActionProps {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  color: MgmtColor;
  onPress: () => void;
  styles: ReturnType<typeof getStyles>;
}

function QuickAction({ icon: Icon, label, color, onPress, styles }: QuickActionProps) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.indigo;
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.quickActionIcon, { backgroundColor: c.light, borderColor: c.border }]}>
        <Icon size={18} color={c.icon} />
      </View>
      <Text style={styles.quickActionLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HODDashboard() {
  const { user } = useAuth();
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<any>();

  const today = React.useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    []
  );

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-combined'],
    queryFn: async () => {
      // Step 1: Helper to fetch total student count across available semesters & sections
      const fetchTotalStudents = async (): Promise<number> => {
        try {
          const semRes = await studentListService.getSemesters();
          const semesters: number[] = semRes?.semesters || semRes?.data?.semesters || [];

          if (!semesters.length) return 0;

          let totalCount = 0;

          for (const sem of semesters) {
            const secRes = await studentListService.getSections(sem);
            const sections: any[] = Array.isArray(secRes) ? secRes : secRes?.data || [];

            for (const sec of sections) {
              const secName = typeof sec === 'string' ? sec : sec?.name || sec?.id;
              if (secName) {
                const dashData = await studentListService.getSectionDashboard(sem, secName, 1, 100);

                // Extract total count from pagination or data array length
                const paginationTotal = dashData?.students?.pagination?.total ?? dashData?.data?.students?.pagination?.total;
                const studentList = dashData?.students?.data ?? dashData?.students ?? [];

                totalCount += paginationTotal ?? studentList.length ?? 0;
              }
            }
          }
          return totalCount;
        } catch (err) {
          console.error('Failed to resolve student count:', err);
          return 0;
        }
      };

      const results = await Promise.allSettled([
        dashboardService.get().catch(() => null),
        facultyService.getAll().catch(() => []),
        fetchTotalStudents(),
      ]);

      const dashRes = results[0].status === 'fulfilled' ? results[0].value : null;
      const facultyRes = results[1].status === 'fulfilled' ? results[1].value : [];
      const calculatedStudentCount = results[2].status === 'fulfilled' ? results[2].value : 0;

      return {
        dashRes,
        facultyRes,
        calculatedStudentCount,
      };
    },
  });

  // Extract array lists cleanly
  const rawFaculty = (data?.facultyRes as any)?.data ?? data?.facultyRes ?? [];
  const facultyList = Array.isArray(rawFaculty) ? rawFaculty : [];

  // Dashboard raw payloads
  const rawDash = (data?.dashRes as any)?.data ?? data?.dashRes ?? {};
  const dashStats = rawDash?.stats ?? rawDash ?? {};

  // Extract totals using calculated student fallbacks
  const facultyCount = dashStats.totalFaculty || dashStats.facultyCount || facultyList.length;
  const studentCount = dashStats.totalStudents || dashStats.studentCount || data?.calculatedStudentCount || 0;
  const coordinatorCount =
    dashStats.coordinatorCount ||
    dashStats.coordinatorsCount ||
    facultyList.filter((f: any) => f.isCoordinator || f.role === 'COORDINATOR' || f.coordinatorRole).length;

  const dept = rawDash?.department || {};
  const recentActivity = rawDash?.recentActivity || [];

  return (
    <ScreenWrapper route={ROUTES.HOD_DASHBOARD}>
      {/* Gradient greeting header */}
      <LinearGradient
        colors={theme.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View>
          <Text style={styles.headerHeading}>
            {getGreeting()}, {(user?.name || 'Dr.').split(' ')[0]}
          </Text>
          <Text style={styles.headerSub}>{dept.name || 'Department'} · {today}</Text>
        </View>
        <View style={styles.headerIconWrap}>
          <LayoutDashboard size={26} color={colors.white} />
        </View>
      </LinearGradient>

      {/* Management cards */}
      {isLoading ? (
        <View style={styles.skeletonRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.skeleton, { width: CARD_W }]} />
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal={SCREEN_W > 600}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={SCREEN_W > 600 ? styles.cardRowH : styles.cardRowV}
        >
          {[
            {
              title: 'Faculty List',
              desc: 'View and browse all faculty members in your department',
              icon: Users,
              color: 'indigo' as const,
              route: ROUTES.HOD_FACULTY,
              stat: facultyCount,
              statLabel: 'faculty members',
            },
            {
              title: 'Student List',
              desc: 'View and manage all students enrolled in your department',
              icon: BookOpen,
              color: 'blue' as const,
              route: ROUTES.HOD_STUDENTS,
              stat: studentCount,
              statLabel: 'students',
            },
            {
              title: 'Coordinator Management',
              desc: 'Assign and manage coordinator roles for faculty members',
              icon: Award,
              color: 'purple' as const,
              route: ROUTES.HOD_COORDINATORS,
              stat: coordinatorCount,
              statLabel: 'coordinators assigned',
            },
          ].map((card, i) => (
            <Animated.View key={card.route} entering={FadeInUp.delay(i * 80).duration(400).springify()}>
              <ManagementCard
                title={card.title}
                description={card.desc}
                icon={card.icon}
                color={card.color}
                route={card.route}
                stat={card.stat}
                statLabel={card.statLabel}
                theme={theme}
                styles={styles}
              />
            </Animated.View>
          ))}
        </ScrollView>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActionsCard}>
        <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
        <View style={styles.quickActionsRow}>
          {QUICK_ACTIONS.map((action) => (
            <QuickAction
              key={action.key}
              icon={action.icon}
              label={action.label}
              color={action.color}
              onPress={() => navigation.navigate(action.route)}
              styles={styles}
            />
          ))}
        </View>
      </View>

      {/* Role notifications */}
      <RoleNotifications roles={user?.roles} />

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <View style={styles.activityCard}>
          <Text style={styles.activityTitle}>Recent Activity</Text>
          {recentActivity.map((log: AuditLog & { performer?: { name?: string }; target?: { name?: string } }) => (
            <View key={log.id} style={styles.activityRow}>
              <Avatar name={log.performer?.name} size="xs" style={styles.activityAvatar} />
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  <Text style={styles.activityBold}>{log.performer?.name?.split(' ').slice(-1)[0]}</Text>{' '}
                  {formatActionLabel(log.action).toLowerCase()}
                  {log.target && (
                    <Text>
                      {' for '}
                      <Text style={styles.activityBold}>{log.target.name?.split(' ').slice(-1)[0]}</Text>
                    </Text>
                  )}
                  {(log.details as any)?.roleName && (
                    <Text style={styles.activityRole}> — {(log.details as any).roleName}</Text>
                  )}
                </Text>
                <Text style={styles.activityTime}>{formatRelativeTime(log.timestamp)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScreenWrapper>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  // Gradient header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 20,
    padding: 20,
    marginBottom: 4,
    ...shadows.card,
  },
  headerHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Card layout
  cardRowH: { flexDirection: 'row', gap: 16 },
  cardRowV: { gap: 12 },
  skeletonRow: { gap: 12 },

  // Management card
  mgmtCard: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    gap: 8,
    minHeight: 168,
    justifyContent: 'space-between',
    ...shadows.card,
  },
  mgmtCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  mgmtIconWrap: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  mgmtTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  mgmtDesc: {
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 17,
  },
  mgmtStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  mgmtStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.textPrimary,
  },
  mgmtStatLabel: {
    fontSize: 12,
    color: theme.textSecondary,
  },

  // Skeleton
  skeleton: {
    height: 160,
    backgroundColor: theme.border,
    borderRadius: 20,
  },

  // Quick actions
  quickActionsCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    ...shadows.card,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.textSecondary,
    letterSpacing: 0.6,
  },
  quickActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickAction: {
    flexGrow: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.primarySoft,
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textPrimary,
    flexShrink: 1,
  },

  // Recent activity
  activityCard: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    gap: 12,
    ...shadows.card,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  activityAvatar: { marginTop: 2 },
  activityContent: { flex: 1 },
  activityText: {
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 17,
  },
  activityBold: { fontWeight: '600', color: theme.textPrimary },
  activityRole: { color: theme.primary },
  activityTime: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 2,
  },
});
