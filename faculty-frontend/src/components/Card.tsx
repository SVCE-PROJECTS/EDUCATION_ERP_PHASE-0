import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, radius } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Remove default padding for full-bleed content */
  noPadding?: boolean;
}

const Card: React.FC<Props> = ({ children, style, noPadding = false }) => (
  <View style={[styles.card, noPadding && styles.noPadding, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: spacing.md,
  },
  noPadding: {
    padding: 0,
  },
});

export default Card;
