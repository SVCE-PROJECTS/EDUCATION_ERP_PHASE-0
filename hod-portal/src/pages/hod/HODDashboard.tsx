import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Users, BookOpen, Award, CalendarClock, ChevronRight } from '../../components/icons';
import { dashboardService, facultyService } from '../../services/faculty.service';
import studentListService from '../../services/studentList.service';
import {
  technicalEventService,
  sportsActivityService,
  culturalActivityService,
  industryProjectService,
  hackathonService,
  otherCurricularService,
} from '../../services/activities.service';
import { useAuth } from '../../context/AuthContext';
import { formatRelativeTime, formatActionLabel } from '../../utils/formatters';
import Avatar from '../../components/ui/Avatar';
import DashboardCharts from '../../components/hod/DashboardCharts';
import ScreenWrapper from '../../layouts/ScreenWrapper';
import { colors, shadows, primaryScale, neutral } from '../../theme/colors';
import { ROUTES } from '../../navigation/routes';
import { AuditLog } from '../../types';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W =
  SCREEN_W > 600
    ? (SCREEN_W - 32 - 48) / 4
    : SCREEN_W - 32;

// ── Management card ───────────────────────────────────────────────────────────

type MgmtColor = 'indigo' | 'blue' | 'purple' | 'emerald';

const COLOR_MAP: Record<MgmtColor, { light: string; icon: string; border: string }> = {
  indigo: { light: primaryScale[50], icon: primaryScale[600], border: primaryScale[100] },
  blue: { light: colors.blue[50], icon: colors.blue[600], border: colors.blue[100] },
  purple: { light: colors.purple[50], icon: colors.purple[600], border: colors.purple[100] },
  emerald: { light: colors.emerald[500], icon: colors.emerald[600], border: colors.emerald[600] },
};

interface ManagementCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: MgmtColor;
  route: string;
  stat?: number | string;
  statLabel?: string;
}

