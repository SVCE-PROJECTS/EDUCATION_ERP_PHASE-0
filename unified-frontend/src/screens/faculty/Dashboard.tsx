/**
 * Faculty Portal — Dashboard
 * GET /api/dashboard/stats returns flat JSON:
 * { totalStudents, attendancePercent, totalAssignments, openAssignments, iaAverage, recentActivities }
 */
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Modal, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { ClipboardList, Award, User, ChevronRight, LayoutDashboard, CalendarClock } from '../../components/faculty/icons';
import { MiniCalendar, SchedulePopup, ScheduleFormModal } from '../../components/calendar';
import { useMonthSchedules } from '../../hooks/useSchedules';
import { Schedule } from '../../services/schedule.service';
import { getTodayString } from '../../utils/dateHelpers';
import { dashboardService } from '../../services/faculty/faculty.service';
import { useAuth } from '../../context/faculty/AuthContext';
import { useTheme } from '../../context/faculty/ThemeContext';
import ScreenWrapper from '../../layouts/faculty/ScreenWrapper';
import SimpleBarChart from '../../components/faculty/ui/SimpleBarChart';
import ClassAttendanceChart from '../../components/faculty/ui/ClassAttendanceChart';
import RoleNotifications from '../../components/faculty/ui/RoleNotifications';
import api from '../../services/faculty/api';
import { colors, shadows, primaryScale, ThemeColors } from '../../theme/faculty/colors';
import { ROUTES } from '../../navigation/faculty/routes';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W > 600 ? (SCREEN_W - 48 - 16) / 2 : SCREEN_W - 32;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

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

