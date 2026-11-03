# DuckDB Analytics — Implementation Guide
## SVCE Education ERP · Phase 0

> **Last updated:** October 2026  
> **Session:** DuckDB Analytics Intelligence (Steps A–F)  
> **Status:** ✅ Implemented, tested, 61/61 tests passing

---

## Table of Contents

1. [What Was Built](#1-what-was-built)
2. [Architecture](#2-architecture)
3. [Features Powered by DuckDB](#3-features-powered-by-duckdb)
4. [File Map — Every New File](#4-file-map--every-new-file)
5. [Files Modified](#5-files-modified)
6. [Environment Variables](#6-environment-variables)
7. [API Endpoints](#7-api-endpoints)
8. [Authorization Rules](#8-authorization-rules)
9. [Data Pipeline — How the Refresh Works](#9-data-pipeline--how-the-refresh-works)
10. [DuckDB Schema](#10-duckdb-schema)
11. [Frontend Integration](#11-frontend-integration)
12. [Test Results](#12-test-results)
13. [Start-up Instructions](#13-start-up-instructions)
14. [Known Limitations](#14-known-limitations)
15. [Rollback / Disable](#15-rollback--disable)
16. [Configurable Thresholds](#16-configurable-thresholds)

---

## 1. What Was Built

A centralized DuckDB analytics layer added to the Express backend.  
PostgreSQL remains the **sole source of truth** for all attendance writes.  
DuckDB is a **read-only derived snapshot** used only for analytical queries.

The implementation is purely additive — no existing route, controller, service, or database table was removed or modified. Attendance marking, IA marks, assignments, meetings, and all other features continue to work exactly as before, even if DuckDB is disabled or unavailable.

### What is new

| Layer | New capability |
|---|---|
| Backend service | DuckDB lifecycle (init, query, bulk-append, shutdown) |
| Backend pipeline | PostgreSQL → DuckDB full-snapshot refresh on a timer |
| Backend API | 8 new analytics endpoints under `/api/analytics/attendance/` |
| Faculty portal | Attendance Intelligence section on the Analytics screen |
| HOD portal | Department-wide attendance summary on the Analytics screen |
| Admin portal | Institution-wide attendance summary on the Analytics screen |

---

## 2. Architecture

```
React Native App (Faculty / HOD / Admin)
         │
         │  JWT Bearer token
         ▼
┌─────────────────────────────────────────────────────┐
│              Express Backend  :5000                  │
│                                                      │
│  Existing routes (unchanged)                        │
│  POST /api/attendance/bulk  ──────────────────────► PostgreSQL
│  GET  /api/analytics/overview ────────────────────► PostgreSQL
│  … all other existing routes ─────────────────────► PostgreSQL
│                                                      │
│  New analytics routes                               │
│  GET  /api/analytics/attendance/* ────────────────► DuckDB
│                                          ▲           │
│                                          │ refresh   │
│                               analyticsRefreshService│
│                                          │           │
│                                          └─── reads ─► PostgreSQL
└─────────────────────────────────────────────────────┘
         │
         ▼
  data/education_analytics.duckdb   (local file, gitignored)
```

**Key rule:** DuckDB never receives a write request from any client. All writes go to PostgreSQL. DuckDB is populated only by the backend's own refresh service.

---

## 3. Features Powered by DuckDB

### Feature 1 — Class Attendance Summary
**Who:** Faculty (own classes only), Admin  
**Endpoint:** `GET /api/analytics/attendance/summary`

Returns for a selected class and date range:
- Total recorded sessions
- Present and absent counts
- Overall attendance percentage (with `NULLIF` division-by-zero guard)
- Count of students per risk band (critical / at-risk / on-track)
- Data freshness timestamp and stale flag

---

### Feature 2 — Student Risk List
**Who:** Faculty (own classes only), Admin  
**Endpoint:** `GET /api/analytics/attendance/risks`

Paginated list of every student in a class, sorted by attendance % (lowest first), each annotated with:
- Attendance percentage
- Risk band: **Critical** (<60%), **At Risk** (<75%), **On Track** (≥75%)
- Plain-language explanation of the flag
- Filterable by risk band via query param

> Thresholds are demo defaults, not official VTU/SVCE policy. Configurable via env vars.

---

### Feature 3 — Attendance Trend
**Who:** Faculty (own classes only), Admin  
**Endpoint:** `GET /api/analytics/attendance/trends`

Date-bucketed series — one data point per attendance date in the range — showing present count, absent count and % for that session. Used to draw the trend bar chart on the Analytics screen.

---

### Feature 4 — Recovery Simulator
**Who:** Faculty (own classes only), Admin  
**Endpoint:** `GET /api/analytics/attendance/recovery`

For a specific student in a specific class:
- Reads their current present/recorded counts from DuckDB
- Applies the formula: `min_sessions = max(0, ceil((R×T − P) / (1−R)))`
- Returns how many of the remaining future sessions they must attend to hit the target %
- Handles edge cases: target already met, target = 100%, zero recorded sessions, impossible target

Every response includes a **disclaimer** that this is a projection, not a promise.

---

### Feature 5 — Department Summary (HOD)
**Who:** HOD only — department locked to `req.user.departmentCode` server-side  
**Endpoint:** `GET /api/analytics/attendance/hod`

Department-wide rollup:
- Overall department attendance rate
- Per-class breakdown: attendance %, distinct students, risk band
- Freshness badge

---

### Feature 6 — Institution Summary (Admin)
**Who:** Admin only  
**Endpoint:** `GET /api/analytics/attendance/admin`

Institution-wide rollup grouped by department:
- Institution-level attendance %, total sessions, present count
- Per-department row: %, distinct students, distinct classes, session count
- Colour-coded risk (<60% red, <75% amber, ≥75% green)

---

### Supporting: Freshness / Health
**Who:** Any authenticated user  
**Endpoint:** `GET /api/analytics/attendance/freshness`

Returns: last successful refresh time, refresh status, stale flag, loaded row count. Shown as a badge on all three portal analytics screens.

---

### Supporting: Manual Refresh
**Who:** Admin only  
**Endpoint:** `POST /api/analytics/attendance/refresh`

Triggers an immediate synchronous PostgreSQL → DuckDB refresh. Rate-limited to the admin role. Returns new row counts and duration.

---

## 4. File Map — Every New File

### Backend

```
unified_backend/
├── data/                                           ← DuckDB file lives here (gitignored)
│   └── education_analytics.duckdb                 ← created on first run
│
└── src/
    ├── config/
    │   └── analytics.js                           ← all analytics config with env-var overrides
    │
    ├── services/analytics/
    │   ├── duckdbService.js                       ← DuckDB lifecycle: init, query, bulkAppend, close
    │   ├── analyticsRefreshService.js             ← PostgreSQL→DuckDB refresh + timer + metadata
    │   └── attendanceAnalyticsService.js          ← all 6 business-logic functions
    │
    ├── repositories/
    │   └── analyticsSourceRepository.js           ← read-only PostgreSQL extraction queries
    │
    ├── controllers/
    │   └── attendanceAnalyticsController.js       ← request/response mapping + auth checks
    │
    ├── routes/
    │   └── attendanceAnalytics.routes.js          ← 8 routes, mounted at /api/analytics/attendance
    │
    └── validators/
        └── attendanceAnalyticsValidator.js        ← express-validator rules for all endpoints
```

### Tests

```
unified_backend/tests/
├── attendanceAnalytics.test.js     ← 38 tests: calculations, DuckDB, analytics service, refresh
├── attendanceAnalyticsAPI.test.js  ← 23 tests: controller, authorization, response shapes
└── analyticsHelper.js              ← pure calculation helpers (no DB needed)
```

### Frontend

```
unified-frontend/src/
├── services/
│   ├── faculty/attendanceAnalytics.service.ts    ← Faculty: API calls + TypeScript types
│   ├── hod/attendanceAnalytics.service.ts        ← HOD: API calls + types
│   └── admin/attendanceAnalyticsService.ts       ← Admin: API calls + types
│
├── hooks/
│   ├── faculty/useAttendanceAnalytics.ts          ← Faculty: React Query hooks
│   ├── hod/useAttendanceAnalytics.ts              ← HOD: React Query hooks
│   └── admin/useAttendanceAnalytics.ts            ← Admin: React Query hooks
```

---

## 5. Files Modified

| File | Change |
|---|---|
| `unified_backend/server.js` | Non-blocking DuckDB init on startup; DuckDB close on graceful shutdown |
| `unified_backend/src/routes/index.js` | Mounted `attendanceAnalytics.routes.js` at `/analytics/attendance` |
| `unified_backend/.gitignore` | Added `data/`, `*.duckdb`, `*.duckdb.wal` |
| `unified_backend/.env.example` | Added full DuckDB Analytics section |
| `unified_backend/.env` | Created (not committed) — contains PG password + DuckDB config |
| `unified-frontend/.env` | Created (not committed) — `EXPO_PUBLIC_API_URL=http://localhost:5000/api` |
| `unified-frontend/src/screens/faculty/Analytics.tsx` | Added Attendance Intelligence section below existing overview |
| `unified-frontend/src/screens/hod/Analytics.tsx` | Added HOD department attendance section |
| `unified-frontend/src/screens/admin/Analytics/AnalyticsScreen.tsx` | Added institution attendance section |

---

## 6. Environment Variables

All in `unified_backend/.env`. The DuckDB section:

```env
# ─── DuckDB Analytics ────────────────────────────────────────────────────────

# Set false to disable entirely. Attendance writes still work. Analytics return 503.
DUCKDB_ENABLED=true

# Path to the DuckDB file. Directory must exist and be writable.
DUCKDB_PATH=./data/education_analytics.duckdb

# Refresh interval in minutes (process-local timer)
ANALYTICS_REFRESH_INTERVAL_MINUTES=15

# Run a refresh on backend startup?
ANALYTICS_REFRESH_ON_START=true

# Age in minutes before the freshness badge shows "Stale"
ANALYTICS_STALENESS_MINUTES=60

# Risk band thresholds (0–1 decimals). DEMO DEFAULTS — not VTU/SVCE policy.
ATTENDANCE_THRESHOLD_CRITICAL=0.60
ATTENDANCE_THRESHOLD_AT_RISK=0.75

# Default recovery target when client doesn't specify
ATTENDANCE_RECOVERY_TARGET=0.75

# Max date range per query (prevents runaway scans)
ANALYTICS_MAX_DATE_RANGE_DAYS=366

# Pagination
ANALYTICS_DEFAULT_PAGE_SIZE=50
ANALYTICS_MAX_PAGE_SIZE=200
```

---

## 7. API Endpoints

Base path: `/api/analytics/attendance/`

| Method | Path | Auth required | Description |
|---|---|---|---|
| `GET` | `/summary` | `authenticate` | Class attendance summary + risk band counts |
| `GET` | `/risks` | `authenticate` | Paginated student risk list |
| `GET` | `/trends` | `authenticate` | Date-bucketed trend series |
| `GET` | `/recovery` | `authenticate` | Recovery projection for one student |
| `GET` | `/hod` | `requireHOD` | Department-wide summary |
| `GET` | `/admin` | `requireAdmin` | Institution-wide summary |
| `GET` | `/freshness` | `authenticate` | Refresh metadata / health |
| `POST` | `/refresh` | `requireAdmin` | Trigger manual refresh |

### Example response — `/summary`

```json
{
  "success": true,
  "data": {
    "classId": 5,
    "range": { "from": "2026-08-01", "to": "2026-10-22" },
    "summary": {
      "recordedRows": 480,
      "presentRows": 388,
      "absentRows": 92,
      "attendancePercentage": 80.83
    },
    "riskBands": { "critical": 1, "atRisk": 3, "onTrack": 26, "insufficient": 0 },
    "thresholds": { "critical": 60, "atRisk": 75, "note": "Demo defaults — not official VTU/SVCE policy" },
    "freshness": {
      "lastSuccessfulRefreshAt": "2026-10-22T13:15:00Z",
      "refreshStatus": "success",
      "stale": false,
      "loadedRowCount": 1240,
      "analyticsAvailable": true
    }
  }
}
```

---

## 8. Authorization Rules

Authorization is enforced **server-side** in the controller. The client never supplies role, department, or ownership claims.

| Role | Scope | How enforced |
|---|---|---|
| Faculty | Own classes only | `classOwnership.isOwnClass(classId, req.user.id)` — checked against PostgreSQL |
| Admin | All classes | `req.user.isAdmin === true` — skips ownership check |
| HOD | Own department only | `departmentId = resolveDepartmentId(req.user.departmentCode)` — derived from server-trusted JWT, not query params |
| Admin | Institution-wide | `requireAdmin` middleware |

**A faculty member cannot see another faculty's class data by changing `class_id` in the request.** The backend verifies ownership before any DuckDB query runs.

---

## 9. Data Pipeline — How the Refresh Works

```
analyticsRefreshService.runRefresh()

1. Check DuckDB is ready and no refresh is already running (process-local mutex)
2. Mark metadata: refresh_status = 'in_progress'
3. Read ALL attendance rows from PostgreSQL (JOIN with classes + faculty for dimensions)
4. DROP TABLE IF EXISTS attendance_fact_staging
5. CREATE TABLE attendance_fact_staging (same schema as production)
6. Bulk-load all rows into staging via DuckDB Appender (high-throughput)
7. Validate: COUNT(*) in staging must equal PostgreSQL row count
8. DROP TABLE attendance_fact
9. ALTER TABLE attendance_fact_staging RENAME TO attendance_fact
10. UPDATE analytics_metadata: timestamp, row counts, duration, status = 'success'

If any step 3–9 fails:
  - The original attendance_fact table is preserved
  - Metadata updated: status = 'failed', last_error_summary set
  - Staging table dropped
  - API continues serving the last known-good dataset
```

**Why full snapshot instead of incremental?**  
The `attendance` table has no `updated_at` column, so there is no reliable watermark to detect corrections or deletions incrementally. A full replace is safe, simple, and idempotent for the current dataset size.

---

## 10. DuckDB Schema

### `attendance_fact`

| Column | Type | Source |
|---|---|---|
| `attendance_id` | `BIGINT PK` | `attendance.attendance_id` |
| `student_id` | `VARCHAR` | `attendance.student_id` (= `students.library_id`, e.g. `4SV21CS001`) |
| `class_id` | `BIGINT` | `attendance.class_id` |
| `attendance_date` | `DATE` | `attendance.attendance_date` |
| `status` | `VARCHAR` | `attendance.status` — exactly `'Present'` or `'Absent'` |
| `subject_id` | `BIGINT` | `classes.subject_id` |
| `section_id` | `BIGINT` | `classes.section_id` |
| `semester_id` | `BIGINT` | `classes.semester_id` |
| `department_id` | `BIGINT` | `faculty.department_id` (via `classes.faculty_id`) |
| `faculty_id` | `BIGINT` | `classes.faculty_id` |
| `academic_year` | `VARCHAR` | `classes.academic_year` |

### `analytics_metadata`

| Column | Type | Purpose |
|---|---|---|
| `dataset_name` | `VARCHAR PK` | Always `'attendance_fact'` |
| `last_successful_refresh_at` | `TIMESTAMPTZ` | Shown as freshness timestamp in UI |
| `source_row_count` | `BIGINT` | PostgreSQL row count at last refresh |
| `loaded_row_count` | `BIGINT` | DuckDB row count after last refresh |
| `refresh_status` | `VARCHAR` | `never_run` / `in_progress` / `success` / `failed` |
| `refresh_duration_ms` | `BIGINT` | How long the last refresh took |
| `last_error_summary` | `VARCHAR` | Sanitized error message (never raw SQL or stack traces) |

---

## 11. Frontend Integration

### Faculty Portal — `Analytics.tsx`

Below the existing overview section (attendance rate tile, IA average, class charts, meetings):
- **Section divider**
- **Attendance Intelligence** header with freshness badge
- Class selector dropdown (only the faculty's own classes)
- Date range inputs (default: academic year start → today)
- **Class Summary card** — overall %, present/absent counts, student risk band donut
- **Attendance Trend chart** — bar chart of last 10 dates
- **Student Risk List** — paginated, filterable by band, sorted by % ascending
- **Recovery Simulator** — pick a student, enter future sessions and target %, get minimum sessions needed

### HOD Portal — `Analytics.tsx`

Below the existing overview (students, faculty, meetings):
- Department-wide attendance tiles (overall %, total sessions, class count)
- Per-class breakdown table with attendance % and risk band badge
- Freshness indicator + disclaimer

### Admin Portal — `AnalyticsScreen.tsx`

Below the existing overview (students, faculty, staff, meetings):
- Institution-level tiles (overall %, total sessions, department count)
- Per-department breakdown table with %, distinct students, distinct classes
- Risk colour coding (red/amber/green)
- Freshness indicator + disclaimer

### Offline / unavailable state

If DuckDB is unavailable (503), all three portals show:
> "📊 Analytics Offline — Attendance analytics are temporarily unavailable. All other features work normally."

The existing overview charts (which query PostgreSQL directly) continue to work.

---

## 12. Test Results

```
node tests/attendanceAnalytics.test.js      → 38/38 passed  ✅
node tests/attendanceAnalyticsAPI.test.js   → 23/23 passed  ✅
Total: 61/61 — exit 0
```

### Coverage

| Group | Tests |
|---|---|
| Risk band calculations (boundary conditions) | 7 |
| Recovery formula (edge cases) | 9 |
| DuckDB service (in-memory) | 6 |
| Analytics service integration (seeded data) | 13 |
| Refresh idempotency + corrected attendance | 2 |
| PostgreSQL reconciliation (skips if no DB) | 1 |
| Config validation | 4 |
| Faculty class ownership (403 enforcement) | 6 |
| Admin bypass of class ownership | 1 |
| Response shape validation | 5 |
| HOD department from server identity | 2 |
| Admin institution summary | 1 |
| Role middleware (requireAdmin, requireHOD) | 4 |
| DuckDB disabled → 503 | 1 |

---

## 13. Start-up Instructions

### Prerequisites
- Node.js 18+ (tested on v20.12.2)
- PostgreSQL running with `education_erp` database
- `unified_backend/.env` configured (see below)

### Backend

```powershell
cd unified_backend
npm install          # installs @duckdb/node-api@1.4.1-r.5 (already in package.json)
mkdir data           # first time only — DuckDB file goes here
npm run dev
```

On first start the backend will:
1. Connect to PostgreSQL ✓
2. Bootstrap schema + seed data ✓
3. Initialize DuckDB → create `data/education_analytics.duckdb` ✓
4. Run first refresh → copy all attendance rows from PostgreSQL into DuckDB ✓
5. Start periodic refresh timer (every 15 min) ✓

### Frontend

```powershell
cd unified-frontend
npx expo start --web
```

Open `http://localhost:8081`

### Verify backend is healthy

```
GET http://localhost:5000/health
GET http://localhost:5000/api/analytics/attendance/freshness  (requires JWT)
```

---

## 14. Known Limitations

| Limitation | Impact | Mitigation |
|---|---|---|
| Full snapshot refresh (not incremental) | All rows re-loaded on every refresh | Safe for current dataset size; document for future incremental migration when `updated_at` is added to `attendance` |
| Process-local refresh lock | Two Node.js processes (multi-replica) could run simultaneous refreshes | Document limitation; use PostgreSQL advisory lock or Redis before horizontal scaling |
| DuckDB file is local to the process | File disappears if container/VM is replaced | Document; use persistent volume in production |
| No `updated_at` on `attendance` table | Cannot detect corrections between refreshes using a watermark | Full refresh handles corrections correctly; each refresh snapshot reflects current PostgreSQL state |
| Risk thresholds are demo defaults | Numbers may not match SVCE/VTU policy | Fully configurable via env vars; always labelled "demo defaults" in the UI |

---

## 15. Rollback / Disable

### Disable DuckDB without touching code

In `unified_backend/.env`:
```env
DUCKDB_ENABLED=false
```
Restart the backend. All attendance writing and PostgreSQL-based analytics continue. The new `/api/analytics/attendance/*` endpoints return 503. The existing `/api/analytics/overview` is unaffected.

### Remove the DuckDB file

```powershell
Remove-Item unified_backend/data/education_analytics.duckdb -ErrorAction SilentlyContinue
Remove-Item unified_backend/data/education_analytics.duckdb.wal -ErrorAction SilentlyContinue
```

The backend recreates it on next start (if `DUCKDB_ENABLED=true`).

### Full rollback

To remove the feature entirely, revert these files to their pre-session state:
- `unified_backend/server.js`
- `unified_backend/src/routes/index.js`
- `unified-frontend/src/screens/faculty/Analytics.tsx`
- `unified-frontend/src/screens/hod/Analytics.tsx`
- `unified-frontend/src/screens/admin/Analytics/AnalyticsScreen.tsx`

And delete the new files listed in Section 4. No database tables, migrations, or existing routes are affected.

---

## 16. Configurable Thresholds

The risk bands are **demo defaults for internal alerting UI only**. They are not verified VTU/SVCE rules. They are visible in the UI with an explicit disclaimer on every screen.

To change them:

```env
# Example: raise At Risk threshold to 80%
ATTENDANCE_THRESHOLD_CRITICAL=0.60
ATTENDANCE_THRESHOLD_AT_RISK=0.80
```

Restart the backend. All risk band calculations, API responses, and UI labels update automatically — no code change needed.

When the institution confirms its official attendance policy, update these values and version-control the change in `.env.example`.

---

## Appendix — Dependency

| Package | Version pinned | Why |
|---|---|---|
| `@duckdb/node-api` | `1.4.1-r.5` | Latest stable before 2.x; Node.js 20 compatible; prebuilt Windows x64 binaries; avoids the 1.3.3 malware advisory (GHSA-w62p-hx95-gf2c) |

Confirmed working on: **Node.js v20.12.2 · Windows 11 · PostgreSQL 14+**

---

*PostgreSQL remains the authoritative source of truth. No destructive database operation was performed during this implementation. No attendance record was modified, dropped, or reset.*
