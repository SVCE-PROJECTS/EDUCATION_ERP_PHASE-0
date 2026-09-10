-- ============================================================
-- SVCE ERP — UNIFIED SCHEMA (CORRECTED)
-- Database:  svce_erp
-- ER Diagram: Unified ERP System — Complete ER Diagram (fixed rev)
-- Covers:    Admin ERP (Repo 1) + HOD Portal (Repo 2) +
--            Faculty-Student ERP (Repo 3)
-- ============================================================
-- HOW TO RUN:
--   1. createdb svce_erp
--   2. psql -U postgres -d svce_erp -f unified_schema.sql
--   3. psql -U postgres -d svce_erp -f unified_seed.sql
-- ============================================================
-- DESIGN NOTES (deltas from the earlier draft):
--   FIX 1 — classes now carries subject_id + faculty_id, so a
--           "class" = one subject offered to one section for one
--           academic year, taught by one faculty member.
--           attendance / ia_marks / assignments key off class_id
--           ALONE — subject_id / faculty_id are no longer
--           duplicated on those tables; they're derived via JOIN
--           to classes.
--   FIX 2 — subjects.program_id added.
--   FIX 3 — ia_marks.average is a GENERATED ALWAYS ... STORED
--           column — the database keeps it correct, not app code.
--   FIX 4 — single cascade convention:
--             master/reference data (departments, programs,
--             semesters, sections, subjects, classes) -> RESTRICT
--             true ownership (row dies with its parent)  -> CASCADE
--             optional/soft references                   -> SET NULL
--   FIX 5 — refresh_tokens table added for JWT session handling.
--   BUG FIX — the earlier draft's
--             chk_student_section_matches_semester used a
--             subquery inside a CHECK constraint, which Postgres
--             rejects outright. Replaced with a BEFORE INSERT/
--             UPDATE trigger that does the same validation.
-- ============================================================

-- ============================================================
-- SECTION 1: AUTHENTICATION & AUTHORIZATION
-- Tables: roles, users, refresh_tokens
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
    role_id     BIGSERIAL    PRIMARY KEY,
    role_name   VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- users: college-level admin accounts and any portal user.
