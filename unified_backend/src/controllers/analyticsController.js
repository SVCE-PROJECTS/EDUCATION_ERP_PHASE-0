/**
 * Analytics Controller
 * Aggregated, read-only insights derived from real rows already in the
 * database — nothing here is estimated or fabricated. One endpoint, scoped
 * differently per caller: Admin sees everything, HOD sees their own
 * department, Faculty sees their own classes/meetings/coordinator roles.
 */

const { pool } = require('../config/db');
const facultyService = require('../services/faculty.service');

// Buckets years of experience into bands for a faculty experience-distribution chart.
const EXPERIENCE_BANDS = [
  { label: '0-2 yrs', min: 0, max: 2 },
  { label: '3-5 yrs', min: 3, max: 5 },
  { label: '6-10 yrs', min: 6, max: 10 },
  { label: '11-15 yrs', min: 11, max: 15 },
  { label: '16+ yrs', min: 16, max: Infinity },
];

const toBarData = (rows) => rows.map((r) => ({ label: r.label, value: Number(r.value) }));

const bucketExperience = (rows) => {
  const counts = EXPERIENCE_BANDS.map((band) => ({ label: band.label, value: 0 }));
  rows.forEach((row) => {
    const years = Number(row.experience_years) || 0;
    const bandIndex = EXPERIENCE_BANDS.findIndex((b) => years >= b.min && years <= b.max);
    if (bandIndex >= 0) counts[bandIndex].value += 1;
  });
  return counts;
};

// Merges the two places a coordinator assignment can live (the live
// coordinator_assignments table, and the legacy coordinator_roles column on
// faculty) into one per-faculty { facultyId, employeeId, name, departmentName,
// roles[] } list, plus the distinct count of faculty holding any role.
const mergeCoordinators = (assignmentRows, legacyRows) => {
  const map = new Map();
  const ensure = (row) => {
    const key = String(row.faculty_id);
    if (!map.has(key)) {
      map.set(key, {
        facultyId: row.faculty_id,
        employeeId: row.employee_id,
        name: row.name,
        departmentName: row.department_name,
        roles: [],
      });
    }
    return map.get(key);
  };
  assignmentRows.forEach((row) => {
    ensure(row).roles.push(row.description || row.role_name);
  });
  legacyRows.forEach((row) => {
    const entry = ensure(row);
    String(row.coordinator_roles)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((roleSlug) => {
        const label = roleSlug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        if (!entry.roles.includes(label)) entry.roles.push(label);
      });
  });
  return Array.from(map.values());
};

const attendanceAndIaShape = (attendanceAgg, iaAvg) => {
  const present = Number(attendanceAgg.rows[0]?.present || 0);
  const total = Number(attendanceAgg.rows[0]?.total || 0);
  return {
    attendanceRate: total > 0 ? Math.round((present / total) * 100) : null,
    attendanceSampleSize: total,
    iaAverage: iaAvg.rows[0]?.avg != null ? Math.round(Number(iaAvg.rows[0].avg)) : null,
  };
};

