/**
 * migrate_faculty_auth.js
 *
 * Creates the `faculty` table and seeds the default faculty account.
 * Safe to run multiple times — uses IF NOT EXISTS and ON CONFLICT DO NOTHING.
 *
 * Run: node backend/scripts/migrate_faculty_auth.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool }    = require('pg');
const bcrypt      = require('bcryptjs');

const pool = new Pool({
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
});

async function run() {
  const client = await pool.connect();
  try {
    // ── 1. Create faculty table ───────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS faculty (
        id             SERIAL       PRIMARY KEY,
        employee_id    VARCHAR(50)  NOT NULL UNIQUE,
        name           VARCHAR(150) NOT NULL,
        email          VARCHAR(150) NOT NULL UNIQUE,
        phone          VARCHAR(20),
        designation    VARCHAR(100) NOT NULL DEFAULT 'Assistant Professor',
        department     VARCHAR(100) NOT NULL DEFAULT 'Computer Science & Engineering',
        experience     VARCHAR(50)  DEFAULT '0 Years',
        password_hash  VARCHAR(255) NOT NULL,
        role           VARCHAR(30)  NOT NULL DEFAULT 'faculty',
        status         VARCHAR(20)  NOT NULL DEFAULT 'active',
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅  faculty table OK');

    // ── 2. Seed default faculty account ──────────────────────────
    const defaultPassword = process.env.DEFAULT_FACULTY_PASSWORD || 'Faculty@2026';
    const hash            = await bcrypt.hash(defaultPassword, 12);

    const res = await client.query(`
      INSERT INTO faculty
        (employee_id, name, email, phone, designation, department, experience, password_hash, role)
      VALUES
        ('BCS-LKS', 'Mr. Lokesh M', 'lokesh@svce.edu', '+91 9876543210',
         'Assistant Professor', 'Computer Science & Engineering', '8 Years', $1, 'faculty')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email;
    `, [hash]);

    if (res.rows.length > 0) {
      console.log(`✅  Default faculty seeded: ${res.rows[0].email}`);
      console.log(`    Initial password is controlled by DEFAULT_FACULTY_PASSWORD env var.`);
    } else {
      console.log('ℹ️   Default faculty already exists — skipped.');
    }

    // ── 3. Print accounts ─────────────────────────────────────────
    const accounts = await pool.query(
      'SELECT id, employee_id, name, email, role FROM faculty ORDER BY id'
    );
    console.log('\nFaculty accounts:');
    accounts.rows.forEach(r =>
      console.log(`  [${r.id}] ${r.employee_id} | ${r.name} | ${r.email} | ${r.role}`)
    );

  } catch (err) {
    console.error('❌  Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

run();
