-- Migration: Make activities.student_id nullable for IndustryProject rows
-- This allows creating a project header (no student yet) for the
-- project-first UX in the HOD portal.
--
-- SAFE: No other activity type creates rows with student_id = NULL because
-- their service layers all require student_id. Only IndustryProject's
-- service is updated to allow null.

-- 1. Drop the NOT NULL constraint on activities.student_id
--    (the FK to students remains, so non-null values are still validated)
ALTER TABLE activities ALTER COLUMN student_id DROP NOT NULL;

-- 2. Update the FK so it is now optional (allow NULL → no student)
--    The FK constraint already supports NULL naturally once NOT NULL is dropped.
--    No change needed to the FK itself.
