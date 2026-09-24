// @ts-nocheck
import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import {
  spacing, typography, radius, shadows,
} from '../../theme';

// One row in a fee category list — used by FeeScreen (top-level categories)
// and AcademicFeeScreen (tuition / exam sub-categories).
const FeeOptionCard = ({
  icon, title, description, onPress, accent = 'blue',
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const palette = colors.accent[accent] || colors.accent.blue;

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        <Icon source={icon} size={28} color={palette.icon} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <Icon source="chevron-right" size={22} color={colors.textSecondary} />
    </TouchableOpacity>
  );
};

const getStyles = (colors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 96,
    ...shadows.soft,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default FeeOptionCard;
