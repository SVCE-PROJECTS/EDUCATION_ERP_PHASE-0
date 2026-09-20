import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
} from 'react-native';

import { useQuery } from '@tanstack/react-query';

import {
  ChevronRight,
  ChevronLeft,
  Users,
  BookOpen,
  GraduationCap,
  CalendarClock,
} from '../../components/icons';

import type { LucideIconType } from '../../components/icons';

import studentListService from '../../services/studentList.service';
import ScreenWrapper from '../../layouts/ScreenWrapper';
import {
  colors,
  shadows,
  primaryScale,
  neutral,
} from '../../theme/colors';
import { ROUTES } from '../../navigation/routes';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VIEW = {
  SEMESTER: 'SEMESTER',
  SECTION: 'SECTION',
  DASHBOARD: 'DASHBOARD',
} as const;

type ViewName = (typeof VIEW)[keyof typeof VIEW];

interface SectionMeta {
  id: string;
  name: string;
}

interface Student {
  sno: number;
  usn: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  attendance?: number | null;
  performance?: number | null;
}

interface TimetableSlot {
  day: string;
  period: number;
  subject: string;
  subjectCode: string;
  facultyId: string | number;
  faculty: string;
}

interface SubjectFacultyRow {
  subject: string;
  subjectCode: string;
  faculty: string;
  facultyId: string | number;
}

// ─── Section Header ───────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  onBack?: () => void;
}

