import React from 'react';
import {
  TouchableOpacity, Text, View, ActivityIndicator,
  StyleSheet, StyleProp, ViewStyle, TextStyle, GestureResponderEvent,
} from 'react-native';
import { colors, primaryScale, neutral } from '../../theme/colors';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANT_BG: Record<ButtonVariant, string> = {
  primary: primaryScale[600], secondary: neutral[100],
  danger: colors.red[600], ghost: colors.transparent, outline: colors.transparent,
};
const VARIANT_TEXT: Record<ButtonVariant, string> = {
  primary: colors.white, secondary: neutral[800],
  danger: colors.white, ghost: neutral[700], outline: neutral[700],
};
const VARIANT_BORDER: Record<ButtonVariant, string> = {
  primary: primaryScale[600], secondary: colors.transparent,
  danger: colors.red[600], ghost: colors.transparent, outline: neutral[200],
};
const SIZE_PX: Record<ButtonSize, ViewStyle> = {
  sm: { paddingHorizontal: 12, paddingVertical: 6 },
  md: { paddingHorizontal: 16, paddingVertical: 8 },
  lg: { paddingHorizontal: 24, paddingVertical: 10 },
  icon: { padding: 8 },
};
const SIZE_TEXT: Record<ButtonSize, number> = { sm: 12, md: 13, lg: 15, icon: 13 };

export interface ButtonProps {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export default function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, onPress, style, textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      onPress={onPress} disabled={isDisabled} activeOpacity={0.75}
      style={[
        styles.base, SIZE_PX[size] ?? SIZE_PX.md,
        { backgroundColor: VARIANT_BG[variant], borderColor: VARIANT_BORDER[variant],
          borderWidth: variant === 'outline' ? 1 : 0, opacity: isDisabled ? 0.5 : 1 },
        style,
      ]}
      accessibilityRole="button" accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading && <ActivityIndicator size={14} color={VARIANT_TEXT[variant]} style={styles.spinner} />}
      {typeof children === 'string' ? (
        <Text style={[styles.text, { color: VARIANT_TEXT[variant], fontSize: SIZE_TEXT[size] }, textStyle]}>
          {children}
        </Text>
      ) : (
        <View style={styles.row}>{children}</View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontWeight: '600' },
  spinner: { marginRight: 4 },
});
