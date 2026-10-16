// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput as RNTextInput, TouchableOpacity, View } from 'react-native';
import { Icon, TextInput } from 'react-native-paper';
import { useFacultyForInvitation } from '../../hooks/useMeetings';

export interface Participant {
  id: string;
  name: string;
  designation?: string;
  department_name?: string;
  department_code?: string;
}

interface ParticipantPickerProps {
  colors: any;
  selected: Participant[];
  onChange: (next: Participant[]) => void;
  label?: string;
}

// Dropdown-style multi-select for inviting faculty/HOD to a meeting. Tapping
// the field opens a scrollable, checkable list of everyone available (not
// just search matches) — typing narrows it further. Picks are reflected both
// as checkmarks in the list and as removable chips below.
export default function ParticipantPicker({ colors, selected, onChange, label = 'Invite participants' }: ParticipantPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: people = [], isLoading, error } = useFacultyForInvitation({
    search: debouncedSearch.trim() || undefined,
  });

  const isSelected = (id: string) => selected.some((p) => p.id === id);

  const toggle = (person: Participant) => {
    if (isSelected(person.id)) {
      onChange(selected.filter((p) => p.id !== person.id));
    } else {
      onChange([...selected, person]);
    }
  };

  const remove = (id: string) => onChange(selected.filter((p) => p.id !== id));

  const summary = selected.length === 0
    ? 'Select faculty or HOD to invite'
    : `${selected.length} selected`;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

      <TouchableOpacity
        style={[styles.field, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={[styles.fieldText, { color: selected.length ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
          {summary}
        </Text>
        <Icon source={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {open && (
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <RNTextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary, borderColor: colors.border }]}
          />
          <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {isLoading ? (
              <View style={styles.state}><ActivityIndicator size="small" color={colors.primary} /></View>
            ) : error ? (
              <Text style={[styles.stateText, { color: colors.danger || colors.error }]}>Could not load the list. Check your connection.</Text>
            ) : people.length === 0 ? (
              <Text style={[styles.stateText, { color: colors.textMuted }]}>
                {debouncedSearch ? `No one found matching "${debouncedSearch}".` : 'No one available to invite.'}
              </Text>
            ) : (
              people.map((person: Participant) => {
                const checked = isSelected(person.id);
                return (
                  <TouchableOpacity
                    key={person.id}
                    style={[styles.row, { borderColor: colors.border }]}
                    onPress={() => toggle(person)}
                    activeOpacity={0.7}
                  >
                    <Icon
                      source={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={20}
                      color={checked ? colors.primary : colors.textMuted}
                    />
                    <View style={styles.rowText}>
                      <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>{person.name}</Text>
                      <Text style={[styles.rowMeta, { color: colors.textMuted }]} numberOfLines={1}>
                        {person.designation}{person.department_name ? ` · ${person.department_name}` : ''}
                        {person.department_code ? ` (${person.department_code})` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
          <TouchableOpacity style={[styles.doneButton, { backgroundColor: colors.primary }]} onPress={() => setOpen(false)}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {selected.length > 0 && (
        <View style={styles.chips}>
          {selected.map((person) => (
            <View key={person.id} style={[styles.chip, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.chipText, { color: colors.primary }]} numberOfLines={1}>{person.name}</Text>
              <TouchableOpacity onPress={() => remove(person.id)} accessibilityLabel={`Remove ${person.name}`} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Icon source="close-circle" size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 48, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1,
  },
  fieldText: { fontSize: 14, flex: 1, marginRight: 8 },
  panel: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 8 },
  searchInput: { height: 38, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, fontSize: 13 },
  list: { maxHeight: 220 },
  state: { padding: 14, alignItems: 'center' },
  stateText: { fontSize: 12, textAlign: 'center', padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 13, fontWeight: '600' },
  rowMeta: { fontSize: 11, marginTop: 1 },
  doneButton: { alignSelf: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  doneText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, maxWidth: '100%' },
  chipText: { fontSize: 12, fontWeight: '600', maxWidth: 160 },
});
