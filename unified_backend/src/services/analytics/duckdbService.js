/**
 * DuckDB Service
 *
 * Owns the single DuckDB instance for the entire backend process.
 * Exposes only narrow, typed functions — controllers never hold a raw
 * connection object and cannot submit arbitrary SQL from the client.
 *
 * Confirmed API for @duckdb/node-api@1.4.1-r.5:
 *   DuckDBInstance.create(path)          → db
 *   db.connect()                         → conn
 *   conn.runAndReadAll(sql, params[])    → result  (SELECT)
 *   result.getRowObjects()               → plain object[]
 *   conn.run(sql, params[])              → result  (DML, returns rowCount)
 *   conn.createPrepared(sql)             → stmt
 *   stmt.bindVarchar(pos, val) / bindInteger / bindBigInt / bindDouble / bindNull
 *   stmt.runAndReadAll()                 → result
 *   conn.createAppender(table)           → appender
 *   appender.append*(val); appender.endRow(); appender.flushSync(); appender.closeSync()
 *   conn.closeSync(); db.closeSync()
 *
 * Lifecycle:
 *   initialize()  — called once from server.js; safe to re-call (idempotent)
 *   query(sql, params) — parameterized SELECT; rejects if not initialized
 *   runSql(sql, params) — parameterized DML; rejects if not initialized
 *   bulkAppend(table, columns, typedRows) — high-throughput insert
 *   close()       — called during graceful shutdown
 *
 * If DuckDB is disabled or initialization fails, all query() calls throw
 * DuckdbUnavailableError so callers can return a controlled 503 response.
 */

'use strict';

const path   = require('path');
const fs     = require('fs');
const { logger }         = require('../../utils/logger');
const analyticsConfig    = require('../../config/analytics');

// ── Error type exposed to callers ─────────────────────────────────────────────

class DuckdbUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DuckdbUnavailableError';
    this.statusCode = 503;
  }
}

// ── Module-level state ────────────────────────────────────────────────────────

let _db        = null;    // DuckDBInstance
let _conn      = null;    // DuckDBConnection
let _initState = 'none';  // 'none' | 'initializing' | 'ready' | 'failed' | 'disabled'
let _initError = null;

// ── Initialization ────────────────────────────────────────────────────────────

const initialize = async () => {
  if (_initState === 'ready')        return true;
  if (_initState === 'initializing') return false;
  if (_initState === 'disabled')     return false;

  if (!analyticsConfig.enabled) {
    _initState = 'disabled';
    logger.info('[DuckDB] Analytics disabled via DUCKDB_ENABLED=false');
    return false;
  }

  _initState = 'initializing';
  logger.info('[DuckDB] Initializing analytics database...');

  try {
    // Ensure data directory exists
    const dir = path.dirname(analyticsConfig.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`[DuckDB] Created data directory: ${dir}`);
    }

    const { DuckDBInstance } = require('@duckdb/node-api');
    _db   = await DuckDBInstance.create(analyticsConfig.dbPath);
    _conn = await _db.connect();

    // Create analytical schema
    await _conn.run(`
      CREATE TABLE IF NOT EXISTS attendance_fact (
        attendance_id   BIGINT PRIMARY KEY,
        student_id      VARCHAR,
        class_id        BIGINT,
        attendance_date DATE,
        status          VARCHAR,
        subject_id      BIGINT,
        section_id      BIGINT,
        semester_id     BIGINT,
        department_id   BIGINT,
        faculty_id      BIGINT,
        academic_year   VARCHAR
      )
    `);

    await _conn.run(`
      CREATE TABLE IF NOT EXISTS analytics_metadata (
        dataset_name               VARCHAR PRIMARY KEY,
        last_successful_refresh_at TIMESTAMPTZ,
        source_row_count           BIGINT,
        loaded_row_count           BIGINT,
        refresh_status             VARCHAR,
        refresh_duration_ms        BIGINT,
        last_error_summary         VARCHAR
      )
    `);

    await _conn.run(`
      INSERT INTO analytics_metadata (dataset_name, refresh_status)
      VALUES ('attendance_fact', 'never_run')
      ON CONFLICT (dataset_name) DO NOTHING
    `);

    _initState = 'ready';
    logger.info(`[DuckDB] Ready — db: ${analyticsConfig.dbPath}`);
    return true;

  } catch (err) {
    _initState = 'failed';
    _initError = err;
    logger.error('[DuckDB] Initialization failed — analytics unavailable', { error: err.message });
    return false;
  }
};

// ── Guard ─────────────────────────────────────────────────────────────────────

const _assertReady = () => {
  if (_initState === 'disabled') {
    throw new DuckdbUnavailableError('Analytics are disabled (DUCKDB_ENABLED=false)');
  }
  if (_initState !== 'ready') {
    throw new DuckdbUnavailableError(
      _initState === 'failed'
        ? `Analytics database failed to initialize: ${_initError?.message || 'unknown'}`
        : 'Analytics database is not yet ready',
    );
  }
};

// ── Bind helper ───────────────────────────────────────────────────────────────

