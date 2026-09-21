import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { neutral, colors } from '../../theme/colors';

export interface PieChartDatum {
  label: string;
  value: number;
  color: string;
}

export interface PieChartProps {
  data: PieChartDatum[];
  /** Outer diameter of the donut in px. Default 160. */
  size?: number;
  /** Ring thickness. Default 24. */
  strokeWidth?: number;
  /** Text shown in the centre of the donut, e.g. total count. */
  centerLabel?: string;
  centerSubLabel?: string;
  /** Show a legend row below the chart. Default true. */
  showLegend?: boolean;
}

/**
 * PieChart — SVG donut chart built with react-native-svg.
 *
 * Uses the classic stroke-dasharray/-dashoffset technique on a circle per
 * segment, so it supports any number of segments without native path math.
 */
export default function PieChart({
  data,
  size = 160,
  strokeWidth = 24,
  centerLabel,
  centerSubLabel,
  showLegend = true,
}: PieChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

  let cumulative = 0;

  return (
    <View style={styles.root}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            {/* Track */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={neutral[100]}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Segments */}
            {data.map((d, i) => {
              const pct = d.value / total;
              const dash = pct * circumference;
              const offset = -1 * (cumulative / total) * circumference;
              cumulative += d.value;
              if (d.value <= 0) return null;
              return (
                <Circle
                  key={`${d.label}-${i}`}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={d.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${dash}, ${circumference - dash}`}
                  strokeDashoffset={offset}
                  strokeLinecap="butt"
                  fill="none"
                />
              );
            })}
          </G>
        </Svg>

        {(centerLabel || centerSubLabel) && (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            {centerLabel && <Text style={styles.centerLabel}>{centerLabel}</Text>}
            {centerSubLabel && <Text style={styles.centerSubLabel}>{centerSubLabel}</Text>}
          </View>
        )}
      </View>

      {showLegend && (
        <View style={styles.legend}>
          {data.map((d, i) => (
            <View key={`${d.label}-legend-${i}`} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: d.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {d.label}
              </Text>
              <Text style={styles.legendValue}>{d.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: 20, flexWrap: 'wrap' },
  center: { alignItems: 'center', justifyContent: 'center' },
  centerLabel: { fontSize: 22, fontWeight: '700', color: neutral[900] },
  centerSubLabel: { fontSize: 11, color: neutral[500], marginTop: 1 },
  legend: { gap: 10, flex: 1, minWidth: 120 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12, color: neutral[600], flex: 1 },
  legendValue: { fontSize: 12, fontWeight: '700', color: neutral[900] },
});
