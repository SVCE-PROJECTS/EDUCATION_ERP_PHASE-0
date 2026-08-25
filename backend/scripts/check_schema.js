require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER, password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
});
async function run() {
  // Check counsellor column
  const c = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='students' AND column_name='counsellor'"
  );
  console.log('counsellor column:', c.rows.length ? 'EXISTS' : 'MISSING');

  // Add if missing
  if (!c.rows.length) {
    await pool.query("ALTER TABLE students ADD COLUMN counsellor VARCHAR(255) DEFAULT NULL");
    console.log('Added counsellor column');
  }

  // Check achievements table
  const a = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='achievements'"
  );
  console.log('achievements table:', a.rows.length ? 'EXISTS' : 'MISSING');

  if (!a.rows.length) {
    await pool.query(`
      CREATE TABLE achievements (
        id           SERIAL PRIMARY KEY,
        student_id   INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        usn          VARCHAR(50) NOT NULL,
        category     VARCHAR(50) NOT NULL DEFAULT 'Certification',
        title        VARCHAR(255) NOT NULL,
        issuer       VARCHAR(255),
        date_achieved DATE,
        description  TEXT,
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created achievements table');
  }

  // List all tables
  const t = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
  console.log('All tables:', t.rows.map(r => r.tablename).join(', '));
  pool.end();
}
run().catch(e => { console.error(e.message); pool.end(); });
