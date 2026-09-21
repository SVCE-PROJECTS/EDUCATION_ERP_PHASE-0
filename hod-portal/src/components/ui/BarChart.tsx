import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, neutral } from '../../theme/colors';

/**
 * BarChart — minimal, dependency-free vertical bar chart.
 *
 * Built with plain Views (no chart library / no new native deps) so it
 * renders identically on web, iOS and Android. Good for small dashboard
 * summaries — not intended for large datasets or axes with negative values.
 */

export interface BarChartDatum {
  label: string;
  value: number;
  /** Optional per-bar color override; defaults to theme primary. */
  color?: string;
}

export interface BarChartProps {
  data: BarChartDatum[];
  /** Fixed chart height in px (bars scale within this). Default 160. */
  height?: number;
  /** Show the numeric value above each bar. Default true. */
  showValues?: boolean;
  /** Optional unit suffix appended to displayed values, e.g. "%". */
  unit?: string;
}

export default function BarChart({ data, height = 160, showValues = true, unit = '' }: BarChartProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <View style={[styles.track, { height }]}>
        {data.map((d, i) => {
          const barHeight = Math.max(4, (d.value / maxValue) * (height - 28));
          return (
            <View key={`${d.label}-${i}`} style={styles.col}>
              {showValues && (
                <Text style={styles.value} numberOfLines={1}>
                  {d.value}
                  {unit}
                </Text>
              )}
              <Animated.View
                entering={FadeIn.delay(i * 60).duration(350)}
                style={[
                  styles.bar,
                  {
                    height: barHeight,
                    backgroundColor: d.color ?? colors.primary,
                    width: trackWidth ? Math.min(40, trackWidth / data.length - 16) : 24,
                  },
                ]}
              />
              <Text style={styles.label} numberOfLines={1}>
                {d.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%' },
  track: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '100%',
  },
  col: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    maxWidth: 90,
  },
  bar: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    minWidth: 18,
  },
  value: {
    fontSize: 11,
    fontWeight: '700',
    color: neutral[700],
  },
  label: {
    fontSize: 10,
    color: neutral[500],
    marginTop: 4,
    textAlign: 'center',
  },
});
