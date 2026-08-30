-- ============================================================
-- FACULTY PORTAL TEST SEED
-- Run AFTER unified_seed_empty.sql
-- Creates: 1 faculty, subjects, classes, 10 students
-- Faculty login → username: dr.sharma  password: Faculty@123
-- ============================================================

-- ── 1. BE program under CSE ──────────────────────────────────
INSERT INTO programs (program_name, program_code, department_id)
SELECT 'Bachelor of Engineering', 'BE',
       (SELECT department_id FROM departments WHERE department_code = 'CSE')
ON CONFLICT (program_code) DO NOTHING;

-- ── 2. Faculty member ────────────────────────────────────────
INSERT INTO faculty (
    employee_id, name, email, phone,
    designation, qualification, specialization, experience_years,
    department_id, username, password_hash, status
)
SELECT
    'EMP001',
    'Dr. Rajesh Sharma',
    'rajesh.sharma@svce.edu',
    '9876543210',
    'Assistant Professor',
    'Ph.D Computer Science',
    'Machine Learning',
    8,
    (SELECT department_id FROM departments WHERE department_code = 'CSE'),
    'dr.sharma',
    '$2b$10$33cEgNsIcJOeIjXCE5I/vuG0hgXHxDUnWaD/P.63xcoKaAm/ZjcnO',
    'ACTIVE'
ON CONFLICT (employee_id) DO NOTHING;

-- ── 3. Subjects (Sem 3, CSE, BE) ─────────────────────────────
INSERT INTO subjects (subject_code, subject_name, credits, program_id, semester_id, department_id)
SELECT 'CS301', 'Data Structures',        4,
       (SELECT program_id  FROM programs    WHERE program_code   = 'BE'),
       (SELECT semester_id FROM semesters   WHERE semester_number = 3),
       (SELECT department_id FROM departments WHERE department_code = 'CSE')
ON CONFLICT (subject_code) DO NOTHING;

INSERT INTO subjects (subject_code, subject_name, credits, program_id, semester_id, department_id)
SELECT 'CS302', 'Object Oriented Programming', 3,
       (SELECT program_id  FROM programs    WHERE program_code   = 'BE'),
       (SELECT semester_id FROM semesters   WHERE semester_number = 3),
       (SELECT department_id FROM departments WHERE department_code = 'CSE')
ON CONFLICT (subject_code) DO NOTHING;

-- ── 4. Classes (Dr. Sharma teaches both subjects to Sem-3 Sec-A) ──
INSERT INTO classes (semester_id, section_id, subject_id, faculty_id, academic_year)
SELECT
    (SELECT semester_id FROM semesters WHERE semester_number = 3),
    (SELECT section_id  FROM sections  WHERE section_name = 'A'
                                        AND semester_id = (SELECT semester_id FROM semesters WHERE semester_number = 3)
                                        AND department_id = (SELECT department_id FROM departments WHERE department_code = 'CSE')),
    (SELECT subject_id  FROM subjects  WHERE subject_code = 'CS301'),
    (SELECT faculty_id  FROM faculty   WHERE employee_id  = 'EMP001'),
    '2025-26'
ON CONFLICT (semester_id, section_id, subject_id, academic_year) DO NOTHING;

INSERT INTO classes (semester_id, section_id, subject_id, faculty_id, academic_year)
SELECT
    (SELECT semester_id FROM semesters WHERE semester_number = 3),
    (SELECT section_id  FROM sections  WHERE section_name = 'A'
                                        AND semester_id = (SELECT semester_id FROM semesters WHERE semester_number = 3)
                                        AND department_id = (SELECT department_id FROM departments WHERE department_code = 'CSE')),
    (SELECT subject_id  FROM subjects  WHERE subject_code = 'CS302'),
    (SELECT faculty_id  FROM faculty   WHERE employee_id  = 'EMP001'),
    '2025-26'
ON CONFLICT (semester_id, section_id, subject_id, academic_year) DO NOTHING;