// ─────────────────────────────────────────────────────────────────────────
// Admin — unrestricted, school-wide
// ─────────────────────────────────────────────────────────────────────────
const getAdminOverview = async (req, res) => {
  const [
    studentsByGender,
    studentsByStatus,
    studentsByYear,
    studentsByProgram,
    facultyByDesignation,
    facultyExperience,
    facultyCoordinatorCoverage,
    coordinatorAssignments,
    facultyLegacyCoordinatorRoles,
    staffByDesignation,
    meetingsByStatus,
    meetingsByType,
    meetingsByDepartment,
    participantResponses,
    attendanceAgg,
    iaAvg,
  ] = await Promise.all([
    pool.query(`SELECT gender AS label, COUNT(*)::int AS value FROM students GROUP BY gender ORDER BY gender`),
    pool.query(`SELECT status AS label, COUNT(*)::int AS value FROM students GROUP BY status ORDER BY value DESC`),
    pool.query(`SELECT academic_year AS label, COUNT(*)::int AS value FROM students GROUP BY academic_year ORDER BY academic_year ASC`),
    pool.query(`
      SELECT p.program_name AS label, COUNT(*)::int AS value
      FROM students s JOIN programs p ON p.program_id = s.program_id
      GROUP BY p.program_name ORDER BY value DESC
    `),
    pool.query(`SELECT designation AS label, COUNT(*)::int AS value FROM faculty WHERE status = 'ACTIVE' GROUP BY designation ORDER BY value DESC`),
    pool.query(`SELECT experience_years FROM faculty WHERE status = 'ACTIVE'`),
    pool.query(`SELECT COUNT(*)::int AS total FROM faculty WHERE status = 'ACTIVE'`),
    pool.query(`
      SELECT ca.faculty_id, f.employee_id, f.name, d.department_name, r.role_name, r.description
      FROM coordinator_assignments ca
      JOIN faculty f ON f.faculty_id = ca.faculty_id
      JOIN departments d ON d.department_id = ca.department_id
      JOIN roles r ON r.role_id = ca.role_id
      ORDER BY f.name ASC
    `),
    pool.query(`
      SELECT f.faculty_id, f.employee_id, f.name, d.department_name, f.coordinator_roles
      FROM faculty f
      JOIN departments d ON d.department_id = f.department_id
      WHERE f.coordinator_roles IS NOT NULL AND f.status = 'ACTIVE'
      ORDER BY f.name ASC
    `),
    pool.query(`
      SELECT sd.name AS label, COUNT(*)::int AS value
      FROM non_teaching_staff s JOIN staff_departments sd ON sd.staff_dept_id = s.staff_dept_id
      WHERE s.status = 'ACTIVE'
      GROUP BY sd.name ORDER BY value DESC
    `),
    pool.query(`SELECT status AS label, COUNT(*)::int AS value FROM meetings WHERE status != 'deleted' GROUP BY status`),
    pool.query(`SELECT meeting_type AS label, COUNT(*)::int AS value FROM meetings WHERE status != 'deleted' GROUP BY meeting_type`),
    pool.query(`
      SELECT d.department_name AS label, COUNT(*)::int AS value
      FROM meetings m JOIN departments d ON d.department_id = m.department_id
      WHERE m.status != 'deleted'
      GROUP BY d.department_name ORDER BY value DESC LIMIT 7
    `),
    pool.query(`SELECT availability_status AS label, COUNT(*)::int AS value FROM meeting_participants GROUP BY availability_status`),
    pool.query(`SELECT COUNT(*) FILTER (WHERE status = 'Present')::int AS present, COUNT(*)::int AS total FROM attendance`),
    pool.query(`SELECT AVG(average) AS avg FROM ia_marks`),
  ]);

  const totalActiveFaculty = Number(facultyCoordinatorCoverage.rows[0]?.total || 0);
  const coordinators = mergeCoordinators(coordinatorAssignments.rows, facultyLegacyCoordinatorRoles.rows);

  res.json({
    scope: 'admin',
    students: {
      byGender: toBarData(studentsByGender.rows),
      byStatus: toBarData(studentsByStatus.rows),
      byAcademicYear: toBarData(studentsByYear.rows),
      byProgram: toBarData(studentsByProgram.rows),
    },
    faculty: {
      byDesignation: toBarData(facultyByDesignation.rows),
      byExperience: bucketExperience(facultyExperience.rows),
      coordinatorCoverage: {
        withRole: coordinators.length,
        withoutRole: Math.max(totalActiveFaculty - coordinators.length, 0),
      },
    },
    coordinators,
    nonTeachingStaff: {
      byDesignation: toBarData(staffByDesignation.rows),
    },
    meetings: {
      byStatus: toBarData(meetingsByStatus.rows),
      byType: toBarData(meetingsByType.rows),
      byDepartment: toBarData(meetingsByDepartment.rows),
      participantResponses: toBarData(participantResponses.rows),
    },
    academics: attendanceAndIaShape(attendanceAgg, iaAvg),
  });
};

