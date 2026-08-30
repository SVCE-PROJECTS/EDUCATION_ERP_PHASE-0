/**
 * Activity Validators
 * FIXED: rules now match the fields actually sent by the hod-portal forms
 * (a single `student_id` reference + the activity-specific fields), instead
 * of the old manual-entry fields (studentName/usn/department) that the
 * current frontend never collects. That mismatch was causing every
 * create/update request for these activity types to fail with
 * "400 Validation failed" before it ever reached the controller/service/DB.
 *
 * Covers: cultural, sports, technical, hackathon, industry projects, other curricular
 */

const { body } = require('express-validator');

// ── Shared reusable rules ─────────────────────────────────────────────────────

// Every activity form sends the student as a single USN reference (the
// service layer resolves it to the real library_id internally) — not
// separate name/department/section fields.
const studentIdRule = body('student_id')
  .trim().notEmpty().withMessage('Student USN is required')
  .isLength({ max: 50 });

const semesterOptional = body('semester')
  .optional({ checkFalsy: true })
  .isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8');

const sectionOptional = body('section')
  .optional({ checkFalsy: true })
  .trim().isLength({ max: 10 });

const yearOptional = body('year')
  .optional({ checkFalsy: true })
  .isInt({ min: 2000, max: 2100 }).withMessage('Valid year required');

// FIXED: the "Academic Year" field on every activity form is a plain free
// text box with no placeholder or format hint — but this rule used to
// reject anything except the exact pattern "2024-25" / "2024-2025". A
// completely ordinary entry like "2025", "2024/25", or "24-25" would fail
// validation with a toast that only ever says "Validation failed", giving
// no clue why. Now this just caps the length and accepts whatever the HOD
// types — an academic year label isn't security- or query-sensitive enough
// to warrant strict format enforcement without matching UI guidance.
const academicYearOptional = body('academicYear')
  .optional({ checkFalsy: true })
  .trim()
  .isLength({ max: 20 }).withMessage('Academic year is too long');

// ── Cultural Activity ─────────────────────────────────────────────────────────
// Frontend fields: student_id, eventName, category, participation, year,
//                  semester, section, academicYear

const createCulturalRules = [
  studentIdRule,
  body('eventName')
    .trim().notEmpty().withMessage('Event name is required')
    .isLength({ max: 200 }),
  body('category').optional({ checkFalsy: true }).isLength({ max: 100 }),
  body('participation').optional({ checkFalsy: true }).isLength({ max: 100 }),
  yearOptional,
  semesterOptional,
  sectionOptional,
  academicYearOptional,
];

const updateCulturalRules = [
  body('eventName').optional().trim().notEmpty().isLength({ max: 200 }),
  body('category').optional({ checkFalsy: true }).isLength({ max: 100 }),
  body('participation').optional({ checkFalsy: true }).isLength({ max: 100 }),
  yearOptional,
  semesterOptional,
  sectionOptional,
  academicYearOptional,
];

// ── Sports Activity ───────────────────────────────────────────────────────────
// Frontend fields: student_id, sportName, competitionLevel, positionMedal,
//                  semester, section, academicYear

const createSportsRules = [
  studentIdRule,
  body('sportName')
    .trim().notEmpty().withMessage('Sport name is required')
    .isLength({ max: 150 }),
  body('competitionLevel')
    .trim().notEmpty().withMessage('Competition level is required')
    .isLength({ max: 100 }),
  body('positionMedal').optional({ checkFalsy: true }).isLength({ max: 100 }),
  semesterOptional,
  sectionOptional,
  academicYearOptional,
];

const updateSportsRules = [
  body('sportName').optional().trim().notEmpty().isLength({ max: 150 }),
  body('competitionLevel').optional().trim().notEmpty().isLength({ max: 100 }),
  body('positionMedal').optional({ checkFalsy: true }).isLength({ max: 100 }),
  semesterOptional,
  sectionOptional,
  academicYearOptional,
];

// ── Technical Event ───────────────────────────────────────────────────────────
// Not currently wired to any hod-portal screen, but kept consistent with the
// service layer (student_id + projectName are the only required fields there).

const VALID_EVENT_TYPES = [
  'Hackathon', 'Project', 'Paper Presentation',
  'Coding Contest', 'Workshop', 'Seminar', 'Internship', 'Other',
];
const VALID_STATUSES = ['ONGOING', 'COMPLETED'];

// FIXED: the Industry Projects screen's status dropdown offers a third
// option, "Paused" (value 'PAUSED'), that VALID_STATUSES never included.
// Selecting it made every create/update request fail validation with
// "400 Validation failed" before it reached the database. Industry
// projects get their own enum so Technical Event's dropdown (which really
// only has Ongoing/Completed) is left untouched.
const VALID_PROJECT_STATUSES = ['ONGOING', 'COMPLETED', 'PAUSED'];

