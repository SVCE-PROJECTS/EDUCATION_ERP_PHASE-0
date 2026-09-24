/**
 * Faculty Portal — Topbar
 * Mirrors hod-portal/src/components/navigation/Topbar.tsx
 * with faculty-specific route (MY_PROFILE instead of FACULTY_PROFILE).
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { Menu, ArrowLeft, Sun, Moon, ChevronDown, User, LogOut } from '../icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/auth.service';
import Avatar from '../ui/Avatar';
import { RoleBadge } from '../ui/Badge';
import { ROUTES } from '../../navigation/routes';
import { colors, shadows, ThemeColors } from '../../theme/colors';
import { AuthUser } from '../../types';
import Toast from '../../services/toast';

export interface TopbarProps { title?: string; }

export default function Topbar({ title }: TopbarProps) {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, colors: theme } = useTheme();
  const styles = getStyles(theme);
  const [profileOpen, setProfileOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const handleLogout = async () => {
    setProfileOpen(false);
    try { await authService.logout(); } catch { /* ignore */ }
    logout();
    Toast.show({ type: 'success', text1: 'Logged out successfully' });
  };

  const handleViewProfile = () => {
    setProfileOpen(false);
    navigation.navigate(ROUTES.MY_PROFILE);
  };

  return (
    <View style={styles.bar}>
      {/* Left: back (when navigable) + hamburger (mobile only) + title */}
      <View style={styles.left}>
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()}
            style={styles.iconBtn} accessibilityLabel="Go back">
            <ArrowLeft size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        {!isLargeScreen && (
          <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={styles.iconBtn} accessibilityLabel="Open menu">
            <Menu size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {user?.departmentCode ? (
            <Text style={styles.subtitle} numberOfLines={1}>{user.departmentCode}</Text>
          ) : null}
        </View>
      </View>

      {/* Right: dark mode + profile */}
      <View style={styles.right}>
        <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn} accessibilityLabel="Toggle dark mode">
          {isDark ? <Sun size={18} color={theme.textSecondary} /> : <Moon size={18} color={theme.textSecondary} />}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setProfileOpen(true)} style={styles.profileBtn} activeOpacity={0.8}>
          <Avatar src={user?.photo} name={user?.name} size="xs" />
          <Text style={styles.profileName} numberOfLines={1}>{user?.name?.split(' ')[0]}</Text>
          <ChevronDown size={13} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      <ProfileModal
        visible={profileOpen} onClose={() => setProfileOpen(false)}
        user={user} onViewProfile={handleViewProfile} onLogout={handleLogout}
      />
    </View>
  );
}

interface ProfileModalProps {
  visible: boolean; onClose: () => void; user: AuthUser | null;
  onViewProfile: () => void; onLogout: () => void;
}

function ProfileModal({ visible, onClose, user, onViewProfile, onLogout }: ProfileModalProps) {
  const { colors: theme } = useTheme();
  const styles = getStyles(theme);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.profileSheet}>
        <View style={styles.profileInfo}>
          <Avatar src={(user as any)?.photo} name={user?.name} size="md" />
          <View style={styles.profileDetails}>
            <Text style={styles.profileFullName} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.profileUsername} numberOfLines={1}>{user?.username}</Text>
            <View style={styles.badgeRow}>
              {user?.roles?.slice(0, 2).map((slug) => (
                <RoleBadge key={slug} slug={slug} size="sm" />
              ))}
            </View>
          </View>
        </View>
        <View style={styles.profileActions}>
          <TouchableOpacity onPress={onViewProfile} style={styles.profileAction}>
            <User size={15} color={theme.textSecondary} />
            <Text style={styles.profileActionText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogout} style={styles.profileAction}>
            <LogOut size={15} color={colors.red[500]} />
            <Text style={[styles.profileActionText, { color: colors.red[500] }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const BAR_HEIGHT = Platform.OS === 'ios' ? 56 : 60;

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  bar: {
    height: BAR_HEIGHT, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16,
    backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: theme.textPrimary, lineHeight: 20 },
  subtitle: { fontSize: 11, color: theme.textSecondary },
  right: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { padding: 8, borderRadius: 12 },
  profileBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingLeft: 6, paddingRight: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 4,
  },
  profileName: { fontSize: 13, fontWeight: '500', color: theme.textPrimary, maxWidth: 100 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.overlay },
  profileSheet: {
    position: 'absolute', top: BAR_HEIGHT + 8, right: 12, width: 240,
    backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1,
    borderColor: theme.border, overflow: 'hidden', ...shadows.soft,
  },
  profileInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16,
    borderBottomWidth: 1, borderBottomColor: theme.border,
  },
  profileDetails: { flex: 1, minWidth: 0 },
  profileFullName: { fontSize: 13, fontWeight: '600', color: theme.textPrimary },
  profileUsername: { fontSize: 11, color: theme.textSecondary, marginTop: 1 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  profileActions: { padding: 8, gap: 2 },
  profileAction: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 10, borderRadius: 12,
  },
  profileActionText: { fontSize: 13, color: theme.textPrimary, fontWeight: '500' },
});
