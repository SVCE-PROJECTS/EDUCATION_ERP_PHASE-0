const { query } = require('../config/db');

/**
 * Fetch active dropdown options from the real schema tables.
 * Supported types: program, department, section, semester, gender
 */
async function findActive(type) {
  switch (type) {
    case 'program': {
      const result = await query(
        `SELECT program_id AS id, program_name AS name
         FROM programs
         WHERE is_active = TRUE
         ORDER BY program_name ASC`,
      );
      return result.rows;
    }
    case 'department': {
      const result = await query(
        `SELECT department_id AS id, department_name AS name
         FROM departments
         WHERE is_active = TRUE
         ORDER BY department_name ASC`,
      );
      return result.rows;
    }
    case 'section': {
      // Return distinct section names only (A, B, C, D).
      // The sections table has one row per (section_name, semester, department)
      // so without DISTINCT we get e.g. 8 rows of "B" (one per semester).
      const result = await query(
        `SELECT DISTINCT ON (sec.section_name)
                sec.section_id   AS id,
                sec.section_name AS name
         FROM sections sec
         ORDER BY sec.section_name ASC`,
      );
      return result.rows;
    }
    case 'faculty': {
      const result = await query(
        `SELECT faculty_id AS id, name
         FROM faculty
         WHERE status = 'ACTIVE'
         ORDER BY name ASC`,
      );
      return result.rows;
    }
    case 'staff-department': {
      const result = await query(
        `SELECT staff_dept_id AS id, name
         FROM staff_departments
         WHERE is_active = TRUE
         ORDER BY sort_order ASC, name ASC`,
      );
      return result.rows;
    }
    default:
      return null;
  }
}

/**
 * Get sections filtered by semester ID
 */
async function findSectionsBySemester(semesterId) {
  const result = await query(
    `SELECT sec.section_id AS id, sec.section_name AS name
     FROM sections sec
     WHERE sec.semester_id = $1
     ORDER BY sec.section_name ASC`,
    [semesterId]
  );
  return result.rows;
}

/**
 * Get departments filtered by program ID - Updated
 */
async function findDepartmentsByProgram(programId) {
  // Get the program details first
  const programResult = await query(
    `SELECT program_name, program_code FROM programs WHERE program_id = $1`,
    [programId]
  );
  
  if (!programResult.rows.length) {
    return [];
  }
  
  const program = programResult.rows[0];
  
  // For Bachelor of Engineering, return all engineering departments
  if (program.program_name === 'Bachelor of Engineering') {
    const result = await query(
      `SELECT department_id AS id, department_name AS name
       FROM departments
       WHERE is_active = TRUE 
         AND (department_name ILIKE '%engineering%' 
              OR department_name ILIKE '%CSE%' 
              OR department_name ILIKE '%ECE%'
              OR department_name ILIKE '%civil%'
              OR department_name ILIKE '%mechanical%')
       ORDER BY department_name ASC`,
    );
    return result.rows;
  }
  
  // For Master of Technology, return engineering departments (similar to BE)
  if (program.program_name === 'Master of Technology') {
    const result = await query(
      `SELECT department_id AS id, department_name AS name
       FROM departments
       WHERE is_active = TRUE 
         AND (department_name ILIKE '%engineering%' 
              OR department_name ILIKE '%CSE%' 
              OR department_name ILIKE '%ECE%'
              OR department_name ILIKE '%civil%'
              OR department_name ILIKE '%mechanical%')
       ORDER BY department_name ASC`,
    );
    return result.rows;
  }
  
  // For MCA, return computer-related departments
  if (program.program_name === 'Master of Computer Applications') {
    const result = await query(
      `SELECT department_id AS id, department_name AS name
       FROM departments
       WHERE is_active = TRUE 
         AND (department_name ILIKE '%computer%' 
              OR department_name ILIKE '%CSE%'
              OR department_name ILIKE '%information%')
       ORDER BY department_name ASC`,
    );
    return result.rows;
  }
  
  // For MBA, if no business department exists, return CSE as fallback
  // In a real implementation, you'd have a dedicated business department
  if (program.program_name === 'Master of Business Administration') {
    // First try to find business-related departments
    const businessDepts = await query(
      `SELECT department_id AS id, department_name AS name
       FROM departments
       WHERE is_active = TRUE 
         AND (department_name ILIKE '%business%' 
              OR department_name ILIKE '%management%'
              OR department_name ILIKE '%administration%')
       ORDER BY department_name ASC`,
    );
    
    if (businessDepts.rows.length > 0) {
      return businessDepts.rows;
    }
    
    // Fallback to CSE if no business department exists
    const result = await query(
      `SELECT department_id AS id, department_name AS name
       FROM departments
       WHERE is_active = TRUE AND department_code = 'CSE'
       ORDER BY department_name ASC`,
    );
    return result.rows;
  }
  
  // For any other programs, use the direct mapping from database
  const result = await query(
    `SELECT d.department_id AS id, d.department_name AS name
     FROM departments d
     JOIN programs p ON p.department_id = d.department_id
     WHERE p.program_id = $1 AND d.is_active = TRUE
     ORDER BY d.department_name ASC`,
    [programId]
  );
  return result.rows;
}

module.exports = { findActive, findSectionsBySemester, findDepartmentsByProgram };
