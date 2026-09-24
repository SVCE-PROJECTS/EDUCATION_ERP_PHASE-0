// @ts-nocheck
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useTheme } from '../../context/ThemeContext';
import { radius, spacing, shadows } from '../../theme';

const SearchBar = ({
  value, onChangeText, onSubmit, placeholder = 'Search by Library ID, USN, Name',
}) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.wrapper}>
      <TextInput
        mode="outlined"
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        left={<TextInput.Icon icon="account-search-outline" />}
        right={<TextInput.Icon icon="magnify" onPress={onSubmit} />}
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
        textColor={colors.textPrimary}
        placeholderTextColor={colors.placeholder}
        style={styles.input}
        returnKeyType="search"
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
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.soft,
  },
  input: {
    backgroundColor: colors.surface,
  },
});

export default SearchBar;
