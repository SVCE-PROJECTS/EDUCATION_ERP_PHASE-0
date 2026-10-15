-- ============================================================
-- MEETING MANAGEMENT MIGRATION
-- Adds meeting scheduling, approval, and workflow functionality
-- Database: education_erp (confirmed from package.json scripts)
-- ============================================================

-- ─── MEETINGS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meetings (
    meeting_id          BIGSERIAL       PRIMARY KEY,
    title               VARCHAR(200)    NOT NULL,
    agenda              TEXT,
    requester_user_id   BIGINT          NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    department_id       BIGINT          REFERENCES departments(department_id) ON DELETE RESTRICT,

    -- Schedule details
    meeting_date        DATE            NOT NULL,
    start_time          TIME            NOT NULL,
    duration_minutes    INTEGER         NOT NULL DEFAULT 60
                        CHECK (duration_minutes > 0 AND duration_minutes <= 480), -- Max 8 hours
    end_time            TIME            GENERATED ALWAYS AS (
                                    CASE
                                        WHEN duration_minutes IS NOT NULL
                                        THEN start_time + INTERVAL '1 minute' * duration_minutes
                                        ELSE NULL
                                    END
                                ) STORED,

    -- Meeting lifecycle with soft delete for data retention
    status              VARCHAR(30)     NOT NULL DEFAULT 'pending_availability'
                        CHECK (status IN (
                            'pending_availability',     -- Waiting for participant availability responses
                            'pending_approval',         -- Waiting for required approvals
                            'confirmed',                -- Meeting is confirmed and ready
                            'rejected',                 -- Approval was rejected
                            'cancelled',                -- Cancelled by requester/admin
                            'rescheduled',              -- Rescheduled to new time
                            'in_progress',              -- Meeting is currently happening
                            'completed',                -- Meeting finished
                            'deleted'                   -- Soft deleted - preserves history
                        )),
    deleted_at          TIMESTAMPTZ,                   -- Soft delete timestamp

    -- Meeting provider details
    meeting_url         TEXT,                          -- Jitsi or other meeting URL
    meeting_provider    VARCHAR(50)     DEFAULT 'jitsi', -- 'jitsi', 'zoom', 'teams', etc.

    -- Workflow metadata
    availability_deadline   TIMESTAMPTZ,               -- Deadline for availability responses
    approval_deadline       TIMESTAMPTZ,               -- Deadline for approvals
    confirmed_at            TIMESTAMPTZ,               -- When meeting was confirmed

    -- Audit trail
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Rescheduling chain
    original_meeting_id BIGINT          REFERENCES meetings(meeting_id) ON DELETE SET NULL,
    reschedule_reason   TEXT,

    -- Constraint: Meetings cannot reach or cross midnight (strict enforcement)
    -- Only applies when duration_minutes is not NULL (online meetings)
    CONSTRAINT chk_meeting_before_midnight CHECK (
        duration_minutes IS NULL OR
        (EXTRACT(EPOCH FROM start_time) + (duration_minutes * 60) < 86400)
    ),

    -- Constraint: Soft delete consistency
    CONSTRAINT chk_soft_delete_consistency CHECK (
        (status = 'deleted' AND deleted_at IS NOT NULL) OR
        (status != 'deleted' AND deleted_at IS NULL)
    )
);

-- Existing meetings remain online. New offline meetings use the same record
-- and participant relationships, with no video URL or approval requirement.
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_type VARCHAR(10) NOT NULL DEFAULT 'online';
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE meetings ALTER COLUMN duration_minutes DROP NOT NULL;

-- Update generated column constraint safely for existing databases
DO $$
DECLARE
    current_definition TEXT;
    expected_definition TEXT := 'CASE WHEN (duration_minutes IS NOT NULL) THEN (start_time + ((''1 minute''::interval) * (duration_minutes)::double precision)) ELSE NULL::time without time zone END';
