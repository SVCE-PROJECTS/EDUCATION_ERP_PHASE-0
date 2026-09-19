-- ============================================================
-- SVCE ERP — FACULTY SEED DATA
-- Run AFTER unified_seed_empty.sql
-- ============================================================
-- This file creates sample faculty users for testing all portals
-- Default password for ALL faculty: Faculty@123
-- Password hash (bcryptjs, 10 rounds): $2b$10$HyxNhM67DG61.lWDedkMU.egOW6AfgAEHRW9nSQ8kMQ3WnySiFDs.
-- ============================================================

-- ============================================================
-- FACULTY USERS (with login credentials)
-- ============================================================

-- CSE Department Faculty
INSERT INTO faculty (
    employee_id, name, email, phone, designation, qualification, 
    specialization, experience_years, department_id, 
    username, password_hash, coordinator_roles, is_hod, status
)
SELECT 
    'FAC001', 
    'Dr. Rajesh Kumar', 
    'rajesh.kumar@svce.edu', 
    '9876543210', 
    'Professor & HOD', 
    'Ph.D in Computer Science',
    'Artificial Intelligence, Machine Learning',
    15,
    d.department_id,
    'rajesh.kumar',
    '$2b$10$HyxNhM67DG61.lWDedkMU.egOW6AfgAEHRW9nSQ8kMQ3WnySiFDs.', -- Password: Faculty@123
    'timetable_coordinator',
    TRUE, -- is_hod
    'ACTIVE'
FROM departments d WHERE d.department_code = 'CSE'
ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO faculty (
    employee_id, name, email, phone, designation, qualification, 
    specialization, experience_years, department_id, 
    username, password_hash, coordinator_roles, is_hod, status
)
SELECT 
    'FAC002', 
    'Dr. Priya Sharma', 
    'priya.sharma@svce.edu', 
    '9876543211', 
    'Associate Professor', 
    'Ph.D in Computer Science',
    'Data Science, Big Data Analytics',
    12,
    d.department_id,
    'priya.sharma',
    '$2b$10$HyxNhM67DG61.lWDedkMU.egOW6AfgAEHRW9nSQ8kMQ3WnySiFDs.', -- Password: Faculty@123
    'exam_coordinator',
    FALSE,
    'ACTIVE'
FROM departments d WHERE d.department_code = 'CSE'
ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO faculty (
    employee_id, name, email, phone, designation, qualification, 
    specialization, experience_years, department_id, 
    username, password_hash, coordinator_roles, is_hod, status
)
SELECT 
    'FAC003', 
    'Prof. Amit Patel', 
    'amit.patel@svce.edu', 
    '9876543212', 
    'Assistant Professor', 
    'M.Tech in Computer Science',
    'Software Engineering, Web Technologies',
    8,
    d.department_id,
    'amit.patel',
    '$2b$10$HyxNhM67DG61.lWDedkMU.egOW6AfgAEHRW9nSQ8kMQ3WnySiFDs.', -- Password: Faculty@123
    NULL,
    FALSE,
    'ACTIVE'
FROM departments d WHERE d.department_code = 'CSE'
ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO faculty (
    employee_id, name, email, phone, designation, qualification, 
    specialization, experience_years, department_id, 
    username, password_hash, coordinator_roles, is_hod, status
)
SELECT 
    'FAC004', 
    'Dr. Sunita Reddy', 
    'sunita.reddy@svce.edu', 
    '9876543213', 
    'Associate Professor', 
    'Ph.D in Information Technology',
    'Cyber Security, Network Security',
    10,
    d.department_id,
    'sunita.reddy',
    '$2b$10$HyxNhM67DG61.lWDedkMU.egOW6AfgAEHRW9nSQ8kMQ3WnySiFDs.', -- Password: Faculty@123
    'placement_coordinator',
    FALSE,
    'ACTIVE'
FROM departments d WHERE d.department_code = 'CSE'
ON CONFLICT (employee_id) DO NOTHING;

-- CSE-AI Department Faculty (HOD)
INSERT INTO faculty (
    employee_id, name, email, phone, designation, qualification, 
    specialization, experience_years, department_id, 
    username, password_hash, coordinator_roles, is_hod, status
)
SELECT 
    'FAC005', 
    'Dr. Arvind Menon', 
    'arvind.menon@svce.edu', 
    '9876543214', 
    'Professor & HOD', 
    'Ph.D in Artificial Intelligence',
    'Deep Learning, Neural Networks',
    14,
    d.department_id,
    'arvind.menon',
    '$2b$10$HyxNhM67DG61.lWDedkMU.egOW6AfgAEHRW9nSQ8kMQ3WnySiFDs.', -- Password: Faculty@123
    NULL,
    TRUE, -- is_hod
    'ACTIVE'
FROM departments d WHERE d.department_code = 'CSE-AI'
ON CONFLICT (employee_id) DO NOTHING;

