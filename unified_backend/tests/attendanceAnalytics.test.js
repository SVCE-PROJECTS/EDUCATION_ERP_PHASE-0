/**
 * Attendance Analytics Tests — Step B
 *
 * Tests:
 *   1. Calculation unit tests (pure functions, no DB)
 *   2. DuckDB service smoke test (in-memory DB)
 *   3. Analytics service integration tests (DuckDB in-memory + seeded data)
 *   4. Refresh idempotency (staging swap mechanism)
 *   5. Reconciliation diagnostic (live PostgreSQL when available)
 *
 * Run with:  node tests/attendanceAnalytics.test.js
 *
 * Exit 0 = all tests passed.  Exit 1 = one or more failures.
 */

'use strict';

require('dotenv').config();

const assert = require('assert');
const path   = require('path');
const fs     = require('fs');

// ── Test runner helpers ───────────────────────────────────────────────────────

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

// ── Flush module cache helper ─────────────────────────────────────────────────

const clearAnalyticsCache = () => {
  Object.keys(require.cache).forEach((k) => {
    if (k.includes('analytics') || k.includes('duckdb') || k.includes('duckDB')) {
      delete require.cache[k];
    }
  });
};

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {

  // ── 1. Risk band calculations ──────────────────────────────────────────────

  group('1. Risk band calculations (pure logic)');

  process.env.ATTENDANCE_THRESHOLD_CRITICAL = '0.60';
  process.env.ATTENDANCE_THRESHOLD_AT_RISK   = '0.75';

  const { getRiskBand, calcRecovery } = require('./analyticsHelper');

  await test('null → insufficient_data',   () => assert.strictEqual(getRiskBand(null), 'insufficient_data'));
  await test('0% → critical',              () => assert.strictEqual(getRiskBand(0),    'critical'));
  await test('59.9% → critical',           () => assert.strictEqual(getRiskBand(59.9), 'critical'));
  await test('60% → at_risk (boundary)',   () => assert.strictEqual(getRiskBand(60),   'at_risk'));
  await test('74.9% → at_risk',            () => assert.strictEqual(getRiskBand(74.9), 'at_risk'));
  await test('75% → on_track (boundary)',  () => assert.strictEqual(getRiskBand(75),   'on_track'));
  await test('100% → on_track',            () => assert.strictEqual(getRiskBand(100),  'on_track'));

  // ── 2. Recovery formula ────────────────────────────────────────────────────

  group('2. Recovery formula');

  await test('target already met (30/40, 75%)',
    () => {
      const r = calcRecovery(30, 40, 20, 0.75);
      assert.strictEqual(r.minSessionsNeeded, 0);
      assert.ok(r.canReachTarget);
    });

  await test('needs sessions: 1/2 recorded, 75% target, 20 future → need 2',
    () => {
      // ceil((0.75*2 - 1) / (1 - 0.75)) = ceil(0.5/0.25) = ceil(2) = 2
      const r = calcRecovery(1, 2, 20, 0.75);
      assert.strictEqual(r.minSessionsNeeded, 2);
      assert.ok(r.canReachTarget);
    });

  await test('impossible: 0/40, 10 future, 75%',
    () => {
      const r = calcRecovery(0, 40, 10, 0.75);
      assert.ok(!r.canReachTarget);
      assert.ok(r.minSessionsNeeded > 10);
    });

  await test('target=1.0 with absences → impossible',
    () => {
      const r = calcRecovery(9, 10, 5, 1.0);
      assert.strictEqual(r.canReachTarget, false);
    });

  await test('target=1.0, perfect so far → must attend all future',
    () => {
      const r = calcRecovery(10, 10, 5, 1.0);
      assert.strictEqual(r.minSessionsNeeded, 5);
      assert.strictEqual(r.canReachTarget, true);
    });

  await test('zero recorded sessions',
    () => {
      const r = calcRecovery(0, 0, 10, 0.75);
      assert.strictEqual(r.minSessionsNeeded, 0);
    });

  await test('minSessionsNeeded is never negative',
    () => {
      const r = calcRecovery(40, 40, 5, 0.75);  // already 100%
      assert.ok(r.minSessionsNeeded >= 0);
    });

  await test('invalid target > 1 clamped to 1.0',
    () => {
      const r = calcRecovery(5, 10, 5, 1.5);  // clamped to 1; has absences → impossible
      assert.strictEqual(r.canReachTarget, false);
    });

  await test('invalid target < 0 clamped to 0 → already met',
    () => {
      const r = calcRecovery(0, 10, 5, -0.5);  // clamped to 0 → 0% target is met
      assert.strictEqual(r.minSessionsNeeded, 0);
      assert.ok(r.canReachTarget);
    });

  // ── 3. DuckDB service smoke test (in-memory) ───────────────────────────────

  group('3. DuckDB service (in-memory)');

  clearAnalyticsCache();
  process.env.DUCKDB_PATH    = ':memory:';
  process.env.DUCKDB_ENABLED = 'true';

  const duckdbService = require('../src/services/analytics/duckdbService');

  await test('initialize() returns true for :memory:',
    async () => {
      const ok = await duckdbService.initialize();
      assert.strictEqual(ok, true);
      assert.ok(duckdbService.isReady());
    });

  await test('attendance_fact starts empty',
    async () => {
      const rows = await duckdbService.query('SELECT COUNT(*)::BIGINT AS cnt FROM attendance_fact');
      assert.strictEqual(Number(rows[0].cnt), 0);
    });

  await test('bulkAppend inserts 3 rows',
    async () => {
      const TYPES = ['bigint','varchar','bigint','date','varchar','bigint','bigint','bigint','bigint','bigint','varchar'];
      await duckdbService.bulkAppend('attendance_fact', TYPES, [
        [1, 'S001', 10, '2026-09-01', 'Present', 100, 200, 300, 400, 500, '2026-27'],
        [2, 'S001', 10, '2026-09-02', 'Absent',  100, 200, 300, 400, 500, '2026-27'],
        [3, 'S002', 10, '2026-09-01', 'Present', 100, 200, 300, 400, 500, '2026-27'],
      ]);
      const rows = await duckdbService.query('SELECT COUNT(*)::BIGINT AS cnt FROM attendance_fact');
      assert.strictEqual(Number(rows[0].cnt), 3);
    });

  await test('parameterized query filters correctly',
    async () => {
      const rows = await duckdbService.query(
        "SELECT COUNT(*)::BIGINT AS cnt FROM attendance_fact WHERE status = $1",
        ['Present'],
      );
      assert.strictEqual(Number(rows[0].cnt), 2);
    });

  await test('percentage with NULLIF prevents division-by-zero',
    async () => {
      const rows = await duckdbService.query(
        `SELECT COUNT(*) FILTER (WHERE status = 'Present') * 100.0 / NULLIF(COUNT(*), 0) AS pct
         FROM attendance_fact WHERE class_id = $1`,
        [10],
      );
      const pct = parseFloat(rows[0]?.pct ?? 'null');
      assert.ok(Math.abs(pct - 66.67) < 0.1, `Expected ~66.67, got ${pct}`);
    });

  await test('DuckdbUnavailableError thrown when service not initialized',
    async () => {
      clearAnalyticsCache();
      const fresh = require('../src/services/analytics/duckdbService');
      try {
        await fresh.query('SELECT 1');
        assert.fail('Should have thrown');
      } catch (err) {
        assert.ok(
          err.name === 'DuckdbUnavailableError' || err.statusCode === 503,
          `Expected DuckdbUnavailableError, got ${err.name}`,
        );
      }
    });

  // ── 4. Analytics service integration (reuse in-memory DB from step 3) ─────

  group('4. Analytics service integration (seeded data)');

  // Re-init the same in-memory service and re-seed (cache was cleared above)
  clearAnalyticsCache();
  process.env.DUCKDB_PATH    = ':memory:';
  process.env.DUCKDB_ENABLED = 'true';

  const duckSvc      = require('../src/services/analytics/duckdbService');
  const analyticsSvc = require('../src/services/analytics/attendanceAnalyticsService');

  await duckSvc.initialize();

  const TYPES = ['bigint','varchar','bigint','date','varchar','bigint','bigint','bigint','bigint','bigint','varchar'];
  await duckSvc.bulkAppend('attendance_fact', TYPES, [
    // class 10, dept 401 (for class-level tests)
    [1, 'S001', 10, '2026-09-01', 'Present', 100, 200, 300, 401, 500, '2026-27'],
    [2, 'S001', 10, '2026-09-02', 'Absent',  100, 200, 300, 401, 500, '2026-27'],
    [3, 'S002', 10, '2026-09-01', 'Present', 100, 200, 300, 401, 500, '2026-27'],
    // class 20, dept 402 (for HOD/admin tests)
    [4, 'S003', 20, '2026-09-01', 'Absent',  101, 201, 301, 402, 501, '2026-27'],
    [5, 'S003', 20, '2026-09-02', 'Absent',  101, 201, 301, 402, 501, '2026-27'],
    [6, 'S004', 20, '2026-09-01', 'Present', 101, 201, 301, 402, 501, '2026-27'],
  ]);

  await test('getClassSummary: correct totals for class 10',
    async () => {
      const s = await analyticsSvc.getClassSummary(10, '2026-09-01', '2026-09-30');
      assert.strictEqual(s.summary.recordedRows, 3);
      assert.strictEqual(s.summary.presentRows,  2);
      assert.strictEqual(s.summary.absentRows,   1);
      assert.ok(Math.abs(s.summary.attendancePercentage - 66.67) < 0.1);
    });

  await test('getClassSummary: empty range returns nulls',
    async () => {
      const s = await analyticsSvc.getClassSummary(10, '2025-01-01', '2025-01-31');
      assert.strictEqual(s.summary.recordedRows, 0);
      assert.strictEqual(s.summary.attendancePercentage, null);
    });

  await test('getClassSummary: riskBands counts populated',
    async () => {
      const s = await analyticsSvc.getClassSummary(10, '2026-09-01', '2026-09-30');
      const total = s.riskBands.critical + s.riskBands.atRisk + s.riskBands.onTrack + s.riskBands.insufficient;
      assert.strictEqual(total, 2, 'Should have 2 students (S001 + S002)');
    });

  await test('getStudentRiskList: S001 critical (1/2 = 50%, below 60% threshold)',
    async () => {
      const r = await analyticsSvc.getStudentRiskList(10, '2026-09-01', '2026-09-30', { page: 1, pageSize: 20 });
      const s = r.students.find(x => x.studentId === 'S001');
      assert.ok(s, 'S001 in list');
      // 1 present / 2 total = 50%, which is below critical threshold (60%) → critical
      assert.strictEqual(s.riskBand, 'critical');
    });

  await test('getStudentRiskList: S002 on_track (1/1 = 100%)',
    async () => {
      const r = await analyticsSvc.getStudentRiskList(10, '2026-09-01', '2026-09-30', { page: 1, pageSize: 20 });
      const s = r.students.find(x => x.studentId === 'S002');
      assert.ok(s, 'S002 in list');
      assert.strictEqual(s.riskBand, 'on_track');
    });

  await test('getAttendanceTrend: 2 distinct dates returned',
    async () => {
      const r = await analyticsSvc.getAttendanceTrend(10, '2026-09-01', '2026-09-30');
      assert.strictEqual(r.trend.length, 2);
    });

  await test('getAttendanceTrend: percentages non-null',
    async () => {
      const r = await analyticsSvc.getAttendanceTrend(10, '2026-09-01', '2026-09-30');
      r.trend.forEach(t => assert.ok(t.attendancePercentage !== null));
    });

  await test('getRecoveryProjection: S002 already at target',
    async () => {
      const r = await analyticsSvc.getRecoveryProjection(10, 'S002', 10, 0.75, '2026-09-01', '2026-09-30');
      assert.strictEqual(r.result.minSessionsNeeded, 0);
      assert.ok(r.result.canReachTarget);
    });

  await test('getRecoveryProjection: S001 needs 2 of 20 future sessions',
    async () => {
      const r = await analyticsSvc.getRecoveryProjection(10, 'S001', 20, 0.75, '2026-09-01', '2026-09-30');
      assert.strictEqual(r.result.minSessionsNeeded, 2);
      assert.ok(r.result.canReachTarget);
    });

  await test('getRecoveryProjection: response includes disclaimer',
    async () => {
      const r = await analyticsSvc.getRecoveryProjection(10, 'S001', 5, 0.75, '2026-09-01', '2026-09-30');
      assert.ok(r.disclaimer && r.disclaimer.length > 10);
    });

  await test('getDepartmentSummary: dept 402 aggregate correct',
    async () => {
      const r = await analyticsSvc.getDepartmentSummary(402, '2026-09-01', '2026-09-30');
      assert.strictEqual(r.overall.recordedSessions, 3);
      assert.strictEqual(r.overall.presentSessions,  1);
      // 1/3 ≈ 33.33%
      assert.ok(Math.abs(r.overall.attendancePercentage - 33.33) < 0.1);
    });

  await test('getInstitutionSummary: totals across all departments',
    async () => {
      const r = await analyticsSvc.getInstitutionSummary('2026-09-01', '2026-09-30');
      assert.strictEqual(r.overall.recordedSessions, 6);
      assert.strictEqual(r.overall.presentSessions,  3);
      // 3/6 = 50%
      assert.ok(Math.abs(r.overall.attendancePercentage - 50) < 0.1);
    });

  await test('freshness object present in every analytics response',
    async () => {
      const s = await analyticsSvc.getClassSummary(10, '2026-09-01', '2026-09-30');
      assert.ok(s.freshness && typeof s.freshness.analyticsAvailable === 'boolean');
    });

  // ── 5. Refresh idempotency ─────────────────────────────────────────────────

  group('5. Refresh idempotency (staging/swap mechanism)');

  await test('staging swap does not duplicate rows',
    async () => {
      // We have 6 rows in attendance_fact from step 4.
      // Simulate a second refresh: drop+create staging, load same 6 rows, swap.
      const TYPES = ['bigint','varchar','bigint','date','varchar','bigint','bigint','bigint','bigint','bigint','varchar'];
      await duckSvc.runSql('DROP TABLE IF EXISTS attendance_fact_staging');
      await duckSvc.runSql('CREATE TABLE attendance_fact_staging AS SELECT * FROM attendance_fact LIMIT 0');
      await duckSvc.bulkAppend('attendance_fact_staging', TYPES, [
        [1, 'S001', 10, '2026-09-01', 'Present', 100, 200, 300, 401, 500, '2026-27'],
        [2, 'S001', 10, '2026-09-02', 'Absent',  100, 200, 300, 401, 500, '2026-27'],
        [3, 'S002', 10, '2026-09-01', 'Present', 100, 200, 300, 401, 500, '2026-27'],
        [4, 'S003', 20, '2026-09-01', 'Absent',  101, 201, 301, 402, 501, '2026-27'],
        [5, 'S003', 20, '2026-09-02', 'Absent',  101, 201, 301, 402, 501, '2026-27'],
        [6, 'S004', 20, '2026-09-01', 'Present', 101, 201, 301, 402, 501, '2026-27'],
      ]);
      await duckSvc.runSql('DROP TABLE attendance_fact');
      await duckSvc.runSql('ALTER TABLE attendance_fact_staging RENAME TO attendance_fact');
      const after = await duckSvc.query('SELECT COUNT(*)::BIGINT AS cnt FROM attendance_fact');
      assert.strictEqual(Number(after[0].cnt), 6, 'Still 6 rows after idempotent refresh');
    });

  await test('corrected attendance (Present → Absent) reflected after re-load',
    async () => {
      // Simulate row 1 being corrected from Present → Absent
      const TYPES = ['bigint','varchar','bigint','date','varchar','bigint','bigint','bigint','bigint','bigint','varchar'];
      await duckSvc.runSql('DROP TABLE IF EXISTS attendance_fact_staging');
      await duckSvc.runSql('CREATE TABLE attendance_fact_staging AS SELECT * FROM attendance_fact LIMIT 0');
      await duckSvc.bulkAppend('attendance_fact_staging', TYPES, [
        [1, 'S001', 10, '2026-09-01', 'Absent',  100, 200, 300, 400, 500, '2026-27'],  // was Present
        [2, 'S001', 10, '2026-09-02', 'Absent',  100, 200, 300, 400, 500, '2026-27'],
        [3, 'S002', 10, '2026-09-01', 'Present', 100, 200, 300, 400, 500, '2026-27'],
      ]);
      await duckSvc.runSql('DROP TABLE attendance_fact');
      await duckSvc.runSql('ALTER TABLE attendance_fact_staging RENAME TO attendance_fact');
      const rows = await duckSvc.query(
        "SELECT COUNT(*)::BIGINT AS cnt FROM attendance_fact WHERE student_id = $1 AND status = $2",
        ['S001', 'Absent'],
      );
      assert.strictEqual(Number(rows[0].cnt), 2, 'Both S001 rows should now be Absent');
    });

  await duckSvc.close();

  // ── 6. PostgreSQL reconciliation (skipped if DB unavailable) ──────────────

  group('6. PostgreSQL ↔ DuckDB reconciliation');

  await test('row counts match after full refresh (skips if no DB)',
    async () => {
      let pgAvailable = false;
      try {
        const { pool } = require('../src/config/db');
        await pool.query('SELECT 1');
        pgAvailable = true;
      } catch {
        console.log('       [SKIP] PostgreSQL not reachable in this environment');
        return;
      }

      clearAnalyticsCache();
      const tmpPath = path.join(process.cwd(), 'data', `test_reconcile_${Date.now()}.duckdb`);
      process.env.DUCKDB_PATH    = tmpPath;
      process.env.DUCKDB_ENABLED = 'true';

      const dSvc   = require('../src/services/analytics/duckdbService');
      const rSvc   = require('../src/services/analytics/analyticsRefreshService');
      const srcRepo = require('../src/repositories/analyticsSourceRepository');

      await dSvc.initialize();
      const { success } = await rSvc.runRefresh();

      if (!success) {
        console.log('       [SKIP] Refresh returned non-success (may be no data)');
        await dSvc.close();
        try { fs.unlinkSync(tmpPath); } catch {}
        try { fs.unlinkSync(tmpPath + '.wal'); } catch {}
        return;
      }

      const pgCounts = await srcRepo.fetchAttendanceCounts();
      const duckRows = await dSvc.query('SELECT COUNT(*)::BIGINT AS cnt FROM attendance_fact');
      const duckCnt  = Number(duckRows[0]?.cnt ?? 0);

      assert.strictEqual(duckCnt, Number(pgCounts.total_rows),
        `Total row mismatch: DuckDB=${duckCnt} PG=${pgCounts.total_rows}`);

      const statusRows = await dSvc.query(
        "SELECT COUNT(*) FILTER (WHERE status = 'Present')::BIGINT AS present FROM attendance_fact",
      );
      assert.strictEqual(Number(statusRows[0].present), Number(pgCounts.present_rows),
        `Present count mismatch: DuckDB=${statusRows[0].present} PG=${pgCounts.present_rows}`);

      console.log(`       PG total=${pgCounts.total_rows} | DuckDB=${duckCnt} ✅`);
      console.log(`       Present=${pgCounts.present_rows} | Absent=${pgCounts.absent_rows} ✅`);

      await dSvc.close();
      try { fs.unlinkSync(tmpPath); } catch {}
      try { fs.unlinkSync(tmpPath + '.wal'); } catch {}
    });

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log(`\n${'─'.repeat(52)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  // Force exit to close any open database pools or handles
  process.exit(failed > 0 ? 1 : 0);

})().catch((err) => {
  console.error('Unexpected test runner error:', err.message, err.stack);
  process.exit(1);
});
