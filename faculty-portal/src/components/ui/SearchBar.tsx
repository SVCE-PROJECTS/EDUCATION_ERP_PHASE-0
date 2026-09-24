import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Search, X } from '../icons';
import { ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

export default function SearchBar({ value, onChange, placeholder = 'Search...', style }: SearchBarProps) {
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={[styles.container, style]}>
      <Search size={16} color={theme.textMuted} style={styles.leadIcon} />
      <TextInput
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={theme.placeholder} style={styles.input}
        autoCorrect={false} autoCapitalize="none" returnKeyType="search"
      />
      {!!value && (
        <TouchableOpacity onPress={() => onChange('')} style={styles.clearBtn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} accessibilityLabel="Clear search">
          <X size={14} color={theme.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingHorizontal: 10, height: 40,
  },
  leadIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 13, color: theme.textPrimary, padding: 0 },
  clearBtn: { marginLeft: 6, padding: 2 },
});
