import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { facultyService } from '../../services/faculty.service';
import { resolveFileUrl } from '../../services/api';
import studentListService from '../../services/studentList.service';

import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import Dropdown, { DropdownOption } from '../../components/ui/Dropdown';
import SearchBar from '../../components/ui/SearchBar';

import {
  BookOpen,
  ChevronRight,
  X,
  RefreshCw,
} from '../../components/icons';

import ScreenWrapper from '../../layouts/ScreenWrapper';
import { useDebounce } from '../../hooks/useDebounce';
import { useTheme } from '../../context/ThemeContext';

import {
  colors,
  shadows,
  ThemeColors,
} from '../../theme/colors';

import { ROUTES } from '../../navigation/routes';
import { Faculty } from '../../types';

import AsyncStorage from '@react-native-async-storage/async-storage';


// ─────────────────────────────────────────────────────────────
// LOCAL STORAGE
// ─────────────────────────────────────────────────────────────

const ALLOCATION_STORAGE_KEY = '@hod_faculty_allocations';


// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface FacultyAllocation {
  id: string;
  facultyId: string;
  facultyName: string;
  semester: string;
  section: string;
  subject: string;
  subjectCode: string;
}

interface FacultyRowProps {
  faculty: Faculty;
  allocationCount?: number;
  onPress: () => void;
}

interface AllocationModalProps {
  faculty: Faculty | null;
  allocations: FacultyAllocation[];
  onSaveAllocation: (allocation: FacultyAllocation) => void;
  onRemoveAllocation: (allocationId: string) => void;
  onClose: () => void;
}


// ─────────────────────────────────────────────────────────────
// FACULTY ROW
// ─────────────────────────────────────────────────────────────

function FacultyRow({
  faculty,
  allocationCount,
  onPress,
}: FacultyRowProps) {
  const { colors: theme } = useTheme();
  const s = getStyles(theme);
  return (
    <TouchableOpacity
      style={s.row}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Avatar
        src={resolveFileUrl(faculty.photoUrl)}
        name={faculty.name}
        size="sm"
      />

      <View style={s.rowInfo}>
        <Text
          style={s.rowName}
          numberOfLines={1}
        >
          {faculty.name}
        </Text>

        <Text
          style={s.rowDesig}
          numberOfLines={1}
        >
          {faculty.designation || '—'}
        </Text>
      </View>

      {allocationCount != null && allocationCount > 0 && (
        <View style={s.countPill}>
          <Text style={s.countPillText}>
            {allocationCount}{' '}
            {allocationCount === 1 ? 'class' : 'classes'}
          </Text>
        </View>
      )}

      <ChevronRight
        size={16}
        color={theme.textMuted}
      />
    </TouchableOpacity>
  );
}


// ─────────────────────────────────────────────────────────────
// ALLOCATION MODAL
// ─────────────────────────────────────────────────────────────

