import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type MeetingType = 'online' | 'offline';

export default function MeetingTypeSelector({
  value,
  onChange,
  colors,
}: {
  value: MeetingType;
  onChange: (type: MeetingType) => void;
  colors: any;
}) {
  return (
    <View accessibilityRole="tablist" style={[styles.container, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {(['online', 'offline'] as const).map((type) => {
        const selected = value === type;
        return (
          <TouchableOpacity
            key={type}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(type)}
            style={[styles.tab, selected && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.label, { color: selected ? '#FFFFFF' : colors.textSecondary }]}>
              {type === 'online' ? 'Online Meetings' : 'Offline Meetings'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignSelf: 'flex-start', borderWidth: 1, borderRadius: 8, padding: 3, gap: 3, maxWidth: '100%' },
  tab: { minHeight: 34, minWidth: 112, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '700' },
});