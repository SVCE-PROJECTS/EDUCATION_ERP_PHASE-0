-- ============================================================
-- SCHEDULES TABLE MIGRATION
-- Adds personal schedules/calendar events for users
-- ============================================================

CREATE TABLE IF NOT EXISTS schedules (
    schedule_id   BIGSERIAL    PRIMARY KEY,
    user_id       VARCHAR(50)  NOT NULL,  -- employee_id or user identifier
    user_role     VARCHAR(20)  NOT NULL CHECK (user_role IN ('admin', 'hod', 'faculty')),
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    date          DATE         NOT NULL,
    start_time    TIME,
    end_time      TIME,
    status        VARCHAR(20)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedules_user_date ON schedules(user_id, date);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON schedules(status);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schedules_updated_at_trigger
    BEFORE UPDATE ON schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_schedules_updated_at();

-- Comments
COMMENT ON TABLE schedules IS 'Personal schedules and calendar events for users across all portals';
COMMENT ON COLUMN schedules.user_id IS 'The employee_id or user identifier from the auth token';
COMMENT ON COLUMN schedules.user_role IS 'Portal role: admin, hod, or faculty';
COMMENT ON COLUMN schedules.status IS 'Status: pending (default) or completed';
