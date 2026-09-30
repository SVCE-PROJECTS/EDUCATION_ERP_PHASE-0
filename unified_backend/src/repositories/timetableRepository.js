const { query } = require('../config/db');

const TimetableRepository = {
  /**
   * Get full timetable for a semester+section, joining through classes → subjects/faculty.
   * Returns rows shaped so studentList.service can access t.subject.subjectName and t.faculty.name.
   */
  async getTimetableBySemesterAndSection(semesterId, sectionId) {
    const result = await query(
      `SELECT
         tt.timetable_id,
         tt.class_id,
         tt.day_of_week AS day,
         tt.period,
         tt.room_number AS "roomNumber",
         sub.subject_id AS "subjectId",
         sub.subject_name AS "subjectName",
         sub.subject_code AS "subjectCode",
         f.faculty_id AS "facultyId",
         f.name AS "facultyName"
       FROM timetable tt
       JOIN classes c ON c.class_id = tt.class_id
       JOIN subjects sub ON sub.subject_id = c.subject_id
       JOIN faculty f ON f.faculty_id = c.faculty_id
       WHERE c.semester_id = $1
         AND c.section_id = $2
       ORDER BY tt.day_of_week ASC, tt.period ASC`,
      [semesterId, sectionId],
    );

    // Shape the rows so callers can access row.subject.subjectName / row.faculty.name
    return result.rows.map(r => ({
      timetableId: r.timetable_id,
      classId: r.class_id,
      day: r.day,
      period: r.period,
      roomNumber: r.roomNumber,
      subject: {
        id: r.subjectId,
        subjectName: r.subjectName,
        subjectCode: r.subjectCode,
      },
      faculty: {
        id: r.facultyId,
        name: r.facultyName,
      },
    }));
  },

  /**
   * Get distinct subject→faculty mappings for a semester+section (one entry per subject).
   */
  async getSubjectFacultyMappingBySemesterAndSection(semesterId, sectionId) {
    const result = await query(
      `SELECT DISTINCT ON (sub.subject_id)
        c.class_id AS "classId",
         sub.subject_id AS "subjectId",
         sub.subject_name AS subject,
         sub.subject_code AS "subjectCode",
         f.faculty_id AS "facultyId",
         f.name AS faculty
       FROM classes c
       JOIN subjects sub ON sub.subject_id = c.subject_id
       JOIN faculty f ON f.faculty_id = c.faculty_id
       WHERE c.semester_id = $1
         AND c.section_id = $2
       ORDER BY sub.subject_id ASC, c.academic_year DESC`,
      [semesterId, sectionId],
    );
    return result.rows;
  },

  /**
   * All timetable slots for one class_id (used to re-fetch after a write).
   */
  async findById(timetableId) {
    const result = await query(
      `SELECT timetable_id AS id, class_id AS "classId", day_of_week AS "dayOfWeek",
              period, room_number AS "roomNumber"
       FROM timetable WHERE timetable_id = $1`,
      [timetableId],
    );
    return result.rows[0] || null;
  },

  /**
   * Create a timetable slot for a class. Can throw:
   *  - Postgres 23505 (unique_violation) if this class already has a slot
   *    at that exact day+period.
   *  - Postgres P0001 (raised by trg_prevent_faculty_double_booking) if the
   *    class's faculty is already teaching a DIFFERENT class at that
   *    day+period — the trigger enforces this at the DB level regardless
   *    of caller, this just lets the service translate it into a clean
   *    4xx instead of a raw 500.
   */
  async create({ classId, dayOfWeek, period, roomNumber }) {
    const result = await query(
      `INSERT INTO timetable (class_id, day_of_week, period, room_number)
       VALUES ($1, $2, $3, $4)
       RETURNING timetable_id`,
      [classId, dayOfWeek, period, roomNumber ?? null],
    );
    return TimetableRepository.findById(result.rows[0].timetable_id);
  },

  async update(timetableId, { dayOfWeek, period, roomNumber }) {
    const result = await query(
      `UPDATE timetable
       SET day_of_week = COALESCE($2, day_of_week),
           period      = COALESCE($3, period),
           room_number = COALESCE($4, room_number),
           updated_at  = NOW()
       WHERE timetable_id = $1
       RETURNING timetable_id`,
      [timetableId, dayOfWeek ?? null, period ?? null, roomNumber ?? null],
    );
    if (!result.rows[0]) return null;
    return TimetableRepository.findById(result.rows[0].timetable_id);
  },

  async remove(timetableId) {
    const result = await query('DELETE FROM timetable WHERE timetable_id = $1 RETURNING timetable_id', [timetableId]);
    return result.rowCount > 0;
  },
};

module.exports = TimetableRepository;
