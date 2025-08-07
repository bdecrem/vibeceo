-- Create notification_state table to track when we last checked for new users
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS notification_state (
    id TEXT PRIMARY KEY,
    last_checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add comment for documentation
COMMENT ON TABLE notification_state IS 'Tracks state for various notification checks (new users, etc.)';
COMMENT ON COLUMN notification_state.id IS 'Unique identifier for the check type (e.g., "new-users-check")';
COMMENT ON COLUMN notification_state.last_checked_at IS 'When this check was last performed';
COMMENT ON COLUMN notification_state.metadata IS 'Optional metadata for the check';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_state_id ON notification_state(id);

-- Insert initial record for new users check (optional - script will create if missing)
INSERT INTO notification_state (id, last_checked_at)
VALUES ('new-users-check', NOW())
ON CONFLICT (id) DO NOTHING;