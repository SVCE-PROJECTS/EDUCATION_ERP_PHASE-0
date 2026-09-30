const { query } = require('../config/db');

function normalizeClassRow(row) {
  if (!row) return null;
  return {
    id: row.class_id,
    semesterId: row.semester_id,
    semesterNumber: row.semester_number ?? null,
    sectionId: row.section_id,
    sectionName: row.section_name ?? null,
    subjectId: row.subject_id,
    subjectCode: row.subject_code ?? null,
    subjectName: row.subject_name ?? null,
    facultyId: row.faculty_id,
    facultyEmployeeId: row.faculty_employee_id ?? null,
    facultyName: row.faculty_name ?? null,
    academicYear: row.academic_year,
    classTeacherId: row.class_teacher_id ?? null,
  };
}

const ClassRepository = {
  /**
   * List the subject<->faculty allocations ("classes") for one semester+section
   * within a department — scoped via the subject's department, so a CSE HOD
   * never sees another department's allocations even if they share a
   * semester_id/section_id numerically.
   */
  async findAllByDeptSemesterSection(departmentCode, semesterId, sectionId) {
    const result = await query(
      `SELECT c.class_id, c.semester_id, sem.semester_number, c.section_id, sec.section_name,
              c.subject_id, sub.subject_code, sub.subject_name,
              c.faculty_id, f.employee_id AS faculty_employee_id, f.name AS faculty_name,
              c.academic_year, c.class_teacher_id
       FROM classes c
       JOIN subjects sub    ON sub.subject_id = c.subject_id
       JOIN departments d   ON d.department_id = sub.department_id
       JOIN semesters sem   ON sem.semester_id = c.semester_id
       JOIN sections sec    ON sec.section_id = c.section_id
       JOIN faculty f       ON f.faculty_id = c.faculty_id
       WHERE d.department_code = $1
         AND c.semester_id = $2
         AND c.section_id = $3
       ORDER BY sub.subject_code ASC`,
      [departmentCode, semesterId, sectionId],
    );
    return result.rows.map(normalizeClassRow);
  },

  /**
   * All classes (subject<->faculty allocations) for a department, regardless
   * of semester/section — used to populate "pick an already-allocated
   * faculty" pickers (Subject-Faculty screen, Timetable builder).
   */
  async findAllByDepartment(departmentCode) {
    const result = await query(
      `SELECT c.class_id, c.semester_id, sem.semester_number, c.section_id, sec.section_name,
              c.subject_id, sub.subject_code, sub.subject_name,
              c.faculty_id, f.employee_id AS faculty_employee_id, f.name AS faculty_name,
              c.academic_year, c.class_teacher_id
       FROM classes c
       JOIN subjects sub    ON sub.subject_id = c.subject_id
       JOIN departments d   ON d.department_id = sub.department_id
       JOIN semesters sem   ON sem.semester_id = c.semester_id
       JOIN sections sec    ON sec.section_id = c.section_id
       JOIN faculty f       ON f.faculty_id = c.faculty_id
       WHERE d.department_code = $1
       ORDER BY sem.semester_number ASC, sec.section_name ASC, sub.subject_code ASC`,
      [departmentCode],
    );
    return result.rows.map(normalizeClassRow);
  },

  async findById(classId) {
    const result = await query(
      `SELECT c.class_id, c.semester_id, sem.semester_number, c.section_id, sec.section_name,
              c.subject_id, sub.subject_code, sub.subject_name,
              c.faculty_id, f.employee_id AS faculty_employee_id, f.name AS faculty_name,
              c.academic_year, c.class_teacher_id
       FROM classes c
       JOIN subjects sub  ON sub.subject_id = c.subject_id
       JOIN semesters sem ON sem.semester_id = c.semester_id
       JOIN sections sec  ON sec.section_id = c.section_id
       JOIN faculty f     ON f.faculty_id = c.faculty_id
       WHERE c.class_id = $1`,
      [classId],
    );
    return normalizeClassRow(result.rows[0]);
  },

  async create({ semesterId, sectionId, subjectId, facultyId, academicYear, classTeacherId }) {
    const result = await query(
      `INSERT INTO classes (semester_id, section_id, subject_id, faculty_id, academic_year, class_teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING class_id`,
      [semesterId, sectionId, subjectId, facultyId, academicYear, classTeacherId ?? null],
    );
    return ClassRepository.findById(result.rows[0].class_id);
  },

  async remove(classId) {
    const result = await query('DELETE FROM classes WHERE class_id = $1 RETURNING class_id', [classId]);
    return result.rowCount > 0;
  },
};

module.exports = ClassRepository;