-- ── 5. Students (10 in Sem-3 Sec-A CSE) ─────────────────────
INSERT INTO students (library_id, usn, name, email, phone, gender, program_id, department_id, semester_id, section_id, academic_year, status)
SELECT 'LIB001','1RV22CS001','Aarav Kumar',   'aarav@svce.edu',  '9000000001','Male',
       (SELECT program_id FROM programs WHERE program_code='BE'),
       (SELECT department_id FROM departments WHERE department_code='CSE'),
       (SELECT semester_id FROM semesters WHERE semester_number=3),
       (SELECT section_id FROM sections WHERE section_name='A' AND semester_id=(SELECT semester_id FROM semesters WHERE semester_number=3) AND department_id=(SELECT department_id FROM departments WHERE department_code='CSE')),
       '2025-26','Enrolled'
ON CONFLICT (library_id) DO NOTHING;

INSERT INTO students (library_id, usn, name, email, phone, gender, program_id, department_id, semester_id, section_id, academic_year, status)
SELECT 'LIB002','1RV22CS002','Priya Nair',    'priya@svce.edu',  '9000000002','Female',
       (SELECT program_id FROM programs WHERE program_code='BE'),
       (SELECT department_id FROM departments WHERE department_code='CSE'),
       (SELECT semester_id FROM semesters WHERE semester_number=3),
       (SELECT section_id FROM sections WHERE section_name='A' AND semester_id=(SELECT semester_id FROM semesters WHERE semester_number=3) AND department_id=(SELECT department_id FROM departments WHERE department_code='CSE')),
       '2025-26','Enrolled'
ON CONFLICT (library_id) DO NOTHING;

INSERT INTO students (library_id, usn, name, email, phone, gender, program_id, department_id, semester_id, section_id, academic_year, status)
SELECT 'LIB003','1RV22CS003','Rohan Verma',   'rohan@svce.edu',  '9000000003','Male',
       (SELECT program_id FROM programs WHERE program_code='BE'),
       (SELECT department_id FROM departments WHERE department_code='CSE'),
       (SELECT semester_id FROM semesters WHERE semester_number=3),
       (SELECT section_id FROM sections WHERE section_name='A' AND semester_id=(SELECT semester_id FROM semesters WHERE semester_number=3) AND department_id=(SELECT department_id FROM departments WHERE department_code='CSE')),
       '2025-26','Enrolled'
ON CONFLICT (library_id) DO NOTHING;

INSERT INTO students (library_id, usn, name, email, phone, gender, program_id, department_id, semester_id, section_id, academic_year, status)
SELECT 'LIB004','1RV22CS004','Sneha Reddy',   'sneha@svce.edu',  '9000000004','Female',
       (SELECT program_id FROM programs WHERE program_code='BE'),
       (SELECT department_id FROM departments WHERE department_code='CSE'),
       (SELECT semester_id FROM semesters WHERE semester_number=3),
       (SELECT section_id FROM sections WHERE section_name='A' AND semester_id=(SELECT semester_id FROM semesters WHERE semester_number=3) AND department_id=(SELECT department_id FROM departments WHERE department_code='CSE')),
       '2025-26','Enrolled'
ON CONFLICT (library_id) DO NOTHING;

INSERT INTO students (library_id, usn, name, email, phone, gender, program_id, department_id, semester_id, section_id, academic_year, status)
SELECT 'LIB005','1RV22CS005','Vikram Singh',  'vikram@svce.edu', '9000000005','Male',
       (SELECT program_id FROM programs WHERE program_code='BE'),
       (SELECT department_id FROM departments WHERE department_code='CSE'),
       (SELECT semester_id FROM semesters WHERE semester_number=3),
       (SELECT section_id FROM sections WHERE section_name='A' AND semester_id=(SELECT semester_id FROM semesters WHERE semester_number=3) AND department_id=(SELECT department_id FROM departments WHERE department_code='CSE')),
       '2025-26','Enrolled'
