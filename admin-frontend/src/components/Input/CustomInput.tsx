// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, HelperText, Text } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { spacing, typography } from '../../theme';

const CustomInput = ({
  label, value, onChangeText, onBlur, placeholder, error, keyboardType = 'default',
  secureTextEntry = false, multiline = false, floatingLabel = true,
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      {!floatingLabel && label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        mode="outlined"
        label={floatingLabel ? label : undefined}
        placeholder={placeholder || label}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        error={!!error}
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
        textColor={colors.textPrimary}
        placeholderTextColor={colors.placeholder}
        style={styles.input}
        theme={{
          colors: {
            background: colors.surface,
            onSurface: colors.textPrimary,
            onSurfaceVariant: colors.textSecondary,
            outline: colors.border,
            primary: colors.primary,
          },
        }}
      />
      {!!error && <HelperText type="error">{error}</HelperText>}
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
  },
});

export default CustomInput;
