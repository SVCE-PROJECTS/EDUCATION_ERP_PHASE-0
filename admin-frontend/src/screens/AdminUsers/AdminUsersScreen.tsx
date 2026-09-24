// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Icon, Snackbar } from 'react-native-paper';
import ScreenLayout from '../../navigation/ScreenLayout';
import CustomModal from '../../components/Modal/CustomModal';
import CustomInput from '../../components/Input/CustomInput';
import CustomDropdown from '../../components/Dropdown/CustomDropdown';
import CustomButton from '../../components/Button/CustomButton';
import LoadingIndicator from '../../components/Loading/LoadingIndicator';
import EmptyState from '../../components/EmptyState/EmptyState';
import { useAuth } from '../../context/AuthContext';
import {
  useAdminUsers, useCreateAdminUser, useSetAdminUserStatus,
} from '../../hooks/useAdminUsers';
import { useTheme } from '../../context/ThemeContext';
import {
  spacing, typography, radius, shadows,
} from '../../theme';

const ROLE_OPTIONS = [
  { id: 'admin', name: 'Admin' },
  { id: 'super_admin', name: 'Super Admin' },
];

const DEFAULT_FORM = {
  username: '', email: '', password: '', roleName: 'admin',
};

const UserRow = ({ item, isSelf, onToggleStatus, toggling }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const isActive = item.status === 'active';
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.username || '?').slice(0, 2).toUpperCase()}</Text>
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowName}>
          {item.username}
          {isSelf ? <Text style={styles.youTag}>  (you)</Text> : null}
        </Text>
        <Text style={styles.rowMeta}>{item.email} · {item.roleName || 'admin'}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: isActive ? colors.successBg : colors.dangerBg }]}>
        <Text style={[styles.statusText, { color: isActive ? colors.success : colors.danger }]}>
          {isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>
      <Text
        style={[styles.actionLink, isSelf && styles.actionLinkDisabled]}
        onPress={() => !isSelf && onToggleStatus(item, isActive ? 'inactive' : 'active')}
      >
        {toggling ? '…' : isActive ? 'Deactivate' : 'Activate'}
      </Text>
    </View>
  );
};

const AdminUsersScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const { user: currentUser } = useAuth();
  const { data, isLoading } = useAdminUsers();
  const createMutation = useCreateAdminUser();
  const statusMutation = useSetAdminUserStatus();

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [formError, setFormError] = useState('');
  const [snackbar, setSnackbar] = useState('');

  const users = data || [];

  const openModal = () => {
    setForm(DEFAULT_FORM);
    setFormError('');
    setModalVisible(true);
  };

  const handleCreate = async () => {
    if (!form.username || !form.email || !form.password) {
      setFormError('Username, email and password are required.');
      return;
    }
    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    try {
      await createMutation.mutateAsync(form);
      setModalVisible(false);
      setSnackbar(`Admin account "${form.username}" created.`);
    } catch (err) {
      setFormError(err.message || 'Could not create admin user.');
    }
  };

  const handleToggleStatus = async (item, status) => {
    try {
      await statusMutation.mutateAsync({ id: item.id, status });
      setSnackbar(`${item.username} is now ${status}.`);
    } catch (err) {
      setSnackbar(err.message || 'Could not update user status.');
    }
  };

  return (
    <ScreenLayout navigation={navigation} activeScreen="AdminUsers">
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Admin Users</Text>
            <Text style={styles.subtitle}>Manage who has admin-portal access</Text>
          </View>
          <CustomButton label="Add Admin" onPress={openModal} style={styles.addBtn} />
        </View>

        <View style={styles.listCard}>
          {isLoading ? (
            <LoadingIndicator label="Loading admin users..." />
          ) : users.length === 0 ? (
            <EmptyState
              icon="shield-account-outline"
              title="No admin users found"
              description="Add an admin account to get started."
            />
          ) : (
            users.map((item) => (
              <UserRow
                key={item.id}
                item={item}
                isSelf={String(item.id) === String(currentUser?.id)}
                onToggleStatus={handleToggleStatus}
                toggling={statusMutation.isPending}
              />
            ))
          )}
        </View>
      </ScrollView>

      <CustomModal visible={modalVisible} onDismiss={() => setModalVisible(false)} title="Add Admin User">
        <CustomInput
          label="Username"
          value={form.username}
          onChangeText={(v) => setForm((f) => ({ ...f, username: v }))}
          floatingLabel={false}
        />
        <CustomInput
          label="Email"
          value={form.email}
          onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
          floatingLabel={false}
        />
        <CustomInput
          label="Password"
          value={form.password}
          onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
          secureTextEntry
          floatingLabel={false}
        />
        <CustomDropdown
          label="Role"
          value={form.roleName}
          options={ROLE_OPTIONS}
          onSelect={(v) => setForm((f) => ({ ...f, roleName: v }))}
          floatingLabel={false}
        />

        {!!formError && (
          <View style={styles.errorRow}>
            <Icon source="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        )}

        <CustomButton
          label="Create Admin"
          onPress={handleCreate}
          loading={createMutation.isPending}
          style={styles.submitBtn}
        />
      </CustomModal>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3000}>
        {snackbar}
      </Snackbar>
    </ScreenLayout>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg,
  },
  title: { ...typography.h1, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  addBtn: { minWidth: 140 },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.soft,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  avatar: {
    width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...typography.bodyBold, color: colors.primary, fontSize: 12 },
  rowContent: { flex: 1, minWidth: 0 },
  rowName: { ...typography.bodyBold, color: colors.textPrimary },
  youTag: { ...typography.caption, color: colors.textMuted },
  rowMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  statusText: { ...typography.caption, fontWeight: '600' },
  actionLink: { ...typography.bodyBold, color: colors.primary, marginLeft: spacing.md },
  actionLinkDisabled: { color: colors.textMuted },
  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md,
  },
  errorText: { ...typography.caption, color: colors.danger, flex: 1 },
  submitBtn: { marginTop: spacing.sm },
});

export default AdminUsersScreen;
