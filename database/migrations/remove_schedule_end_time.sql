-- ============================================================
-- REMOVE end_time COLUMN FROM schedules TABLE
-- Migration to drop the unused end_time column
-- ============================================================

-- Drop the end_time column
ALTER TABLE schedules DROP COLUMN IF EXISTS end_time;

-- Add comment to document the change
COMMENT ON TABLE schedules IS 'Personal schedules and calendar events for users across all portals (end_time removed - single time point only)';