ON CONFLICT (library_id) DO NOTHING;

INSERT INTO students (library_id, usn, name, email, phone, gender, program_id, department_id, semester_id, section_id, academic_year, status)
SELECT 'LIB006','1RV22CS006','Anjali Mehta',  'anjali@svce.edu', '9000000006','Female',
       (SELECT program_id FROM programs WHERE program_code='BE'),
       (SELECT department_id FROM departments WHERE department_code='CSE'),
       (SELECT semester_id FROM semesters WHERE semester_number=3),
       (SELECT section_id FROM sections WHERE section_name='A' AND semester_id=(SELECT semester_id FROM semesters WHERE semester_number=3) AND department_id=(SELECT department_id FROM departments WHERE department_code='CSE')),
       '2025-26','Enrolled'
ON CONFLICT (library_id) DO NOTHING;

INSERT INTO students (library_id, usn, name, email, phone, gender, program_id, department_id, semester_id, section_id, academic_year, status)
SELECT 'LIB007','1RV22CS007','Karan Patel',   'karan@svce.edu',  '9000000007','Male',
       (SELECT program_id FROM programs WHERE program_code='BE'),
       (SELECT department_id FROM departments WHERE department_code='CSE'),
       (SELECT semester_id FROM semesters WHERE semester_number=3),
       (SELECT section_id FROM sections WHERE section_name='A' AND semester_id=(SELECT semester_id FROM semesters WHERE semester_number=3) AND department_id=(SELECT department_id FROM departments WHERE department_code='CSE')),
       '2025-26','Enrolled'
ON CONFLICT (library_id) DO NOTHING;

INSERT INTO students (library_id, usn, name, email, phone, gender, program_id, department_id, semester_id, section_id, academic_year, status)
SELECT 'LIB008','1RV22CS008','Divya Rao',     'divya@svce.edu',  '9000000008','Female',
       (SELECT program_id FROM programs WHERE program_code='BE'),
       (SELECT department_id FROM departments WHERE department_code='CSE'),
       (SELECT semester_id FROM semesters WHERE semester_number=3),
       (SELECT section_id FROM sections WHERE section_name='A' AND semester_id=(SELECT semester_id FROM semesters WHERE semester_number=3) AND department_id=(SELECT department_id FROM departments WHERE department_code='CSE')),
       '2025-26','Enrolled'
ON CONFLICT (library_id) DO NOTHING;

INSERT INTO students (library_id, usn, name, email, phone, gender, program_id, department_id, semester_id, section_id, academic_year, status)
SELECT 'LIB009','1RV22CS009','Arjun Iyer',    'arjun@svce.edu',  '9000000009','Male',
       (SELECT program_id FROM programs WHERE program_code='BE'),
       (SELECT department_id FROM departments WHERE department_code='CSE'),
       (SELECT semester_id FROM semesters WHERE semester_number=3),
       (SELECT section_id FROM sections WHERE section_name='A' AND semester_id=(SELECT semester_id FROM semesters WHERE semester_number=3) AND department_id=(SELECT department_id FROM departments WHERE department_code='CSE')),
       '2025-26','Enrolled'
ON CONFLICT (library_id) DO NOTHING;

INSERT INTO students (library_id, usn, name, email, phone, gender, program_id, department_id, semester_id, section_id, academic_year, status)
SELECT 'LIB010','1RV22CS010','Meera Joshi',   'meera@svce.edu',  '9000000010','Female',
       (SELECT program_id FROM programs WHERE program_code='BE'),
       (SELECT department_id FROM departments WHERE department_code='CSE'),
       (SELECT semester_id FROM semesters WHERE semester_number=3),
       (SELECT section_id FROM sections WHERE section_name='A' AND semester_id=(SELECT semester_id FROM semesters WHERE semester_number=3) AND department_id=(SELECT department_id FROM departments WHERE department_code='CSE')),
       '2025-26','Enrolled'
