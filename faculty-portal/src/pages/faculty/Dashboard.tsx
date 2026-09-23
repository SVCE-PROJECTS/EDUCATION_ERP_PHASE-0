/**
 * Faculty Portal — Dashboard
 * GET /api/dashboard/stats returns flat JSON:
 * { totalStudents, attendancePercent, totalAssignments, openAssignments, iaAverage, recentActivities }
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, CheckSquare, Award, User, ChevronRight } from '../../components/icons';
import { dashboardService } from '../../services/faculty.service';
import { useAuth } from '../../context/AuthContext';
import ScreenWrapper from '../../layouts/ScreenWrapper';
import SimpleBarChart from '../../components/ui/SimpleBarChart';
import ProgressRing from '../../components/ui/ProgressRing';
import { colors, shadows, primaryScale, neutral } from '../../theme/colors';
import { ROUTES } from '../../navigation/routes';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W > 600 ? (SCREEN_W - 48 - 16) / 2 : SCREEN_W - 32;

type TileColor = 'indigo' | 'blue' | 'purple' | 'amber';
const COLOR_MAP: Record<TileColor, { light: string; icon: string; border: string }> = {
  indigo: { light: primaryScale[50],  icon: primaryScale[600],  border: primaryScale[100] },
  blue:   { light: colors.blue[50],   icon: colors.blue[600],   border: colors.blue[100] },
  purple: { light: colors.purple[50], icon: colors.purple[600], border: colors.purple[100] },
  amber:  { light: colors.amber[50],  icon: colors.amber[600],  border: colors.amber[100] },
};

interface TileProps {
  title: string; description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: TileColor; route: string;
  stat?: string | number; statLabel?: string;
}

function ManagementCard({ title, description, icon: Icon, color, route, stat, statLabel }: TileProps) {
  const navigation = useNavigation<any>();
  const c = COLOR_MAP[color];
  return (
    <TouchableOpacity onPress={() => navigation.navigate(route)} activeOpacity={0.85}
      style={[s.mgmtCard, { width: CARD_W }]}>
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
          <Text style={s.mgmtStatValue}>{stat}</Text>
          <Text style={s.mgmtStatLabel}>{statLabel}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['faculty-dashboard'],
    queryFn: () => dashboardService.getStats(),
    staleTime: 60_000,
    retry: 1,
  });

  // Fetch weekly attendance for chart
  const { data: weeklyData } = useQuery({
    queryKey: ['weekly-attendance'],
    queryFn: async () => {
      const res = await require('../../services/api').default.get('/dashboard/weekly-attendance');
      return res.data;
    },
    staleTime: 60_000,
    retry: 1,
  });

  // Backend returns flat JSON directly — no .data wrapper
  const stats = data ?? {};

  const tiles: TileProps[] = [
    {
      title: 'Assignments',
      description: 'Create and manage assignments for your classes',
      icon: ClipboardList, color: 'indigo', route: ROUTES.ASSIGNMENTS,
      stat: stats.totalAssignments ?? '—',
      statLabel: `${stats.openAssignments ?? 0} open`,
    },
    {
      title: 'Attendance',
      description: 'Mark and review student attendance records',
      icon: CheckSquare, color: 'blue', route: ROUTES.ATTENDANCE,
      stat: stats.attendancePercent !== undefined ? `${stats.attendancePercent}%` : '—',
      statLabel: 'overall rate',
    },
    {
      title: 'IA Marks',
      description: 'Enter and update internal assessment marks',
      icon: Award, color: 'purple', route: ROUTES.IA_MARKS,
      stat: stats.iaAverage !== undefined ? `${stats.iaAverage}` : '—',
      statLabel: 'avg score',
    },
    {
      title: 'My Profile',
      description: 'View your profile details and assigned roles',
      icon: User, color: 'amber', route: ROUTES.MY_PROFILE,
    },
  ];

  return (
    <ScreenWrapper route={ROUTES.FACULTY_DASHBOARD}>

      {/* Welcome */}
      <View style={s.welcome}>
        <Text style={s.welcomeHeading}>
          Welcome to <Text style={s.welcomeBrand}>Faculty</Text>
        </Text>
        <Text style={s.welcomeSub}>
          Hello, <Text style={s.welcomeName}>{user?.name?.split(' ')[0] || 'Faculty Member'}</Text>!{' '}
          {user?.departmentCode ? `${user.departmentCode} Department` : 'Faculty Portal'}{' '}
          — manage your academic tasks from here
        </Text>
      </View>

      {/* Error state */}
      {isError && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>Could not load stats — backend may be down</Text>
        </View>
      )}

      {/* Statistics Overview with Charts */}
      {!isLoading && (
        <View style={s.statsSection}>
          {/* Attendance Overview */}
          <View style={s.statsCard}>
            <Text style={s.statsCardTitle}>Overall Attendance</Text>
            <View style={s.attendanceRow}>
              <ProgressRing 
                percentage={stats.attendancePercent || 0} 
                size={100}
                strokeWidth={10}
                label="attendance"
                color={
                  (stats.attendancePercent || 0) >= 85 ? colors.green[500] :
                  (stats.attendancePercent || 0) >= 75 ? colors.amber[500] :
                  colors.red[500]
                }
              />
              <View style={s.attendanceStats}>
                <View style={s.attendanceStat}>
                  <Text style={s.attendanceStatValue}>{stats.totalStudents || 0}</Text>
                  <Text style={s.attendanceStatLabel}>Total Students</Text>
                </View>
                <View style={s.attendanceStat}>
                  <Text style={s.attendanceStatValue}>{stats.totalAssignments || 0}</Text>
                  <Text style={s.attendanceStatLabel}>Assignments</Text>
                </View>
                <View style={s.attendanceStat}>
                  <Text style={s.attendanceStatValue}>{stats.iaAverage || 0}</Text>
                  <Text style={s.attendanceStatLabel}>IA Average</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Weekly Attendance Trend */}
          {weeklyData && weeklyData.length > 0 && (
            <SimpleBarChart
              title="Weekly Attendance Trend"
              data={weeklyData.map((d: any) => ({
                label: d.day,
                value: d.percent,
                color: d.percent >= 85 ? colors.green[500] :
                       d.percent >= 75 ? colors.amber[500] :
                       colors.red[500]
              }))}
              maxValue={100}
              height={160}
              showValues={true}
            />
          )}
        </View>
      )}

      {/* Tiles */}
      {isLoading ? (
        <View style={s.skeletonRow}>
          {[0, 1, 2, 3].map((i) => <View key={i} style={[s.skeleton, { width: CARD_W }]} />)}
        </View>
      ) : (
        <ScrollView horizontal={SCREEN_W > 600} showsHorizontalScrollIndicator={false}
          contentContainerStyle={SCREEN_W > 600 ? s.cardRowH : s.cardRowV}>
          {tiles.map((tile, i) => (
            <Animated.View key={tile.route} entering={FadeInUp.delay(i * 80).duration(400).springify()}>
              <ManagementCard {...tile} />
            </Animated.View>
          ))}
        </ScrollView>
      )}

      {/* Recent activity */}
      {!isLoading && stats.recentActivities?.length > 0 && (
        <View style={s.activityCard}>
          <Text style={s.activityTitle}>Recent Activity</Text>
          {stats.recentActivities.map((act: string, i: number) => (
            <View key={i} style={s.activityRow}>
              <View style={s.activityDot} />
              <Text style={s.activityText}>{act}</Text>
            </View>
          ))}
        </View>
      )}

    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  welcome: { gap: 4 },
  welcomeHeading: { fontSize: 24, fontWeight: '700', color: neutral[900] },
  welcomeBrand: { color: primaryScale[600] },
  welcomeName: { color: primaryScale[600], fontWeight: '700' },
  welcomeSub: { fontSize: 14, color: neutral[600], lineHeight: 20 },

  errorBanner: { backgroundColor: colors.dangerBg, borderRadius: 12, padding: 12 },
  errorText: { fontSize: 13, color: colors.danger, textAlign: 'center' },

  statsSection: { gap: 16 },
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[100],
    padding: 20,
    gap: 16,
    ...shadows.card,
  },
  statsCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: neutral[900],
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  attendanceStats: {
    flex: 1,
    gap: 12,
  },
  attendanceStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: neutral[50],
    borderRadius: 12,
  },
  attendanceStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: neutral[900],
  },
  attendanceStatLabel: {
    fontSize: 12,
    color: neutral[600],
    fontWeight: '500',
  },

  cardRowH: { flexDirection: 'row', gap: 16 },
  cardRowV: { gap: 12 },
  skeletonRow: { gap: 12 },

  mgmtCard: {
    backgroundColor: colors.white, borderRadius: 20, borderWidth: 1,
    borderColor: neutral[100], padding: 20, gap: 8, minHeight: 168,
    justifyContent: 'space-between', ...shadows.card,
  },
  mgmtCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  mgmtIconWrap: { padding: 12, borderRadius: 16, borderWidth: 1 },
  mgmtTitle: { fontSize: 16, fontWeight: '700', color: neutral[900] },
  mgmtDesc: { fontSize: 12, color: neutral[500], lineHeight: 17 },
  mgmtStat: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: neutral[100] },
  mgmtStatValue: { fontSize: 24, fontWeight: '700', color: neutral[900] },
  mgmtStatLabel: { fontSize: 12, color: neutral[500] },
  skeleton: { height: 160, backgroundColor: neutral[100], borderRadius: 20 },

  activityCard: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: neutral[100], padding: 20, gap: 10, ...shadows.card },
  activityTitle: { fontSize: 14, fontWeight: '600', color: neutral[900] },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  activityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: primaryScale[400], marginTop: 6 },
  activityText: { flex: 1, fontSize: 12, color: neutral[600], lineHeight: 18 },
});
