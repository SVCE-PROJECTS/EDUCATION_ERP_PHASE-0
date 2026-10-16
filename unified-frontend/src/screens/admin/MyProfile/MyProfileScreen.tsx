// @ts-nocheck
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import ScreenLayout from '../../../navigation/admin/ScreenLayout';
import InfoCard from '../../../components/Card/InfoCard';
import { useAuth } from '../../../context/admin/AuthContext';
import { useAdminUsers } from '../../../hooks/admin/useAdminUsers';
import { useTheme } from '../../../context/admin/ThemeContext';
import { spacing, typography, radius } from '../../../theme';

const Field = ({ label, value, styles }) => (
  <View style={styles.fieldRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value || '—'}</Text>
  </View>
);

const MyProfileScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { user } = useAuth();
  const { data: adminUsers } = useAdminUsers();

  // AuthContext only carries the bare essentials (username/fullName/role) —
  // the fuller account record (email, status) lives in the admin users list,
  // so enrich with it when it's there instead of duplicating that data.
  const ownRecord = adminUsers?.find((u) => u.username === user?.username);

  const initials = (user?.fullName || user?.username || 'AD')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScreenLayout navigation={navigation} activeScreen="MyProfile">
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.fullName || user?.username || 'Administrator'}</Text>
            <Text style={styles.role}>
              {user?.role === 'admin' ? 'Super Admin' : (user?.role || 'Admin')}
            </Text>
          </View>
        </View>

        <InfoCard title="Account Information" icon={<Icon source="account-outline" size={18} color={colors.primary} />}>
          <Field styles={styles} label="Username" value={user?.username} />
          <Field styles={styles} label="Full Name" value={user?.fullName} />
          <Field styles={styles} label="Email" value={ownRecord?.email} />
          <Field styles={styles} label="Status" value={ownRecord?.status ? ownRecord.status.charAt(0).toUpperCase() + ownRecord.status.slice(1) : null} />
          <Field styles={styles} label="Role" value={ownRecord?.roleName || user?.role} />
        </InfoCard>
      </ScrollView>
    </ScreenLayout>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, maxWidth: 640 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg,
  },
  avatarCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...typography.h2, color: colors.white },
  name: { ...typography.h1, color: colors.textPrimary },
  role: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  fieldRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  fieldLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  fieldValue: { ...typography.body, color: colors.textPrimary, flex: 1.5, textAlign: 'right' },
});

export default MyProfileScreen;
