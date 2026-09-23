-- ============================================================
-- SVCE ERP — TEST DATA SEED
-- Run AFTER seed_faculty_users.sql
-- Creates sample students, subjects, classes for testing
-- ============================================================

-- ============================================================
-- 1. SUBJECTS FOR CSE DEPARTMENT
-- ============================================================

INSERT INTO subjects (subject_code, subject_name, credits, program_id, semester_id, department_id)
SELECT 'CS401', 'Data Structures and Algorithms', 4, p.program_id, s.semester_id, d.department_id
FROM programs p, semesters s, departments d
WHERE p.program_code = 'BE' AND s.semester_number = 4 AND d.department_code = 'CSE'
ON CONFLICT (subject_code) DO NOTHING;

INSERT INTO subjects (subject_code, subject_name, credits, program_id, semester_id, department_id)
SELECT 'CS402', 'Database Management Systems', 4, p.program_id, s.semester_id, d.department_id
FROM programs p, semesters s, departments d
WHERE p.program_code = 'BE' AND s.semester_number = 4 AND d.department_code = 'CSE'
ON CONFLICT (subject_code) DO NOTHING;

INSERT INTO subjects (subject_code, subject_name, credits, program_id, semester_id, department_id)
SELECT 'CS403', 'Operating Systems', 4, p.program_id, s.semester_id, d.department_id
FROM programs p, semesters s, departments d
WHERE p.program_code = 'BE' AND s.semester_number = 4 AND d.department_code = 'CSE'
ON CONFLICT (subject_code) DO NOTHING;

INSERT INTO subjects (subject_code, subject_name, credits, program_id, semester_id, department_id)
SELECT 'CS404', 'Computer Networks', 3, p.program_id, s.semester_id, d.department_id
FROM programs p, semesters s, departments d
WHERE p.program_code = 'BE' AND s.semester_number = 4 AND d.department_code = 'CSE'
ON CONFLICT (subject_code) DO NOTHING;

INSERT INTO subjects (subject_code, subject_name, credits, program_id, semester_id, department_id)
SELECT 'CS405', 'Web Technologies', 3, p.program_id, s.semester_id, d.department_id
FROM programs p, semesters s, departments d
WHERE p.program_code = 'BE' AND s.semester_number = 4 AND d.department_code = 'CSE'
ON CONFLICT (subject_code) DO NOTHING;

-- ============================================================
-- 2. SAMPLE STUDENTS FOR SEMESTER 4, SECTION A (CSE)
-- ============================================================

-- Get IDs we'll need
DO $$
DECLARE
    v_program_id BIGINT;
    v_dept_id BIGINT;
    v_sem_id BIGINT;
    v_section_id BIGINT;
