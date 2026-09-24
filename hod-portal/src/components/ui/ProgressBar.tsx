import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

export interface ProgressBarProps {
  label: string;
  /** 0–100 */
  percent: number;
  color?: string;
  valueLabel?: string;
}

/** Single horizontal progress row — used for at-a-glance % comparisons. */
export default function ProgressBar({ label, percent, color = colors.primary, valueLabel }: ProgressBarProps) {
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  const pct = Math.max(0, Math.min(100, percent));

  return (
    <View style={styles.row}>
      <View style={styles.headerRow}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.value, { color }]}>{valueLabel ?? `${pct}%`}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          entering={FadeIn.duration(500)}
          style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  row: { gap: 6, width: '100%' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: 12, color: theme.textSecondary, fontWeight: '500', flex: 1 },
  value: { fontSize: 12, fontWeight: '700' },
  track: {
    height: 8,
    borderRadius: 6,
    backgroundColor: theme.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  },
});
