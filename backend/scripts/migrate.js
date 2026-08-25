require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
});

async function migrate() {
  try {
    // assignments table
    await pool.query(`CREATE TABLE IF NOT EXISTS assignments (
      id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, subject VARCHAR(255) NOT NULL,
      semester VARCHAR(10), due_date DATE, marks INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'Open', created_at TIMESTAMP DEFAULT NOW()
    );`);

    // ia_marks table
    await pool.query(`CREATE TABLE IF NOT EXISTS ia_marks (
      id SERIAL PRIMARY KEY, usn VARCHAR(50) NOT NULL, name VARCHAR(255) NOT NULL,
      subject VARCHAR(255) DEFAULT 'General', ia1 INTEGER DEFAULT 0,
      ia2 INTEGER DEFAULT 0, ia3 INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW()
    );`);

    // Attendance unique constraint
    const cc = await pool.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name='attendance' AND constraint_type='UNIQUE'
        AND constraint_name='attendance_unique_session'
    `);
    if (cc.rows.length === 0) {
      await pool.query(`
        ALTER TABLE attendance ADD CONSTRAINT attendance_unique_session
        UNIQUE (student_id, subject, attendance_date);
      `);
      console.log('attendance unique constraint added');
    }

    // counsellor column on students
    const colCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='students' AND column_name='counsellor'
    `);
    if (colCheck.rows.length === 0) {
      await pool.query(`ALTER TABLE students ADD COLUMN counsellor VARCHAR(255) DEFAULT NULL;`);
      console.log('students.counsellor column added');
    }

    // achievements table
    await pool.query(`CREATE TABLE IF NOT EXISTS achievements (
      id           SERIAL PRIMARY KEY,
      student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      usn          VARCHAR(50) NOT NULL,
      category     VARCHAR(50)  NOT NULL DEFAULT 'Certification',
      title        VARCHAR(255) NOT NULL,
      issuer       VARCHAR(255),
      date_achieved DATE,
      description  TEXT,
      created_at   TIMESTAMP DEFAULT NOW()
    );`);
    console.log('achievements table OK');

    const tables = await pool.query(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    );
    console.log('Tables:', tables.rows.map(r => r.tablename).join(', '));
    pool.end();
  } catch (err) {
    console.error('Migration error:', err.message);
    pool.end(); process.exit(1);
  }
}
migrate();
