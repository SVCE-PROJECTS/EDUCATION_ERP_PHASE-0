import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, RefreshCw } from '../../components/icons';

import { facultyService } from '../../services/faculty.service';
import { resolveFileUrl } from '../../services/api';
import SearchBar from '../../components/ui/SearchBar';
import { RoleBadge } from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Pagination from '../../components/ui/Pagination';
import ContextMenu from '../../components/faculty/ContextMenu';
import ScreenWrapper from '../../layouts/ScreenWrapper';
import { useDebounce } from '../../hooks/useDebounce';
import { useTheme } from '../../context/ThemeContext';

import {
  colors,
  ThemeColors,
  shadows,
} from '../../theme/colors';

import { ROUTES } from '../../navigation/routes';
import { Faculty, Pagination as PaginationMeta } from '../../types';


// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const MENU_WIDTH = 270;
const SCREEN_PADDING = 16;


// ─────────────────────────────────────────────────────────────────────────────
// Faculty Card
// ─────────────────────────────────────────────────────────────────────────────

interface FacultyCardProps {
  faculty: Faculty;
  onPress: () => void;
  onLongPress: () => void;
  onMenuPress: () => void;
  menuRef?: (ref: any) => void;
}


function FacultyCard({
  faculty,
  onPress,
  onLongPress,
  onMenuPress,
  menuRef,
}: FacultyCardProps) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  return (
    <TouchableOpacity
      style={s.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
    >
      {/* ──────────────────────────────────────────────────────────────── */}
      {/* Avatar + Name + Menu */}
      {/* ──────────────────────────────────────────────────────────────── */}

      <View style={s.cardMain}>

        {/* Avatar */}
        <Avatar
          src={resolveFileUrl(faculty.photoUrl)}
          name={faculty.name}
          size="sm"
        />

        {/* Faculty information */}
        <View style={s.cardInfo}>
          <Text
            style={s.cardName}
            numberOfLines={1}
          >
            {faculty.name}
          </Text>

          <Text
            style={s.cardEmail}
            numberOfLines={1}
          >
            {faculty.email}
          </Text>
        </View>

        {/* Three-dot menu */}
        <TouchableOpacity
          ref={menuRef}
          style={s.menuBtn}
          onPress={onMenuPress}
          hitSlop={{
            top: 8,
            bottom: 8,
            left: 8,
            right: 8,
          }}
          accessibilityLabel={`Actions for ${faculty.name}`}
        >
          <MoreVertical
            size={18}
            color={theme.textMuted}
          />
        </TouchableOpacity>

      </View>


      {/* ──────────────────────────────────────────────────────────────── */}
      {/* Faculty Attributes */}
      {/* ──────────────────────────────────────────────────────────────── */}

      <View style={s.attrGrid}>

        {/* Employee ID */}
        <View style={s.attrCol}>
          <Text style={s.attrLabel}>
            Emp ID
          </Text>

          <Text
            style={s.attrValue}
            numberOfLines={1}
          >
            {faculty.employeeId || '—'}
          </Text>
        </View>


        {/* Designation */}
        <View style={s.attrCol}>
          <Text style={s.attrLabel}>
            Designation
          </Text>

          <Text
            style={s.attrValue}
            numberOfLines={1}
          >
            {faculty.designation || '—'}
          </Text>
        </View>


        {/* Qualification */}
        <View style={s.attrCol}>
          <Text style={s.attrLabel}>
            Qualification
          </Text>

          <Text
            style={s.attrValue}
            numberOfLines={1}
          >
            {faculty.qualification || '—'}
          </Text>
        </View>

      </View>


      {/* ──────────────────────────────────────────────────────────────── */}
      {/* Role Badges */}
      {/* ──────────────────────────────────────────────────────────────── */}

      {faculty.roles?.length > 0 && (
        <View style={s.badgeRow}>
          {faculty.roles.map((fr) => {
            const role = fr.role || (fr as any);

            return (
              <RoleBadge
                key={role.id || role.slug}
                slug={role.slug}
                name={role.name}
                size="sm"
              />
            );
          })}
        </View>
      )}

    </TouchableOpacity>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function FacultyManagement() {

  const { colors: theme } = useTheme();

  const s = getStyles(theme);

  const navigation = useNavigation<any>();

  const queryClient = useQueryClient();


  // ──────────────────────────────────────────────────────────────────────────
  // State
  // ──────────────────────────────────────────────────────────────────────────

  const [search, setSearch] = useState('');

  const [sortBy] = useState('name');

  const [sortOrder] = useState('asc');

  const [page, setPage] = useState(1);

  const LIMIT = 10;


  // ──────────────────────────────────────────────────────────────────────────
  // Context Menu State
  // ──────────────────────────────────────────────────────────────────────────

  const [menuVisible, setMenuVisible] = useState(false);

  const [menuFaculty, setMenuFaculty] =
    useState<Faculty | null>(null);

  const [menuPosition, setMenuPosition] =
    useState({
      x: 0,
      y: 0,
    });


  /*
   * Store references to every three-dot button.
   *
   * employeeId → TouchableOpacity ref
   */
  const menuBtnRefs =
    useRef<Record<string, any>>({});


  // ──────────────────────────────────────────────────────────────────────────
  // Search
  // ──────────────────────────────────────────────────────────────────────────

  const debouncedSearch =
    useDebounce(search, 350);


  // ──────────────────────────────────────────────────────────────────────────
  // Query Params
  // ──────────────────────────────────────────────────────────────────────────

  const queryParams = {
    page,

    limit: LIMIT,

    search:
      debouncedSearch || undefined,

    sortBy,

    sortOrder,
  };


  // ──────────────────────────────────────────────────────────────────────────
  // Faculty Query
  // ──────────────────────────────────────────────────────────────────────────

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['faculty', queryParams],

    queryFn: () =>
      facultyService.getAll(queryParams),

    
  });


  // ──────────────────────────────────────────────────────────────────────────
  // Data
  // ──────────────────────────────────────────────────────────────────────────

  const faculty: Faculty[] =
    (data as any)?.data || [];


  const pagination: Partial<PaginationMeta> =
    (data as any)?.pagination || {};


  // ──────────────────────────────────────────────────────────────────────────
  // Search Handler
  // ──────────────────────────────────────────────────────────────────────────

  const handleSearch = useCallback(
    (val: string) => {
      setSearch(val);

      setPage(1);
    },
    []
  );


  // ──────────────────────────────────────────────────────────────────────────
  // Three-Dot Menu
  // ──────────────────────────────────────────────────────────────────────────

  const handleMenuPress = useCallback(
    (
      fac: Faculty,
      employeeId: string
    ) => {

      const ref =
        menuBtnRefs.current[employeeId];


      /*
       * If we have a reference to the
       * three-dot button, measure its
       * absolute position on the screen.
       */
      if (ref) {

        ref.measure(
          (
            _fx: number,
            _fy: number,
            width: number,
            height: number,
            px: number,
            py: number
          ) => {

            const {
              width: screenWidth,
            } = Dimensions.get('window');


            /*
             * Position the popup toward
             * the right side of the screen.
             *
             * The menu's right edge will
             * remain inside the screen.
             */
            const menuX = Math.max(
              SCREEN_PADDING,

              screenWidth -
                MENU_WIDTH -
                SCREEN_PADDING
            );


            /*
             * Popup appears below
             * the three-dot button.
             */
            const menuY =
              py +
              height +
              4;


            setMenuPosition({
              x: menuX,
              y: menuY,
            });


            setMenuFaculty(fac);

            setMenuVisible(true);
          }
        );

      } else {

        /*
         * Fallback if the button ref
         * cannot be measured.
         */
        const {
          width: screenWidth,
        } = Dimensions.get('window');


        const menuX = Math.max(
          SCREEN_PADDING,

          screenWidth -
            MENU_WIDTH -
            SCREEN_PADDING
        );


        setMenuPosition({
          x: menuX,
          y: 120,
        });


        setMenuFaculty(fac);

        setMenuVisible(true);
      }
    },
    []
  );


  // ──────────────────────────────────────────────────────────────────────────
  // Render Faculty Item
  // ──────────────────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: Faculty }) => {

      const employeeId =
        (item as any).employeeId;


      return (
        <FacultyCard

          faculty={item}


          onPress={() =>
            navigation.navigate(
              ROUTES.FACULTY_PROFILE,
              {
                id: employeeId,
              }
            )
          }


          onLongPress={() => {

            setMenuFaculty(item);

            const {
              width: screenWidth,
            } = Dimensions.get('window');


            const menuX = Math.max(
              SCREEN_PADDING,

              screenWidth -
                MENU_WIDTH -
                SCREEN_PADDING
            );


            setMenuPosition({
              x: menuX,
              y: 200,
            });


            setMenuVisible(true);
          }}


          onMenuPress={() =>
            handleMenuPress(
              item,
              employeeId
            )
          }


          /*
           * IMPORTANT:
           *
           * Store the actual three-dot
           * button reference.
           */
          menuRef={(ref) => {

            if (ref) {
              menuBtnRefs.current[
                employeeId
              ] = ref;
            } else {
              delete menuBtnRefs.current[
                employeeId
              ];
            }

          }}

        />
      );
    },

    [
      navigation,
      handleMenuPress,
    ]
  );


  // ──────────────────────────────────────────────────────────────────────────
  // Key Extractor
  // ──────────────────────────────────────────────────────────────────────────

  const keyExtractor = useCallback(
    (item: Faculty) =>
      (item as any).employeeId,
    []
  );


  // ──────────────────────────────────────────────────────────────────────────
  // List Header
  // ──────────────────────────────────────────────────────────────────────────

  const ListHeader = (
    <View style={s.filterBar}>

      <SearchBar
        value={search}
        onChange={handleSearch}
        placeholder="Search by name, ID, designation..."
        style={s.searchBar}
      />


      <TouchableOpacity
        onPress={() =>
          queryClient.invalidateQueries({
            queryKey: ['faculty'],
          })
        }
        style={s.refreshBtn}
        accessibilityLabel="Refresh"
      >

        {isFetching ? (

          <ActivityIndicator
            size={16}
            color={theme.textMuted}
          />

        ) : (

          <RefreshCw
            size={16}
            color={theme.textMuted}
          />

        )}

      </TouchableOpacity>

    </View>
  );


  // ──────────────────────────────────────────────────────────────────────────
  // Empty State
  // ──────────────────────────────────────────────────────────────────────────

  const ListEmpty =
    isLoading
      ? null
      : (
        <View style={s.empty}>

          <Text style={s.emptyText}>

            {
              debouncedSearch
                ? `No faculty found for "${debouncedSearch}"`
                : 'No faculty in this department yet.'
            }

          </Text>

        </View>
      );


  // ──────────────────────────────────────────────────────────────────────────
  // Pagination Footer
  // ──────────────────────────────────────────────────────────────────────────

  const ListFooter =
    (pagination.totalPages ?? 0) > 1
      ? (
        <Pagination
          pagination={{
            ...(pagination as PaginationMeta),
            page,
          }}
          onPageChange={setPage}
        />
      )
      : null;


  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (

    <ScreenWrapper
      route={ROUTES.HOD_FACULTY}
      scrollable={false}
    >

      {/* Header */}
      <View style={s.header}>

        <Text style={s.title}>
          Faculty List
        </Text>

        <Text style={s.subtitle}>
          {pagination.total ?? '—'} total faculty in your department
        </Text>

      </View>


      {/* Faculty List */}
      <FlatList

        data={
          isLoading
            ? []
            : faculty
        }

        keyExtractor={keyExtractor}

        renderItem={renderItem}

        ListHeaderComponent={
          ListHeader
        }

        ListEmptyComponent={
          ListEmpty
        }

        ListFooterComponent={
          ListFooter
        }

        contentContainerStyle={
          s.listContent
        }

        showsVerticalScrollIndicator={
          false
        }


        refreshControl={

          <RefreshControl

            refreshing={
              isFetching &&
              !isLoading
            }

            onRefresh={refetch}

            tintColor={
              theme.primary
            }

            colors={[
              theme.primary,
            ]}

          />

        }

      />


      {/* ──────────────────────────────────────────────────────────────── */}
      {/* Context Menu */}
      {/* ──────────────────────────────────────────────────────────────── */}

      <ContextMenu

        faculty={menuFaculty}

        visible={menuVisible}

        anchorPosition={
          menuPosition
        }

        onClose={() =>
          setMenuVisible(false)
        }


        onViewProfile={(f) => {

          setMenuVisible(false);

          navigation.navigate(
            ROUTES.FACULTY_PROFILE,
            {
              id: (
                f as any
              ).employeeId,
            }
          );

        }}

      />

    </ScreenWrapper>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const getStyles = (theme: ThemeColors) => StyleSheet.create({

  // Header

  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 2,
  },


  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.textPrimary,
  },


  subtitle: {
    fontSize: 13,
    color: theme.textSecondary,
  },


  // Filter bar

  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    marginBottom: 8,
  },


  searchBar: {
    flex: 1,
  },


  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
  },


  // List

  listContent: {
    paddingBottom: 32,
  },


  // Faculty card

  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 14,
    gap: 10,
    ...shadows.card,
  },


  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },


  cardInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },


  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },


  cardEmail: {
    fontSize: 12,
    color: theme.textMuted,
  },


  menuBtn: {
    padding: 4,
    borderRadius: 8,
  },


  // Attribute grid

  attrGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 2,
  },


  attrCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },


  attrLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },


  attrValue: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.textSecondary,
  },


  // Role badges

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },


  // Empty state

  empty: {
    padding: 40,
    alignItems: 'center',
  },


  emptyText: {
    fontSize: 14,
    color: theme.textMuted,
    textAlign: 'center',
  },

});