-- faculty_id / student_id are nullable self-references wired
-- after those tables exist (see deferred FK section below).
CREATE TABLE IF NOT EXISTS users (
    user_id       BIGSERIAL    PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id       BIGINT       REFERENCES roles(role_id) ON DELETE SET NULL,
    faculty_id    BIGINT,      -- wired to faculty(faculty_id) below
    student_id    VARCHAR(50), -- wired to students(library_id) below
    status        VARCHAR(20)  NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','inactive','suspended')),
    last_login    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- refresh_tokens: FIX 5 — JWT session handling. A user can hold
-- multiple active refresh tokens (multiple devices).
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id    BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(user_id)
                                       ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 2: MASTER DATA
-- Tables: departments, programs, semesters, sections,
--         faculty, faculty_subjects
-- ============================================================

CREATE TABLE IF NOT EXISTS departments (
    department_id   BIGSERIAL    PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    department_code VARCHAR(20)  NOT NULL UNIQUE,
    hod_faculty_id  BIGINT,      -- wired to faculty(faculty_id) below; SET NULL
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS programs (
    program_id    BIGSERIAL    PRIMARY KEY,
    program_name  VARCHAR(100) NOT NULL UNIQUE,
    program_code  VARCHAR(20)  NOT NULL UNIQUE,
    department_id BIGINT       NOT NULL REFERENCES departments(department_id)
                                         ON DELETE RESTRICT,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS semesters (
    semester_id     BIGSERIAL   PRIMARY KEY,
    semester_number INTEGER     NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (semester_number)
);

-- sections belong to a semester AND a department so that
-- CSE-Sem4-A and ECE-Sem4-A are distinct rows.
-- FIX 4: semester_id changed to RESTRICT (was CASCADE — the only
-- outlier from the master-data convention used everywhere else).
CREATE TABLE IF NOT EXISTS sections (
    section_id    BIGSERIAL    PRIMARY KEY,
    section_name  VARCHAR(10)  NOT NULL,
    semester_id   BIGINT       NOT NULL REFERENCES semesters(semester_id)
                                         ON DELETE RESTRICT,
    department_id BIGINT       NOT NULL REFERENCES departments(department_id)
                                         ON DELETE RESTRICT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (section_name, semester_id, department_id)
);

-- faculty: single master table. Replaces Repo 2 faculty_list,
-- Repo 2 sl_faculties, and Repo 3's hardcoded faculty profile.
CREATE TABLE IF NOT EXISTS faculty (
    faculty_id        BIGSERIAL    PRIMARY KEY,
    employee_id       VARCHAR(50)  NOT NULL UNIQUE,
    name              VARCHAR(150) NOT NULL,
    email             VARCHAR(150) NOT NULL UNIQUE,
    phone             VARCHAR(20),
    designation       VARCHAR(100) NOT NULL,
    qualification     VARCHAR(150),
    specialization    VARCHAR(150),
    experience_years  INTEGER      NOT NULL DEFAULT 0,
    department_id     BIGINT       NOT NULL REFERENCES departments(department_id)
                                             ON DELETE RESTRICT,
    photo_url         VARCHAR(500),
    username          VARCHAR(50)  NOT NULL UNIQUE,
    password_hash     VARCHAR(255) NOT NULL,
    -- Fast-read cache only. coordinator_assignments (Section 7) is
    -- the authoritative source — keep this in sync via app code,
    -- do not write to it directly from ad-hoc queries.
    coordinator_roles VARCHAR(500),
    is_hod            BOOLEAN      NOT NULL DEFAULT FALSE,
    status            VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                                   CHECK (status IN ('ACTIVE','INACTIVE','ON_LEAVE')),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Deferred FK: departments.hod_faculty_id → faculty ────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_departments_hod_faculty'
          AND conrelid = 'public.departments'::regclass
    ) THEN
        ALTER TABLE departments DROP CONSTRAINT fk_departments_hod_faculty;
    END IF;
END $$;

ALTER TABLE departments
    ADD CONSTRAINT fk_departments_hod_faculty
    FOREIGN KEY (hod_faculty_id)
    REFERENCES faculty(faculty_id)
    ON DELETE SET NULL;

-- ── Deferred FK: users.faculty_id → faculty ──────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_users_faculty'
          AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE users DROP CONSTRAINT fk_users_faculty;
    END IF;
END $$;

ALTER TABLE users
    ADD CONSTRAINT fk_users_faculty
    FOREIGN KEY (faculty_id)
    REFERENCES faculty(faculty_id)
    ON DELETE SET NULL;

-- faculty_subjects: which subjects a faculty member is QUALIFIED
-- to teach (capability mapping). This is distinct from
-- classes.faculty_id, which records who is ACTUALLY teaching a
-- given subject to a given section in a given year.
CREATE TABLE IF NOT EXISTS faculty_subjects (
    faculty_id  BIGINT      NOT NULL REFERENCES faculty(faculty_id) ON DELETE CASCADE,
    subject_id  BIGINT      NOT NULL,   -- FK wired after subjects table is created
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (faculty_id, subject_id)
);
-- ============================================================
-- SECTION 3: STUDENT MASTER
-- Table: students
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    library_id    VARCHAR(50)  NOT NULL,
    usn           VARCHAR(50)  UNIQUE,        -- nullable until USN is assigned
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(150) UNIQUE,
    phone         VARCHAR(20),
    gender        VARCHAR(10)  NOT NULL
                               CHECK (gender IN ('Male','Female','Other')),
    program_id    BIGINT       NOT NULL REFERENCES programs(program_id)
                                         ON DELETE RESTRICT,
    department_id BIGINT       NOT NULL REFERENCES departments(department_id)
                                         ON DELETE RESTRICT,
    semester_id   BIGINT       NOT NULL REFERENCES semesters(semester_id)
                                         ON DELETE RESTRICT,
    section_id    BIGINT       NOT NULL REFERENCES sections(section_id)
                                         ON DELETE RESTRICT,
    academic_year VARCHAR(20)  NOT NULL,  -- e.g. '2024-25'
    status        VARCHAR(20)  NOT NULL DEFAULT 'Enrolled'
                               CHECK (status IN ('Enrolled','On Leave','Transferred','Inactive')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (library_id)
);
-- ── Deferred FK: users.student_id → students ─────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_users_student'
          AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE users DROP CONSTRAINT fk_users_student;
    END IF;
END $$;

ALTER TABLE users
    ADD CONSTRAINT fk_users_student
    FOREIGN KEY (student_id)
    REFERENCES students(library_id)
    ON DELETE SET NULL;

-- BUG FIX: "section belongs to student's semester" cannot be a
-- CHECK constraint (Postgres forbids subqueries there). Enforced
-- via trigger instead — runs on INSERT and whenever semester_id
-- or section_id changes.
CREATE OR REPLACE FUNCTION fn_validate_student_section()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM sections s
        WHERE s.section_id = NEW.section_id
          AND s.semester_id = NEW.semester_id
    ) THEN
        RAISE EXCEPTION
            'section_id % does not belong to semester_id % for student %',
            NEW.section_id, NEW.semester_id, NEW.library_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_student_section ON students;

CREATE TRIGGER trg_validate_student_section
    BEFORE INSERT OR UPDATE OF semester_id, section_id ON students
    FOR EACH ROW
    EXECUTE FUNCTION fn_validate_student_section();

-- ============================================================
-- SECTION 4: SUBJECTS, CLASSES & TIMETABLE
-- Tables: subjects, faculty_subjects (FK wire), classes, timetable
-- ============================================================

-- subjects: replaces Repo 2 subjects + Repo 3's hardcoded subject
-- string array. FIX 2: program_id added so the same semester
-- number in the same department can carry different subjects per
-- program (e.g. BE vs MCA both have a "Semester 3" but different
-- subjects).
CREATE TABLE IF NOT EXISTS subjects (
    subject_id    BIGSERIAL    PRIMARY KEY,
    subject_code  VARCHAR(20)  NOT NULL UNIQUE,
    subject_name  VARCHAR(100) NOT NULL,
    credits       INTEGER,
    program_id    BIGINT       NOT NULL REFERENCES programs(program_id)
                                         ON DELETE RESTRICT,
    semester_id   BIGINT       NOT NULL REFERENCES semesters(semester_id)
                                         ON DELETE RESTRICT,
    department_id BIGINT       NOT NULL REFERENCES departments(department_id)
                                         ON DELETE RESTRICT,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Wire deferred FK on faculty_subjects ─────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_faculty_subjects_subject'
          AND conrelid = 'public.faculty_subjects'::regclass
    ) THEN
        ALTER TABLE faculty_subjects DROP CONSTRAINT fk_faculty_subjects_subject;
    END IF;
END $$;

ALTER TABLE faculty_subjects
    ADD CONSTRAINT fk_faculty_subjects_subject
    FOREIGN KEY (subject_id)
    REFERENCES subjects(subject_id)
    ON DELETE CASCADE;

-- classes: FIX 1 — a class row = ONE subject offered to ONE
-- section for ONE academic year, taught by ONE faculty member.
-- This makes class_id sufficient, on its own, to identify
-- student + subject + faculty + section + semester + year for
-- attendance / ia_marks / assignments — no duplicate FKs needed
-- on those tables.
-- class_teacher_id is the section's homeroom/class teacher (may
-- differ from the subject-teaching faculty_id below).
CREATE TABLE IF NOT EXISTS classes (
    class_id         BIGSERIAL    PRIMARY KEY,
    semester_id      BIGINT       NOT NULL REFERENCES semesters(semester_id)
                                            ON DELETE RESTRICT,
    section_id       BIGINT       NOT NULL REFERENCES sections(section_id)
                                            ON DELETE RESTRICT,
    subject_id       BIGINT       NOT NULL REFERENCES subjects(subject_id)
                                            ON DELETE RESTRICT,
    faculty_id       BIGINT       NOT NULL REFERENCES faculty(faculty_id)
                                            ON DELETE RESTRICT,
    academic_year    VARCHAR(20)  NOT NULL,
    class_teacher_id BIGINT       REFERENCES faculty(faculty_id)
                                            ON DELETE SET NULL,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (semester_id, section_id, subject_id, academic_year)
);

-- timetable: weekly schedule slots for a class. No longer
-- duplicates subject_id / faculty_id — both come from classes.
CREATE TABLE IF NOT EXISTS timetable (
    timetable_id BIGSERIAL   PRIMARY KEY,
    class_id     BIGINT      NOT NULL REFERENCES classes(class_id)
                                       ON DELETE RESTRICT,
    day_of_week  VARCHAR(10) NOT NULL
                 CHECK (day_of_week IN
                     ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
    period       INTEGER     NOT NULL CHECK (period BETWEEN 1 AND 8),
    room_number  VARCHAR(20),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (class_id, day_of_week, period)
);

-- BUG FIX (was a NOTE, never enforced): a faculty member could be
-- double-booked across two different classes at the same
-- day_of_week + period, since faculty_id isn't directly on this
-- table — it's only reachable via classes.faculty_id. Enforced
-- here with a trigger that joins to classes and rejects any
-- INSERT/UPDATE that would create the collision.
CREATE OR REPLACE FUNCTION fn_prevent_faculty_double_booking()
RETURNS TRIGGER AS $$
DECLARE
    v_faculty_id   BIGINT;
    v_conflict_id  BIGINT;
BEGIN
    SELECT faculty_id INTO v_faculty_id
    FROM   classes
    WHERE  class_id = NEW.class_id;

    SELECT t.timetable_id INTO v_conflict_id
    FROM   timetable t
    JOIN   classes c ON c.class_id = t.class_id
    WHERE  c.faculty_id  = v_faculty_id
      AND  t.day_of_week = NEW.day_of_week
      AND  t.period       = NEW.period
      AND  t.timetable_id <> COALESCE(NEW.timetable_id, -1)
    LIMIT 1;

    IF v_conflict_id IS NOT NULL THEN
        RAISE EXCEPTION
            'faculty_id % is already scheduled for another class at % period % (timetable_id %)',
            v_faculty_id, NEW.day_of_week, NEW.period, v_conflict_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_faculty_double_booking ON timetable;

CREATE TRIGGER trg_prevent_faculty_double_booking
    BEFORE INSERT OR UPDATE OF class_id, day_of_week, period ON timetable
    FOR EACH ROW
    EXECUTE FUNCTION fn_prevent_faculty_double_booking();

-- ============================================================
-- SECTION 5: ACADEMIC OPERATIONS
-- Tables: attendance, ia_marks, assignments,
--         assignment_submissions
-- ============================================================

-- attendance: FIX 1 applied — class_id is the only FK needed.
-- subject and faculty are derived via classes.subject_id /
-- classes.faculty_id.
CREATE TABLE IF NOT EXISTS attendance (
    attendance_id   BIGSERIAL    PRIMARY KEY,
    student_id      VARCHAR(50)  NOT NULL REFERENCES students(library_id)
                                           ON DELETE CASCADE,
    class_id        BIGINT       NOT NULL REFERENCES classes(class_id)
                                           ON DELETE RESTRICT,
    attendance_date DATE         NOT NULL,
    status          VARCHAR(10)  NOT NULL
                    CHECK (status IN ('Present','Absent')),
    remarks         VARCHAR(255),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, class_id, attendance_date)
);

-- ia_marks: FIX 1 applied — class_id replaces subject_id +
-- faculty_id. FIX 3 — average is a generated column, always
-- correct, no app-layer sync required.
CREATE TABLE IF NOT EXISTS ia_marks (
    ia_id      BIGSERIAL    PRIMARY KEY,
    student_id VARCHAR(50)  NOT NULL REFERENCES students(library_id)
                                      ON DELETE CASCADE,
    class_id   BIGINT       NOT NULL REFERENCES classes(class_id)
                                      ON DELETE RESTRICT,
    ia1        INTEGER      CHECK (ia1 BETWEEN 0 AND 20),
    ia2        INTEGER      CHECK (ia2 BETWEEN 0 AND 20),
    ia3        INTEGER      CHECK (ia3 BETWEEN 0 AND 20),
    average    NUMERIC(5,2) GENERATED ALWAYS AS (
                   ROUND(
                       (COALESCE(ia1, 0) + COALESCE(ia2, 0) + COALESCE(ia3, 0))
                       ::NUMERIC / 3,
                   2)
               ) STORED,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, class_id)
);

