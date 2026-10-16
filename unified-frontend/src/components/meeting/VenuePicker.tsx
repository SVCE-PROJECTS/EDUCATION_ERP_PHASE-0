// @ts-nocheck
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { OFFLINE_MEETING_VENUES } from '../../constants';

interface VenuePickerProps {
  colors: any;
  value: string;
  onChange: (next: string) => void;
  label?: string;
}

// Single-select dropdown for the fixed offline-meeting venue list, matching
// ParticipantPicker's dropdown convention. Free text isn't accepted — the
// venue must be one of the shared, predefined rooms.
export default function VenuePicker({ colors, value, onChange, label = 'Venue *' }: VenuePickerProps) {
  const [open, setOpen] = useState(false);

  const select = (venue: string) => {
    onChange(venue);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

      <TouchableOpacity
        style={[styles.field, { backgroundColor: colors.background, borderColor: colors.border }]}
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <Text style={[styles.fieldText, { color: value ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>
          {value || 'Select a venue'}
        </Text>
        <Icon source={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {open && (
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {OFFLINE_MEETING_VENUES.map((venue) => {
              const checked = value === venue;
              return (
                <TouchableOpacity
                  key={venue}
                  style={[styles.row, { borderColor: colors.border }]}
                  onPress={() => select(venue)}
                  activeOpacity={0.7}
                >
                  <Icon
                    source={checked ? 'radiobox-marked' : 'radiobox-blank'}
                    size={20}
                    color={checked ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>{venue}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 12, fontWeight: '600' },
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    minHeight: 48, paddingHorizontal: 14, borderRadius: 4, borderWidth: 1,
  },
  fieldText: { fontSize: 14, flex: 1, marginRight: 8 },
  panel: { borderWidth: 1, borderRadius: 10, padding: 8, gap: 8, marginTop: 4 },
  list: { maxHeight: 220 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  rowName: { fontSize: 13, fontWeight: '600' },
});
