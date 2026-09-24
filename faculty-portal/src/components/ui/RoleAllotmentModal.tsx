/**
 * Faculty Portal — Role Allotment Modal
 * Pops up on My Profile the first time a role newly appears on the
 * faculty's account, announcing the role and its responsibilities.
 */
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Bell } from '../icons';
import { RoleBadge } from './Badge';
import { getRoleShortName, getRoleResponsibilities } from '../../utils/roleUtils';
import { colors, shadows, primaryScale, ThemeColors } from '../../theme/colors';
import { useTheme } from '../../context/ThemeContext';

export interface RoleAllotmentModalProps {
  visible: boolean;
  slug: string | null;
  onAcknowledge: () => void;
}

export default function RoleAllotmentModal({ visible, slug, onAcknowledge }: RoleAllotmentModalProps) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  if (!slug) return null;
  const responsibilities = getRoleResponsibilities(slug);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onAcknowledge} statusBarTranslucent>
      <View style={s.backdrop}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <Bell size={22} color={theme.primary} />
          </View>

          <Text style={s.title}>You've been allotted a new role</Text>

          <View style={s.badgeRow}>
            <RoleBadge slug={slug} size="lg" />
          </View>

          <Text style={s.subtitle}>Your responsibilities as {getRoleShortName(slug)}:</Text>

          <View style={s.list}>
            {responsibilities.map((item) => (
              <View key={item} style={s.listRow}>
                <View style={s.dot} />
                <Text style={s.listText}>{item}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.button} onPress={onAcknowledge} activeOpacity={0.85}>
            <Text style={s.buttonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 24,
    gap: 10,
    ...shadows.soft,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginTop: 4 },
  badgeRow: { flexDirection: 'row' },
  subtitle: { fontSize: 12, color: theme.textSecondary, marginTop: 4 },
  list: { gap: 8, marginTop: 2 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: primaryScale[400], marginTop: 6 },
  listText: { flex: 1, fontSize: 13, color: theme.textSecondary, lineHeight: 18 },
  button: {
    marginTop: 10,
    backgroundColor: primaryScale[600],
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: { color: colors.white, fontWeight: '600', fontSize: 14 },
});
