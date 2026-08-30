import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors, spacing, typography, radius } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  rightIcon?: React.ReactNode;
  /** Show/hide toggle (for password fields) */
  isPassword?: boolean;
}

const CustomInput: React.FC<Props> = ({
  label,
  error,
  containerStyle,
  rightIcon,
  isPassword = false,
  secureTextEntry,
  ...inputProps
}) => {
  const [hidden, setHidden] = useState(isPassword);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={isPassword ? hidden : secureTextEntry}
          accessibilityLabel={label}
          {...inputProps}
        />
        {isPassword ? (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            style={styles.toggle}
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Text style={styles.toggleText}>{hidden ? '👁' : '🙈'}</Text>
          </TouchableOpacity>
        ) : (
          rightIcon ? <View style={styles.toggle}>{rightIcon}</View> : null
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: {
    ...typography.smallBold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    minHeight: 44,
  },
  inputError: { borderColor: colors.danger },
  toggle: { paddingLeft: spacing.sm },
  toggleText: { fontSize: 18 },
  error: {
    ...typography.small,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});

export default CustomInput;
