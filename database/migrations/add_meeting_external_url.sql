-- ─── External meeting link ──────────────────────────────────
-- Lets a creator paste a meeting link from another platform (Zoom, Teams,
-- Meet, etc.) instead of the auto-generated Jitsi URL. Kept as a separate
-- column rather than overwriting meeting_url so the generated Jitsi link
-- is never lost — the effective link is external_meeting_url when present,
-- falling back to meeting_url otherwise (computed in application queries).
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS external_meeting_url TEXT;

COMMENT ON COLUMN meetings.external_meeting_url IS 'Optional creator-supplied meeting link (any platform). Takes precedence over the auto-generated meeting_url when present.';