BEGIN
    SELECT program_id INTO v_program_id FROM programs WHERE program_code = 'BE' LIMIT 1;
    SELECT department_id INTO v_dept_id FROM departments WHERE department_code = 'CSE';
    SELECT semester_id INTO v_sem_id FROM semesters WHERE semester_number = 4;
    SELECT section_id INTO v_section_id FROM sections 
    WHERE section_name = 'A' AND semester_id = v_sem_id AND department_id = v_dept_id;

    -- Insert 20 sample students
    INSERT INTO students (library_id, usn, name, email, phone, gender, program_id, department_id, semester_id, section_id, academic_year, status)
    VALUES
    ('1CS21CS001', '1CS21CS001', 'Arjun Kumar', 'arjun.kumar@student.svce.edu', '9876543201', 'Male', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS002', '1CS21CS002', 'Priya Singh', 'priya.singh@student.svce.edu', '9876543202', 'Female', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS003', '1CS21CS003', 'Rahul Sharma', 'rahul.sharma@student.svce.edu', '9876543203', 'Male', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS004', '1CS21CS004', 'Sneha Reddy', 'sneha.reddy@student.svce.edu', '9876543204', 'Female', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS005', '1CS21CS005', 'Vikram Patel', 'vikram.patel@student.svce.edu', '9876543205', 'Male', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS006', '1CS21CS006', 'Ananya Iyer', 'ananya.iyer@student.svce.edu', '9876543206', 'Female', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS007', '1CS21CS007', 'Karthik Rao', 'karthik.rao@student.svce.edu', '9876543207', 'Male', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS008', '1CS21CS008', 'Divya Menon', 'divya.menon@student.svce.edu', '9876543208', 'Female', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS009', '1CS21CS009', 'Aditya Nair', 'aditya.nair@student.svce.edu', '9876543209', 'Male', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS010', '1CS21CS010', 'Meera Desai', 'meera.desai@student.svce.edu', '9876543210', 'Female', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS011', '1CS21CS011', 'Rohan Gupta', 'rohan.gupta@student.svce.edu', '9876543211', 'Male', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS012', '1CS21CS012', 'Kavya Krishna', 'kavya.krishna@student.svce.edu', '9876543212', 'Female', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS013', '1CS21CS013', 'Siddharth Joshi', 'siddharth.joshi@student.svce.edu', '9876543213', 'Male', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS014', '1CS21CS014', 'Pooja Bhat', 'pooja.bhat@student.svce.edu', '9876543214', 'Female', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS015', '1CS21CS015', 'Nikhil Hegde', 'nikhil.hegde@student.svce.edu', '9876543215', 'Male', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS016', '1CS21CS016', 'Riya Kapoor', 'riya.kapoor@student.svce.edu', '9876543216', 'Female', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS017', '1CS21CS017', 'Akash Shetty', 'akash.shetty@student.svce.edu', '9876543217', 'Male', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS018', '1CS21CS018', 'Shreya Kulkarni', 'shreya.kulkarni@student.svce.edu', '9876543218', 'Female', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS019', '1CS21CS019', 'Harsh Verma', 'harsh.verma@student.svce.edu', '9876543219', 'Male', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled'),
    ('1CS21CS020', '1CS21CS020', 'Nisha Pandey', 'nisha.pandey@student.svce.edu', '9876543220', 'Female', v_program_id, v_dept_id, v_sem_id, v_section_id, '2021-22', 'Enrolled')
    ON CONFLICT (library_id) DO NOTHING;
END;
$$;

-- ============================================================
-- 3. CLASSES (Faculty teaching subjects to sections)
-- ============================================================

-- Prof. Amit Patel teaching Data Structures to Semester 4 Section A
INSERT INTO classes (subject_id, faculty_id, semester_id, section_id, academic_year)
SELECT 
    sub.subject_id,
    f.faculty_id,
    sem.semester_id,
    sec.section_id,
    '2025-26'
FROM subjects sub
JOIN faculty f ON f.employee_id = 'FAC003'
JOIN sections sec ON sec.section_name = 'A'
JOIN semesters sem ON sem.semester_number = 4
JOIN departments d ON d.department_code = 'CSE'
WHERE sub.subject_code = 'CS401'
  AND sec.semester_id = sem.semester_id
  AND sec.department_id = d.department_id
ON CONFLICT DO NOTHING;

-- Dr. Priya Sharma teaching DBMS to Semester 4 Section A
INSERT INTO classes (subject_id, faculty_id, semester_id, section_id, academic_year)
SELECT 
    sub.subject_id,
    f.faculty_id,
    sem.semester_id,
    sec.section_id,
    '2025-26'
FROM subjects sub
JOIN faculty f ON f.employee_id = 'FAC002'
JOIN sections sec ON sec.section_name = 'A'
JOIN semesters sem ON sem.semester_number = 4
JOIN departments d ON d.department_code = 'CSE'
WHERE sub.subject_code = 'CS402'
  AND sec.semester_id = sem.semester_id
  AND sec.department_id = d.department_id
ON CONFLICT DO NOTHING;

-- Dr. Rajesh Kumar (HOD) teaching Operating Systems to Semester 4 Section A
INSERT INTO classes (subject_id, faculty_id, semester_id, section_id, academic_year)
SELECT 
    sub.subject_id,
    f.faculty_id,
    sem.semester_id,
    sec.section_id,
    '2025-26'
FROM subjects sub
JOIN faculty f ON f.employee_id = 'FAC001'
JOIN sections sec ON sec.section_name = 'A'
JOIN semesters sem ON sem.semester_number = 4
JOIN departments d ON d.department_code = 'CSE'
WHERE sub.subject_code = 'CS403'
  AND sec.semester_id = sem.semester_id
  AND sec.department_id = d.department_id
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. SAMPLE ASSIGNMENTS
-- ============================================================

-- Assignment 1: Data Structures
INSERT INTO assignments (class_id, title, description, due_date, marks, status)
SELECT 
    c.class_id,
    'Binary Search Tree Implementation',
    'Implement BST with insert, delete, and traversal operations',
    CURRENT_DATE + INTERVAL '7 days',
    20,
    'Open'
FROM classes c
JOIN subjects sub ON sub.subject_id = c.subject_id
WHERE sub.subject_code = 'CS401'
  AND c.academic_year = '2025-26'
ON CONFLICT DO NOTHING;

-- Assignment 2: DBMS
INSERT INTO assignments (class_id, title, description, due_date, marks, status)
SELECT 
    c.class_id,
    'Database Normalization Exercise',
    'Normalize the given schema up to 3NF',
    CURRENT_DATE + INTERVAL '5 days',
    15,
    'Open'
FROM classes c
JOIN subjects sub ON sub.subject_id = c.subject_id
WHERE sub.subject_code = 'CS402'
  AND c.academic_year = '2025-26'
ON CONFLICT DO NOTHING;

-- Assignment 3: OS (Closed)
INSERT INTO assignments (class_id, title, description, due_date, marks, status)
SELECT 
    c.class_id,
    'Process Scheduling Algorithms',
    'Implement FCFS, SJF, and Round Robin',
    CURRENT_DATE - INTERVAL '2 days',
    25,
    'Closed'
FROM classes c
JOIN subjects sub ON sub.subject_id = c.subject_id
WHERE sub.subject_code = 'CS403'
  AND c.academic_year = '2025-26'
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. SAMPLE ATTENDANCE RECORDS
-- ============================================================

-- Attendance for last 5 days for Data Structures class
DO $$
DECLARE
    v_class_id BIGINT;
    v_student RECORD;
    v_date DATE;
    v_day INT;
BEGIN
    -- Get class_id for CS401
    SELECT c.class_id INTO v_class_id
    FROM classes c
    JOIN subjects sub ON sub.subject_id = c.subject_id
    WHERE sub.subject_code = 'CS401' AND c.academic_year = '2025-26'
    LIMIT 1;

    IF v_class_id IS NULL THEN
        RETURN;
    END IF;

    -- For each of the last 5 days
    FOR v_day IN 0..4 LOOP
        v_date := CURRENT_DATE - v_day;
        
        -- For each student, randomly mark Present (85% probability) or Absent
        FOR v_student IN 
            SELECT library_id FROM students 
            WHERE usn LIKE '1CS21CS%' 
            ORDER BY library_id
        LOOP
            INSERT INTO attendance (student_id, class_id, attendance_date, status)
            VALUES (
                v_student.library_id,
                v_class_id,
                v_date,
                CASE WHEN RANDOM() < 0.85 THEN 'Present' ELSE 'Absent' END
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$;

-- ============================================================
-- 6. SAMPLE IA MARKS
-- ============================================================

-- IA Marks for Data Structures class
DO $$
DECLARE
    v_class_id BIGINT;
    v_student RECORD;
BEGIN
    -- Get class_id for CS401
    SELECT c.class_id INTO v_class_id
    FROM classes c
    JOIN subjects sub ON sub.subject_id = c.subject_id
    WHERE sub.subject_code = 'CS401' AND c.academic_year = '2025-26'
    LIMIT 1;

    IF v_class_id IS NULL THEN
        RETURN;
    END IF;

    -- For each student, insert random IA marks
    FOR v_student IN 
        SELECT library_id FROM students 
        WHERE usn LIKE '1CS21CS%' 
        ORDER BY library_id
    LOOP
        INSERT INTO ia_marks (student_id, class_id, ia1, ia2, ia3)
        VALUES (
            v_student.library_id,
            v_class_id,
            12 + FLOOR(RANDOM() * 8)::INT,  -- IA1: 12-19
            13 + FLOOR(RANDOM() * 7)::INT,   -- IA2: 13-19
            NULL                              -- IA3: not yet conducted
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- SELECT COUNT(*) as student_count FROM students;
-- SELECT COUNT(*) as subject_count FROM subjects WHERE department_id = (SELECT department_id FROM departments WHERE department_code = 'CSE');
-- SELECT COUNT(*) as class_count FROM classes;
-- SELECT COUNT(*) as assignment_count FROM assignments;
-- SELECT COUNT(*) as attendance_count FROM attendance;
-- SELECT COUNT(*) as ia_marks_count FROM ia_marks;

-- SELECT 
--     s.subject_name,
--     f.name as faculty_name,
--     sec.section_name,
--     c.academic_year
-- FROM classes c
-- JOIN subjects s ON s.subject_id = c.subject_id
-- JOIN faculty f ON f.faculty_id = c.faculty_id
-- JOIN sections sec ON sec.section_id = c.section_id;