BEGIN
    -- Check if end_time column exists and get its generation expression
    -- Use explicit schema to avoid ambiguity
    SELECT pg_get_expr(pg_attrdef.adbin, pg_attrdef.adrelid) INTO current_definition
    FROM pg_attribute
    JOIN pg_class ON pg_attribute.attrelid = pg_class.oid
    JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
    JOIN pg_attrdef ON pg_attrdef.adrelid = pg_class.oid AND pg_attrdef.adnum = pg_attribute.attnum
    WHERE pg_namespace.nspname = CURRENT_SCHEMA()
      AND pg_class.relname = 'meetings'
      AND pg_attribute.attname = 'end_time'
      AND pg_attribute.attgenerated = 's';  -- stored generated column

    IF current_definition IS NULL THEN
        -- Column doesn't exist or isn't generated, create it
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = CURRENT_SCHEMA()
              AND table_name = 'meetings'
              AND column_name = 'end_time'
        ) THEN
            -- Column doesn't exist at all, create it
            ALTER TABLE meetings ADD COLUMN end_time TIME
            GENERATED ALWAYS AS (
                CASE
                    WHEN duration_minutes IS NOT NULL
                    THEN start_time + INTERVAL '1 minute' * duration_minutes
                    ELSE NULL
                END
            ) STORED;
        ELSE
            -- Column exists but is not generated correctly, need to fix it
            -- First check if there are any dependent objects
            IF EXISTS (
                SELECT 1 FROM pg_depend d
                JOIN pg_attribute a ON d.refobjid = a.attrelid AND d.refobjsubid = a.attnum
                JOIN pg_class c ON a.attrelid = c.oid
                JOIN pg_namespace n ON c.relnamespace = n.oid
                WHERE n.nspname = CURRENT_SCHEMA()
                  AND c.relname = 'meetings'
                  AND a.attname = 'end_time'
                  AND d.deptype IN ('n', 'a')  -- normal or auto dependency
            ) THEN
                RAISE EXCEPTION 'Cannot safely update end_time column: dependent objects exist. Manual intervention required.';
            END IF;

            -- Safe to recreate
            ALTER TABLE meetings DROP COLUMN end_time;
            ALTER TABLE meetings ADD COLUMN end_time TIME
            GENERATED ALWAYS AS (
                CASE
                    WHEN duration_minutes IS NOT NULL
                    THEN start_time + INTERVAL '1 minute' * duration_minutes
                    ELSE NULL
                END
            ) STORED;
        END IF;
    ELSE
        -- Column exists as generated, check if definition matches expected
        -- More precise pattern matching for the generated column expression
        IF current_definition IS NULL OR
           (current_definition NOT LIKE '%CASE%' OR
            current_definition NOT LIKE '%duration_minutes IS NOT NULL%' OR
            current_definition NOT LIKE '%start_time%' OR
            current_definition NOT LIKE '%INTERVAL%' OR
            current_definition NOT LIKE '%duration_minutes%' OR
            current_definition NOT LIKE '%ELSE NULL%') THEN
            -- Definition is missing or different, need to update
            -- Check for dependencies first (excluding self-references and system dependencies)
            IF EXISTS (
                SELECT 1 FROM pg_depend d
                JOIN pg_attribute a ON d.refobjid = a.attrelid AND d.refobjsubid = a.attnum
                JOIN pg_class c ON a.attrelid = c.oid
                JOIN pg_namespace n ON c.relnamespace = n.oid
                JOIN pg_class dep_class ON d.objid = dep_class.oid
                WHERE n.nspname = CURRENT_SCHEMA()
                  AND c.relname = 'meetings'
                  AND a.attname = 'end_time'
                  AND d.deptype IN ('n', 'a')  -- normal or auto dependency
                  AND d.objid != d.refobjid   -- exclude self-references
                  AND dep_class.relkind IN ('r', 'v', 'i')  -- only tables, views, indexes
            ) THEN
                RAISE EXCEPTION 'Cannot safely update end_time column: dependent objects exist (views, indexes, or constraints). Manual intervention required. Current definition: %', current_definition;
            END IF;

            -- Safe to recreate with correct definition
            ALTER TABLE meetings DROP COLUMN end_time;
            ALTER TABLE meetings ADD COLUMN end_time TIME
            GENERATED ALWAYS AS (
                CASE
                    WHEN duration_minutes IS NOT NULL
                    THEN start_time + INTERVAL '1 minute' * duration_minutes
                    ELSE NULL
                END
            ) STORED;
        END IF;
        -- If definition matches expected pattern, do nothing (idempotent)
    END IF;

    -- Update midnight constraint to handle NULL duration
    -- Check if constraint exists and has correct definition
    IF EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = CURRENT_SCHEMA()
          AND t.relname = 'meetings'
          AND c.conname = 'chk_meeting_before_midnight'
    ) THEN
        -- Check if current constraint definition handles NULL correctly
        -- Get the constraint definition and validate it completely
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            WHERE n.nspname = CURRENT_SCHEMA()
              AND t.relname = 'meetings'
              AND c.conname = 'chk_meeting_before_midnight'
              AND pg_get_constraintdef(c.oid) LIKE '%duration_minutes IS NULL%'
              AND pg_get_constraintdef(c.oid) LIKE '%EXTRACT%EPOCH%FROM start_time%'
              AND pg_get_constraintdef(c.oid) LIKE '%duration_minutes * 60%'
              AND pg_get_constraintdef(c.oid) LIKE '%< 86400%'
        ) THEN
            -- Constraint exists but doesn't handle NULL or has wrong logic, update it
            ALTER TABLE meetings DROP CONSTRAINT chk_meeting_before_midnight;
            ALTER TABLE meetings ADD CONSTRAINT chk_meeting_before_midnight CHECK (
                duration_minutes IS NULL OR
                (EXTRACT(EPOCH FROM start_time) + (duration_minutes * 60) < 86400)
            );
        END IF;
        -- If constraint already handles NULL correctly, do nothing (idempotent)
    ELSE
        -- Constraint doesn't exist, create it (this should not happen in practice
        -- since it's defined in the main CREATE TABLE, but handle for safety)
        ALTER TABLE meetings ADD CONSTRAINT chk_meeting_before_midnight CHECK (
            duration_minutes IS NULL OR
            (EXTRACT(EPOCH FROM start_time) + (duration_minutes * 60) < 86400)
        );
    END IF;
