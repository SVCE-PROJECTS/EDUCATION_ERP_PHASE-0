-- ============================================================
-- Audit log: department + faculty-actor scoping
-- ============================================================
-- audit_logs.user_id is a BIGINT FK into users(user_id) — only admin
-- accounts have a row there. Faculty/HOD actors authenticate against the
-- `faculty` table and carry a string employee_id (e.g. "EMP001"), which
-- never fit that column. This adds two things:
--
--   1. performed_by_employee_id — a proper FK for faculty/HOD actors,
--      so their audit entries display a real name instead of being
--      unattributed or stuffed into the new_value JSON blob.
--   2. department_id — lets a department's activity be queried directly
--      (WHERE department_id = $1) instead of joining through whatever
--      table `module`/`record_id` happens to point at.
-- ============================================================

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(department_id),
  ADD COLUMN IF NOT EXISTS performed_by_employee_id VARCHAR(20) REFERENCES faculty(employee_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_department_id ON audit_logs(department_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by_employee_id ON audit_logs(performed_by_employee_id);