const createTechnicalRules = [
  studentIdRule,
  body('projectName')
    .trim().notEmpty().withMessage('Project / event name is required')
    .isLength({ max: 200 }),
  body('eventType').optional({ checkFalsy: true }).isIn(VALID_EVENT_TYPES),
  body('projectDomain').optional({ checkFalsy: true }).isLength({ max: 150 }),
  body('facultyMentor').optional({ checkFalsy: true }).isLength({ max: 150 }),
  body('projectStatus').optional().isIn(VALID_STATUSES),
  semesterOptional,
  sectionOptional,
  academicYearOptional,
];

const updateTechnicalRules = [
  body('projectName').optional().trim().notEmpty().isLength({ max: 200 }),
  body('eventType').optional({ checkFalsy: true }).isIn(VALID_EVENT_TYPES),
  body('projectDomain').optional({ checkFalsy: true }).isLength({ max: 150 }),
  body('facultyMentor').optional({ checkFalsy: true }).isLength({ max: 150 }),
  body('projectStatus').optional().isIn(VALID_STATUSES),
  semesterOptional,
  sectionOptional,
  academicYearOptional,
];

// ── Hackathon ─────────────────────────────────────────────────────────────────
// Frontend fields: student_id, hackathonName, position, year, semester,
//                  section, academicYear

const createHackathonRules = [
  studentIdRule,
  body('hackathonName')
    .trim().notEmpty().withMessage('Hackathon name is required')
    .isLength({ max: 200 }),
  body('position')
    .trim().notEmpty().withMessage('Position is required')
    .isLength({ max: 100 }),
  yearOptional,
  semesterOptional,
  sectionOptional,
  academicYearOptional,
];

const updateHackathonRules = [
  body('hackathonName').optional().trim().notEmpty().isLength({ max: 200 }),
  body('position').optional().trim().notEmpty().isLength({ max: 100 }),
  yearOptional,
  semesterOptional,
  sectionOptional,
  academicYearOptional,
];

// ── Industry Project ──────────────────────────────────────────────────────────
// Frontend fields: student_id, projectName, status, academicYear, domain

const createIndustryProjectRules = [
  studentIdRule,
  body('projectName')
    .trim().notEmpty().withMessage('Project name is required')
    .isLength({ max: 200 }),
  body('status').optional().isIn(VALID_PROJECT_STATUSES)
    .withMessage(`Status must be one of: ${VALID_PROJECT_STATUSES.join(', ')}`),
  body('domain').optional({ checkFalsy: true }).isLength({ max: 150 }),
  semesterOptional,
  sectionOptional,
  academicYearOptional,
];

// Used by the (currently unused) "add student to project" endpoint. Left as
// student_id-based for consistency in case that flow gets wired up later.
const industryStudentRules = [
  studentIdRule,
  semesterOptional,
  sectionOptional,
];

// ── Other Curricular ──────────────────────────────────────────────────────────
// Frontend fields: student_id, eventName, organizingCollege, achievement,
//                  year, semester, section, academicYear, activityType

const createOtherCurricularRules = [
  studentIdRule,
  body('eventName')
    .trim().notEmpty().withMessage('Event name is required')
    .isLength({ max: 200 }),
  body('organizingCollege').optional({ checkFalsy: true }).isLength({ max: 200 }),
  body('achievement').optional({ checkFalsy: true }).isLength({ max: 200 }),
  yearOptional,
  semesterOptional,
  sectionOptional,
  academicYearOptional,
];

const updateOtherCurricularRules = [
  body('eventName').optional().trim().notEmpty().isLength({ max: 200 }),
  body('organizingCollege').optional({ checkFalsy: true }).isLength({ max: 200 }),
  body('achievement').optional({ checkFalsy: true }).isLength({ max: 200 }),
  yearOptional,
  semesterOptional,
  sectionOptional,
  academicYearOptional,
];

module.exports = {
  // Cultural
  createCulturalRules, updateCulturalRules,
  // Sports
  createSportsRules, updateSportsRules,
  // Technical
  createTechnicalRules, updateTechnicalRules,
  // Hackathon
  createHackathonRules, updateHackathonRules,
  // Industry Projects
  createIndustryProjectRules, industryStudentRules,
  // Other Curricular
  createOtherCurricularRules, updateOtherCurricularRules,
  // Shared
  VALID_EVENT_TYPES, VALID_STATUSES, VALID_PROJECT_STATUSES,
};
