// @ts-nocheck
import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import {
  radius, typography, shadows,
} from '../../theme';

// variant: 'primary' | 'outline' | 'text'
const CustomButton = ({
  label, onPress, variant = 'primary', loading = false, disabled = false, style,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const mode = variant === 'primary' ? 'contained' : variant === 'outline' ? 'outlined' : 'text';

  return (
    <PaperButton
      mode={mode}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      style={[
        styles.base,
        variant === 'primary' && !disabled && !loading && styles.baseRaised,
        variant === 'outline' && { borderColor: colors.border },
        style,
      ]}
      labelStyle={styles.label}
      buttonColor={variant === 'primary' ? colors.primary : undefined}
      textColor={variant === 'primary' ? colors.white : colors.primary}
    >
      {label}
    </PaperButton>
  );
};

const getStyles = (colors) => StyleSheet.create({
  base: {
    borderRadius: radius.sm,
    justifyContent: 'center',
  },
  baseRaised: {
    ...shadows.button,
  },
  label: {
    ...typography.button,
  },
});

export default CustomButton;