function AllocationModal({
  faculty,
  allocations,
  onSaveAllocation,
  onRemoveAllocation,
  onClose,
}: AllocationModalProps) {

  const { colors: theme } = useTheme();
  const s = getStyles(theme);

  const facultyId =
    (faculty as any)?.employeeId ||
    faculty?.id ||
    '';

  const facultyAllocations = allocations.filter(
    (allocation) =>
      allocation.facultyId === facultyId
  );

  const [semester, setSemester] =
    useState<string | null>(null);

  const [section, setSection] =
    useState<string | null>(null);

  const [subjectCode, setSubjectCode] =
    useState<string | null>(null);


  // ─────────────────────────────────────────────
  // SUBJECT INPUT MODE
  // Default is manual entry — the HOD can type the subject name/code
  // directly rather than depending on the timetable being filled in.
  // Switching to "From Timetable" fills both fields from a dropdown
  // sourced from the class's existing timetable instead.
  // ─────────────────────────────────────────────

  const [subjectMode, setSubjectMode] =
    useState<'manual' | 'timetable'>('manual');

  const [manualSubjectName, setManualSubjectName] =
    useState('');

  const [manualSubjectCode, setManualSubjectCode] =
    useState('');


  // ─────────────────────────────────────────────
  // SEMESTERS
  // ─────────────────────────────────────────────

  const { data: semData } = useQuery({
    queryKey: ['semesters'],

    queryFn:
      studentListService.getSemesters,

    enabled: !!faculty,
  });

  const semesters: number[] =
    (semData as any)?.data?.semesters || [];

  const semesterOptions: DropdownOption[] =
    semesters.map((sem) => ({
      label: `Semester ${sem}`,
      value: String(sem),
    }));


  // ─────────────────────────────────────────────
  // SECTIONS
  // ─────────────────────────────────────────────

  const { data: secData } = useQuery({
    queryKey: ['sections', semester],

    queryFn: () =>
      studentListService.getSections(
        Number(semester)
      ),

    enabled: !!semester,
  });

  const sections: {
    id: string;
    name: string;
  }[] =
    (secData as any)?.data || [];

  const sectionOptions: DropdownOption[] =
    sections.map((sec) => ({
      label: `Section ${sec.name}`,
      value: sec.name,
    }));


  // ─────────────────────────────────────────────
  // SUBJECTS FROM TIMETABLE
  // ─────────────────────────────────────────────

  const {
    data: dashData,
    isLoading: subjLoading,
  } = useQuery({
    queryKey: [
      'sectionDashboard-forAllocation',
      semester,
      section,
    ],

    queryFn: () =>
      studentListService.getSectionDashboard(
        Number(semester),
        section as string,
        1,
        1
      ),

    enabled:
      !!semester &&
      !!section,
  });

  const timetable: any[] =
    (dashData as any)?.data?.timetable || [];


  const subjectOptions: DropdownOption[] =
    useMemo(() => {

      const seen =
        new Map<string, DropdownOption>();

      timetable.forEach((slot) => {

        if (
          slot.subjectCode &&
          !seen.has(slot.subjectCode)
        ) {
          seen.set(
            slot.subjectCode,
            {
              label: slot.subject,
              value: slot.subjectCode,
              meta: slot.subjectCode,
            }
          );
        }
      });

      return Array.from(
        seen.values()
      );

    }, [timetable]);


  // ─────────────────────────────────────────────
  // RESET FORM
  // ─────────────────────────────────────────────

  const resetForm = () => {
    setSemester(null);
    setSection(null);
    setSubjectCode(null);
    setSubjectMode('manual');
    setManualSubjectName('');
    setManualSubjectCode('');
  };


  // ─────────────────────────────────────────────
  // SAVE ALLOCATION LOCALLY
  // ─────────────────────────────────────────────

  // Resolved subject name/code, whichever mode produced them.
  const resolvedSubjectName =
    subjectMode === 'manual'
      ? manualSubjectName.trim()
      : subjectOptions.find((option) => option.value === subjectCode)?.label || subjectCode || '';

  const resolvedSubjectCode =
    subjectMode === 'manual'
      ? manualSubjectCode.trim()
      : subjectCode || '';

  const canAssign =
    !!semester &&
    !!section &&
    !!resolvedSubjectName &&
    !!resolvedSubjectCode;

  const handleAssign = () => {

    if (
      !semester ||
      !section ||
      !resolvedSubjectName ||
      !resolvedSubjectCode ||
      !faculty
    ) {
      return;
    }


    // Prevent duplicate allocation
    const alreadyExists =
      facultyAllocations.some(
        (allocation) =>
          allocation.semester === semester &&
          allocation.section === section &&
          allocation.subjectCode === resolvedSubjectCode
      );

    if (alreadyExists) {
      return;
    }


    const newAllocation: FacultyAllocation = {
      id:
        `${facultyId}-${semester}-${section}-${resolvedSubjectCode}-${Date.now()}`,

      facultyId,

      facultyName:
        faculty.name,

      semester,

      section,

      subject:
        resolvedSubjectName,

      subjectCode:
        resolvedSubjectCode,
    };


    // Send to parent
    onSaveAllocation(
      newAllocation
    );

    resetForm();
  };


  if (!faculty) {
    return null;
  }


  return (
    <Modal
      isOpen={!!faculty}
      onClose={onClose}
      title="Allocate Subject & Class"
      size="lg"
    >

      {/* Faculty header */}
      <View style={s.modalFacultyRow}>

        <Avatar
          src={resolveFileUrl(faculty.photoUrl)}
          name={faculty.name}
          size="md"
        />

        <View
          style={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <Text
            style={s.modalFacultyName}
            numberOfLines={1}
          >
            {faculty.name}
          </Text>

          <Text
            style={s.modalFacultyDesig}
            numberOfLines={1}
          >
            {faculty.designation}
          </Text>
        </View>

      </View>


      {/* ─────────────────────────────────────── */}
      {/* CURRENT ALLOCATIONS */}
      {/* ─────────────────────────────────────── */}

      <Text style={s.modalSectionLabel}>
        Current Allocations
      </Text>


      {facultyAllocations.length === 0 ? (

        <Text style={s.modalEmptyText}>
          No subjects allocated yet.
        </Text>

      ) : (

        <View style={s.allocList}>

          {facultyAllocations.map(
            (allocation) => (

              <View
                key={allocation.id}
                style={s.allocChip}
              >

                <View
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >

                  <Text
                    style={s.allocChipSubject}
                    numberOfLines={1}
                  >
                    {allocation.subject}{' '}

                    <Text
                      style={s.allocChipCode}
                    >
                      ({allocation.subjectCode})
                    </Text>
                  </Text>


                  <Text
                    style={s.allocChipClass}
                  >
                    Semester{' '}
                    {allocation.semester}
                    {' · '}
                    Section{' '}
                    {allocation.section}
                  </Text>

                </View>


                <TouchableOpacity
                  onPress={() =>
                    onRemoveAllocation(
                      allocation.id
                    )
                  }

                  style={
                    s.allocRemoveBtn
                  }

                  hitSlop={8}

                  accessibilityLabel="Remove allocation"
                >

                  <X
                    size={13}
                    color={colors.red[500]}
                  />

                </TouchableOpacity>

              </View>

            )
          )}

        </View>

      )}


      {/* ─────────────────────────────────────── */}
      {/* ASSIGN NEW */}
      {/* ─────────────────────────────────────── */}

      <Text
        style={[
          s.modalSectionLabel,
          { marginTop: 20 },
        ]}
      >
        Assign New Subject
      </Text>


      <View style={s.form}>

        {/* Semester */}

        <Dropdown
          label="Semester"
          placeholder="Choose semester"
          value={semester}
          options={semesterOptions}

          onChange={(value) => {

            setSemester(value);

            setSection(null);

            setSubjectCode(null);

          }}
        />


        {/* Section */}

        <Dropdown
          label="Section (Class)"

          placeholder={
            semester
              ? 'Choose section'
              : 'Select a semester first'
          }

          value={section}

          options={sectionOptions}

          onChange={(value) => {

            setSection(value);

            setSubjectCode(null);

          }}

          disabled={!semester}
        />


        {/* Subject — manual entry (default) or pick from timetable */}

        <View>

          <Text style={s.fieldLabel}>
            Subject
          </Text>

          <View style={s.modeToggle}>

            <TouchableOpacity
              style={[
                s.modeToggleBtn,
                subjectMode === 'manual' && s.modeToggleBtnActive,
              ]}
              onPress={() => setSubjectMode('manual')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  s.modeToggleText,
                  subjectMode === 'manual' && s.modeToggleTextActive,
                ]}
              >
                Type manually
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.modeToggleBtn,
                subjectMode === 'timetable' && s.modeToggleBtnActive,
              ]}
              onPress={() => setSubjectMode('timetable')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  s.modeToggleText,
                  subjectMode === 'timetable' && s.modeToggleTextActive,
                ]}
              >
                From timetable
              </Text>
            </TouchableOpacity>

          </View>

          {subjectMode === 'manual' ? (

            <View style={s.manualFields}>

              <TextInput
                style={s.textInput}
                placeholder="Subject name (e.g. Data Structures)"
                placeholderTextColor={theme.textMuted}
                value={manualSubjectName}
                onChangeText={setManualSubjectName}
                autoCapitalize="words"
              />

              <TextInput
                style={s.textInput}
                placeholder="Subject code (e.g. CS301)"
                placeholderTextColor={theme.textMuted}
                value={manualSubjectCode}
                onChangeText={setManualSubjectCode}
                autoCapitalize="characters"
              />

            </View>

          ) : (

            <Dropdown
              placeholder={
                !section
                  ? 'Select a class first'
                  : subjLoading
                    ? 'Loading subjects…'
                    : 'Choose subject'
              }

              value={subjectCode}

              options={subjectOptions}

              onChange={(value) => {
                setSubjectCode(value);
                const picked = subjectOptions.find((o) => o.value === value);
                setManualSubjectName(picked?.label || '');
                setManualSubjectCode(value);
              }}

              disabled={!section}

              emptyText={
                "No subjects found in this class's timetable yet."
              }
            />

          )}

        </View>


        {/* Assign */}

        <TouchableOpacity

          style={[
            s.assignBtn,

            !canAssign &&
              s.assignBtnDisabled,
          ]}

          disabled={!canAssign}

          onPress={handleAssign}

          activeOpacity={0.85}
        >

          <Text style={s.assignBtnText}>
            Assign to Faculty
          </Text>

        </TouchableOpacity>

      </View>

    </Modal>
  );
}


// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────

export default function FacultyAllocation() {

  const { colors: theme } = useTheme();
  const s = getStyles(theme);

  const queryClient =
    useQueryClient();


  const [search, setSearch] =
    useState('');

  const debouncedSearch =
    useDebounce(search, 350);


  const [selectedFaculty, setSelectedFaculty] =
    useState<Faculty | null>(null);


  // ALL LOCAL ALLOCATIONS
  const [allocations, setAllocations] =
    useState<FacultyAllocation[]>([]);


  // ─────────────────────────────────────────────
  // LOAD SAVED ALLOCATIONS
  // ─────────────────────────────────────────────

  useEffect(() => {

    const loadAllocations =
      async () => {

        try {

          const saved =
            await AsyncStorage.getItem(
              ALLOCATION_STORAGE_KEY
            );

          if (saved) {

            const parsed =
              JSON.parse(saved);

            if (Array.isArray(parsed)) {

              setAllocations(parsed);

            }

          }

        } catch (error) {

          console.error(
            'Failed to load allocations:',
            error
          );

        }

      };


    loadAllocations();

  }, []);


  // ─────────────────────────────────────────────
  // SAVE ALL ALLOCATIONS
  // ─────────────────────────────────────────────

  const persistAllocations =
    async (
      updatedAllocations:
        FacultyAllocation[]
    ) => {

      try {

        await AsyncStorage.setItem(
          ALLOCATION_STORAGE_KEY,
          JSON.stringify(
            updatedAllocations
          )
        );

      } catch (error) {

        console.error(
          'Failed to save allocations:',
          error
        );

      }

    };


  // ─────────────────────────────────────────────
  // ADD ALLOCATION
  // ─────────────────────────────────────────────

  const handleSaveAllocation =
    (
      newAllocation:
        FacultyAllocation
    ) => {

      const updated = [
        ...allocations,
        newAllocation,
      ];

      setAllocations(updated);

      persistAllocations(updated);

    };


  // ─────────────────────────────────────────────
  // REMOVE ALLOCATION
  // ─────────────────────────────────────────────

  const handleRemoveAllocation =
    (
      allocationId: string
    ) => {

      const updated =
        allocations.filter(
          (allocation) =>
            allocation.id !==
            allocationId
        );

      setAllocations(updated);

      persistAllocations(updated);

    };


  // ─────────────────────────────────────────────
  // FACULTY QUERY
  // ─────────────────────────────────────────────

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({

    queryKey: [
      'faculty',
      {
        page: 1,
        limit: 200,
        search:
          debouncedSearch ||
          undefined,
      },
    ],

    queryFn: () =>
      facultyService.getAll({
        page: 1,
        limit: 200,
        search:
          debouncedSearch ||
          undefined,
      }),

  });


  const facultyList:
    Faculty[] =
      (data as any)?.data || [];


  // ─────────────────────────────────────────────
  // GET ALLOCATION COUNT FOR FACULTY
  // ─────────────────────────────────────────────

  const getAllocationCount =
    (faculty: Faculty) => {

      const facultyId =
        (faculty as any)?.employeeId ||
        faculty?.id ||
        '';

      return allocations.filter(
        (allocation) =>
          allocation.facultyId ===
          facultyId
      ).length;

    };


  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────

  return (

    <ScreenWrapper
      route={
        ROUTES.HOD_FACULTY_ALLOCATION
      }
      scrollable={false}
    >

      {/* Header */}

      <View style={s.header}>

        <Text style={s.title}>
          Faculty Subject & Class Allocation
        </Text>

        <Text style={s.subtitle}>
          Tap a faculty member to allocate
          subjects and classes
        </Text>

      </View>


      {/* Search */}

      <View style={s.filterBar}>

        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search faculty…"
          style={{ flex: 1 }}
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


      {/* Faculty list */}

      {isLoading ? (

        <ActivityIndicator
          style={{ marginTop: 40 }}
          color={theme.primary}
        />

      ) : facultyList.length === 0 ? (

        <View style={s.empty}>

          <BookOpen
            size={28}
            color={theme.border}
          />

          <Text style={s.emptyText}>
            No faculty found.
          </Text>

        </View>

      ) : (

        <FlatList

          data={facultyList}

          keyExtractor={(item) =>
            (item as any).employeeId ||
            item.id
          }

          renderItem={({ item }) => (

            <FacultyRow

              faculty={item}

              allocationCount={
                getAllocationCount(item)
              }

              onPress={() =>
                setSelectedFaculty(item)
              }

            />

          )}

          ItemSeparatorComponent={() => (
            <View
              style={s.separator}
            />
          )}

          contentContainerStyle={
            s.listContent
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

      )}


      {/* Allocation Modal */}

      <AllocationModal

        faculty={selectedFaculty}

        allocations={allocations}

        onSaveAllocation={
          handleSaveAllocation
        }

        onRemoveAllocation={
          handleRemoveAllocation
        }

        onClose={() =>
          setSelectedFaculty(null)
        }

      />

    </ScreenWrapper>

  );
}


// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────

const getStyles = (theme: ThemeColors) => StyleSheet.create({

  header: {
    paddingHorizontal: 4,
    gap: 2,
    marginBottom: 8,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.textPrimary,
  },

  subtitle: {
    fontSize: 13,
    color: theme.textSecondary,
  },


  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
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


  listContent: {
    paddingBottom: 24,
  },


  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    ...shadows.card,
  },

  rowInfo: {
    flex: 1,
    minWidth: 0,
  },

  rowName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textPrimary,
  },

  rowDesig: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 1,
  },


  countPill: {
    backgroundColor:
      theme.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  countPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.primary,
  },


  separator: {
    height: 10,
  },


  empty: {
    padding: 48,
    alignItems: 'center',
    gap: 8,
  },

  emptyText: {
    fontSize: 14,
    color: theme.textMuted,
  },


  // ───────────────────────────────────────────
  // MODAL
  // ───────────────────────────────────────────

  modalFacultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },

  modalFacultyName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.textPrimary,
  },

  modalFacultyDesig: {
    fontSize: 12,
    color: theme.textSecondary,
  },


  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },

  modalEmptyText: {
    fontSize: 13,
    color: theme.textMuted,
    marginBottom: 8,
  },


  allocList: {
    gap: 8,
    marginBottom: 4,
  },

  allocChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 12,
  },

  allocChipSubject: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textPrimary,
  },

  allocChipCode: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.primary,
  },

  allocChipClass: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 2,
  },

  allocRemoveBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor:
      colors.red[50],
  },


  form: {
    gap: 14,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 6,
  },

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.background,
    borderRadius: 10,
    padding: 3,
    gap: 3,
    marginBottom: 10,
  },

  modeToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },

  modeToggleBtnActive: {
    backgroundColor: theme.surface,
    ...shadows.card,
  },

  modeToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
  },

  modeToggleTextActive: {
    color: theme.primary,
  },

  manualFields: {
    gap: 10,
  },

  textInput: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: theme.textPrimary,
    backgroundColor: theme.surface,
  },

  assignBtn: {
    backgroundColor:
      theme.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  assignBtnDisabled: {
    backgroundColor:
      theme.border,
  },

  assignBtnText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },

});