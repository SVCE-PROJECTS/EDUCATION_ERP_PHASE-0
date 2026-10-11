import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Modal, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, BookOpen, Award, CalendarClock, ChevronRight, LayoutDashboard, GraduationCap, Flame } from '../../components/hod/icons';
import { MiniCalendar, SchedulePopup, ScheduleFormModal } from '../../components/calendar';
import { useMonthSchedules } from '../../hooks/useSchedules';
import { Schedule } from '../../services/schedule.service';
import { getTodayString } from '../../utils/dateHelpers';
import { dashboardService, facultyService } from '../../services/hod/faculty.service';
import studentListService from '../../services/hod/studentList.service';
import {
  technicalEventService,
  sportsActivityService,
  culturalActivityService,
  industryProjectService,
  hackathonService,
  otherCurricularService,
} from '../../services/hod/activities.service';
import { useAuth } from '../../context/hod/AuthContext';
import { useTheme } from '../../context/hod/ThemeContext';
import { formatRelativeTime, formatActionLabel } from '../../utils/hod/formatters';
import Avatar from '../../components/hod/ui/Avatar';
import DashboardCharts from '../../components/hod/DashboardCharts';
import GroupedBarChart from '../../components/hod/ui/GroupedBarChart';
import type { GroupedBarChartGroup } from '../../components/hod/ui/GroupedBarChart';
import RoleNotifications from '../../components/hod/ui/RoleNotifications';
import ScreenWrapper from '../../layouts/hod/ScreenWrapper';
import { colors, ThemeColors, shadows, primaryScale } from '../../theme/hod/colors';
import { ROUTES } from '../../navigation/hod/routes';
import { AuditLog } from '../../types';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W =
  SCREEN_W > 600
    ? Math.floor((SCREEN_W - 32 - 48) / 4) // Distribute evenly across 4 cards with gaps
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
  theme: ThemeColors;
  styles: ReturnType<typeof getStyles>;
  cardWidth?: number;
  cardHeight?: number;
}

