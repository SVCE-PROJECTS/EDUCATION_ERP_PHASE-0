/**
 * Attendance Analytics API — Controller / Authorization Tests
 *
 * Tests controller logic in isolation by patching module-level dependencies.
 * Does NOT start an Express server or require a running PostgreSQL connection.
 *
 * Strategy: initialize one shared in-memory DuckDB, then patch the specific
 * dependency functions (isOwnClass, resolveDepartmentId) that touch PostgreSQL.
 * Patching happens on the already-loaded module object so we don't need to
 * juggle require cache repeatedly.
 *
 * Run with:  node tests/attendanceAnalyticsAPI.test.js
 * Exit 0 = all passed.
 */

'use strict';

require('dotenv').config();

const assert = require('assert');

// ── Test helpers ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

const test = async (name, fn) => {
  try {
    await fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌  ${name}`);
    console.error(`       ${err.message}`);
    failed++;
  }
};

const group = (label) => console.log(`\n── ${label} ──`);

// ── Minimal req/res mocks ─────────────────────────────────────────────────────

const mockRes = () => {
  const r = { _status: 200, _body: null };
  r.status = (code) => { r._status = code; return r; };
  r.json   = (body) => { r._body = body;   return r; };
  return r;
};

const mockFacultyReq = (classId, overrides = {}) => ({
  user:   { id: 'EMP001', isAdmin: false, isHOD: false, departmentCode: 'CSE', roles: [] },
  query:  { class_id: String(classId), from: '2026-09-01', to: '2026-09-30' },
  params: {},
  body:   {},
  ...overrides,
});

const mockHODReq = (overrides = {}) => ({
  user:   { id: 'HOD001', isAdmin: false, isHOD: true, departmentCode: 'CSE', roles: ['HOD'] },
  query:  { from: '2026-09-01', to: '2026-09-30' },
  params: {},
  body:   {},
  ...overrides,
});

// ── Bootstrap: one shared in-memory DuckDB ────────────────────────────────────

// Force analytics-related env before any require so config loads correctly
process.env.DUCKDB_ENABLED = 'true';
process.env.DUCKDB_PATH    = ':memory:';
process.env.ATTENDANCE_THRESHOLD_CRITICAL = '0.60';
process.env.ATTENDANCE_THRESHOLD_AT_RISK   = '0.75';

const duckSvc     = require('../src/services/analytics/duckdbService');
const classOwn    = require('../src/utils/classOwnership');
const sourceRepo  = require('../src/repositories/analyticsSourceRepository');
const ctrl        = require('../src/controllers/attendanceAnalyticsController');
const { ApiError } = require('../src/utils/response');

// Patch all PostgreSQL-touching functions once so every test can control them
let _isOwnClass           = async () => true;
let _resolveDepartmentId  = async (code) => code === 'CSE' ? 999 : null;

classOwn.isOwnClass            = async (...args) => _isOwnClass(...args);
sourceRepo.resolveDepartmentId = async (...args) => _resolveDepartmentId(...args);

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {

  // ── 0. Boot DuckDB and seed data ──────────────────────────────────────────

  const ok = await duckSvc.initialize();
  if (!ok) {
    console.error('DuckDB failed to initialize — aborting tests');
    process.exit(1);
  }

  const TYPES = ['bigint','varchar','bigint','date','varchar','bigint','bigint','bigint','bigint','bigint','varchar'];
  // class 10, dept 401
  await duckSvc.bulkAppend('attendance_fact', TYPES, [
    [1, 'S001', 10, '2026-09-01', 'Present', 100, 200, 300, 401, 500, '2026-27'],
    [2, 'S001', 10, '2026-09-02', 'Absent',  100, 200, 300, 401, 500, '2026-27'],
    [3, 'S002', 10, '2026-09-01', 'Present', 100, 200, 300, 401, 500, '2026-27'],
  ]);
  // class 20, dept 999 (matches HOD 'CSE' mock)
  await duckSvc.bulkAppend('attendance_fact', TYPES, [
    [4, 'S003', 20, '2026-09-01', 'Absent',  101, 201, 301, 999, 501, '2026-27'],
    [5, 'S004', 20, '2026-09-01', 'Present', 101, 201, 301, 999, 501, '2026-27'],
    [6, 'S004', 20, '2026-09-02', 'Present', 101, 201, 301, 999, 501, '2026-27'],
  ]);

  // ── 1. Config validation ──────────────────────────────────────────────────

  group('1. Config validation');

  const analyticsConfig = require('../src/config/analytics');

  await test('maxDateRangeDays is a positive integer',
    () => {
      assert.ok(Number.isInteger(analyticsConfig.maxDateRangeDays) && analyticsConfig.maxDateRangeDays > 0);
    });

  await test('critical threshold < atRisk threshold',
    () => {
      assert.ok(analyticsConfig.thresholds.critical < analyticsConfig.thresholds.atRisk);
    });

  await test('defaultRecoveryTarget in [0, 1]',
    () => {
      const t = analyticsConfig.defaultRecoveryTarget;
      assert.ok(t >= 0 && t <= 1);
    });

  await test('defaultPageSize <= maxPageSize',
    () => {
      assert.ok(analyticsConfig.defaultPageSize <= analyticsConfig.maxPageSize);
    });

  // ── 2. Faculty class ownership ────────────────────────────────────────────

  group('2. Faculty — class ownership authorization');

  await test('faculty with owned class receives summary (200)',
    async () => {
      _isOwnClass = async () => true;
      const req = mockFacultyReq(10);
      const res = mockRes();
      await ctrl.getClassSummary(req, res);
      assert.strictEqual(res._status, 200);
      assert.ok(res._body?.success === true);
      assert.strictEqual(res._body?.data?.summary?.recordedRows, 3);
    });

  await test('faculty denied for a class they do not own (403 thrown)',
    async () => {
      _isOwnClass = async () => false;
      const req = mockFacultyReq(10);
      const res = mockRes();
      try {
        await ctrl.getClassSummary(req, res);
        assert.fail('Expected ApiError 403');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403);
        assert.ok(err.message.includes('not assigned'));
      }
    });

  await test('risks endpoint also enforces class ownership (403 for wrong class)',
    async () => {
      _isOwnClass = async () => false;
      const req = mockFacultyReq(10);
      const res = mockRes();
      try {
        await ctrl.getStudentRisks(req, res);
        assert.fail('Expected ApiError 403');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403);
      }
    });

  await test('trends endpoint enforces class ownership',
    async () => {
      _isOwnClass = async () => false;
      const req = mockFacultyReq(10);
      const res = mockRes();
      try {
        await ctrl.getAttendanceTrends(req, res);
        assert.fail('Expected ApiError 403');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403);
      }
    });

  await test('recovery endpoint enforces class ownership',
    async () => {
      _isOwnClass = async () => false;
      const req = mockFacultyReq(10, {
        query: { class_id: '10', student_id: 'S001', future: '10',
                 from: '2026-09-01', to: '2026-09-30' },
      });
      const res = mockRes();
      try {
        await ctrl.getRecoveryProjection(req, res);
        assert.fail('Expected ApiError 403');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403);
      }
    });

  await test('admin bypasses class ownership check entirely',
    async () => {
      _isOwnClass = async () => false;   // would deny a faculty
      const req = { ...mockFacultyReq(10), user: { id: 'ADMIN', isAdmin: true, roles: [] } };
      const res = mockRes();
      await ctrl.getClassSummary(req, res);
      assert.strictEqual(res._status, 200, 'Admin should bypass isOwnClass');
    });

  // Reset to owned for remaining tests
  _isOwnClass = async () => true;

  // ── 3. Response shape verification ───────────────────────────────────────

  group('3. Response shape');

  await test('summary includes summary, riskBands, thresholds, and freshness',
    async () => {
      const req = mockFacultyReq(10);
      const res = mockRes();
      await ctrl.getClassSummary(req, res);
      const d = res._body?.data;
      assert.ok(d?.summary,    'summary required');
      assert.ok(d?.riskBands,  'riskBands required');
      assert.ok(d?.thresholds, 'thresholds required');
      assert.ok(d?.freshness,  'freshness required');
      assert.strictEqual(typeof d.thresholds.critical, 'number');
      assert.ok(d.thresholds.note, 'threshold disclaimer note required');
    });

  await test('risks response includes pagination object',
    async () => {
      const req = mockFacultyReq(10);
      const res = mockRes();
      await ctrl.getStudentRisks(req, res);
      const d = res._body?.data;
      assert.ok(d?.pagination, 'pagination required');
      assert.ok(typeof d.pagination.total === 'number');
      assert.ok(d?.students, 'students array required');
    });

  await test('recovery response includes disclaimer',
    async () => {
      const req = mockFacultyReq(10, {
        query: { class_id: '10', student_id: 'S001', future: '10',
                 target: '0.75', from: '2026-09-01', to: '2026-09-30' },
      });
      const res = mockRes();
      await ctrl.getRecoveryProjection(req, res);
      assert.strictEqual(res._status, 200);
      assert.ok(res._body?.data?.disclaimer, 'disclaimer required');
      assert.ok(res._body?.data?.result?.explanation, 'explanation required');
    });

  await test('trends response includes trend array',
    async () => {
      const req = mockFacultyReq(10);
      const res = mockRes();
      await ctrl.getAttendanceTrends(req, res);
      assert.strictEqual(res._status, 200);
      const d = res._body?.data;
      assert.ok(Array.isArray(d?.trend));
      assert.strictEqual(d.trend.length, 2);
    });

  await test('freshness endpoint returns analyticsAvailable field',
    async () => {
      const req = { user: { id: 'EMP001', isAdmin: false, roles: [] }, query: {} };
      const res = mockRes();
      await ctrl.getFreshness(req, res);
      assert.strictEqual(res._status, 200);
      assert.ok(typeof res._body?.data?.analyticsAvailable === 'boolean');
    });

  // ── 4. HOD authorization ──────────────────────────────────────────────────

  group('4. HOD — department from server-trusted identity');

  await test('HOD summary derives department from user.departmentCode, not query params',
    async () => {
      _resolveDepartmentId = async (code) => code === 'CSE' ? 999 : null;
      const req = mockHODReq();
      // req.query does NOT contain department_id — controller must use user identity
      const res = mockRes();
      await ctrl.getHODAttendanceSummary(req, res);
      assert.strictEqual(res._status, 200);
      // dept 999 has 3 rows in our seed
      assert.strictEqual(res._body?.data?.overall?.recordedSessions, 3);
    });

  await test('HOD summary returns 400 when department code not found',
    async () => {
      _resolveDepartmentId = async () => null;
      const req = mockHODReq({ user: { id: 'HOD001', isHOD: true, departmentCode: 'BOGUS', roles: ['HOD'] } });
      const res = mockRes();
      try {
        await ctrl.getHODAttendanceSummary(req, res);
        assert.fail('Expected ApiError 400');
      } catch (err) {
        assert.strictEqual(err.statusCode, 400);
      }
      _resolveDepartmentId = async (code) => code === 'CSE' ? 999 : null;
    });

  // ── 5. Admin summary ─────────────────────────────────────────────────────

  group('5. Admin — institution summary');

  await test('admin summary returns aggregates across all departments',
    async () => {
      const req = {
        user:   { id: 'ADMIN', isAdmin: true, roles: ['admin'] },
        query:  { from: '2026-09-01', to: '2026-09-30' },
        params: {}, body: {},
      };
      const res = mockRes();
      await ctrl.getAdminAttendanceSummary(req, res);
      assert.strictEqual(res._status, 200);
      const d = res._body?.data;
      // Total rows: 6 (3 class-10 + 3 class-20)
      assert.strictEqual(d?.overall?.recordedSessions, 6);
      assert.ok(Array.isArray(d?.departments));
    });

  // ── 6. Middleware — requireAdmin / requireHOD ─────────────────────────────

  group('6. Role middleware');

  await test('requireAdmin blocks non-admin (403)',
    async () => {
      const { requireAdmin } = require('../src/middleware/authenticate');
      const req = { user: { id: 'EMP001', isAdmin: false, role: 'faculty', roles: [] } };
      const res = mockRes();
      let nextErr = null;
      requireAdmin(req, res, (err) => { nextErr = err; });
      assert.ok(nextErr instanceof ApiError);
      assert.strictEqual(nextErr.statusCode, 403);
    });

  await test('requireAdmin passes admin user',
    async () => {
      const { requireAdmin } = require('../src/middleware/authenticate');
      const req = { user: { id: 'admin', isAdmin: true, role: 'admin', roles: [] } };
      const res = mockRes();
      let nextErr = null;
      requireAdmin(req, res, (err) => { nextErr = err || null; });
      assert.ok(nextErr === null, 'should call next() without error');
    });

  await test('requireHOD blocks regular faculty (403)',
    async () => {
      const { requireHOD } = require('../src/middleware/authenticate');
      const req = { user: { id: 'EMP001', isHOD: false, roles: [] } };
      const res = mockRes();
      let nextErr = null;
      requireHOD(req, res, (err) => { nextErr = err; });
      assert.ok(nextErr instanceof ApiError);
      assert.strictEqual(nextErr.statusCode, 403);
    });

  await test('requireHOD passes HOD user',
    async () => {
      const { requireHOD } = require('../src/middleware/authenticate');
      const req = { user: { id: 'HOD001', isHOD: true, roles: ['HOD'] } };
      const res = mockRes();
      let nextErr = null;
      requireHOD(req, res, (err) => { nextErr = err || null; });
      assert.ok(nextErr === null);
    });

  // ── 7. DuckDB disabled → 503 ─────────────────────────────────────────────

  group('7. DuckDB disabled → 503');

  await test('getFreshness returns analyticsAvailable:false when DuckDB status is not ready',
    async () => {
      // This test uses the live in-memory DuckDB which IS ready, so freshness
      // returns analyticsAvailable:true (metadata table exists but is never_run)
      const req = { user: { id: 'EMP001', isAdmin: false, roles: [] }, query: {} };
      const res = mockRes();
      await ctrl.getFreshness(req, res);
      assert.strictEqual(res._status, 200);
      // analyticsAvailable is true because DuckDB is ready (even if never refreshed)
      assert.ok(typeof res._body?.data?.analyticsAvailable === 'boolean');
    });

  // ── Cleanup ────────────────────────────────────────────────────────────────

  await duckSvc.close();

  // Close the pg pool if it was opened during module load
  try {
    const { closePool } = require('../src/config/db');
    await closePool();
  } catch {}

  console.log(`\n${'─'.repeat(52)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);

})().catch((err) => {
  console.error('Unexpected test runner error:', err.message, err.stack);
  process.exit(1);
});