// ─────────────────────────────────────────────────────────────────────────
// HOD — scoped to the caller's own department
// ─────────────────────────────────────────────────────────────────────────
const getHodOverview = async (req, res) => {
  const departmentId = await facultyService.resolveDepartmentId(req.user.departmentCode);
  if (!departmentId) {
    return res.status(400).json({ message: `Department not found: ${req.user.departmentCode}` });
  }

  const [
    studentsByGender,
    studentsByStatus,
    studentsBySemester,
    facultyByDesignation,
    facultyExperience,
    facultyCoordinatorCoverage,
    coordinatorAssignments,
    facultyLegacyCoordinatorRoles,
    meetingsByStatus,
    meetingsByType,
    participantResponses,
    attendanceAgg,
    iaAvg,
  ] = await Promise.all([
    pool.query(`SELECT gender AS label, COUNT(*)::int AS value FROM students WHERE department_id = $1 GROUP BY gender ORDER BY gender`, [departmentId]),
    pool.query(`SELECT status AS label, COUNT(*)::int AS value FROM students WHERE department_id = $1 GROUP BY status ORDER BY value DESC`, [departmentId]),
    pool.query(`
      SELECT 'Semester ' || sem.semester_number AS label, COUNT(*)::int AS value
      FROM students s JOIN semesters sem ON sem.semester_id = s.semester_id
      WHERE s.department_id = $1
      GROUP BY sem.semester_number ORDER BY sem.semester_number ASC
    `, [departmentId]),
    pool.query(`SELECT designation AS label, COUNT(*)::int AS value FROM faculty WHERE department_id = $1 AND status = 'ACTIVE' GROUP BY designation ORDER BY value DESC`, [departmentId]),
    pool.query(`SELECT experience_years FROM faculty WHERE department_id = $1 AND status = 'ACTIVE'`, [departmentId]),
    pool.query(`SELECT COUNT(*)::int AS total FROM faculty WHERE department_id = $1 AND status = 'ACTIVE'`, [departmentId]),
    pool.query(`
      SELECT ca.faculty_id, f.employee_id, f.name, d.department_name, r.role_name, r.description
      FROM coordinator_assignments ca
      JOIN faculty f ON f.faculty_id = ca.faculty_id
      JOIN departments d ON d.department_id = ca.department_id
      JOIN roles r ON r.role_id = ca.role_id
      WHERE ca.department_id = $1
      ORDER BY f.name ASC
    `, [departmentId]),
    pool.query(`
      SELECT f.faculty_id, f.employee_id, f.name, d.department_name, f.coordinator_roles
      FROM faculty f
      JOIN departments d ON d.department_id = f.department_id
      WHERE f.coordinator_roles IS NOT NULL AND f.status = 'ACTIVE' AND f.department_id = $1
      ORDER BY f.name ASC
    `, [departmentId]),
    pool.query(`SELECT status AS label, COUNT(*)::int AS value FROM meetings WHERE status != 'deleted' AND department_id = $1 GROUP BY status`, [departmentId]),
    pool.query(`SELECT meeting_type AS label, COUNT(*)::int AS value FROM meetings WHERE status != 'deleted' AND department_id = $1 GROUP BY meeting_type`, [departmentId]),
    pool.query(`
      SELECT mp.availability_status AS label, COUNT(*)::int AS value
      FROM meeting_participants mp
      JOIN meetings m ON m.meeting_id = mp.meeting_id
      WHERE m.department_id = $1
      GROUP BY mp.availability_status
    `, [departmentId]),
    pool.query(`
      SELECT COUNT(*) FILTER (WHERE a.status = 'Present')::int AS present, COUNT(*)::int AS total
      FROM attendance a
      JOIN classes c ON c.class_id = a.class_id
      JOIN faculty f ON f.faculty_id = c.faculty_id
      WHERE f.department_id = $1
    `, [departmentId]),
    pool.query(`
      SELECT AVG(im.average) AS avg
      FROM ia_marks im
      JOIN classes c ON c.class_id = im.class_id
      JOIN faculty f ON f.faculty_id = c.faculty_id
      WHERE f.department_id = $1
    `, [departmentId]),
  ]);

  const totalActiveFaculty = Number(facultyCoordinatorCoverage.rows[0]?.total || 0);
  const coordinators = mergeCoordinators(coordinatorAssignments.rows, facultyLegacyCoordinatorRoles.rows);

  res.json({
    scope: 'hod',
    students: {
      byGender: toBarData(studentsByGender.rows),
      byStatus: toBarData(studentsByStatus.rows),
      bySemester: toBarData(studentsBySemester.rows),
    },
    faculty: {
      byDesignation: toBarData(facultyByDesignation.rows),
      byExperience: bucketExperience(facultyExperience.rows),
      coordinatorCoverage: {
        withRole: coordinators.length,
        withoutRole: Math.max(totalActiveFaculty - coordinators.length, 0),
      },
    },
    coordinators,
    meetings: {
      byStatus: toBarData(meetingsByStatus.rows),
      byType: toBarData(meetingsByType.rows),
      participantResponses: toBarData(participantResponses.rows),
    },
    academics: attendanceAndIaShape(attendanceAgg, iaAvg),
  });
};