function SectionHeader({
  title,
  onBack,
}: SectionHeaderProps) {
  return (
    <View style={s.sectionHeader}>
      {onBack && (
        <TouchableOpacity
          onPress={onBack}
          style={s.backBtn}
          hitSlop={{
            top: 8,
            bottom: 8,
            left: 8,
            right: 8,
          }}
        >
          <ChevronLeft
            size={18}
            color={primaryScale[600]}
          />
        </TouchableOpacity>
      )}

      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

// ─── Info Card ────────────────────────────────────────────────────────────────

interface InfoCardProps {
  icon: LucideIconType;
  label: string;
  value?: string | number | null;
  color?: string;
}

function InfoCard({
  icon: Icon,
  label,
  value,
  color = primaryScale[600],
}: InfoCardProps) {
  return (
    <View style={s.infoCard}>
      <View
        style={[
          s.infoIcon,
          {
            backgroundColor: color + '1a',
          },
        ]}
      >
        <Icon
          size={18}
          color={color}
        />
      </View>

      <View>
        <Text style={s.infoLabel}>{label}</Text>

        <Text style={s.infoValue}>
          {value ?? '—'}
        </Text>
      </View>
    </View>
  );
}

// ─── Semester Picker ──────────────────────────────────────────────────────────

interface SemesterPickerProps {
  onSelect: (sem: number) => void;
}

function SemesterPicker({
  onSelect,
}: SemesterPickerProps) {
  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: ['semesters'],
    queryFn: studentListService.getSemesters,
  });

  const meta = (data as any)?.data;

  const semesters: number[] =
    meta?.semesters || [];

  if (isLoading) {
    return (
      <ActivityIndicator
        style={s.loader}
        color={primaryScale[500]}
      />
    );
  }

  return (
    <View style={s.section}>
      {meta && (
        <View style={s.metaRow}>
          <InfoCard
            icon={BookOpen}
            label="Semester Type"
            value={meta.semesterType}
          />

          <InfoCard
            icon={GraduationCap}
            label="Academic Year"
            value={meta.academicYear}
            color={colors.green[600]}
          />
        </View>
      )}

      <Text style={s.pickerLabel}>
        Select Semester
      </Text>

      <View style={s.chipGrid}>
        {semesters.map((sem) => (
          <TouchableOpacity
            key={sem}
            onPress={() => onSelect(sem)}
            style={s.chip}
            activeOpacity={0.75}
          >
            <Text style={s.chipText}>
              Semester {sem}
            </Text>

            <ChevronRight
              size={14}
              color={primaryScale[600]}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Section Picker ───────────────────────────────────────────────────────────

interface SectionPickerProps {
  semester: number;
  onSelect: (sec: SectionMeta) => void;
  onBack: () => void;
}

function SectionPicker({
  semester,
  onSelect,
  onBack,
}: SectionPickerProps) {
  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: ['sections', semester],
    queryFn: () =>
      studentListService.getSections(semester),
    enabled: !!semester,
  });

  const sections: SectionMeta[] =
    (data as any)?.data || [];

  return (
    <View style={s.section}>
      <SectionHeader
        title={`Semester ${semester} — Select Section`}
        onBack={onBack}
      />

      {isLoading ? (
        <ActivityIndicator
          style={s.loader}
          color={primaryScale[500]}
        />
      ) : (
        <View style={s.chipGrid}>
          {sections.map((sec) => (
            <TouchableOpacity
              key={sec.id}
              onPress={() => onSelect(sec)}
              style={s.chip}
              activeOpacity={0.75}
            >
              <Text style={s.chipText}>
                Section {sec.name}
              </Text>

              <ChevronRight
                size={14}
                color={primaryScale[600]}
              />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Students Table ───────────────────────────────────────────────────────────

const STUDENT_MIN_TABLE_WIDTH = 796;

const STUDENT_COLUMNS = [
  {
    key: 'sno',
    label: '#',
    flex: 0.45,
    minWidth: 45,
  },
  {
    key: 'usn',
    label: 'USN',
    flex: 1,
    minWidth: 100,
  },
  {
    key: 'name',
    label: 'Name',
    flex: 1.3,
    minWidth: 130,
  },
  {
    key: 'phone',
    label: 'Phone',
    flex: 1,
    minWidth: 110,
  },
  {
    key: 'email',
    label: 'Email',
    flex: 1.8,
    minWidth: 180,
  },
  {
    key: 'attendance',
    label: 'Attendance %',
    flex: 1,
    minWidth: 100,
  },
  {
    key: 'performance',
    label: 'Performance %',
    flex: 1,
    minWidth: 110,
  },
] as const;

interface StudentTableProps {
  students: Student[];
}

function StudentTable({
  students,
}: StudentTableProps) {
  const {
    width: screenWidth,
  } = useWindowDimensions();

  const availableWidth = Math.max(
    screenWidth - 64,
    STUDENT_MIN_TABLE_WIDTH
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={true}
      contentContainerStyle={
        s.studentHorizontalContent
      }
    >
      <View
        style={[
          s.studentTable,
          {
            width: availableWidth,
          },
        ]}
      >

        {/* ───────────── TABLE HEADER ───────────── */}

        <View style={s.tableHeaderRow}>
          {STUDENT_COLUMNS.map((column) => (
            <View
              key={column.key}
              style={[
                s.tableColumn,
                {
                  flex: column.flex,
                  minWidth: column.minWidth,
                },
              ]}
            >
              <Text
                style={s.tableHeaderCell}
                numberOfLines={1}
              >
                {column.label}
              </Text>
            </View>
          ))}
        </View>

        {/* ───────────── TABLE DATA ───────────── */}

        {students.length > 0 ? (

          /*
           * REAL DATABASE DATA
           *
           * Nothing is created here.
           * Only students returned by the backend are displayed.
           */
          students.map((student) => (
            <StudentRow
              key={
                student.usn ??
                student.sno
              }
              student={student}
            />
          ))

        ) : (

          /*
           * EMPTY TABLE
           *
           * These are only visual blank rows.
           * No student/database data is created.
           */
          Array.from({
            length: 8,
          }).map((_, index) => (
            <View
              key={`empty-student-${index}`}
              style={s.tableDataRow}
            >
              {STUDENT_COLUMNS.map(
                (column) => (
                  <View
                    key={column.key}
                    style={[
                      s.tableColumn,
                      {
                        flex: column.flex,
                        minWidth:
                          column.minWidth,
                      },
                    ]}
                  >
                    {column.key === 'sno' ? (
                      <Text
                        style={s.tableCell}
                      >
                        {index + 1}
                      </Text>
                    ) : null}
                  </View>
                )
              )}
            </View>
          ))
        )}

      </View>
    </ScrollView>
  );
}


// ─── Student Row ──────────────────────────────────────────────────────────────

interface StudentRowProps {
  student: Student;
}

function StudentRow({
  student,
}: StudentRowProps) {

  const attendance =
    student.attendance != null
      ? `${student.attendance}%`
      : '—';

  const performance =
    student.performance != null
      ? `${student.performance}%`
      : '—';

  return (
    <View style={s.tableDataRow}>

      {/* ───────────── S.NO ───────────── */}

      <View
        style={[
          s.tableColumn,
          {
            flex:
              STUDENT_COLUMNS[0].flex,
            minWidth:
              STUDENT_COLUMNS[0].minWidth,
          },
        ]}
      >
        <Text style={s.tableCell}>
          {student.sno}
        </Text>
      </View>


      {/* ───────────── USN ───────────── */}

      <View
        style={[
          s.tableColumn,
          {
            flex:
              STUDENT_COLUMNS[1].flex,
            minWidth:
              STUDENT_COLUMNS[1].minWidth,
          },
        ]}
      >
        <Text
          style={[
            s.tableCell,
            s.tableCellStrong,
          ]}
          numberOfLines={1}
        >
          {student.usn}
        </Text>
      </View>


      {/* ───────────── NAME ───────────── */}

      <View
        style={[
          s.tableColumn,
          {
            flex:
              STUDENT_COLUMNS[2].flex,
            minWidth:
              STUDENT_COLUMNS[2].minWidth,
          },
        ]}
      >
        <Text
          style={[
            s.tableCell,
            s.tableCellStrong,
          ]}
          numberOfLines={1}
        >
          {student.name}
        </Text>
      </View>


      {/* ───────────── PHONE ───────────── */}

      <View
        style={[
          s.tableColumn,
          {
            flex:
              STUDENT_COLUMNS[3].flex,
            minWidth:
              STUDENT_COLUMNS[3].minWidth,
          },
        ]}
      >
        <Text
          style={s.tableCell}
          numberOfLines={1}
        >
          {student.phone || '—'}
        </Text>
      </View>


      {/* ───────────── EMAIL ───────────── */}

      <View
        style={[
          s.tableColumn,
          {
            flex:
              STUDENT_COLUMNS[4].flex,
            minWidth:
              STUDENT_COLUMNS[4].minWidth,
          },
        ]}
      >
        <Text
          style={s.tableCell}
          numberOfLines={1}
        >
          {student.email || '—'}
        </Text>
      </View>


      {/* ───────────── ATTENDANCE ───────────── */}

      <View
        style={[
          s.tableColumn,
          {
            flex:
              STUDENT_COLUMNS[5].flex,
            minWidth:
              STUDENT_COLUMNS[5].minWidth,
          },
        ]}
      >
        <Text style={s.attendanceCell}>
          {attendance}
        </Text>
      </View>


      {/* ───────────── PERFORMANCE ───────────── */}

      <View
        style={[
          s.tableColumn,
          {
            flex:
              STUDENT_COLUMNS[6].flex,
            minWidth:
              STUDENT_COLUMNS[6].minWidth,
          },
        ]}
      >
        <Text style={s.performanceCell}>
          {performance}
        </Text>
      </View>

    </View>
  );
}

// ─── Timetable Grid ───────────────────────────────────────────────────────────

const DAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function TimetableGrid({
  slots,
}: {
  slots: TimetableSlot[];
}) {
  // Always show the standard periods.
  // These are TABLE COLUMNS, not dummy data.
  const periods = [1, 2, 3, 4, 5, 6, 7];

  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];

  const cellByDayPeriod =
    new Map<string, TimetableSlot>();

  slots.forEach((slot) => {
    cellByDayPeriod.set(
      `${slot.day}-${slot.period}`,
      slot
    );
  });

  const DAY_COL_WIDTH = 100;
  const PERIOD_COL_WIDTH = 145;

  const gridWidth =
    DAY_COL_WIDTH +
    periods.length * PERIOD_COL_WIDTH;

  return (
    <View style={s.card}>
      <View style={s.cardTitleRow}>
        <CalendarClock
          size={16}
          color={colors.blue[600]}
        />

        <Text style={s.cardTitle}>
          Timetable
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
      >
        <View style={{ width: gridWidth }}>

          {/* HEADER */}
          <View style={s.ttRow}>
            <Text
              style={[
                s.ttHeaderCell,
                {
                  width: DAY_COL_WIDTH,
                },
              ]}
            >
              Day
            </Text>

            {periods.map((period) => (
              <Text
                key={period}
                style={[
                  s.ttHeaderCell,
                  {
                    width: PERIOD_COL_WIDTH,
                  },
                ]}
              >
                Period {period}
              </Text>
            ))}
          </View>

          {/* DAYS */}
          {days.map((day) => (
            <View
              key={day}
              style={s.ttRow}
            >
              <Text
                style={[
                  s.ttDayCell,
                  {
                    width: DAY_COL_WIDTH,
                  },
                ]}
              >
                {day}
              </Text>

              {periods.map((period) => {
                const slot =
                  cellByDayPeriod.get(
                    `${day}-${period}`
                  );

                return (
                  <View
                    key={`${day}-${period}`}
                    style={[
                      s.ttCell,
                      {
                        width:
                          PERIOD_COL_WIDTH,
                      },
                    ]}
                  >
                    {slot ? (
                      <>
                        <Text
                          style={s.ttSubject}
                          numberOfLines={2}
                        >
                          {slot.subject}
                        </Text>

                        <Text style={s.ttCode}>
                          {slot.subjectCode}
                        </Text>

                        <Text
                          style={s.ttFaculty}
                          numberOfLines={1}
                        >
                          {slot.faculty}
                        </Text>
                      </>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Subject Faculty Assignment ───────────────────────────────────────────────
function SubjectFacultyTable({
  mapping,
}: {
  mapping: SubjectFacultyRow[];
}) {
  const emptyRows = 5;

  return (
    <View style={s.card}>

      <View style={s.cardTitleRow}>
        <BookOpen
          size={16}
          color={primaryScale[600]}
        />

        <Text style={s.cardTitle}>
          Subject — Faculty Assignment
        </Text>
      </View>

      {/* HEADER */}
      <View style={s.sfHeaderRow}>

        <Text
          style={[
            s.sfHeaderCell,
            { width: 40 },
          ]}
        >
          #
        </Text>

        <Text
          style={[
            s.sfHeaderCell,
            { flex: 1.4 },
          ]}
        >
          Subject
        </Text>

        <Text
          style={[
            s.sfHeaderCell,
            { flex: 0.7 },
          ]}
        >
          Subject Code
        </Text>

        <Text
          style={[
            s.sfHeaderCell,
            { flex: 1.2 },
          ]}
        >
          Assigned Faculty
        </Text>

      </View>

      {/* REAL DATA */}
      {mapping.length > 0 ? (

        mapping.map((row, index) => (
          <View
            key={`${row.subjectCode}-${index}`}
            style={s.sfDataRow}
          >

            <Text
              style={[
                s.sfCell,
                { width: 40 },
              ]}
            >
              {index + 1}
            </Text>

            <Text
              style={[
                s.sfCell,
                s.sfSubject,
                { flex: 1.4 },
              ]}
              numberOfLines={1}
            >
              {row.subject}
            </Text>

            <Text
              style={[
                s.sfCode,
                { flex: 0.7 },
              ]}
              numberOfLines={1}
            >
              {row.subjectCode}
            </Text>

            <Text
              style={[
                s.sfCell,
                { flex: 1.2 },
              ]}
              numberOfLines={1}
            >
              {row.faculty}
            </Text>

          </View>
        ))

      ) : (

        /* EMPTY VISUAL ROWS — NOT DATABASE DATA */
        Array.from({ length: emptyRows }).map(
          (_, index) => (
            <View
              key={`empty-faculty-${index}`}
              style={s.sfDataRow}
            >

              <Text
                style={[
                  s.sfCell,
                  { width: 40 },
                ]}
              >
                {index + 1}
              </Text>

              <View
                style={{ flex: 1.4 }}
              />

              <View
                style={{ flex: 0.7 }}
              />

              <View
                style={{ flex: 1.2 }}
              />

            </View>
          )
        )
      )}

    </View>
  );
}

// ─── Section Dashboard ────────────────────────────────────────────────────────

interface SectionDashboardProps {
  semester: number;
  section: SectionMeta | null;
  onBack: () => void;
}

function SectionDashboard({
  semester,
  section,
  onBack,
}: SectionDashboardProps) {
  const [page, setPage] = useState(1);

  const LIMIT = 50;

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      'sectionDashboard',
      semester,
      section?.name,
      page,
    ],
    queryFn: () =>
      studentListService.getSectionDashboard(
        semester,
        section?.name as string,
        page,
        LIMIT
      ),
    enabled: !!semester && !!section,
  });

  const dash = (data as any)?.data;

  const students: Student[] =
    dash?.students?.data || [];

  const pagination =
    dash?.students?.pagination || {};

  const timetable: TimetableSlot[] =
    dash?.timetable || [];

  const mapping: SubjectFacultyRow[] =
    dash?.subjectFacultyMapping || [];

  return (
    <ScrollView
      style={s.dashboardScroll}
      contentContainerStyle={s.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={
            isFetching && !isLoading
          }
          onRefresh={refetch}
          tintColor={primaryScale[500]}
          colors={[primaryScale[500]]}
        />
      }
    >
      {/* Header */}
      <SectionHeader
        title={`Sem ${semester} · Section ${section?.name}`}
        onBack={onBack}
      />

      {/* Stats */}
      <View style={s.metaRow}>
        <InfoCard
          icon={Users}
          label="Students"
          value={
            pagination.total ??
            students.length
          }
        />

        <InfoCard
          icon={BookOpen}
          label="Subjects"
          value={mapping.length}
          color={primaryScale[600]}
        />

        <InfoCard
          icon={GraduationCap}
          label="Timetable slots"
          value={timetable.length}
          color={colors.blue[600]}
        />
      </View>

      {/* Timetable */}
      <TimetableGrid
        slots={timetable}
      />

      {/* Subject Faculty */}
      <SubjectFacultyTable
        mapping={mapping}
      />

      {/* Students */}
      <View style={s.studentsCard}>
        <View style={s.cardTitleRow}>
          <Users
            size={16}
            color={primaryScale[600]}
          />

          <Text style={s.cardTitle}>
            Students (
            {pagination.total ??
              students.length}{' '}
            total)
          </Text>
        </View>

        {isLoading ? (
  <ActivityIndicator
    style={s.loader}
    color={primaryScale[500]}
  />
) : (
  <StudentTable
    students={students}
  />
)}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <View style={s.pageRow}>
            <TouchableOpacity
              onPress={() =>
                setPage((p) =>
                  Math.max(1, p - 1)
                )
              }
              disabled={page === 1}
              style={s.pageBtn}
            >
              <ChevronLeft
                size={16}
                color={
                  page === 1
                    ? neutral[300]
                    : neutral[700]
                }
              />
            </TouchableOpacity>

            <Text style={s.pageText}>
              {page} /{' '}
              {pagination.totalPages}
            </Text>

            <TouchableOpacity
              onPress={() =>
                setPage((p) => p + 1)
              }
              disabled={
                page >=
                pagination.totalPages
              }
              style={s.pageBtn}
            >
              <ChevronRight
                size={16}
                color={
                  page >=
                  pagination.totalPages
                    ? neutral[300]
                    : neutral[700]
                }
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StudentManagement() {
  const [view, setView] =
    useState<ViewName>(VIEW.SEMESTER);

  const [semester, setSemester] =
    useState<number | null>(null);

  const [section, setSection] =
    useState<SectionMeta | null>(null);

  const handleSemesterSelect = (
    sem: number
  ) => {
    setSemester(sem);
    setView(VIEW.SECTION);
  };

  const handleSectionSelect = (
    sec: SectionMeta
  ) => {
    setSection(sec);
    setView(VIEW.DASHBOARD);
  };

  const backToSemesters = () => {
    setSemester(null);
    setSection(null);
    setView(VIEW.SEMESTER);
  };

  const backToSections = () => {
    setSection(null);
    setView(VIEW.SECTION);
  };

  if (view === VIEW.DASHBOARD) {
    return (
      <View style={s.dashboardRoot}>
        <SectionDashboard
          semester={semester as number}
          section={section}
          onBack={backToSections}
        />
      </View>
    );
  }

  return (
    <ScreenWrapper
      route={ROUTES.HOD_STUDENTS}
    >
      {view === VIEW.SEMESTER && (
        <SemesterPicker
          onSelect={handleSemesterSelect}
        />
      )}

      {view === VIEW.SECTION && (
        <SectionPicker
          semester={semester as number}
          onSelect={handleSectionSelect}
          onBack={backToSemesters}
        />
      )}
    </ScreenWrapper>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // ── Dashboard ──────────────────────────────────────────────────────────────

  dashboardRoot: {
    flex: 1,
    width: '100%',
    backgroundColor: neutral[50],
  },

  dashboardScroll: {
    flex: 1,
    width: '100%',
    backgroundColor: neutral[50],
  },

  listContent: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 32,
    alignSelf: 'stretch',
  },

  loader: {
    marginTop: 40,
  },

  section: {
    gap: 16,
    width: '100%',
  },

  // ── Header ─────────────────────────────────────────────────────────────────

  sectionHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },

  backBtn: {
    padding: 4,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: neutral[900],
    flex: 1,
  },

  // ── Stats ──────────────────────────────────────────────────────────────────

  metaRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },

  infoCard: {
    flex: 1,
    minWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: neutral[100],
    padding: 12,
    ...shadows.card,
  },

  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoLabel: {
    fontSize: 11,
    color: neutral[500],
  },

  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: neutral[900],
  },

  // ── Semester / Section Picker ─────────────────────────────────────────────

  pickerLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: neutral[500],
    marginBottom: -4,
  },

  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: primaryScale[100],
    ...shadows.card,
  },

  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: primaryScale[700],
  },

  // ── Common Cards ───────────────────────────────────────────────────────────

  card: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[100],
    padding: 16,
    marginTop: 14,
    gap: 10,
    ...shadows.card,
  },

  studentsCard: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: neutral[100],
    padding: 16,
    marginTop: 14,
    gap: 10,
    ...shadows.card,
  },

  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: neutral[900],
  },

  // ── Students Table ─────────────────────────────────────────────────────────

  studentHorizontalContent: {
    minWidth: '100%',
  },

  studentTable: {
    minWidth: STUDENT_MIN_TABLE_WIDTH,
    width: '100%',
  },

  tableHeaderRow: {
    width: '100%',
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: neutral[50],
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },

  tableDataRow: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: neutral[50],
  },

  tableColumn: {
    justifyContent: 'center',
    paddingHorizontal: 4,
    minWidth: 45,
  },

  tableHeaderCell: {
    fontSize: 10,
    fontWeight: '700',
    color: neutral[500],
  },

  tableCell: {
    fontSize: 12,
    color: neutral[700],
  },

  tableCellStrong: {
    fontWeight: '600',
    color: neutral[900],
  },

  attendanceCell: {
    fontSize: 12,
    color: colors.green[600],
    fontWeight: '600',
  },

  performanceCell: {
    fontSize: 12,
    color: primaryScale[600],
    fontWeight: '600',
  },

  // ── Timetable ──────────────────────────────────────────────────────────────

  ttRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: neutral[100],
  },

  ttHeaderCell: {
    fontSize: 10,
    fontWeight: '700',
    color: neutral[500],
    backgroundColor: neutral[50],
    paddingVertical: 8,
    paddingHorizontal: 8,
  },

  ttDayCell: {
    fontSize: 12,
    fontWeight: '600',
    color: neutral[900],
    backgroundColor: neutral[50],
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },

  ttCell: {
    padding: 8,
    borderLeftWidth: 1,
    borderLeftColor: neutral[100],
    gap: 1,
  },

  ttSubject: {
    fontSize: 11,
    fontWeight: '600',
    color: neutral[900],
  },

  ttCode: {
    fontSize: 10,
    color: primaryScale[600],
    fontWeight: '500',
  },

  ttFaculty: {
    fontSize: 10,
    color: neutral[400],
  },

  ttEmpty: {
    fontSize: 11,
    color: neutral[300],
    textAlign: 'center',
  },

  // ── Subject Faculty ────────────────────────────────────────────────────────

  sfHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: neutral[50],
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },

  sfHeaderCell: {
    fontSize: 10,
    fontWeight: '700',
    color: neutral[500],
  },

  sfDataRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: neutral[50],
  },

  sfCell: {
    fontSize: 12,
    color: neutral[700],
  },

  sfSubject: {
    fontWeight: '600',
    color: neutral[900],
  },

  sfCode: {
    fontSize: 10,
    fontWeight: '600',
    color: primaryScale[700],
    backgroundColor:
      primaryScale[50] ?? neutral[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  // ── Empty ──────────────────────────────────────────────────────────────────

  empty: {
    padding: 40,
    alignItems: 'center',
  },

  emptyText: {
    fontSize: 14,
    color: neutral[400],
  },

  // ── Pagination ─────────────────────────────────────────────────────────────

  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 16,
  },

  pageBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: neutral[200],
  },

  pageText: {
    fontSize: 13,
    color: neutral[600],
    fontWeight: '500',
  },
});