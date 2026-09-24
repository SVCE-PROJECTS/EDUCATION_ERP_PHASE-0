/**
 * Simple Bar Chart Component
 * Lightweight bar chart using native React Native components
 */
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { primaryScale, ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

interface DataPoint {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: DataPoint[];
  maxValue?: number;
  height?: number;
  showValues?: boolean;
  title?: string;
}

export default function SimpleBarChart({
  data,
  maxValue,
  height = 180,
  showValues = true,
  title
}: SimpleBarChartProps) {
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  const max = maxValue || Math.max(...data.map(d => d.value), 100);
  const barWidth = Math.min((Dimensions.get('window').width - 80) / data.length, 60);

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={[styles.chartContainer, { height }]}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          <Text style={styles.axisLabel}>{max}</Text>
          <Text style={styles.axisLabel}>{Math.round(max / 2)}</Text>
          <Text style={styles.axisLabel}>0</Text>
        </View>

        {/* Bars */}
        <View style={styles.barsContainer}>
          {data.map((item, index) => {
            const barHeight = (item.value / max) * (height - 40);
            const barColor = item.color || theme.primary;

            return (
              <View key={index} style={[styles.barWrapper, { width: barWidth }]}>
                <View style={styles.barContainer}>
                  {showValues && item.value > 0 && (
                    <Text style={styles.valueLabel}>{item.value}</Text>
                  )}
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor: barColor,
                        width: Math.max(barWidth * 0.7, 24),
                      }
                    ]}
                  />
                </View>
                <Text style={styles.barLabel} numberOfLines={1}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  chartContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  yAxis: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 8,
    paddingBottom: 24,
  },
  axisLabel: {
    fontSize: 10,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 24,
    gap: 4,
  },
  barWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  barContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
  },
  bar: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 2,
    shadowColor: primaryScale[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  valueLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  barLabel: {
    fontSize: 10,
    color: theme.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
});
