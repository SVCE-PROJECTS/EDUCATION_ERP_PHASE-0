// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import {
  TextInput, Text, ActivityIndicator, Icon,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { searchStudents } from '../../services/studentService';
import { useTheme } from '../../context/ThemeContext';
import {
  spacing, radius, shadows, typography,
} from '../../theme';

// Reachable from every screen via ScreenLayout. Debounced search over the
// student registry; picking a result jumps straight to their detail screen.
const GlobalSearch = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const rows = await searchStudents(trimmed);
        setResults(rows);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (student) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    navigation.navigate('StudentDetails', { studentId: student.id });
  };

  const showDropdown = open && query.trim().length >= 2;

  return (
    <View style={styles.wrap}>
      <TextInput
        mode="outlined"
        placeholder="Search students by name, USN or Library ID..."
        value={query}
        onChangeText={(v) => { setQuery(v); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        left={<TextInput.Icon icon="magnify" />}
        dense
        style={styles.input}
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
        textColor={colors.textPrimary}
        placeholderTextColor={colors.placeholder}
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

      {showDropdown && (
        <View
          style={styles.dropdown}
          // Prevent the TextInput's onBlur (which fires on mousedown, before
          // onPress) from closing the dropdown before a result can be tapped.
          onStartShouldSetResponderCapture={() => true}
          {...(Platform.OS === 'web' ? { onMouseDown: (e) => e.preventDefault() } : {})}
        >
          {loading ? (
            <View style={styles.centerRow}>
              <ActivityIndicator size={16} color={colors.primary} />
            </View>
          ) : results.length === 0 ? (
            <Text style={styles.emptyText}>No students found</Text>
          ) : (
            results.map((student) => (
              <TouchableOpacity
                key={student.id}
                style={styles.resultRow}
                onPress={() => handleSelect(student)}
              >
                <Icon source="account-outline" size={16} color={colors.textSecondary} />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName} numberOfLines={1}>{student.name}</Text>
                  <Text style={styles.resultMeta} numberOfLines={1}>
                    {student.usn || student.libraryId} · {student.departmentName}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  wrap: { width: 320, position: 'relative' },
  input: { height: 40, backgroundColor: colors.surface },
  dropdown: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 320,
    overflow: 'hidden',
    zIndex: 50,
    ...shadows.card,
  },
  centerRow: { padding: spacing.md, alignItems: 'center' },
  emptyText: {
    ...typography.caption, color: colors.textMuted, padding: spacing.md, textAlign: 'center',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultInfo: { flex: 1, minWidth: 0 },
  resultName: { ...typography.bodyBold, color: colors.textPrimary, fontSize: 13 },
  resultMeta: { ...typography.caption, color: colors.textSecondary },
});

export default GlobalSearch;
