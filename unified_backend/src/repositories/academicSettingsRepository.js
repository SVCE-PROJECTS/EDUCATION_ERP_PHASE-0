const { query } = require('../config/db');

const AcademicSettingsRepository = {
  /**
   * Returns the most recent academic settings row.
   */
  async getCurrentSettings() {
    const result = await query(
      `SELECT academic_year AS "academicYear",
              current_semester_type AS "currentSemesterType"
       FROM academic_settings
       ORDER BY setting_id DESC
       LIMIT 1`,
    );
    return result.rows[0] || null;
  },

  /**
   * Upserts the settings row for a given academic year (e.g. "2025-26") —
   * used by the admin Settings screen. Only one row is treated as "current"
   * (the most recently created/updated one, per getCurrentSettings above).
   */
  async upsertSettings({ academicYear, currentSemesterType }) {
    const result = await query(
      `INSERT INTO academic_settings (academic_year, current_semester_type)
       VALUES ($1, $2)
       ON CONFLICT (academic_year)
       DO UPDATE SET current_semester_type = EXCLUDED.current_semester_type, updated_at = NOW()
       RETURNING academic_year AS "academicYear", current_semester_type AS "currentSemesterType"`,
      [academicYear, currentSemesterType],
    );
    return result.rows[0];
  },
};

module.exports = AcademicSettingsRepository;