function ManagementCard({ title, description, icon: Icon, color, route, stat, statLabel }: ManagementCardProps) {
  const navigation = useNavigation<any>();
  const c = COLOR_MAP[color] ?? COLOR_MAP.indigo;

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate(route)}
      activeOpacity={0.85}
      style={[s.mgmtCard, { width: CARD_W }]}
    >
      <View>
        <View style={s.mgmtCardTop}>
          <View style={[s.mgmtIconWrap, { backgroundColor: c.light, borderColor: c.border }]}>
            <Icon size={22} color={c.icon} />
          </View>
          <ChevronRight size={16} color={neutral[400]} />
        </View>

        <Text style={s.mgmtTitle}>{title}</Text>
        <Text style={s.mgmtDesc}>{description}</Text>
      </View>

      {stat !== undefined && (
        <View style={s.mgmtStat}>
          <Text style={s.mgmtStatValue}>{stat ?? '—'}</Text>
          <Text style={s.mgmtStatLabel}>{statLabel}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HODDashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-combined'],
    queryFn: async () => {
      // Step 1: Fetch total student count + performance bands (red/yellow/green)
      // across every semester & section — same real student-list data used
      // by the Student Management screen.
      const fetchStudentStats = async () => {
        const buckets = { excellent: 0, average: 0, needsImprovement: 0 };
        try {
          const semRes = await studentListService.getSemesters();
          const semesters: number[] = semRes?.semesters || semRes?.data?.semesters || [];

          if (!semesters.length) return { totalCount: 0, buckets };

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

                studentList.forEach((st: any) => {
                  const perf = st?.performance;
                  if (perf == null) return;
                  if (perf >= 75) buckets.excellent += 1;
                  else if (perf >= 50) buckets.average += 1;
                  else buckets.needsImprovement += 1;
                });
              }
            }
          }
          return { totalCount, buckets };
        } catch (err) {
          console.error('Failed to resolve student count:', err);
          return { totalCount: 0, buckets };
        }
      };

      // Step 2: Total activities across all real activity categories.
      const countFrom = (res: any): number => {
        const pagTotal = res?.pagination?.total ?? res?.data?.pagination?.total;
        if (typeof pagTotal === 'number') return pagTotal;
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        return list.length;
      };

      const fetchActivityCount = async (): Promise<number> => {
        const results = await Promise.allSettled([
          technicalEventService.getAll().catch(() => null),
          sportsActivityService.getAll().catch(() => null),
          culturalActivityService.getAll().catch(() => null),
          industryProjectService.getAll().catch(() => null),
          hackathonService.getAll().catch(() => null),
          otherCurricularService.getAll().catch(() => null),
        ]);
        return results.reduce((sum, r) => sum + (r.status === 'fulfilled' ? countFrom(r.value) : 0), 0);
      };

      const results = await Promise.allSettled([
        dashboardService.get().catch(() => null),
        facultyService.getAll().catch(() => []),
        fetchStudentStats(),
        fetchActivityCount(),
      ]);

      const dashRes = results[0].status === 'fulfilled' ? results[0].value : null;
      const facultyRes = results[1].status === 'fulfilled' ? results[1].value : [];
      const studentStats =
        results[2].status === 'fulfilled'
          ? results[2].value
          : { totalCount: 0, buckets: { excellent: 0, average: 0, needsImprovement: 0 } };
      const activityCount = results[3].status === 'fulfilled' ? results[3].value : 0;

      return {
        dashRes,
        facultyRes,
        calculatedStudentCount: studentStats.totalCount,
        performanceBuckets: studentStats.buckets,
        activityCount,
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
  const activityCount = dashStats.activityCount || data?.activityCount || 0;
  const performanceBuckets = data?.performanceBuckets || { excellent: 0, average: 0, needsImprovement: 0 };

  const dept = rawDash?.department || {};
  const recentActivity = rawDash?.recentActivity || [];

  return (
    <ScreenWrapper route={ROUTES.HOD_DASHBOARD}>
      {/* Welcome */}
      <View style={s.welcome}>
        <Text style={s.welcomeHeading}>
         <Text style={s.welcomeName}>Welcome to Department Portal</Text>
        </Text>
        <Text style={s.welcomeSub}>{dept.name || 'Department'} — Manage your department from here</Text>
      </View>

      {/* Management cards */}
      {isLoading ? (
        <View style={s.skeletonRow}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[s.skeleton, { width: CARD_W }]} />
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal={SCREEN_W > 600}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={SCREEN_W > 600 ? s.cardRowH : s.cardRowV}
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
            {
              title: 'Faculty Allocation',
              desc: 'Allocate subjects and classes to faculty members',
              icon: CalendarClock,
              color: 'emerald' as const,
              route: ROUTES.HOD_FACULTY_ALLOCATION,
              stat: undefined,
              statLabel: undefined,
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
              />
            </Animated.View>
          ))}
        </ScrollView>
      )}

      {/* Charts: department overview + performance breakdown */}
      {!isLoading && (
        <DashboardCharts
          studentCount={studentCount}
          facultyCount={facultyCount}
          coordinatorCount={coordinatorCount}
          activityCount={activityCount}
          performanceBuckets={performanceBuckets}
        />
      )}

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <View style={s.activityCard}>
          <Text style={s.activityTitle}>Recent Activity</Text>
          {recentActivity.map((log: AuditLog & { performer?: { name?: string }; target?: { name?: string } }) => (
            <View key={log.id} style={s.activityRow}>
              <Avatar name={log.performer?.name} size="xs" style={s.activityAvatar} />
              <View style={s.activityContent}>
                <Text style={s.activityText}>
                  <Text style={s.activityBold}>{log.performer?.name?.split(' ').slice(-1)[0]}</Text>{' '}
                  {formatActionLabel(log.action).toLowerCase()}
                  {log.target && (
                    <Text>
                      {' for '}
                      <Text style={s.activityBold}>{log.target.name?.split(' ').slice(-1)[0]}</Text>
                    </Text>
                  )}
                  {(log.details as any)?.roleName && (
                    <Text style={s.activityRole}> — {(log.details as any).roleName}</Text>
                  )}
                </Text>
                <Text style={s.activityTime}>{formatRelativeTime(log.timestamp)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScreenWrapper>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  welcome: { gap: 4 },
  welcomeHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: neutral[900],
  },
  welcomeName: { color: primaryScale[600] },
  welcomeSub: {
    fontSize: 13,
    color: neutral[500],
  },

  // Card layout
  cardRowH: { flexDirection: 'row', gap: 16 },
  cardRowV: { gap: 12 },
  skeletonRow: { gap: 12 },

  // Management card
  mgmtCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[100],
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
    color: neutral[900],
  },
  mgmtDesc: {
    fontSize: 12,
    color: neutral[500],
    lineHeight: 17,
  },
  mgmtStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: neutral[100],
  },
  mgmtStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: neutral[900],
  },
  mgmtStatLabel: {
    fontSize: 12,
    color: neutral[500],
  },

  // Skeleton
  skeleton: {
    height: 160,
    backgroundColor: neutral[100],
    borderRadius: 20,
  },

  // Recent activity
  activityCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[100],
    padding: 20,
    gap: 12,
    ...shadows.card,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: neutral[900],
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
    color: neutral[700],
    lineHeight: 17,
  },
  activityBold: { fontWeight: '600' },
  activityRole: { color: primaryScale[500] },
  activityTime: {
    fontSize: 11,
    color: neutral[400],
    marginTop: 2,
  },
});