END;
$$;

-- Handle meeting type constraint separately for clarity
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = CURRENT_SCHEMA()
          AND t.relname = 'meetings'
          AND c.conname = 'chk_meetings_type'
    ) THEN
        ALTER TABLE meetings ADD CONSTRAINT chk_meetings_type
            CHECK (meeting_type IN ('online', 'offline'));
    ELSE
        -- Verify the constraint has the correct definition
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_class t ON c.conrelid = t.oid
            JOIN pg_namespace n ON t.relnamespace = n.oid
            WHERE n.nspname = CURRENT_SCHEMA()
              AND t.relname = 'meetings'
              AND c.conname = 'chk_meetings_type'
              AND pg_get_constraintdef(c.oid) LIKE '%meeting_type%'
              AND pg_get_constraintdef(c.oid) LIKE '%online%'
              AND pg_get_constraintdef(c.oid) LIKE '%offline%'
        ) THEN
            -- Constraint exists but has wrong definition, update it
            ALTER TABLE meetings DROP CONSTRAINT chk_meetings_type;
            ALTER TABLE meetings ADD CONSTRAINT chk_meetings_type
                CHECK (meeting_type IN ('online', 'offline'));
        END IF;
        -- If constraint is correct, do nothing (idempotent)
    END IF;
END;
$$;

-- ─── MEETING PARTICIPANTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS meeting_participants (
    participant_id      BIGSERIAL       PRIMARY KEY,
    meeting_id          BIGINT          NOT NULL REFERENCES meetings(meeting_id) ON DELETE RESTRICT,
    participant_user_id BIGINT          REFERENCES users(user_id) ON DELETE SET NULL,
    participant_name    VARCHAR(200)    NOT NULL,    -- Backend must populate from users/faculty
    participant_email   VARCHAR(150),               -- Cached for notifications

    -- Availability response
    availability_status VARCHAR(20)     NOT NULL DEFAULT 'pending'
                        CHECK (availability_status IN ('pending', 'available', 'unavailable')),
    availability_response_at TIMESTAMPTZ,
    unavailable_reason  TEXT,

    -- Participation metadata
    is_required         BOOLEAN         NOT NULL DEFAULT true,    -- Required vs optional participant
    invited_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Unique constraint: one participant record per meeting per user (when user exists)
    UNIQUE(meeting_id, participant_user_id)
);

-- ─── MEETING APPROVALS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS meeting_approvals (
    approval_id         BIGSERIAL       PRIMARY KEY,
    meeting_id          BIGINT          NOT NULL REFERENCES meetings(meeting_id) ON DELETE RESTRICT,
    approver_user_id    BIGINT          REFERENCES users(user_id) ON DELETE SET NULL,
    approver_name       VARCHAR(200)    NOT NULL,    -- Backend must populate from users/faculty

    -- Approval decision
    approval_status     VARCHAR(20)     NOT NULL DEFAULT 'pending'
                        CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approval_decision_at TIMESTAMPTZ,
    rejection_reason    TEXT,

    -- Metadata
    required_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Unique constraint: one approval record per meeting per approver (when user exists)
    UNIQUE(meeting_id, approver_user_id)
);

-- Persistent in-app notifications for arranged offline meetings.
CREATE TABLE IF NOT EXISTS meeting_notifications (
    notification_id BIGSERIAL PRIMARY KEY,
    meeting_id BIGINT NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
    recipient_user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
    recipient_employee_id VARCHAR(50) REFERENCES faculty(employee_id) ON DELETE CASCADE,
    notification_type VARCHAR(40) NOT NULL DEFAULT 'offline_meeting_arranged',
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    CONSTRAINT chk_meeting_notification_recipient CHECK (
        recipient_user_id IS NOT NULL OR recipient_employee_id IS NOT NULL
    )
);

