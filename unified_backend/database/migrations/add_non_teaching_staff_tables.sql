-- ============================================================
-- Non-teaching staff
-- ============================================================
-- Adds the tables backing the admin "Non-Teaching Staff" registry
-- (unified_backend/src/repositories/nonTeachingStaff.repository.js
-- and the 'staff-department' dropdown type in dropdownRepository.js).
-- Non-teaching staff are deliberately NOT stored in the `faculty` or
-- `departments` tables — they use their own department list
-- (staff_departments), separate from the academic departments table.
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_departments (
  staff_dept_id SERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL UNIQUE,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS non_teaching_staff (
  staff_id       BIGSERIAL    PRIMARY KEY,
  employee_id    VARCHAR(50)  NOT NULL UNIQUE,
  name           VARCHAR(150) NOT NULL,
  email          VARCHAR(150) UNIQUE,
  phone          VARCHAR(20),
  gender         VARCHAR(20),
  designation    VARCHAR(100) NOT NULL,
  staff_dept_id  INTEGER      REFERENCES staff_departments(staff_dept_id) ON DELETE SET NULL,
  qualification  VARCHAR(150),
  joining_date   DATE,
  status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                               CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_non_teaching_staff_dept ON non_teaching_staff(staff_dept_id);
CREATE INDEX IF NOT EXISTS idx_non_teaching_staff_status ON non_teaching_staff(status);