function ManagementCard({ title, description, icon: Icon, color, route, stat, statLabel, theme, s }: TileProps & { theme: ThemeColors; s: ReturnType<typeof getStyles> }) {
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
          <ChevronRight size={16} color={theme.textMuted} />
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

function QuickAction({ icon: Icon, label, color, onPress, s }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string; color: TileColor; onPress: () => void; s: ReturnType<typeof getStyles> }) {
  const c = COLOR_MAP[color];
  return (
    <TouchableOpacity style={s.quickAction} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.quickActionIcon, { backgroundColor: c.light, borderColor: c.border }]}>
        <Icon size={18} color={c.icon} />
      </View>
      <Text style={s.quickActionLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const navigation = useNavigation<any>();

  // Calendar popover state
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formDate, setFormDate] = useState<string | undefined>(undefined);

  const today = React.useMemo(
    () => new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    []
  );

  // Fetch schedules for current month
  const currentDate = new Date();
  const { schedules } = useMonthSchedules(currentDate.getFullYear(), currentDate.getMonth() + 1);

  const handleDatePress = (dateStr: string) => {
    setSelectedDate(dateStr);
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
      const res = await api.get('/dashboard/weekly-attendance');
      return res.data;
    },
    staleTime: 60_000,
    retry: 1,
  });

  // Fetch class attendance statistics for the new chart
  const { data: classAttendanceData, isLoading: loadingClassAttendance, isError: classAttendanceError } = useQuery({
    queryKey: ['class-attendance-statistics'],
    queryFn: async () => {
      const res = await api.get('/attendance/class-statistics');
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

  const quickActions: { key: string; label: string; icon: React.ComponentType<{ size?: number; color?: string }>; color: TileColor; route: string }[] = [
    { key: 'assignments', label: 'Assignments', icon: ClipboardList, color: 'indigo', route: ROUTES.ASSIGNMENTS },
    { key: 'ia-marks', label: 'IA Marks', icon: Award, color: 'purple', route: ROUTES.IA_MARKS },
    { key: 'profile', label: 'My Profile', icon: User, color: 'amber', route: ROUTES.MY_PROFILE },
  ];

  // Transform class attendance data for chart
  const classesWithAttendance = React.useMemo(() => {
    if (!classAttendanceData || !Array.isArray(classAttendanceData)) return [];
    return classAttendanceData.map((cls: any) => ({
      class_id: cls.class_id,
      subject_code: cls.subject_code,
      subject_name: cls.subject_name,
      semester: cls.semester,
      section: cls.section,
      label: `${cls.subject_name} (${cls.subject_code}) · Sec ${cls.section} · Sem ${cls.semester}`,
      attendancePercent: cls.attendancePercent,
      studentCount: cls.studentCount,
    }));
  }, [classAttendanceData]);

  return (
    <ScreenWrapper route={ROUTES.FACULTY_DASHBOARD}>

      {/* Gradient greeting header */}
      <LinearGradient
        colors={theme.gradientPrimary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <View>
          <Text style={s.headerHeading}>
            {getGreeting()}, {user?.name || 'Faculty'}
          </Text>
          <Text style={s.headerSub}>
            {user?.departmentCode ? `${user?.departmentCode} Department` : 'Faculty Portal'} · {today}
          </Text>
        </View>
        <View style={s.headerIcons}>
          <TouchableOpacity
            style={s.headerIconWrap}
            onPress={() => setCalendarVisible(!calendarVisible)}
            activeOpacity={0.75}
          >
            <CalendarClock size={26} color={colors.white} />
          </TouchableOpacity>
          <View style={s.headerIconWrap}>
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
        <Pressable style={calPopoverStyles.backdrop} onPress={() => setCalendarVisible(false)}>
          <Pressable style={calPopoverStyles.popover} onPress={(e) => e.stopPropagation()}>
            <MiniCalendar
              schedules={schedules}
              onDatePress={handleDatePress}
              calWidth={300}
              theme={theme}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Error state */}
      {isError && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>Could not load stats — backend may be down</Text>
        </View>
      )}

      {/* Statistics Overview with Charts */}
      {!isLoading && (
        <View style={s.statsSection}>
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

          {/* Class Attendance Chart - ALWAYS RENDER */}
          <ClassAttendanceChart
            classes={classesWithAttendance}
            height={240}
          />
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
              <ManagementCard {...tile} theme={theme} s={s} />
            </Animated.View>
          ))}
        </ScrollView>
      )}

      {/* Quick Actions */}
      <View style={s.quickActionsCard}>
        <Text style={s.sectionLabel}>QUICK ACTIONS</Text>
        <View style={s.quickActionsRow}>
          {quickActions.map((action) => (
            <QuickAction
              key={action.key}
              icon={action.icon}
              label={action.label}
              color={action.color}
              onPress={() => navigation.navigate(action.route)}
              s={s}
            />
          ))}
        </View>
      </View>

      {/* Role notifications */}
      <RoleNotifications roles={user?.roles} />

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

      {/* Schedule Popup */}
      <SchedulePopup
        visible={popupVisible}
        date={selectedDate || getTodayString()}
        schedules={schedules || []}
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

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: 20, padding: 20, marginBottom: 4, ...shadows.card, overflow: 'visible' as any,
  },
  headerHeading: { fontSize: 20, fontWeight: '700', color: colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  headerIcons: {
    flexDirection: 'row', gap: 14, alignItems: 'center',
  },
  headerIconWrap: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },

  errorBanner: { backgroundColor: theme.dangerBg, borderRadius: 12, padding: 12 },
  errorText: { fontSize: 13, color: theme.danger, textAlign: 'center' },

  statsSection: { gap: 16 },

  cardRowH: { flexDirection: 'row', gap: 16 },
  cardRowV: { gap: 12 },
  skeletonRow: { gap: 12 },

  mgmtCard: {
    backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1,
    borderColor: theme.border, padding: 20, gap: 8, minHeight: 168,
    justifyContent: 'space-between', ...shadows.card,
  },
  mgmtCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  mgmtIconWrap: { padding: 12, borderRadius: 16, borderWidth: 1 },
  mgmtTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
  mgmtDesc: { fontSize: 12, color: theme.textSecondary, lineHeight: 17 },
  mgmtStat: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border },
  mgmtStatValue: { fontSize: 24, fontWeight: '700', color: theme.textPrimary },
  mgmtStatLabel: { fontSize: 12, color: theme.textSecondary },
  skeleton: { height: 160, backgroundColor: theme.border, borderRadius: 20 },

  quickActionsCard: {
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border,
    borderRadius: 20, padding: 20, gap: 12, ...shadows.card,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.textSecondary, letterSpacing: 0.6 },
  quickActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickAction: {
    flexGrow: 1, minWidth: 140, flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.primarySoft,
  },
  quickActionIcon: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontSize: 13, fontWeight: '600', color: theme.textPrimary, flexShrink: 1 },

  activityCard: { backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, padding: 20, gap: 10, ...shadows.card },
  activityTitle: { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  activityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: primaryScale[400], marginTop: 6 },
  activityText: { flex: 1, fontSize: 12, color: theme.textSecondary, lineHeight: 18 },
});

// Popover styles — module-level so they don't depend on theme
const calPopoverStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // fully transparent — just catches outside taps
  },
  popover: {
    position: 'absolute',
    top: 72,
    right: 16,
    // shadow handled by MiniCalendar's container border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
});