-- ─── MEETING DOCUMENTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS meeting_documents (
    document_id         BIGSERIAL       PRIMARY KEY,
    meeting_id          BIGINT          NOT NULL REFERENCES meetings(meeting_id) ON DELETE RESTRICT,

    -- File metadata (follows existing upload patterns)
    original_filename   VARCHAR(255)    NOT NULL,
    stored_filename     VARCHAR(255)    NOT NULL,
    file_path           VARCHAR(500)    NOT NULL,  -- Relative path from uploads/
    file_size           BIGINT          NOT NULL,
    mime_type           VARCHAR(100),

    -- Document context
    document_type       VARCHAR(50)     NOT NULL DEFAULT 'attachment'
                        CHECK (document_type IN ('attachment', 'agenda', 'minutes', 'action_items')),
    description         TEXT,

    -- Upload metadata
    uploaded_by_user_id BIGINT          REFERENCES users(user_id) ON DELETE SET NULL,
    uploaded_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─── POST-MEETING RECORDS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS meeting_minutes (
    minutes_id          BIGSERIAL       PRIMARY KEY,
    meeting_id          BIGINT          NOT NULL REFERENCES meetings(meeting_id) ON DELETE RESTRICT,

    -- Meeting summary
    summary             TEXT,
    decisions_made      TEXT,
    key_discussions     TEXT,

    -- Recording metadata
    recorded_by_user_id BIGINT          REFERENCES users(user_id) ON DELETE SET NULL,
    recorded_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    last_updated_by_user_id BIGINT      REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- Only one minutes record per meeting
    UNIQUE(meeting_id)
);

-- ─── ACTION ITEMS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meeting_action_items (
    action_id           BIGSERIAL       PRIMARY KEY,
    meeting_id          BIGINT          NOT NULL REFERENCES meetings(meeting_id) ON DELETE RESTRICT,

    -- Action details
    description         TEXT            NOT NULL,
    assigned_to_user_id BIGINT          REFERENCES users(user_id) ON DELETE SET NULL,
    assignee_name       VARCHAR(200)    NOT NULL,    -- Backend must populate from users/faculty
    due_date            DATE,
    priority            VARCHAR(20)     NOT NULL DEFAULT 'medium'
                        CHECK (priority IN ('low', 'medium', 'high', 'critical')),

    -- Status tracking
    status              VARCHAR(20)     NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled')),
    completion_notes    TEXT,
    completed_at        TIMESTAMPTZ,

    -- Audit trail - RESTRICT preserves critical audit attribution
    created_by_user_id  BIGINT          NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_by_user_id  BIGINT          NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ─── INDEXES FOR PERFORMANCE ─────────────────────────────────
-- Active meetings (excludes soft deleted)
CREATE INDEX IF NOT EXISTS idx_meetings_active ON meetings(meeting_id) WHERE status != 'deleted';
CREATE INDEX IF NOT EXISTS idx_meetings_requester ON meetings(requester_user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_department ON meetings(department_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date_time ON meetings(meeting_date, start_time);
CREATE INDEX IF NOT EXISTS idx_meetings_type_date ON meetings(meeting_type, meeting_date);

-- Participants
CREATE INDEX IF NOT EXISTS idx_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON meeting_participants(participant_user_id);
CREATE INDEX IF NOT EXISTS idx_participants_availability ON meeting_participants(availability_status);

-- Approvals
CREATE INDEX IF NOT EXISTS idx_approvals_meeting ON meeting_approvals(meeting_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON meeting_approvals(approver_user_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON meeting_approvals(approval_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_notifications_employee_unique
    ON meeting_notifications(meeting_id, recipient_employee_id)
    WHERE recipient_employee_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_notifications_user_unique
    ON meeting_notifications(meeting_id, recipient_user_id)
    WHERE recipient_employee_id IS NULL AND recipient_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_meeting_notifications_recipient_employee
    ON meeting_notifications(recipient_employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meeting_notifications_recipient_user
    ON meeting_notifications(recipient_user_id, created_at DESC);

-- Documents
CREATE INDEX IF NOT EXISTS idx_documents_meeting ON meeting_documents(meeting_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON meeting_documents(document_type);

-- Action Items
CREATE INDEX IF NOT EXISTS idx_action_items_meeting ON meeting_action_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_action_items_assignee ON meeting_action_items(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON meeting_action_items(status);
CREATE INDEX IF NOT EXISTS idx_action_items_due_date ON meeting_action_items(due_date);

-- ─── TIMESTAMP TRIGGERS ──────────────────────────────────────

-- Create meeting-specific timestamp functions (idempotent with CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION update_meeting_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_meeting_minutes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_meeting_action_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers only if they don't exist (safe for repeated execution)
DO $$
BEGIN
    -- meetings table trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'meetings_updated_at_trigger'
          AND tgrelid = 'meetings'::regclass
    ) THEN
        CREATE TRIGGER meetings_updated_at_trigger
            BEFORE UPDATE ON meetings
            FOR EACH ROW
            EXECUTE FUNCTION update_meeting_updated_at();
    END IF;

    -- meeting_minutes table trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'minutes_updated_at_trigger'
          AND tgrelid = 'meeting_minutes'::regclass
    ) THEN
        CREATE TRIGGER minutes_updated_at_trigger
            BEFORE UPDATE ON meeting_minutes
            FOR EACH ROW
            EXECUTE FUNCTION update_meeting_minutes_updated_at();
    END IF;

    -- meeting_action_items table trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'action_items_updated_at_trigger'
          AND tgrelid = 'meeting_action_items'::regclass
    ) THEN
        CREATE TRIGGER action_items_updated_at_trigger
            BEFORE UPDATE ON meeting_action_items
            FOR EACH ROW
            EXECUTE FUNCTION update_meeting_action_items_updated_at();
    END IF;
END;
$$;

-- ─── TABLE COMMENTS ──────────────────────────────────────────
COMMENT ON TABLE meetings IS 'Meeting requests with approval workflow and soft-delete lifecycle management';
COMMENT ON TABLE meeting_participants IS 'Meeting participants with availability responses and cached identity';
COMMENT ON TABLE meeting_approvals IS 'Required approvals for meeting requests with cached approver identity';
COMMENT ON TABLE meeting_documents IS 'File attachments using existing upload infrastructure';
COMMENT ON TABLE meeting_minutes IS 'Post-meeting summary, decisions, and discussions';
COMMENT ON TABLE meeting_action_items IS 'Action items with assignment tracking and audit trail';

-- ─── COLUMN COMMENTS ─────────────────────────────────────────
COMMENT ON COLUMN meetings.status IS 'Meeting lifecycle: pending_availability → pending_approval → confirmed → completed. Use "deleted" for soft delete';
COMMENT ON COLUMN meetings.deleted_at IS 'Soft delete timestamp - prevents hard delete data loss';
COMMENT ON COLUMN meetings.end_time IS 'Generated: start_time + duration_minutes, constrained before midnight';
COMMENT ON COLUMN meetings.requester_user_id IS 'RESTRICT: Prevents deletion of users with institutional meeting history';
COMMENT ON COLUMN meetings.department_id IS 'RESTRICT: Prevents department deletion from changing meeting semantics';

COMMENT ON COLUMN meeting_participants.participant_name IS 'REQUIRED: Backend must populate when creating record to survive user deletion';
COMMENT ON COLUMN meeting_participants.participant_user_id IS 'SET NULL: Preserves participation history when user deleted';

COMMENT ON COLUMN meeting_approvals.approver_name IS 'REQUIRED: Backend must populate when creating record to survive user deletion';
COMMENT ON COLUMN meeting_approvals.approver_user_id IS 'SET NULL: Preserves approval decisions when user deleted';

COMMENT ON COLUMN meeting_documents.uploaded_by_user_id IS 'SET NULL: Preserves document metadata when user deleted - NO name cache, displays as "[Deleted User]"';

COMMENT ON COLUMN meeting_minutes.recorded_by_user_id IS 'SET NULL: Preserves minutes when recorder deleted - NO name cache, displays as "[Deleted User]"';
COMMENT ON COLUMN meeting_minutes.last_updated_by_user_id IS 'SET NULL: Preserves minutes when editor deleted - NO name cache, displays as "[Deleted User]"';

COMMENT ON COLUMN meeting_action_items.assignee_name IS 'REQUIRED: Backend must populate when creating record to survive user deletion';
COMMENT ON COLUMN meeting_action_items.assigned_to_user_id IS 'SET NULL: Preserves action items when assignee deleted';
COMMENT ON COLUMN meeting_action_items.created_by_user_id IS 'RESTRICT: Critical audit trail - prevents creator deletion';
COMMENT ON COLUMN meeting_action_items.updated_by_user_id IS 'RESTRICT: Critical audit trail - prevents editor deletion';