import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, CheckSquare, Square, ChevronRight } from '../../components/icons';
import { roleService } from '../../services/faculty.service';
import { colors, primaryScale, neutral } from '../../theme/colors';
import { Faculty, Role } from '../../types';
import Toast from '../../services/toast';

const COORDINATOR_SLUGS = [
  'TIMETABLE_COORDINATOR',
  'EXAM_COORDINATOR',
  'CULTURAL_COORDINATOR',
  'PLACEMENT_COORDINATOR',
];

export interface ContextMenuProps {
  faculty: Faculty | null;
  visible: boolean;
  anchorPosition?: { x: number; y: number };
  onClose: () => void;
  onViewProfile: (faculty: Faculty) => void;
}

/**
 * ContextMenu for a faculty row.
 */
export default function ContextMenu({
  faculty,
  visible,
  anchorPosition = { x: 0, y: 0 },
  onClose,
  onViewProfile,
}: ContextMenuProps) {
  const queryClient = useQueryClient();
  const [roleSubmenu, setRoleSubmenu] = useState(false);
  const [menuLayout, setMenuLayout] = useState({ width: 0, height: 0 });

  // Fetch coordinator role definitions
  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: roleService.getAll,
    staleTime: Infinity,
    enabled: visible,
  });

  const coordinatorRoles: Role[] = ((rolesData as any)?.data || []).filter((r: Role) =>
    COORDINATOR_SLUGS.includes(r.slug)
  );

  const currentRoleSlugs: string[] =
    faculty?.roles?.map((fr) => fr.role?.slug || (fr as any).slug) || [];

  const facultyId = (faculty as any)?.employeeId || faculty?.id;

  const syncMutation = useMutation({
    mutationFn: ({ add, remove }: { add: string[]; remove: string[] }) =>
      roleService.sync(facultyId as string, { add, remove }),
    onSuccess: (res: any) => {
      const { results } = res.data;
      if (results.added.length) Toast.show({ type: 'success', text1: 'Role assigned' });
      if (results.removed.length) Toast.show({ type: 'success', text1: 'Role removed' });
      queryClient.invalidateQueries({ queryKey: ['faculty'] });
      queryClient.invalidateQueries({ queryKey: ['faculty', facultyId] });
    },
    onError: (err: any) => {
      Toast.show({ type: 'error', text1: err.response?.data?.message || 'Failed to update role' });
    },
  });

  const handleRoleToggle = useCallback(
    (role: Role) => {
      // FIXED: the backend's syncRoles logic matches against role SLUGS
      // (e.g. 'TIMETABLE_COORDINATOR'), not the numeric role_id — sending
      // role.id here meant the assignment silently never took effect.
      const hasRole = currentRoleSlugs.includes(role.slug);
      if (hasRole) syncMutation.mutate({ add: [], remove: [role.slug] });
      else syncMutation.mutate({ add: [role.slug], remove: [] });
    },
    [currentRoleSlugs, syncMutation]
  );

  const handleClose = useCallback(() => {
    setRoleSubmenu(false);
    onClose();
  }, [onClose]);

  // Compute clamped position so the menu never goes off-screen
  const { width: SW, height: SH } = Dimensions.get('window');
  const MENU_W = 224;
  const MENU_H = menuLayout.height || 160;
  const PADDING = 8;

  const left = Math.min(Math.max(anchorPosition.x, PADDING), SW - MENU_W - PADDING);
  const top = Math.min(Math.max(anchorPosition.y, PADDING), SH - MENU_H - PADDING);

  if (!faculty) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose} statusBarTranslucent>
      {/* Full-screen backdrop — tap anywhere outside to dismiss */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      {/* Menu panel — absolutely positioned */}
      <View
        style={[styles.menu, { left, top, width: MENU_W }]}
        onLayout={(e: LayoutChangeEvent) => setMenuLayout(e.nativeEvent.layout)}
      >
        {/* Faculty info header */}
        <View style={styles.infoHeader}>
          <Text style={styles.infoName} numberOfLines={1}>
            {faculty.name}
          </Text>
          <Text style={styles.infoDesig} numberOfLines={1}>
            {faculty.designation}
          </Text>
        </View>

        <View style={styles.items}>
          {/* View Profile */}
          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onViewProfile(faculty);
              handleClose();
            }}
            activeOpacity={0.7}
          >
            <User size={15} color={neutral[400]} />
            <Text style={styles.itemText}>View Profile</Text>
          </TouchableOpacity>

          {/* Coordinator Roles toggle */}
          <TouchableOpacity
            style={[styles.item, styles.itemIndigo]}
            onPress={() => setRoleSubmenu((v) => !v)}
            activeOpacity={0.7}
          >
            {syncMutation.isPending ? (
              <ActivityIndicator size={15} color={primaryScale[600]} />
            ) : (
              <CheckSquare size={15} color={primaryScale[600]} />
            )}
            <Text style={[styles.itemText, styles.itemTextIndigo]}>Coordinator Roles</Text>
            <ChevronRight
              size={13}
              color={primaryScale[400]}
              style={{ transform: [{ rotate: roleSubmenu ? '90deg' : '0deg' }] }}
            />
          </TouchableOpacity>

          {/* Inline role checkboxes */}
          {roleSubmenu && (
            <View style={styles.submenu}>
              {coordinatorRoles.length === 0 ? (
                <Text style={styles.submenuEmpty}>Loading roles…</Text>
              ) : (
                coordinatorRoles.map((role) => {
                  const checked = currentRoleSlugs.includes(role.slug);
                  return (
                    <TouchableOpacity
                      key={role.id}
                      style={[styles.roleItem, checked && styles.roleItemActive]}
                      onPress={() => handleRoleToggle(role)}
                      disabled={syncMutation.isPending}
                      activeOpacity={0.7}
                    >
                      {checked ? (
                        <CheckSquare size={13} color={primaryScale[500]} />
                      ) : (
                        <Square size={13} color={neutral[400]} />
                      )}
                      <Text style={[styles.roleText, checked && styles.roleTextActive]} numberOfLines={1}>
                        {role.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[200],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    overflow: 'hidden',
  },
  infoHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: neutral[100],
    backgroundColor: neutral[50],
  },
  infoName: {
    fontSize: 12,
    fontWeight: '600',
    color: neutral[900],
  },
  infoDesig: {
    fontSize: 11,
    color: neutral[500],
    marginTop: 1,
  },
  items: {
    padding: 6,
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  itemIndigo: {
    backgroundColor: primaryScale[50],
  },
  itemText: {
    flex: 1,
    fontSize: 13,
    color: neutral[700],
    fontWeight: '500',
  },
  itemTextIndigo: {
    color: primaryScale[600],
  },
  submenu: {
    marginHorizontal: 4,
    padding: 4,
    backgroundColor: neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: neutral[100],
    gap: 2,
  },
  submenuEmpty: {
    fontSize: 11,
    color: neutral[400],
    padding: 8,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  roleItemActive: {
    backgroundColor: primaryScale[50],
  },
  roleText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    color: neutral[600],
  },
  roleTextActive: {
    color: primaryScale[600],
  },
});
