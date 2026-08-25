/**
 * seed.js — Populates the database with consistent dummy data.
 *
 * Students : 1VE23CS001 – 1VE23CS010  (3rd Semester, Section A)
 * Attendance: last 7 days × 5 subjects — realistic mix of Present/Absent
 * IA Marks  : ia1, ia2, ia3 for each student (out of 20)
 * Assignments: 5 sample assignments for Semester 3
 *
 * Run: node backend/scripts/seed.js
 * Safe to run multiple times — uses UPSERT / clear + reinsert.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
});

// ── 10 dummy students ──────────────────────────────────────────────
const STUDENTS = [
  { usn: '1VE23CS001', name: 'Aarav Sharma',    email: '1ve23cs001@college.edu', phone: '9876543001', semester: 3, section: 'A' },
  { usn: '1VE23CS002', name: 'Bhavya Reddy',    email: '1ve23cs002@college.edu', phone: '9876543002', semester: 3, section: 'A' },
  { usn: '1VE23CS003', name: 'Charan Kumar',    email: '1ve23cs003@college.edu', phone: '9876543003', semester: 3, section: 'A' },
  { usn: '1VE23CS004', name: 'Deepika Nair',    email: '1ve23cs004@college.edu', phone: '9876543004', semester: 3, section: 'A' },
  { usn: '1VE23CS005', name: 'Eshan Mehta',     email: '1ve23cs005@college.edu', phone: '9876543005', semester: 3, section: 'A' },
  { usn: '1VE23CS006', name: 'Fathima Zahra',   email: '1ve23cs006@college.edu', phone: '9876543006', semester: 3, section: 'A' },
  { usn: '1VE23CS007', name: 'Ganesh Prasad',   email: '1ve23cs007@college.edu', phone: '9876543007', semester: 3, section: 'A' },
  { usn: '1VE23CS008', name: 'Harini Suresh',   email: '1ve23cs008@college.edu', phone: '9876543008', semester: 3, section: 'A' },
  { usn: '1VE23CS009', name: 'Ishaan Verma',    email: '1ve23cs009@college.edu', phone: '9876543009', semester: 3, section: 'A' },
  { usn: '1VE23CS010', name: 'Jyothi Prakash',  email: '1ve23cs010@college.edu', phone: '9876543010', semester: 3, section: 'A' },
];

// IA marks (out of 20) — realistic spread
const IA_MARKS = [
  { ia1: 18, ia2: 17, ia3: 19 },
  { ia1: 15, ia2: 16, ia3: 14 },
  { ia1: 20, ia2: 19, ia3: 18 },
  { ia1: 12, ia2: 14, ia3: 13 },
  { ia1: 17, ia2: 18, ia3: 16 },
  { ia1: 19, ia2: 20, ia3: 18 },
  { ia1: 11, ia2: 13, ia3: 12 },
  { ia1: 16, ia2: 15, ia3: 17 },
  { ia1: 14, ia2: 16, ia3: 15 },
  { ia1: 20, ia2: 20, ia3: 19 },
];

const SUBJECTS = [
  'Data Structures',
  'DBMS',
  'Computer Networks',
  'Operating Systems',
  'Java Programming',
];

// Attendance per student per day: 1=Present, 0=Absent
// Pattern: mostly Present with realistic absences
const ATT_PATTERN = [
  [1, 1, 1, 1, 1, 1, 1], // student 0 — 100%
  [1, 0, 1, 1, 1, 0, 1], // student 1 — 71%
  [1, 1, 1, 1, 1, 1, 0], // student 2 — 86%
  [1, 1, 0, 1, 0, 1, 1], // student 3 — 71%
  [1, 1, 1, 0, 1, 1, 1], // student 4 — 86%
  [0, 1, 1, 1, 1, 1, 1], // student 5 — 86%
  [1, 0, 0, 1, 1, 1, 1], // student 6 — 71%
  [1, 1, 1, 1, 1, 1, 1], // student 7 — 100%
  [1, 1, 0, 0, 1, 1, 1], // student 8 — 71%
  [1, 1, 1, 1, 0, 1, 1], // student 9 — 86%
];

const ASSIGNMENTS = [
  { title: 'Data Structures Lab Report',    subject: 'Data Structures',    semester: '3', due_date: '2026-08-10', marks: 20, status: 'Open'   },
  { title: 'ER Diagram Assignment',         subject: 'DBMS',               semester: '3', due_date: '2026-08-15', marks: 15, status: 'Open'   },
  { title: 'Network Topology Project',      subject: 'Computer Networks',  semester: '3', due_date: '2026-08-20', marks: 25, status: 'Open'   },
  { title: 'Process Scheduling Report',     subject: 'Operating Systems',  semester: '3', due_date: '2026-07-30', marks: 20, status: 'Closed' },
  { title: 'Java OOP Mini Project',         subject: 'Java Programming',   semester: '3', due_date: '2026-08-25', marks: 30, status: 'Open'   },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Clear existing data ────────────────────────────────────
    await client.query('DELETE FROM attendance');
    await client.query('DELETE FROM ia_marks');
    await client.query('DELETE FROM assignments');
    await client.query('DELETE FROM students');
    console.log('Cleared existing data');

    // ── 2. Insert students ────────────────────────────────────────
    const studentIds = [];
    for (const s of STUDENTS) {
      const r = await client.query(
        `INSERT INTO students (usn, name, email, phone, semester, section, status)
         VALUES ($1,$2,$3,$4,$5,$6,'Active') RETURNING id`,
        [s.usn, s.name, s.email, s.phone, s.semester, s.section]
      );
      studentIds.push(r.rows[0].id);
    }
    console.log(`Inserted ${studentIds.length} students`);

    // ── 3. Insert IA marks ────────────────────────────────────────
    for (let i = 0; i < STUDENTS.length; i++) {
      const m = IA_MARKS[i];
      await client.query(
        `INSERT INTO ia_marks (usn, name, subject, ia1, ia2, ia3)
         VALUES ($1,$2,'General',$3,$4,$5)`,
        [STUDENTS[i].usn, STUDENTS[i].name, m.ia1, m.ia2, m.ia3]
      );
    }
    console.log('Inserted IA marks');

    // ── 4. Insert attendance (last 7 days × 5 subjects) ──────────
    const today = new Date();
    let attCount = 0;
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const d = new Date(today);
      d.setDate(d.getDate() - dayOffset);
      const dateStr = d.toISOString().split('T')[0];

      for (const subject of SUBJECTS) {
        for (let si = 0; si < studentIds.length; si++) {
          const dayIndex = 6 - dayOffset; // 0-6
          const isPresent = ATT_PATTERN[si][dayIndex] === 1;
          await client.query(
            `INSERT INTO attendance (student_id, subject, attendance_date, status)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (student_id, subject, attendance_date) DO UPDATE SET status=EXCLUDED.status`,
            [studentIds[si], subject, dateStr, isPresent ? 'Present' : 'Absent']
          );
          attCount++;
        }
      }
    }
    console.log(`Inserted ${attCount} attendance records`);

    // ── 5. Insert assignments ─────────────────────────────────────
    for (const a of ASSIGNMENTS) {
      await client.query(
        `INSERT INTO assignments (title, subject, semester, due_date, marks, status)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [a.title, a.subject, a.semester, a.due_date, a.marks, a.status]
      );
    }
    console.log(`Inserted ${ASSIGNMENTS.length} assignments`);

    await client.query('COMMIT');
    console.log('\n✅ Seed complete!');

    // Print summary
    const s = await pool.query('SELECT usn, name, semester, section FROM students ORDER BY usn');
    console.log('\nStudents seeded:');
    s.rows.forEach(r => console.log(`  ${r.usn} | ${r.name} | Sem ${r.semester} | Sec ${r.section}`));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
