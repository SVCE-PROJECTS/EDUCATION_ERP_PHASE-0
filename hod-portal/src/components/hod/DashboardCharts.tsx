import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import BarChart from '../ui/BarChart';
import PieChart from '../ui/PieChart';
import { colors, shadows, neutral } from '../../theme/colors';

const SCREEN_W = Dimensions.get('window').width;
const IS_WIDE = SCREEN_W > 700;

export interface DashboardChartsProps {
  studentCount: number;
  facultyCount: number;
  coordinatorCount: number;
  activityCount: number;
  performanceBuckets: {
    excellent: number; // performance >= 75
    average: number; // 50–74
    needsImprovement: number; // < 50
  };
}

/**
 * DashboardCharts — "Department Overview" bar chart + "Overall Department
 * Performance" donut, both using the red / yellow / green palette already
 * defined in the shared theme (colors.danger / colors.warning /
 * colors.success), so it always matches the rest of the app.
 */
export default function DashboardCharts({
  studentCount,
  facultyCount,
  coordinatorCount,
  activityCount,
  performanceBuckets,
}: DashboardChartsProps) {
  const { excellent, average, needsImprovement } = performanceBuckets;
  const totalRated = excellent + average + needsImprovement;

  return (
    <View style={[s.wrap, IS_WIDE && s.wrapRow]}>
      {/* Overview bar chart */}
      <View style={[s.card, IS_WIDE && s.cardHalf]}>
        <Text style={s.cardTitle}>Department Overview</Text>
        <Text style={s.cardSub}>Students, faculty, coordinators & activities</Text>
        <BarChart
          data={[
            { label: 'Students', value: studentCount, color: colors.success },
            { label: 'Faculty', value: facultyCount, color: colors.warning },
            { label: 'Coordinators', value: coordinatorCount, color: colors.danger },
            { label: 'Activities', value: activityCount, color: colors.success },
          ]}
          height={170}
        />
      </View>

      {/* Performance donut */}
      {/* Performance donut */}
<View style={[s.card, IS_WIDE && s.cardHalf]}>
  <Text style={s.cardTitle}>Overall Department Performance</Text>
  <Text style={s.cardSub}>Students grouped by performance band</Text>

  <PieChart
    centerLabel="5"
    centerSubLabel="students"
    data={[
      {
        label: 'Excellent (>75%)',
        value: 2,
        color: colors.success,
      },
      {
        label: 'Average (50-74%)',
        value: 2,
        color: colors.warning,
      },
      {
        label: 'Needs Improvement (<50%)',
        value: 1,
        color: colors.danger,
      },
    ]}
  />
</View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 16 },
  wrapRow: { flexDirection: 'row', alignItems: 'stretch' },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: neutral[100],
    padding: 20,
    gap: 4,
    ...shadows.card,
  },
  cardHalf: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: neutral[900] },
  cardSub: { fontSize: 12, color: neutral[500], marginBottom: 14 },
  empty: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 13, color: neutral[400] },
});
