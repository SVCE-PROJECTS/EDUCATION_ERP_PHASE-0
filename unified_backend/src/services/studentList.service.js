const academicSettingsRepo = require('../repositories/academicSettingsRepository');
const semesterRepo        = require('../repositories/semesterRepository');
const sectionRepo         = require('../repositories/sectionRepository');
const studentRepo         = require('../repositories/studentRepository');
const timetableRepo       = require('../repositories/timetableRepository');

// Canonical day sort order for timetable display
const DAY_ORDER = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };

const StudentListService = {
  /**
   * Returns the current semester type + applicable semester numbers (from DB)
   */
  async getSemesters() {
    const settings = await academicSettingsRepo.getCurrentSettings();
    if (!settings) {
      const err = new Error('Academic settings not configured in the database');
      err.statusCode = 500;
      throw err;
    }

    const semesterType = settings.currentSemesterType.toUpperCase();
    if (!['ODD', 'EVEN'].includes(semesterType)) {
      const err = new Error(`Invalid semester type "${semesterType}" in DB. Must be ODD or EVEN.`);
      err.statusCode = 500;
      throw err;
    }

    const records = await semesterRepo.getSemestersBySemesterType(semesterType);
    return {
      semesterType,
      academicYear: settings.academicYear,
      semesters: records.map(r => r.semesterNumber)
    };
  },

  /**
   * Returns all sections for a given semester number
   */
  async getSectionsBySemester(semesterNumber, departmentCode) {
    const semester = await semesterRepo.findBySemesterNumber(semesterNumber);
    if (!semester) {
      const err = new Error(`Semester ${semesterNumber} not found`);
      err.statusCode = 404;
      throw err;
    }

    const sections = await sectionRepo.getSectionsBySemesterId(semester.id, departmentCode);
    if (!sections.length) {
      const err = new Error(`No sections found for Semester ${semesterNumber}`);
      err.statusCode = 404;
      throw err;
    }

    return sections.map(s => ({ id: s.id, name: s.sectionName }));
  },

  /**
   * Returns full section dashboard: timetable, subject-faculty mapping, students (paginated)
   */
  async getSectionDashboard(semesterNumber, sectionName, pagination = {}, departmentCode) {
    const semester = await semesterRepo.findBySemesterNumber(semesterNumber);
    if (!semester) {
      const err = new Error(`Semester ${semesterNumber} not found`);
      err.statusCode = 404;
      throw err;
    }

    const section = await sectionRepo.findBySemesterAndName(semester.id, sectionName.toUpperCase(), departmentCode);
    if (!section) {
      const err = new Error(`Section "${sectionName.toUpperCase()}" not found for Semester ${semesterNumber}`);
      err.statusCode = 404;
      throw err;
    }

    // Timetable
    const rawTimetable = await timetableRepo.getTimetableBySemesterAndSection(semester.id, section.id);
    const timetable = rawTimetable
      .sort((a, b) => (DAY_ORDER[a.day] || 99) - (DAY_ORDER[b.day] || 99) || a.period - b.period)
      .map(t => ({
        timetableId: t.timetableId,
        classId: t.classId,
        day: t.day,
        period: t.period,
        roomNumber: t.roomNumber,
        subject: t.subject.subjectName,
        subjectCode: t.subject.subjectCode,
        facultyId: t.faculty.id,
        faculty: t.faculty.name
      }));

    // Subject → Faculty mapping
    const rawMapping = await timetableRepo.getSubjectFacultyMappingBySemesterAndSection(semester.id, section.id);
    const subjectFacultyMapping = rawMapping.map(m => ({
      classId: m.classId,
      subject: m.subject,
      subjectCode: m.subjectCode,
      faculty: m.faculty,
      facultyId: m.facultyId
    }));

    // Students with pagination
    const allStudents = await studentRepo.getStudentsBySectionId(section.id);
    const page  = Math.max(1, parseInt(pagination.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pagination.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const students = allStudents.slice(offset, offset + limit).map((s, i) => ({
      sno: offset + i + 1,
      usn: s.usn,
      name: s.name,
      phone: s.phone,
      email: s.email,
      attendance:  s.attendance  ? parseFloat(s.attendance.attendancePercentage.toFixed(2))   : null,
      performance: s.performance ? parseFloat(s.performance.performancePercentage.toFixed(2)) : null
    }));

    return {
      semester: semesterNumber,
      section: sectionName.toUpperCase(),
      timetable,
      subjectFacultyMapping,
      students: {
        data: students,
        pagination: {
          total: allStudents.length,
          page,
          limit,
          totalPages: Math.ceil(allStudents.length / limit)
        }
      }
    };
  }
};

module.exports = StudentListService;
