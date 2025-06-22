-- Add wtaf_zero_admin_collaborative table for Zero Admin Data collaborative apps
-- This table stores collaborative app data without admin interfaces

CREATE TABLE IF NOT EXISTS wtaf_zero_admin_collaborative (
    id BIGSERIAL PRIMARY KEY,
    app_id TEXT NOT NULL,
    action_type TEXT NOT NULL, -- 'join', 'message', 'data', 'vote', etc.
    user_identifier TEXT NOT NULL, -- emoji, username, etc.
    passcode TEXT, -- for authentication
    content TEXT, -- message content, data payload, etc.
    metadata JSONB, -- additional structured data
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments to document the columns
COMMENT ON TABLE wtaf_zero_admin_collaborative IS 'Collaborative app data for Zero Admin Data (ZAD) apps - no admin interface needed';
COMMENT ON COLUMN wtaf_zero_admin_collaborative.app_id IS 'Unique identifier for the collaborative app instance';
COMMENT ON COLUMN wtaf_zero_admin_collaborative.action_type IS 'Type of action: join, message, vote, data, etc.';
COMMENT ON COLUMN wtaf_zero_admin_collaborative.user_identifier IS 'User identification (emoji, username, etc.)';
COMMENT ON COLUMN wtaf_zero_admin_collaborative.passcode IS 'User authentication code';
COMMENT ON COLUMN wtaf_zero_admin_collaborative.content IS 'Message content, data payload, or other content';
COMMENT ON COLUMN wtaf_zero_admin_collaborative.metadata IS 'Additional structured data as JSON';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_zad_app_id ON wtaf_zero_admin_collaborative(app_id);
CREATE INDEX IF NOT EXISTS idx_zad_app_action ON wtaf_zero_admin_collaborative(app_id, action_type);
CREATE INDEX IF NOT EXISTS idx_zad_user_auth ON wtaf_zero_admin_collaborative(app_id, user_identifier, passcode);
CREATE INDEX IF NOT EXISTS idx_zad_created_at ON wtaf_zero_admin_collaborative(created_at);

-- Enable Row Level Security (optional - can be enabled later if needed)
-- ALTER TABLE wtaf_zero_admin_collaborative ENABLE ROW LEVEL SECURITY; 