-- assignments: FIX 1 applied — class_id replaces subject_id,
-- section_id, and faculty_id (all three were derivable via the
-- class anyway).
CREATE TABLE IF NOT EXISTS assignments (
    assignment_id  BIGSERIAL    PRIMARY KEY,
    class_id       BIGINT       NOT NULL REFERENCES classes(class_id)
                                          ON DELETE RESTRICT,
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    due_date       DATE,
    marks          INTEGER      DEFAULT 0,
    attachment_url VARCHAR(500),
    status         VARCHAR(20)  NOT NULL DEFAULT 'Open'
                                CHECK (status IN ('Open','Closed','Graded')),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- assignment_submissions: student submissions against an
-- assignment. New table from the ER diagram, no direct predecessor.
CREATE TABLE IF NOT EXISTS assignment_submissions (
    submission_id BIGSERIAL    PRIMARY KEY,
    assignment_id BIGINT       NOT NULL REFERENCES assignments(assignment_id)
                                         ON DELETE CASCADE,
    student_id    VARCHAR(50)  NOT NULL REFERENCES students(library_id)
                                         ON DELETE CASCADE,
    submitted_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    file_url      VARCHAR(500),
    marks         INTEGER,
    remarks       VARCHAR(500),
    UNIQUE (assignment_id, student_id)
);

-- ============================================================
-- SECTION 6: ACTIVITIES & ACHIEVEMENTS
-- Tables: activities, achievements
-- ============================================================

-- activities: consolidates Repo 2's six separate activity tables
-- (TechnicalEvent, SportsActivity, CulturalActivity,
--  IndustryProject, Hackathon, OtherCurricularActivity) into one
-- table discriminated by activity_type.
CREATE TABLE IF NOT EXISTS activities (
    activity_id    BIGSERIAL    PRIMARY KEY,
    student_id     VARCHAR(50)  NOT NULL REFERENCES students(library_id)
                                          ON DELETE CASCADE,
    faculty_id     BIGINT       REFERENCES faculty(faculty_id)
                                          ON DELETE SET NULL,
    activity_type  VARCHAR(50)  NOT NULL
                   CHECK (activity_type IN (
                       'Technical','Sports','Cultural',
                       'IndustryProject','Hackathon','OtherCurricular'
                   )),
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    academic_year  VARCHAR(20),
    status         VARCHAR(20)  NOT NULL DEFAULT 'Completed',
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- achievements: consolidates Repo 3's achievements table with the
-- ER diagram's achievements entity.
CREATE TABLE IF NOT EXISTS achievements (
    achievement_id   BIGSERIAL    PRIMARY KEY,
    student_id       VARCHAR(50)  NOT NULL REFERENCES students(library_id)
                                            ON DELETE CASCADE,
    faculty_id       BIGINT       REFERENCES faculty(faculty_id)
                                            ON DELETE SET NULL,
    title            VARCHAR(255) NOT NULL,
    level            VARCHAR(50)
                     CHECK (level IN (
                         'College','University',
                         'State','National','International'
                     )),
    type             VARCHAR(50)  NOT NULL
                     CHECK (type IN (
                         'Hackathon','Sports','Cultural','Industry',
                         'Certification','Publication','Award','Other'
                     )),
    position         VARCHAR(100),
    certificate_url  VARCHAR(500),
    achievement_date DATE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 7: ADMIN OPERATIONS
-- Tables: student_transfers, coordinator_assignments
-- ============================================================

CREATE TABLE IF NOT EXISTS student_transfers (
    transfer_id       BIGSERIAL   PRIMARY KEY,
    student_id        VARCHAR(50) NOT NULL REFERENCES students(library_id)
                                            ON DELETE CASCADE,
    old_program_id    BIGINT      REFERENCES programs(program_id)       ON DELETE SET NULL,
    old_department_id BIGINT      REFERENCES departments(department_id) ON DELETE SET NULL,
    old_semester_id   BIGINT      REFERENCES semesters(semester_id)     ON DELETE SET NULL,
    old_section_id    BIGINT      REFERENCES sections(section_id)       ON DELETE SET NULL,
    new_program_id    BIGINT      NOT NULL REFERENCES programs(program_id)
                                            ON DELETE RESTRICT,
    new_department_id BIGINT      NOT NULL REFERENCES departments(department_id)
                                            ON DELETE RESTRICT,
    new_semester_id   BIGINT      NOT NULL REFERENCES semesters(semester_id)
                                            ON DELETE RESTRICT,
    new_section_id    BIGINT      NOT NULL REFERENCES sections(section_id)
                                            ON DELETE RESTRICT,
    reason            VARCHAR(500),
    document_url      VARCHAR(500),
    transfer_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_transfer_different_target'
          AND conrelid = 'public.student_transfers'::regclass
    ) THEN
        ALTER TABLE student_transfers DROP CONSTRAINT chk_transfer_different_target;
    END IF;
END $$;

ALTER TABLE student_transfers
    ADD CONSTRAINT chk_transfer_different_target
    CHECK (
        new_program_id    <> old_program_id OR
        new_department_id <> old_department_id OR
        new_semester_id   <> old_semester_id OR
        new_section_id    <> old_section_id OR
        old_program_id    IS NULL OR
        old_department_id IS NULL OR
        old_semester_id   IS NULL OR
        old_section_id    IS NULL
    );

-- coordinator_assignments: authoritative source for coordinator
-- role assignment. faculty.coordinator_roles is a denormalized
-- fast-read cache of this table — keep them in sync at the
-- application layer.
CREATE TABLE IF NOT EXISTS coordinator_assignments (
    coordinator_id BIGSERIAL   PRIMARY KEY,
    faculty_id     BIGINT      NOT NULL REFERENCES faculty(faculty_id)
                                         ON DELETE CASCADE,
    role_id        BIGINT      NOT NULL REFERENCES roles(role_id)
                                         ON DELETE CASCADE,
    department_id  BIGINT      NOT NULL REFERENCES departments(department_id)
                                         ON DELETE CASCADE,
    assigned_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
    remarks        VARCHAR(500),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (faculty_id, role_id, department_id)
);

-- ============================================================
-- SECTION 8: ACADEMIC SETTINGS
-- Table: academic_settings
-- Used by the HOD Portal's Student List module to track the
-- current semester type (ODD/EVEN) and academic year.
-- Structure only — seed data lives in unified_seed.sql.
-- ============================================================

-- BUG FIX: no unique constraint meant unified_seed.sql's
-- "ON CONFLICT DO NOTHING" was a no-op — every re-run of the seed
-- silently inserted a duplicate academic_settings row. UNIQUE
-- (academic_year) gives that ON CONFLICT clause an actual target.
CREATE TABLE IF NOT EXISTS academic_settings (
    setting_id            BIGSERIAL    PRIMARY KEY,
    academic_year         VARCHAR(20)  NOT NULL UNIQUE,
    current_semester_type VARCHAR(10)  NOT NULL
                          CHECK (current_semester_type IN ('ODD','EVEN')),
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 9: COMMUNICATION & SYSTEM
-- Tables: notifications, settings
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
    notification_id BIGSERIAL    PRIMARY KEY,
    user_id         BIGINT       NOT NULL REFERENCES users(user_id)
                                           ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    message         TEXT         NOT NULL,
    read_status     VARCHAR(10)  NOT NULL DEFAULT 'Unread'
                                 CHECK (read_status IN ('Unread','Read')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
    setting_id           BIGSERIAL   PRIMARY KEY,
    user_id              BIGINT      NOT NULL REFERENCES users(user_id)
                                              ON DELETE CASCADE,
    theme                VARCHAR(20) DEFAULT 'light',
    language             VARCHAR(20) DEFAULT 'en',
    notification_enabled BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);

-- ============================================================
-- SECTION 10: AUDIT & LOGS
-- Table: audit_logs
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id   BIGSERIAL    PRIMARY KEY,
    user_id    BIGINT       REFERENCES users(user_id) ON DELETE SET NULL,
    action     VARCHAR(100) NOT NULL,
    module     VARCHAR(50),
    record_id  VARCHAR(100),
    old_value  JSONB,
    new_value  JSONB,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SECTION 11: INDEXES
-- ============================================================

-- ── users / refresh_tokens ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user     ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires  ON refresh_tokens (expires_at);

-- ── students ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_usn           ON students (usn);
CREATE INDEX IF NOT EXISTS idx_students_name          ON students (name);
CREATE INDEX IF NOT EXISTS idx_students_department    ON students (department_id);
CREATE INDEX IF NOT EXISTS idx_students_program       ON students (program_id);
CREATE INDEX IF NOT EXISTS idx_students_semester      ON students (semester_id);
CREATE INDEX IF NOT EXISTS idx_students_section       ON students (section_id);
CREATE INDEX IF NOT EXISTS idx_students_status        ON students (status);

-- ── faculty ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_faculty_department     ON faculty (department_id);
CREATE INDEX IF NOT EXISTS idx_faculty_username       ON faculty (username);
CREATE INDEX IF NOT EXISTS idx_faculty_status         ON faculty (status);
CREATE INDEX IF NOT EXISTS idx_faculty_employee_id    ON faculty (employee_id);

-- ── subjects ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subjects_program       ON subjects (program_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester      ON subjects (semester_id);
CREATE INDEX IF NOT EXISTS idx_subjects_department    ON subjects (department_id);

-- ── classes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_classes_semester       ON classes (semester_id);
CREATE INDEX IF NOT EXISTS idx_classes_section        ON classes (section_id);
CREATE INDEX IF NOT EXISTS idx_classes_subject        ON classes (subject_id);
CREATE INDEX IF NOT EXISTS idx_classes_faculty        ON classes (faculty_id);

-- ── timetable ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_timetable_class        ON timetable (class_id);

-- ── attendance ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attendance_student     ON attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class       ON attendance (class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date        ON attendance (attendance_date);

-- ── ia_marks ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ia_marks_student       ON ia_marks (student_id);
CREATE INDEX IF NOT EXISTS idx_ia_marks_class         ON ia_marks (class_id);

-- ── assignments ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assignments_class      ON assignments (class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status     ON assignments (status);

-- ── assignment_submissions ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student    ON assignment_submissions (student_id);

-- ── activities ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activities_student     ON activities (student_id);
CREATE INDEX IF NOT EXISTS idx_activities_type        ON activities (activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_faculty     ON activities (faculty_id);

-- ── achievements ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_achievements_student   ON achievements (student_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type      ON achievements (type);

-- ── student_transfers ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transfers_student      ON student_transfers (student_id);
CREATE INDEX IF NOT EXISTS idx_transfers_date         ON student_transfers (transfer_date);

-- ── coordinator_assignments ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_coordinator_faculty    ON coordinator_assignments (faculty_id);
CREATE INDEX IF NOT EXISTS idx_coordinator_dept       ON coordinator_assignments (department_id);

-- ── faculty_subjects ─────────────────────────────────────────
-- BUG FIX: the composite PK (faculty_id, subject_id) only
-- indexes subject_id as a prefix column of a 2-column index, so
-- it can't support "which faculty teach subject X" lookups on
-- subject_id alone. Adding a dedicated index for that direction.
CREATE INDEX IF NOT EXISTS idx_faculty_subjects_subject ON faculty_subjects (subject_id);

-- ── notifications ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user     ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status   ON notifications (read_status);

-- ── audit_logs ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_user             ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action           ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_created          ON audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_module           ON audit_logs (module);

-- ============================================================
-- SECTION 12: updated_at MAINTENANCE
-- ============================================================
-- BUG FIX: no table had an auto-update mechanism for updated_at —
-- app code was relied on to set it, which is easy to forget on
-- any given UPDATE statement. One generic trigger function,
-- applied to every table that actually has an updated_at column
-- (18 tables). Tables without updated_at (refresh_tokens,
-- faculty_subjects, attendance, assignment_submissions,
-- student_transfers, notifications, audit_logs) are intentionally
-- append-only / timestamped by created_at only, so they're
-- skipped.

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'roles', 'users', 'departments', 'programs', 'semesters',
        'sections', 'faculty', 'students', 'subjects', 'classes',
        'timetable', 'ia_marks', 'assignments', 'activities',
        'achievements', 'coordinator_assignments',
        'academic_settings', 'settings'
    ] LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_set_updated_at ON %I;
             CREATE TRIGGER trg_set_updated_at
                 BEFORE UPDATE ON %I
                 FOR EACH ROW
                 EXECUTE FUNCTION fn_set_updated_at();',
            v_table, v_table
        );
    END LOOP;
END;
$$;