import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../theme/colors';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  iconName?: string;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
  badge?: number | null;
}

export default function PageHeader({
  title,
  subtitle,
  iconName,
  actionLabel,
  actionIcon = 'add',
  onAction,
  badge,
}: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {iconName && (
          <View style={styles.iconBox}>
            <Ionicons name={iconName as any} size={20} color={Colors.primary} />
          </View>
        )}
        <View>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            {badge !== undefined && badge !== null && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
          </View>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      {onAction && (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction} activeOpacity={0.8}>
          <Ionicons name={actionIcon as any} size={16} color={Colors.white} />
          {actionLabel ? <Text style={styles.actionText}>{actionLabel}</Text> : null}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2,
  },
  left:     { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconBox:  { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:    { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  badge: {
    backgroundColor: Colors.primary, borderRadius: 10,
    minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  badgeText:  { color: Colors.white, fontSize: 11, fontWeight: '800' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
    elevation: 2, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  actionText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
});