-- ECE Department Faculty (HOD)
INSERT INTO faculty (
    employee_id, name, email, phone, designation, qualification, 
    specialization, experience_years, department_id, 
    username, password_hash, coordinator_roles, is_hod, status
)
SELECT 
    'FAC006', 
    'Dr. Lakshmi Iyer', 
    'lakshmi.iyer@svce.edu', 
    '9876543215', 
    'Professor & HOD', 
    'Ph.D in Electronics',
    'VLSI Design, Embedded Systems',
    16,
    d.department_id,
    'lakshmi.iyer',
    '$2b$10$HyxNhM67DG61.lWDedkMU.egOW6AfgAEHRW9nSQ8kMQ3WnySiFDs.', -- Password: Faculty@123
    'timetable_coordinator',
    TRUE, -- is_hod
    'ACTIVE'
FROM departments d WHERE d.department_code = 'ECE'
ON CONFLICT (employee_id) DO NOTHING;

-- ISE Department Faculty (HOD)
INSERT INTO faculty (
    employee_id, name, email, phone, designation, qualification, 
    specialization, experience_years, department_id, 
    username, password_hash, coordinator_roles, is_hod, status
)
SELECT 
    'FAC007', 
    'Dr. Venkat Rao', 
    'venkat.rao@svce.edu', 
    '9876543216', 
    'Professor & HOD', 
    'Ph.D in Information Science',
    'Database Systems, Cloud Computing',
    13,
    d.department_id,
    'venkat.rao',
    '$2b$10$HyxNhM67DG61.lWDedkMU.egOW6AfgAEHRW9nSQ8kMQ3WnySiFDs.', -- Password: Faculty@123
    NULL,
    TRUE, -- is_hod
    'ACTIVE'
FROM departments d WHERE d.department_code = 'ISE'
ON CONFLICT (employee_id) DO NOTHING;

-- Additional CSE Faculty (non-HOD)
INSERT INTO faculty (
    employee_id, name, email, phone, designation, qualification, 
    specialization, experience_years, department_id, 
    username, password_hash, coordinator_roles, is_hod, status
)
SELECT 
    'FAC008', 
    'Prof. Meera Singh', 
    'meera.singh@svce.edu', 
    '9876543217', 
    'Assistant Professor', 
    'M.Tech in Computer Science',
    'Mobile Computing, IoT',
    6,
    d.department_id,
    'meera.singh',
    '$2b$10$HyxNhM67DG61.lWDedkMU.egOW6AfgAEHRW9nSQ8kMQ3WnySiFDs.', -- Password: Faculty@123
    'cultural_coordinator',
    FALSE,
    'ACTIVE'
FROM departments d WHERE d.department_code = 'CSE'
ON CONFLICT (employee_id) DO NOTHING;

-- ============================================================
-- UPDATE HOD REFERENCES IN DEPARTMENTS TABLE
-- ============================================================

UPDATE departments d
SET hod_faculty_id = f.faculty_id
FROM faculty f
WHERE f.employee_id = 'FAC001' 
  AND d.department_code = 'CSE'
  AND d.hod_faculty_id IS NULL;

UPDATE departments d
SET hod_faculty_id = f.faculty_id
FROM faculty f
WHERE f.employee_id = 'FAC005' 
  AND d.department_code = 'CSE-AI'
  AND d.hod_faculty_id IS NULL;

UPDATE departments d
SET hod_faculty_id = f.faculty_id
FROM faculty f
WHERE f.employee_id = 'FAC006' 
  AND d.department_code = 'ECE'
  AND d.hod_faculty_id IS NULL;

UPDATE departments d
SET hod_faculty_id = f.faculty_id
FROM faculty f
WHERE f.employee_id = 'FAC007' 
  AND d.department_code = 'ISE'
  AND d.hod_faculty_id IS NULL;

-- ============================================================
-- VERIFICATION QUERY (run this to check faculty were created)
-- ============================================================
-- SELECT f.employee_id, f.name, f.username, f.designation, 
--        f.is_hod, d.department_code, f.status
-- FROM faculty f
-- JOIN departments d ON d.department_id = f.department_id
-- ORDER BY d.department_code, f.is_hod DESC, f.name;

-- ============================================================
-- LOGIN CREDENTIALS SUMMARY:
-- ============================================================
-- Admin Portal:
--   Username: admin
--   Password: Admin@123
--
-- Faculty Portal (CSE):
--   Username: rajesh.kumar (HOD)
--   Username: priya.sharma
--   Username: amit.patel
--   Username: sunita.reddy
--   Username: meera.singh
--   Department Code: CSE
--   Password: Faculty@123
--
-- HOD Portal:
--   Username: rajesh.kumar (CSE HOD)
--   Username: arvind.menon (CSE-AI HOD)
--   Username: lakshmi.iyer (ECE HOD)
--   Username: venkat.rao (ISE HOD)
--   Department Code: respective department code
--   Password: Faculty@123
-- ============================================================