/**
 * Bind params[] to a prepared statement using the appropriate typed bind call.
 * Positions are 1-indexed as required by @duckdb/node-api.
 */
const _bindParams = (stmt, params) => {
  for (let i = 0; i < params.length; i++) {
    const pos = i + 1;
    const val = params[i];
    if (val === null || val === undefined) {
      stmt.bindNull(pos);
    } else if (typeof val === 'string') {
      stmt.bindVarchar(pos, val);
    } else if (typeof val === 'bigint') {
      stmt.bindBigInt(pos, val);
    } else if (typeof val === 'boolean') {
      stmt.bindBoolean(pos, val);
    } else if (Number.isInteger(val)) {
      stmt.bindInteger(pos, val);
    } else if (typeof val === 'number') {
      stmt.bindDouble(pos, val);
    } else if (val instanceof Date) {
      // DuckDB DATE/TIMESTAMPTZ from ISO string
      stmt.bindVarchar(pos, val.toISOString());
    } else {
      stmt.bindVarchar(pos, String(val));
    }
  }
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Execute a SELECT query and return plain object rows.
 * @param {string} sql    — SQL with $1/$2/... positional placeholders
 * @param {Array}  params — parameter values matched to $1, $2, ...
 * @returns {Promise<object[]>}
 */
const query = async (sql, params = []) => {
  _assertReady();
  try {
    if (params.length === 0) {
      const result = await _conn.runAndReadAll(sql);
      return result.getRowObjects();
    }
    const stmt = await _conn.createPrepared(sql);
    _bindParams(stmt, params);
    const result = await stmt.runAndReadAll();
    stmt.destroySync();
    return result.getRowObjects();
  } catch (err) {
    logger.error('[DuckDB] query error', { error: err.message, sql: sql.slice(0, 300) });
    throw err;
  }
};

/**
 * Execute a DML statement (INSERT/UPDATE/DELETE/CREATE/DROP).
 * Returns the number of rows changed (for DML) or 0.
 */
const runSql = async (sql, params = []) => {
  _assertReady();
  try {
    if (params.length === 0) {
      const result = await _conn.run(sql);
      return result.rowCount ?? 0;
    }
    const stmt = await _conn.createPrepared(sql);
    _bindParams(stmt, params);
    const result = await stmt.run();
    stmt.destroySync();
    return result.rowCount ?? 0;
  } catch (err) {
    logger.error('[DuckDB] runSql error', { error: err.message, sql: sql.slice(0, 300) });
    throw err;
  }
};

/**
 * High-throughput bulk append using DuckDB's native Appender.
 *
 * @param {string}   tableName    — target table
 * @param {string[]} columnTypes  — per-column type hint:
 *   'bigint' | 'integer' | 'double' | 'varchar' | 'date' | 'boolean' | 'null'
 * @param {Array[]}  rows         — array of value arrays matching columnTypes
 */
const bulkAppend = async (tableName, columnTypes, rows) => {
  _assertReady();
  if (!rows || rows.length === 0) return;
  try {
    const appender = await _conn.createAppender(tableName);
    for (const row of rows) {
      for (let i = 0; i < row.length; i++) {
        const v    = row[i];
        const type = columnTypes[i];
        if (v === null || v === undefined) {
          appender.appendNull();
        } else if (type === 'bigint') {
          appender.appendBigInt(typeof v === 'bigint' ? v : BigInt(v));
        } else if (type === 'integer') {
          appender.appendInteger(Number(v));
        } else if (type === 'double') {
          appender.appendDouble(Number(v));
        } else if (type === 'boolean') {
          appender.appendBoolean(Boolean(v));
        } else if (type === 'date') {
          // DuckDB DATE appended as ISO string via varchar coercion
          appender.appendVarchar(v instanceof Date ? v.toISOString().slice(0, 10) : String(v));
        } else {
          appender.appendVarchar(String(v));
        }
      }
      appender.endRow();
    }
    appender.flushSync();
    appender.closeSync();
  } catch (err) {
    logger.error('[DuckDB] bulkAppend error', { error: err.message, tableName });
    throw err;
  }
};

// ── Status ─────────────────────────────────────────────────────────────────────

const getStatus = () => ({
  state:  _initState,
  dbPath: analyticsConfig.enabled ? analyticsConfig.dbPath : null,
  error:  _initState === 'failed' ? (_initError?.message || 'unknown') : null,
});

const isReady = () => _initState === 'ready';

// ── Shutdown ──────────────────────────────────────────────────────────────────

const close = async () => {
  try {
    if (_conn) { _conn.closeSync(); _conn = null; }
    if (_db)   { _db.closeSync();   _db   = null; }
    _initState = 'none';
    logger.info('[DuckDB] Connection closed');
  } catch (err) {
    logger.warn('[DuckDB] Error during close', { error: err.message });
  }
};

module.exports = {
  initialize,
  query,
  runSql,
  bulkAppend,
  getStatus,
  isReady,
  close,
  DuckdbUnavailableError,
};
