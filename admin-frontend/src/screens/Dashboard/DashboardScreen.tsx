// @ts-nocheck
import React, { useMemo } from 'react';
import {
  View, ScrollView, StyleSheet, Platform, TouchableOpacity,
} from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import ScreenLayout from '../../navigation/ScreenLayout';
import { useDashboard } from '../../hooks/useDashboard';
import { useAuditLogs } from '../../hooks/useAuditLogs';
import { useAdminUsers } from '../../hooks/useAdminUsers';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getModuleMeta, actionLabel, formatTimestamp } from '../../utils/auditFormat';
import {
  spacing, typography, radius, shadows,
} from '../../theme';

const CHART_COLORS = {
  primary: '#3B82F6',
  secondary: '#14B8A6',
  accent: '#A78BFA',
  warning: '#F59E0B',
  muted: '#CBD5E1',
};

const DEPT_ABBR = {
  'Computer Science and Engineering': 'CSE',
  'Computer Science and Engineering - AI': 'CSE-AI',
  'Computer Science and Engineering - Data Science': 'CSE-DS',
  'Computer Science and Engineering - Cyber Security': 'CSE-CY',
  'Information Science and Engineering': 'ISE',
  'Electronics and Communication Engineering': 'ECE',
  'Civil Engineering': 'CIVIL',
  'Mechanical Engineering': 'MECH',
};

const getAbbr = (label) =>
  DEPT_ABBR[label] || label.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 6);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const QUICK_ACTIONS = [
  {
    key: 'AddStudent', label: 'Add Student', icon: 'account-plus-outline', accent: 'blue', screen: 'AddStudent',
  },
  {
    key: 'TransferStudent', label: 'Transfer Student', icon: 'swap-horizontal', accent: 'violet', screen: 'TransferStudent',
  },
  {
    key: 'ExportStudentData', label: 'Download Data', icon: 'tray-arrow-down', accent: 'teal', screen: 'ExportStudentData',
  },
  {
    key: 'Settings', label: 'Settings', icon: 'cog-outline', accent: 'amber', screen: 'Settings',
  },
];

const StatCard = ({
  icon, label, value, hint, accent = 'blue', onPress,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const palette = colors.accent[accent] || colors.accent.blue;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.75 } : {};
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.statCard} {...wrapperProps}>
      <View style={styles.statTopRow}>
        <View style={[styles.statIcon, { backgroundColor: palette.bg, borderColor: palette.border }]}>
          <Icon source={icon} size={20} color={palette.icon} />
        </View>
        {onPress && <Icon source="chevron-right" size={18} color={colors.textMuted} />}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statHint, onPress && styles.statHintLink]}>
        {onPress ? 'Tap to view →' : hint}
      </Text>
    </Wrapper>
  );
};

const QuickAction = ({
  icon, label, accent, onPress,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const palette = colors.accent[accent] || colors.accent.blue;
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.quickActionIcon, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        <Icon source={icon} size={20} color={palette.icon} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

// Bar chart showing students per dept, with year breakdown as stacked tooltip
const BarChart = ({ data, deptByYear }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const max = Math.max(...data.map(d => d.value), 1);
  const [hoveredIndex, setHoveredIndex] = React.useState(null);

  return (
    <View style={styles.barChart}>
      <View style={styles.barPlot}>
        {data.map((item, index) => {
          const yearData = deptByYear?.[item.label] || {};
          const yearEntries = Object.entries(yearData).sort();
          return (
            <View key={item.label} style={styles.barColumn}>
              <Text style={styles.barValue}>{item.value}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { height: `${Math.max((item.value / max) * 100, item.value ? 8 : 0)}%` }]} />
              </View>
              <View style={styles.barLabelWrap}>
                <Text style={styles.barLabel} numberOfLines={1}>{getAbbr(item.label)}</Text>
                <View
                  style={styles.tooltipTrigger}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <Text style={styles.tooltipIcon}>▲</Text>
                  {hoveredIndex === index && (
                    <View style={styles.tooltip}>
                      <Text style={styles.tooltipDeptName}>{item.label}</Text>
                      {yearEntries.length > 0 && (
                        <View style={styles.tooltipYears}>
                          {yearEntries.map(([year, count]) => (
                            <Text key={year} style={styles.tooltipYearRow}>
                              {year}: {count} students
                            </Text>
                          ))}
                        </View>
                      )}
                      <Text style={styles.tooltipTotal}>Total: {item.value}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const PieChart = ({ transferred, active }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const total = transferred + active;
  const transferredPercent = total ? Math.round((transferred / total) * 100) : 0;
  const activePercent = 100 - transferredPercent;
  const pieStyle = Platform.OS === 'web'
    ? { background: `conic-gradient(${CHART_COLORS.accent} 0% ${transferredPercent}%, ${CHART_COLORS.secondary} ${transferredPercent}% 100%)` }
    : {};

  return (
    <View style={styles.pieWrap}>
      <View style={[styles.pie, pieStyle]}>
        <View style={styles.pieCenter}>
          <Text style={styles.pieCenterValue}>{total}</Text>
          <Text style={styles.pieCenterLabel}>Students</Text>
        </View>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: CHART_COLORS.secondary }]} />
          <Text style={styles.legendLabel}>Active</Text>
          <Text style={styles.legendValue}>{active} ({activePercent}%)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: CHART_COLORS.accent }]} />
          <Text style={styles.legendLabel}>Transferred</Text>
          <Text style={styles.legendValue}>{transferred} ({transferredPercent}%)</Text>
        </View>
      </View>
    </View>
  );
};

const ActivityRow = ({ entry }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const meta = getModuleMeta(entry.module);
  const palette = colors.accent[meta.accent] || colors.accent.blue;

  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityIcon, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        <Icon source={meta.icon} size={16} color={palette.icon} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityAction}>{actionLabel(entry.action)}</Text>
        <Text style={styles.activityMeta}>
          {entry.performedBy || 'System'} · {formatTimestamp(entry.createdAt)}
        </Text>
      </View>
    </View>
  );
};

const DashboardScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { user } = useAuth();
  const { data, isLoading, isError, error } = useDashboard();
  const { data: recentActivity, isLoading: loadingActivity } = useAuditLogs({ page: 1, pageSize: 5 });
  const { data: adminUsers } = useAdminUsers();
  const dashboard = data || {};
  const totalStudents = Number(dashboard.totalStudents || 0);

  const today = useMemo(() => new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }), []);

  const departmentData = useMemo(() => {
    const counts = dashboard.departmentCounts;
    if (!Array.isArray(counts) || counts.length === 0) return [];
    return counts
      .map(item => ({ label: String(item.label || 'Unassigned'), value: Number(item.value || 0) }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [dashboard.departmentCounts]);

  const transferred = Number(dashboard.transferredStudents || 0);
  const transferData = useMemo(
    () => ({ transferred, active: Math.max(totalStudents - transferred, 0) }),
    [totalStudents, transferred],
  );

  const activityRows = recentActivity?.data || [];

  return (
    <ScreenLayout navigation={navigation} activeScreen="Dashboard">
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View>
            <Text style={styles.title}>
              {getGreeting()}, {(user?.fullName || user?.username || 'Administrator').split(' ')[0]}
            </Text>
            <Text style={styles.subtitle}>{today}</Text>
          </View>
          <View style={styles.headerIconWrap}>
            <Icon source="view-dashboard-outline" size={26} color={colors.white} />
          </View>
        </LinearGradient>

        <View style={styles.statsGrid}>
          <StatCard accent="blue" icon="account-group-outline" label="Registered Students" value={isLoading ? '—' : totalStudents} hint="Current registry" />
          <StatCard
            accent="violet"
            icon="swap-horizontal"
            label="Transferred Students"
            value={isLoading ? '—' : transferData.transferred}
            onPress={() => navigation.navigate('TransferredStudents')}
          />
          <StatCard accent="teal" icon="domain" label="Departments" value={isLoading ? '—' : departmentData.length} hint="Departments represented" />
          <StatCard
            accent="amber"
            icon="shield-account-outline"
            label="Admin Users"
            value={adminUsers ? adminUsers.length : '—'}
            onPress={() => navigation.navigate('AdminUsers')}
          />
        </View>

        <View style={styles.quickActionsCard}>
          <Text style={styles.sectionLabel}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            {QUICK_ACTIONS.map((action) => (
              <QuickAction
                key={action.key}
                icon={action.icon}
                label={action.label}
                accent={action.accent}
                onPress={() => navigation.navigate(action.screen)}
              />
            ))}
          </View>
        </View>

        <View style={styles.chartGrid}>
          {/* Bar Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Student Registry</Text>
                <Text style={styles.chartSubtitle}>Students by department · hover ▲ for year breakdown</Text>
              </View>
              <Icon source="chart-bar" size={22} color={CHART_COLORS.primary} />
            </View>
            {departmentData.length
              ? <BarChart data={departmentData} deptByYear={dashboard.departmentByYear} />
              : <Text style={styles.emptyChart}>{isError ? (error?.message || 'Unable to load data.') : 'No student registry data available.'}</Text>}
          </View>

          {/* Donut Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Student Transfer</Text>
                <Text style={styles.chartSubtitle}>Active vs transferred distribution</Text>
              </View>
              <Icon source="chart-donut" size={22} color={CHART_COLORS.accent} />
            </View>
            <PieChart transferred={transferData.transferred} active={transferData.active} />
          </View>
        </View>

        <View style={styles.activityCard}>
          <View style={styles.activityHeader}>
            <Text style={styles.chartTitle}>Recent Activity</Text>
            <Text style={styles.viewAllLink} onPress={() => navigation.navigate('ActivityLog')}>
              View all →
            </Text>
          </View>
          {loadingActivity ? (
            <Text style={styles.emptyChart}>Loading...</Text>
          ) : activityRows.length === 0 ? (
            <Text style={styles.emptyChart}>No recent activity yet.</Text>
          ) : (
            activityRows.map((entry) => <ActivityRow key={entry.id} entry={entry} />)
          )}
        </View>
      </ScrollView>
    </ScreenLayout>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.raised,
  },
  title: { ...typography.h1, color: colors.white },
  subtitle: { ...typography.body, color: 'rgba(255,255,255,0.85)', marginTop: spacing.xs },
  headerIconWrap: {
    width: 52, height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  statCard: {
    flexGrow: 1, flexBasis: 220, minWidth: 200,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg,
    ...shadows.soft,
  },
  statTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md,
  },
  statIcon: {
    width: 42, height: 42, borderRadius: radius.md, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  statValue: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.xs },
  statHint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  statHintLink: { color: colors.primary, fontWeight: '600' },
  sectionLabel: {
    ...typography.label, color: colors.textSecondary, marginBottom: spacing.md, letterSpacing: 0.6,
  },
  quickActionsCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg,
    ...shadows.soft,
  },
  quickActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  quickAction: {
    flexGrow: 1, minWidth: 140, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  quickActionIcon: {
    width: 36, height: 36, borderRadius: radius.sm, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  quickActionLabel: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 13, flexShrink: 1 },
  chartGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginBottom: spacing.lg },
  chartCard: {
    flex: 1, minWidth: 360, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg, minHeight: 360,
    ...shadows.soft,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  chartTitle: { ...typography.h3, color: colors.textPrimary },
  chartSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
  barChart: { flex: 1, minHeight: 270, justifyContent: 'flex-end' },
  barPlot: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderBottomWidth: 1, borderBottomColor: colors.border, paddingTop: spacing.lg },
  barColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minWidth: 38, height: '100%' },
  barValue: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  barTrack: { width: '55%', maxWidth: 42, height: '72%', justifyContent: 'flex-end', backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, overflow: 'hidden' },
  bar: { width: '100%', backgroundColor: CHART_COLORS.primary, borderRadius: radius.sm },
  barLabelWrap: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  barLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm, maxWidth: 72, textAlign: 'center' },
  tooltipTrigger: { position: 'relative', alignItems: 'center' },
  tooltipIcon: { fontSize: 8, color: colors.textMuted, marginTop: 2 },
  tooltip: { position: 'absolute', bottom: 18, backgroundColor: '#1e293b', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, zIndex: 99, minWidth: 180, maxWidth: 240 },
  tooltipDeptName: { color: '#fff', fontSize: 11, fontWeight: '700', marginBottom: 4 },
  tooltipYears: { gap: 2 },
  tooltipYearRow: { color: '#94a3b8', fontSize: 10 },
  tooltipTotal: { color: '#e2e8f0', fontSize: 11, fontWeight: '600', marginTop: 4, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 4 },
  pieWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md },
  pie: { width: 190, height: 190, borderRadius: 95, alignItems: 'center', justifyContent: 'center', backgroundColor: CHART_COLORS.muted },
  pieCenter: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pieCenterValue: { ...typography.h2, color: colors.textPrimary },
  pieCenterLabel: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  legend: { width: '100%', maxWidth: 270, marginTop: spacing.lg, gap: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  legendDot: { width: 9, height: 9, borderRadius: 5, marginRight: spacing.sm },
  legendLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  legendValue: { ...typography.bodyBold, color: colors.textPrimary },
  emptyChart: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xxl },
  activityCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: spacing.lg,
    ...shadows.soft,
  },
  activityHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md,
  },
  viewAllLink: { ...typography.bodyBold, color: colors.primary, fontSize: 13 },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  activityIcon: {
    width: 32, height: 32, borderRadius: radius.sm, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  activityContent: { flex: 1, minWidth: 0 },
  activityAction: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 13 },
  activityMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
});

export default DashboardScreen;