function ManagementCard({ title, description, icon: Icon, color, route, stat, statLabel, theme, styles, cardWidth, cardHeight }: ManagementCardProps) {
  const navigation = useNavigation<any>();
  const c = COLOR_MAP[color] ?? COLOR_MAP.indigo;

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate(route)}
      activeOpacity={0.85}
      style={[styles.mgmtCard, { width: cardWidth ?? CARD_W }, cardHeight !== undefined && { height: cardHeight }]}
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

  // Calendar popover state
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formDate, setFormDate] = useState<string | undefined>(undefined);

  // Fetch schedules for current month
  const currentDate = new Date();
  const { schedules: monthSchedules } = useMonthSchedules(currentDate.getFullYear(), currentDate.getMonth() + 1);

  const handleDatePress = (dateString: string) => {
    setSelectedDate(dateString);
    setCalendarVisible(false);
    setPopupVisible(true);
  };

  const handleAddNew = (date?: string) => {
    setFormDate(date);
    setEditingSchedule(null);
    setPopupVisible(false);
    setFormVisible(true);
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setPopupVisible(false);
    setFormVisible(true);
  };

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
      // Step 1: Fetch total student count + performance bands (red/yellow/green)
      // across every semester & section — same real student-list data used
      // by the Student Management screen.
      const fetchStudentStats = async () => {
        const buckets = { excellent: 0, average: 0, needsImprovement: 0 };
        try {
          const semRes = await studentListService.getSemesters();
          const semesters: number[] = semRes?.semesters || semRes?.data?.semesters || [];

          if (!semesters.length) return { totalCount: 0, buckets };

          // Fetch every semester's sections in parallel (was sequential —
          // 4 semesters x 4 sections took ~3s one-at-a-time on a small
          // department; this cuts it to the slowest single call).
          const sectionsBySem = await Promise.all(
            semesters.map((sem) => studentListService.getSections(sem)),
          );

          const targets: { sem: number; secName: string }[] = [];
          semesters.forEach((sem, i) => {
            const secRes = sectionsBySem[i];
            const sections: any[] = Array.isArray(secRes) ? secRes : secRes?.data || [];
            sections.forEach((sec) => {
              const secName = typeof sec === 'string' ? sec : sec?.name || sec?.id;
              if (secName) targets.push({ sem, secName });
            });
          });

          // Fetch every section's dashboard in parallel too, for the same reason.
          const dashResults = await Promise.all(
            targets.map(({ sem, secName }) => studentListService.getSectionDashboard(sem, secName, 1, 100)),
          );

          let totalCount = 0;
          dashResults.forEach((dashData) => {
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
          });
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

      // Step 3: Fetch attendance data for odd semesters (1, 3, 5, 7) grouped by section
      // ALWAYS BUILD FULL SKELETON, then fill in real values
      const fetchAttendanceData = async (): Promise<GroupedBarChartGroup[]> => {
        const SKELETON_SEMESTERS = [1, 3, 5, 7];
        const SKELETON_SECTIONS = ['A', 'B', 'C'];
        const sectionColors: Record<string, string> = {
          'A': colors.blue[600],
          'B': colors.purple[600],
          'C': colors.green[600],
        };

        // Always build the full 4x3 skeleton first
        const skeleton: GroupedBarChartGroup[] = SKELETON_SEMESTERS.map(sem => ({
          groupLabel: `Sem ${sem}`,
          bars: SKELETON_SECTIONS.map(sec => ({
            label: sec,
            value: null as any,
            color: sectionColors[sec],
            semester: sem,
            section: sec,
          })),
        }));

        try {
          const semRes = await studentListService.getSemesters();
          const allSemesters: number[] = semRes?.semesters || semRes?.data?.semesters || [];
          const oddSemesters = allSemesters.filter((sem) => sem % 2 === 1).sort((a, b) => a - b);
          if (!oddSemesters.length) return skeleton;

          const limitedSemesters = oddSemesters.slice(0, 4);

          for (const sem of limitedSemesters) {
            try {
              const secRes = await studentListService.getSections(sem);
              const sections: any[] = Array.isArray(secRes) ? secRes : secRes?.data || [];

              for (const sec of sections) {
                try {
                  const secName = typeof sec === 'string' ? sec : sec?.name || sec?.id;
                  await new Promise(resolve => setTimeout(resolve, 100));

                  const dashData = await studentListService.getSectionDashboard(sem, secName, 1, 100);
                  const studentList = dashData?.students?.data ?? dashData?.data?.students?.data ?? dashData?.students ?? [];

                  // Extract attendance values - attendance is returned as a NUMBER from the service
                  const validAttendance = studentList
                    .map((st: any) => st?.attendance)
                    .filter((att: any) => typeof att === 'number' && !isNaN(att));

                  let avgAttendance: number | null = null;
                  if (validAttendance.length > 0) {
                    avgAttendance = Math.round(validAttendance.reduce((sum: number, att: number) => sum + att, 0) / validAttendance.length);
                  }

                  const groupIdx = SKELETON_SEMESTERS.indexOf(sem);
                  const barIdx = SKELETON_SECTIONS.indexOf(secName);

                  if (groupIdx >= 0 && barIdx >= 0 && skeleton[groupIdx]) {
                    skeleton[groupIdx].bars[barIdx] = {
                      label: secName,
                      value: avgAttendance,
                      color: sectionColors[secName] || colors.indigo[600],
                      semester: sem,
                      section: secName,
                    };
                  }
                } catch (err) {
                  console.error(`Failed for Sem ${sem} Section ${sec}:`, err);
                }
              }
            } catch (err) {
              console.error(`Failed to get sections for Sem ${sem}:`, err);
            }
          }

          return skeleton;
        } catch (err) {
          console.error('Failed to fetch attendance data:', err);
          return skeleton;
        }
      };

      const results = await Promise.allSettled([
        dashboardService.get().catch(() => null),
        facultyService.getAll().catch(() => []),
        fetchStudentStats(),
        fetchActivityCount(),
        fetchAttendanceData(),
      ]);

      const dashRes = results[0].status === 'fulfilled' ? results[0].value : null;
      const facultyRes = results[1].status === 'fulfilled' ? results[1].value : [];
      const studentStats =
        results[2].status === 'fulfilled'
          ? results[2].value
          : { totalCount: 0, buckets: { excellent: 0, average: 0, needsImprovement: 0 } };
      const activityCount = results[3].status === 'fulfilled' ? results[3].value : 0;
      const attendanceData = results[4].status === 'fulfilled' ? results[4].value : [];

      return {
        dashRes,
        facultyRes,
        calculatedStudentCount: studentStats.totalCount,
        performanceBuckets: studentStats.buckets,
        activityCount,
        attendanceData,
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
    facultyList.filter((f: any) =>
      f.roles?.some((fr: any) => {
        const slug = fr.role?.slug ?? fr.slug ?? fr;
        return ['TIMETABLE_COORDINATOR','EXAM_COORDINATOR','CULTURAL_COORDINATOR','PLACEMENT_COORDINATOR'].includes(slug);
      })
    ).length;
  const activityCount = dashStats.activityCount || data?.activityCount || 0;
  const performanceBuckets = data?.performanceBuckets || { excellent: 0, average: 0, needsImprovement: 0 };
  const attendanceChartData = data?.attendanceData || [];

  const dept = rawDash?.department || {};
  const recentActivity = rawDash?.recentActivity || [];

  // Prepare attendance chart data with navigation handlers
  const attendanceGroups: GroupedBarChartGroup[] = attendanceChartData.map((group: any) => ({
    groupLabel: group.groupLabel,
    bars: group.bars.map((bar: any) => ({
      label: bar.label,
      value: bar.value, // Can be null for "no data"
      color: bar.color,
      semester: bar.semester,
      section: bar.section,
      onPress: () => {
        // Navigate to Student Management with the semester and section pre-selected
        navigation.navigate(ROUTES.HOD_STUDENTS, {
          semester: bar.semester,
          section: bar.section,
        });
      },
    })),
  }));

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
            {getGreeting()}, {user?.name || 'Dr. HOD'}
          </Text>
          <Text style={styles.headerSub}>{dept.name || 'Department'} · {today}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.headerIconWrap}
            onPress={() => setCalendarVisible(!calendarVisible)}
            activeOpacity={0.75}
          >
            <CalendarClock size={26} color={colors.white} />
          </TouchableOpacity>
          <View style={styles.headerIconWrap}>
            <LayoutDashboard size={26} color={colors.white} />
          </View>
        </View>
      </LinearGradient>

      {/* Calendar popover — transparent Modal so tapping outside closes it */}
      <Modal
        visible={calendarVisible}
        transparent
        animationType="none"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <Pressable style={hodCalPopoverStyles.backdrop} onPress={() => setCalendarVisible(false)}>
          <Pressable style={hodCalPopoverStyles.popover} onPress={(e) => e.stopPropagation()}>
            <MiniCalendar
              schedules={monthSchedules || []}
              onDatePress={handleDatePress}
              calWidth={300}
              theme={theme}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Management cards */}
      {isLoading ? (
        <View style={styles.skeletonRow}>
          {[0, 1, 2, 3].map((i) => (
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
              statLabel: coordinatorCount === 1 ? 'faculty with coordinator roles' : 'faculty with coordinator roles',
            },
            {
              title: 'Faculty Allocation',
              desc: 'Allocate subjects and classes to faculty members',
              icon: CalendarClock,
              color: 'emerald' as const,
              route: ROUTES.HOD_FACULTY_ALLOCATION,
              stat: undefined,
              statLabel: undefined,
              cardWidth: 327,
              cardHeight: 210.73,
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
                cardWidth={(card as any).cardWidth}
                cardHeight={(card as any).cardHeight}
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

      {/* Department Attendance Chart - Always show skeleton even if data is empty */}
      {!isLoading && (
        <View style={styles.attendanceChartCard}>
          <Text style={styles.sectionLabel}>DEPARTMENT ATTENDANCE</Text>
          <GroupedBarChart
            data={attendanceGroups}
            height={240}
            showValues={true}
            unit="%"
            title="Average Attendance by Semester & Section"
            showLegend={true}
          />
          <Text style={styles.chartHelp}>Tap any section to view student details</Text>
        </View>
      )}

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
      
      {/* Schedule Popup */}
      <SchedulePopup
        visible={popupVisible}
        date={selectedDate || getTodayString()}
        schedules={monthSchedules || []}
        onClose={() => setPopupVisible(false)}
        onAddNew={handleAddNew}
        onEdit={handleEdit}
        theme={theme}
      />

      {/* Schedule Form Modal */}
      <ScheduleFormModal
        visible={formVisible}
        initialDate={formDate}
        schedule={editingSchedule || undefined}
        onClose={() => {
          setFormVisible(false);
          setEditingSchedule(null);
          setFormDate(undefined);
        }}
        theme={theme}
      />
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
    overflow: 'visible' as any,
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
  headerIcons: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
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
  cardRowH: { flexDirection: 'row', gap: 16, paddingRight: 16 },
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
    marginBottom: 0,
    paddingBottom: 0,
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

  // Attendance chart card
  attendanceChartCard: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 22,
    gap: 0,
    ...shadows.card,
    overflow: 'visible' as any,
  },
  chartHelp: {
    fontSize: 11,
    color: theme.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
});

// Popover styles — module-level (no theme dependency for positioning)
const hodCalPopoverStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  popover: {
    position: 'absolute',
    top: 72,
    right: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
});
