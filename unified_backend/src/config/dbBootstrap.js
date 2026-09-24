const fs = require('fs');
const path = require('path');
const { query, getClient } = require('./db');
const { logger } = require('../utils/logger');

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDollarQuote = false;
  let dollarTag = '';
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1];

    if (inSingleQuote) {
      current += char;
      if (char === "'" && next === "'") {
        current += next;
        i += 2;
        continue;
      }
      if (char === "'") {
        inSingleQuote = false;
      }
      i += 1;
      continue;
    }

    if (inDollarQuote) {
      current += char;
      if (char === '$') {
        const rest = sql.slice(i, i + dollarTag.length + 1);
        if (rest === `$${dollarTag}$` || rest === `$${dollarTag}`) {
          current += sql.slice(i + 1, i + dollarTag.length + 1);
          i += dollarTag.length + 1;
          inDollarQuote = false;
          dollarTag = '';
          continue;
        }
      }
      i += 1;
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      current += char;
      i += 1;
      continue;
    }

    if (char === '$') {
      const match = sql.slice(i).match(/^\$(\w*)\$/);
      if (match) {
        const tag = match[1];
        inDollarQuote = true;
        dollarTag = tag;
        current += sql.slice(i, i + tag.length + 2);
        i += tag.length + 2;
        continue;
      }
    }

    if (char === '-' && next === '-') {
      const endOfLine = sql.indexOf('\n', i);
      const comment = endOfLine === -1 ? sql.slice(i) : sql.slice(i, endOfLine);
      current += comment;
      i += comment.length;
      continue;
    }

    if (char === '/' && next === '*') {
      const endComment = sql.indexOf('*/', i + 2);
      if (endComment !== -1) {
        current += sql.slice(i, endComment + 2);
        i = endComment + 2;
        continue;
      }
    }

    if (char === ';') {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
      i += 1;
      continue;
    }

    current += char;
    i += 1;
  }

  const trailing = current.trim();
  if (trailing) {
    statements.push(trailing);
  }

  return statements;
}

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, '..', '..', '..', 'database', 'unified_schema.sql');
  const seedPath = path.join(__dirname, '..', '..', '..', 'database', 'unified_seed_empty.sql');
  const migrationsDir = path.join(__dirname, '..', '..', 'database', 'migrations');

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const seedSql = fs.readFileSync(seedPath, 'utf8');

  const client = await getClient();

  try {
    await client.query('BEGIN');

    for (const statement of splitSqlStatements(schemaSql)) {
      await client.query(statement);
    }

    // Migrations live outside unified_schema.sql but, like it, are written
    // to be safe to re-run every startup (CREATE TABLE/ADD COLUMN/CREATE
    // INDEX ... IF NOT EXISTS) — running them here means a fresh clone ends
    // up with the same schema as a longer-lived dev database without any
    // manual `psql -f ...` step.
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();
      for (const file of migrationFiles) {
        const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        for (const statement of splitSqlStatements(migrationSql)) {
          await client.query(statement);
        }
      }
    }

    for (const statement of splitSqlStatements(seedSql)) {
      await client.query(statement);
    }

    await client.query(
      `INSERT INTO users (username, email, password_hash, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO NOTHING`,
      ['admin', 'admin@svce.edu', '$2b$10$sTEWPHN82n8UpjoMfg4XfOy6GMOdNOBOmfdb1SoNpuKz4/E58kemO', 'active'],
    );

    await client.query(
      `UPDATE users
       SET role_id = (SELECT role_id FROM roles WHERE role_name = 'admin')
       WHERE username = $1 AND role_id IS NULL`,
      ['admin'],
    );

    await client.query(
      `INSERT INTO settings (user_id, theme, language, notification_enabled)
       SELECT user_id, 'light', 'en', TRUE FROM users WHERE username = $1
       ON CONFLICT (user_id) DO NOTHING`,
      ['admin'],
    );

    await client.query('COMMIT');
    logger.info('Database bootstrap completed successfully');
    return { ready: true };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    logger.error('Database bootstrap failed', error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { initializeDatabase };