ON CONFLICT (library_id) DO NOTHING;

-- ── 6. Sample assignments ────────────────────────────────────
INSERT INTO assignments (class_id, title, description, due_date, marks, status)
SELECT
    (SELECT c.class_id FROM classes c
     JOIN subjects s ON s.subject_id = c.subject_id
     WHERE s.subject_code = 'CS301' AND c.academic_year = '2025-26' LIMIT 1),
    'Assignment 1: Arrays and Linked Lists',
    'Implement array-based and linked list-based stack. Compare time complexity.',
    CURRENT_DATE + INTERVAL '7 days',
    20,
    'Open'
ON CONFLICT DO NOTHING;

INSERT INTO assignments (class_id, title, description, due_date, marks, status)
SELECT
    (SELECT c.class_id FROM classes c
     JOIN subjects s ON s.subject_id = c.subject_id
     WHERE s.subject_code = 'CS302' AND c.academic_year = '2025-26' LIMIT 1),
    'Assignment 1: OOP Principles',
    'Create a class hierarchy demonstrating inheritance, polymorphism and encapsulation.',
    CURRENT_DATE + INTERVAL '10 days',
    15,
    'Open'
ON CONFLICT DO NOTHING;

-- ── 7. Sample attendance (last 3 days for CS301) ─────────────
DO $$
DECLARE
    v_class_id BIGINT;
    v_student  RECORD;
    v_day      INT;
    v_statuses TEXT[] := ARRAY['Present','Present','Present','Absent','Present',
                                'Present','Present','Absent','Present','Present'];
    v_idx      INT := 1;
BEGIN
    SELECT c.class_id INTO v_class_id
    FROM classes c JOIN subjects s ON s.subject_id = c.subject_id
    WHERE s.subject_code = 'CS301' AND c.academic_year = '2025-26' LIMIT 1;

    FOR v_day IN 1..3 LOOP
        v_idx := 1;
        FOR v_student IN SELECT library_id FROM students ORDER BY library_id LOOP
            INSERT INTO attendance (student_id, class_id, attendance_date, status)
            VALUES (v_student.library_id, v_class_id,
                    CURRENT_DATE - (v_day || ' days')::INTERVAL,
                    v_statuses[v_idx])
            ON CONFLICT (student_id, class_id, attendance_date) DO NOTHING;
            v_idx := v_idx + 1;
        END LOOP;
    END LOOP;
END;
$$;

-- ── 8. Sample IA marks for CS301 ─────────────────────────────
DO $$
DECLARE
    v_class_id BIGINT;
    v_student  RECORD;
    v_ia1s     INT[] := ARRAY[18,15,20,17,19,14,20,16,18,15];
    v_ia2s     INT[] := ARRAY[16,18,19,20,17,15,18,19,16,20];
    v_ia3s     INT[] := ARRAY[17,16,18,19,20,18,17,20,15,19];
    v_idx      INT := 1;
BEGIN
    SELECT c.class_id INTO v_class_id
    FROM classes c JOIN subjects s ON s.subject_id = c.subject_id
    WHERE s.subject_code = 'CS301' AND c.academic_year = '2025-26' LIMIT 1;

    FOR v_student IN SELECT library_id FROM students ORDER BY library_id LOOP
        INSERT INTO ia_marks (student_id, class_id, ia1, ia2, ia3)
        VALUES (v_student.library_id, v_class_id,
                v_ia1s[v_idx], v_ia2s[v_idx], v_ia3s[v_idx])
        ON CONFLICT (student_id, class_id) DO NOTHING;
        v_idx := v_idx + 1;
    END LOOP;
END;
$$;

-- ── Done ─────────────────────────────────────────────────────
SELECT 'Faculty seeded: dr.sharma / Faculty@123' AS result;
SELECT employee_id, username, name, designation FROM faculty;
SELECT COUNT(*) AS students FROM students;
SELECT COUNT(*) AS classes  FROM classes;
