import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { facultyService } from '../../services/faculty.service';
import { resolveFileUrl } from '../../services/api';
import { useSyncRoles } from '../../hooks/useFaculty';
import Avatar from '../../components/ui/Avatar';
import { RoleBadge } from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { X } from '../../components/icons';
import ScreenWrapper from '../../layouts/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { colors, ThemeColors, shadows } from '../../theme/colors';
import { ROUTES } from '../../navigation/routes';
import { Faculty } from '../../types';

const COORDINATOR_SLUGS = [
  'TIMETABLE_COORDINATOR',
  'EXAM_COORDINATOR',
  'CULTURAL_COORDINATOR',
  'PLACEMENT_COORDINATOR',
];

export default function CoordinatorManagement() {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);

  const { data: facultyData, isLoading } = useQuery({
    queryKey: ['faculty', { page: 1, limit: 100 }],
    queryFn: () => facultyService.getAll({ page: 1, limit: 100 }),
  });

  const allFaculty: Faculty[] = (facultyData as any)?.data || [];
  const coordinators = allFaculty.filter((f) =>
    f.roles?.some((fr) => COORDINATOR_SLUGS.includes(fr.role?.slug || (fr as any).slug))
  );

  return (
    <ScreenWrapper route={ROUTES.HOD_COORDINATORS} scrollable={false}>
      {/* Section card */}
      <View style={s.card}>
        {/* Card header */}
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>Coordinators</Text>
          {!isLoading && <Text style={s.cardCount}>{coordinators.length} assigned</Text>}
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={s.loadingWrap}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={s.skeleton} />
            ))}
          </View>
        ) : coordinators.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>No coordinators assigned.</Text>
          </View>
        ) : (
          <FlatList
            data={coordinators}
            keyExtractor={(item) => (item as any).employeeId}
            renderItem={({ item }) => <CoordinatorRow faculty={item} />}
            ItemSeparatorComponent={() => <View style={s.separator} />}
            scrollEnabled={false}
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────
// Split out from the list so useSyncRoles (a hook) can be called once per
// faculty member, scoped to their own employeeId — FlatList's renderItem
// calls this the same way it would render any other component per row.

interface CoordinatorRoleRef {
  slug: string;
  name?: string;
}

function CoordinatorRow({ faculty: f }: { faculty: Faculty }) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  const [pendingRole, setPendingRole] = useState<CoordinatorRoleRef | null>(null);

  const syncMutation = useSyncRoles((f as any).employeeId, {
    onSuccess: () => setPendingRole(null),
  });

  const coordRoles: CoordinatorRoleRef[] =
    f.roles
      ?.filter((fr) => COORDINATOR_SLUGS.includes(fr.role?.slug || (fr as any).slug))
      .map((fr) => fr.role || (fr as any)) || [];

  const handleConfirmRemove = () => {
    if (!pendingRole) return;
    syncMutation.mutate({ add: [], remove: [pendingRole.slug] });
  };

  return (
    <View style={s.row}>
      <Avatar src={resolveFileUrl(f.photoUrl)} name={f.name} size="sm" />
      <View style={s.rowInfo}>
        <Text style={s.rowName} numberOfLines={1}>
          {f.name}
        </Text>
        <Text style={s.rowDesig} numberOfLines={1}>
          {f.designation}
        </Text>
      </View>
      <View style={s.badges}>
        {coordRoles.map((role) => (
          <View key={role.slug} style={s.badgeWithRemove}>
            <RoleBadge slug={role.slug} name={role.name} size="sm" />
            <TouchableOpacity
              onPress={() => setPendingRole(role)}
              style={s.removeBtn}
              accessibilityLabel={`Remove ${role.name || role.slug} role`}
              hitSlop={6}
            >
              <X size={11} color={colors.red[500]} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <ConfirmDialog
        isOpen={pendingRole !== null}
        onClose={() => setPendingRole(null)}
        onConfirm={handleConfirmRemove}
        title="Remove coordinator role?"
        message={`This will remove ${f.name} from the ${pendingRole?.name || pendingRole?.slug || ''} role.`}
        confirmLabel="Remove"
        variant="danger"
        loading={syncMutation.isPending}
      />
    </View>
  );
}

const getStyles = (theme: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  cardCount: {
    fontSize: 13,
    color: theme.textSecondary,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textPrimary,
  },
  rowDesig: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 1,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'flex-end',
    maxWidth: 200,
  },
  badgeWithRemove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  removeBtn: {
    padding: 3,
    borderRadius: 8,
    backgroundColor: colors.red[50],
  },
  separator: {
    height: 1,
    backgroundColor: theme.border,
  },

  // Loading
  loadingWrap: {
    padding: 16,
    gap: 12,
  },
  skeleton: {
    height: 56,
    backgroundColor: theme.border,
    borderRadius: 12,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.textMuted,
  },
});