// ─────────────────────────────────────────────────────────────────────────
// Faculty — scoped to the caller's own classes, meetings and coordinator roles
// ─────────────────────────────────────────────────────────────────────────
const getFacultyOverview = async (req, res) => {
  const employeeId = req.user.id;

  const facultyRow = await pool.query(
    `SELECT f.faculty_id, u.user_id FROM faculty f LEFT JOIN users u ON u.faculty_id = f.faculty_id WHERE f.employee_id = $1`,
    [employeeId],
  );
  if (facultyRow.rows.length === 0) {
    return res.status(404).json({ message: 'Faculty record not found' });
  }
  const { faculty_id: facultyId, user_id: userId } = facultyRow.rows[0];

  const ownClasses = `SELECT class_id FROM classes WHERE faculty_id = $1`;

  const [
    totalAtt,
    presentAtt,
    iaAvg,
    assignmentTotal,
    assignmentOpen,
    studentCount,
    meetingsByStatus,
    meetingsByType,
    participantResponses,
    attendanceByClass,
    iaByClass,
    coordinatorAssignments,
    facultyLegacyCoordinatorRoles,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total FROM attendance WHERE class_id IN (${ownClasses})`, [facultyId]),
    pool.query(`SELECT COUNT(*)::int AS total FROM attendance WHERE status = 'Present' AND class_id IN (${ownClasses})`, [facultyId]),
    pool.query(`SELECT AVG(average) AS avg FROM ia_marks WHERE class_id IN (${ownClasses})`, [facultyId]),
    pool.query(`SELECT COUNT(*)::int AS total FROM assignments WHERE class_id IN (${ownClasses})`, [facultyId]),
    pool.query(`SELECT COUNT(*)::int AS total FROM assignments WHERE status = 'Open' AND class_id IN (${ownClasses})`, [facultyId]),
    pool.query(`SELECT COUNT(DISTINCT student_id)::int AS total FROM attendance WHERE class_id IN (${ownClasses})`, [facultyId]),
    userId
      ? pool.query(`
          SELECT status AS label, COUNT(*)::int AS value FROM meetings
          WHERE status != 'deleted' AND (
            requester_user_id = $1
            OR meeting_id IN (SELECT meeting_id FROM meeting_participants WHERE participant_user_id = $1)
          )
          GROUP BY status
        `, [userId])
      : Promise.resolve({ rows: [] }),
    userId
      ? pool.query(`
          SELECT meeting_type AS label, COUNT(*)::int AS value FROM meetings
          WHERE status != 'deleted' AND (
            requester_user_id = $1
            OR meeting_id IN (SELECT meeting_id FROM meeting_participants WHERE participant_user_id = $1)
          )
          GROUP BY meeting_type
        `, [userId])
      : Promise.resolve({ rows: [] }),
    // How invitees have responded to meetings THIS faculty organized —
    // mirrors the admin/HOD "participant responses" panel, scoped to theirs.
    userId
      ? pool.query(`
          SELECT mp.availability_status AS label, COUNT(*)::int AS value
          FROM meeting_participants mp
          JOIN meetings m ON m.meeting_id = mp.meeting_id
          WHERE m.requester_user_id = $1 AND m.status != 'deleted'
          GROUP BY mp.availability_status
        `, [userId])
      : Promise.resolve({ rows: [] }),
    // Per-class attendance % — same query shape as the Dashboard's own
    // class-attendance chart, so Analytics shows the same real numbers.
    pool.query(`
      SELECT
        sub.subject_code || ' - Sec ' || sec.section_name AS label,
        COUNT(a.*) FILTER (WHERE a.status = 'Present')::float / NULLIF(COUNT(a.*), 0) * 100 AS percent
      FROM classes c
      JOIN subjects sub ON sub.subject_id = c.subject_id
      JOIN sections sec ON sec.section_id = c.section_id
      LEFT JOIN attendance a ON a.class_id = c.class_id
      WHERE c.faculty_id = $1
      GROUP BY c.class_id, sub.subject_code, sec.section_name
      ORDER BY sub.subject_code
    `, [facultyId]),
    // Per-class IA marks average, same shape.
    pool.query(`
      SELECT
        sub.subject_code || ' - Sec ' || sec.section_name AS label,
        AVG(im.average) AS avg
      FROM classes c
      JOIN subjects sub ON sub.subject_id = c.subject_id
      JOIN sections sec ON sec.section_id = c.section_id
      LEFT JOIN ia_marks im ON im.class_id = c.class_id
      WHERE c.faculty_id = $1
      GROUP BY c.class_id, sub.subject_code, sec.section_name
      ORDER BY sub.subject_code
    `, [facultyId]),
    pool.query(`
      SELECT ca.faculty_id, f.employee_id, f.name, d.department_name, r.role_name, r.description
      FROM coordinator_assignments ca
      JOIN faculty f ON f.faculty_id = ca.faculty_id
      JOIN departments d ON d.department_id = ca.department_id
      JOIN roles r ON r.role_id = ca.role_id
      WHERE ca.faculty_id = $1
    `, [facultyId]),
    pool.query(`
      SELECT f.faculty_id, f.employee_id, f.name, d.department_name, f.coordinator_roles
      FROM faculty f JOIN departments d ON d.department_id = f.department_id
      WHERE f.faculty_id = $1 AND f.coordinator_roles IS NOT NULL
    `, [facultyId]),
  ]);

  const coordinators = mergeCoordinators(coordinatorAssignments.rows, facultyLegacyCoordinatorRoles.rows);

  res.json({
    scope: 'faculty',
    teaching: {
      studentsTaught: Number(studentCount.rows[0]?.total || 0),
      totalAssignments: Number(assignmentTotal.rows[0]?.total || 0),
      openAssignments: Number(assignmentOpen.rows[0]?.total || 0),
      attendanceByClass: attendanceByClass.rows.map((r) => ({
        label: r.label,
        value: r.percent != null ? Math.round(Number(r.percent)) : 0,
      })),
      iaByClass: iaByClass.rows.map((r) => ({
        label: r.label,
        value: r.avg != null ? Math.round(Number(r.avg)) : 0,
      })),
    },
    coordinatorRoles: coordinators[0]?.roles || [],
    meetings: {
      byStatus: toBarData(meetingsByStatus.rows),
      byType: toBarData(meetingsByType.rows),
      participantResponses: toBarData(participantResponses.rows),
    },
    academics: attendanceAndIaShape(
      { rows: [{ present: presentAtt.rows[0]?.total, total: totalAtt.rows[0]?.total }] },
      iaAvg,
    ),
  });
};

const getOverview = async (req, res) => {
  try {
    if (req.user.isAdmin) return await getAdminOverview(req, res);
    const isHOD = req.user.isHOD === true || (Array.isArray(req.user.roles) && req.user.roles.includes('HOD'));
    if (isHOD) return await getHodOverview(req, res);
    return await getFacultyOverview(req, res);
  } catch (err) {
    console.error('Analytics overview error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getOverview };
