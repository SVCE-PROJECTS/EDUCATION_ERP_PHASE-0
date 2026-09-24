import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { colors, ThemeColors, shadows, primaryScale } from '../../theme/colors';

// ── Base Card ─────────────────────────────────────────────────────────────────

export interface CardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  hover?: boolean;
}

export default function Card({ children, style, onPress, hover = false }: CardProps) {
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.card, style]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── CardHeader ────────────────────────────────────────────────────────────────

export interface CardSectionProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CardHeader({ children, style }: CardSectionProps) {
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  return <View style={[styles.header, style]}>{children}</View>;
}

// ── CardBody ──────────────────────────────────────────────────────────────────

export function CardBody({ children, style }: CardSectionProps) {
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  return <View style={[styles.body, style]}>{children}</View>;
}

// ── StatCard ──────────────────────────────────────────────────────────────────

export type StatCardColor = 'indigo' | 'green' | 'orange' | 'purple' | 'blue' | 'pink';

const COLOR_MAP: Record<StatCardColor, { bg: string; icon: string; ring: string }> = {
  indigo: { bg: primaryScale[50], icon: primaryScale[600], ring: primaryScale[100] },
  green: { bg: colors.green[50], icon: colors.green[600], ring: colors.green[100] },
  orange: { bg: colors.orange[50], icon: colors.orange[600], ring: colors.orange[100] },
  purple: { bg: colors.purple[50], icon: colors.purple[600], ring: colors.purple[100] },
  blue: { bg: colors.blue[50], icon: colors.blue[600], ring: colors.blue[100] },
  pink: { bg: colors.pink[50], icon: colors.pink[600], ring: colors.pink[100] },
};

export interface StatCardProps {
  title: string;
  value?: string | number | null;
  subtitle?: string;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  color?: StatCardColor;
  trend?: number;
  onPress?: (event: GestureResponderEvent) => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'indigo',
  trend,
  onPress,
}: StatCardProps) {
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  const c = COLOR_MAP[color] ?? COLOR_MAP.indigo;

  return (
    <Card onPress={onPress} style={styles.statCard}>
      <View style={styles.statRow}>
        <View style={styles.statInfo}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={styles.statValue}>{value ?? '—'}</Text>
          {subtitle ? <Text style={styles.statSubtitle}>{subtitle}</Text> : null}
        </View>

        {Icon && (
          <View style={[styles.iconWrap, { backgroundColor: c.bg, borderColor: c.ring }]}>
            <Icon size={22} color={c.icon} />
          </View>
        )}
      </View>

      {trend !== undefined && (
        <Text style={[styles.trend, { color: trend >= 0 ? colors.green[500] : colors.red[500] }]}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%{' '}
          <Text style={styles.trendSuffix}>vs last month</Text>
        </Text>
      )}
    </Card>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    ...shadows.card,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  body: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  // StatCard specific
  statCard: {
    padding: 20,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.textSecondary,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.textPrimary,
    marginTop: 6,
  },
  statSubtitle: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 2,
  },
  iconWrap: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 2,
  },
  trend: {
    fontSize: 11,
    marginTop: 12,
  },
  trendSuffix: {
    color: theme.textMuted,
  },
});
