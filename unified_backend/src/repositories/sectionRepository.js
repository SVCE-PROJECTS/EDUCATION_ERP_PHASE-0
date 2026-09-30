const { query } = require('../config/db');

const SectionRepository = {
  /**
   * Get all sections for a semester, ordered alphabetically.
   */
  async getSectionsBySemesterId(semesterId, departmentCode) {
    const params = [semesterId];
    const departmentFilter = departmentCode ? `AND UPPER(d.department_code) = UPPER($${params.push(departmentCode)})` : '';
    const result = await query(
      `SELECT sec.section_id AS id,
              sec.section_name AS "sectionName",
              sec.semester_id AS "semesterId",
              sec.department_id AS "departmentId",
              d.department_code AS "departmentCode",
              d.department_name AS "departmentName"
       FROM sections sec
       JOIN departments d ON d.department_id = sec.department_id
      WHERE sec.semester_id = $1 ${departmentFilter}
       ORDER BY sec.section_name ASC`,
          params,
    );
    return result.rows;
  },

  /**
   * Find a specific section by semester and section name (case-insensitive).
   */
  async findBySemesterAndName(semesterId, sectionName, departmentCode) {
    const params = [semesterId, sectionName];
    const departmentFilter = departmentCode ? `AND UPPER(d.department_code) = UPPER($${params.push(departmentCode)})` : '';
    const result = await query(
      `SELECT sec.section_id AS id,
              sec.section_name AS "sectionName",
              sec.semester_id AS "semesterId",
              sec.department_id AS "departmentId"
       FROM sections sec
       JOIN departments d ON d.department_id = sec.department_id
       WHERE sec.semester_id = $1
         AND UPPER(sec.section_name) = UPPER($2)
         ${departmentFilter}
       LIMIT 1`,
      params,
    );
    return result.rows[0] || null;
  },
};

module.exports = SectionRepository;
