import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Cpu, Music2 } from '../../../components/icons';
import Hackathons from './Hackathons';
import CulturalActivities from './CulturalActivities';
import { colors, primaryScale, neutral } from '../../../theme/colors';

type TabId = 'hackathons' | 'cultural';
const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { id: 'hackathons', label: 'Hackathons', icon: Cpu },
  { id: 'cultural', label: 'Cultural', icon: Music2 },
];

export default function TechnicalEvents() {
  const [tab, setTab] = useState<TabId>('hackathons');
  return (
    <View style={s.root}>
      <View style={s.tabBar}>
        {TABS.map((item) => {
          const active = item.id === tab;
          const Icon = item.icon;
          return (
            <TouchableOpacity key={item.id} onPress={() => setTab(item.id)} style={[s.tab, active && s.tabActive]}>
              <Icon size={15} color={active ? primaryScale[600] : neutral[400]} />
              <Text style={[s.tabText, active && s.tabTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {tab === 'hackathons' ? <Hackathons /> : <CulturalActivities />}
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: neutral[50] },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: neutral[100], backgroundColor: colors.white },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: primaryScale[600] },
  tabText: { fontSize: 13, fontWeight: '500', color: neutral[500] },
  tabTextActive: { color: primaryScale[600], fontWeight: '600' },
});
