-- Migration: Add system state table for tracking automated processes
-- This table stores key-value pairs for system state (like last check times)

CREATE TABLE IF NOT EXISTS wtaf_system_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial values
INSERT INTO wtaf_system_state (key, value, updated_at) 
VALUES ('last_user_check', '2025-01-01T00:00:00.000Z', NOW())
ON CONFLICT (key) DO NOTHING;

-- Index for performance (though not needed with small data)
CREATE INDEX IF NOT EXISTS idx_system_state_updated 
ON wtaf_system_state(updated_at);

COMMENT ON TABLE wtaf_system_state IS 'System state storage for automated processes';
COMMENT ON COLUMN wtaf_system_state.key IS 'Unique identifier for the state value';
COMMENT ON COLUMN wtaf_system_state.value IS 'State value (typically timestamp or config)';
COMMENT ON COLUMN wtaf_system_state.updated_at IS 'When this state was last updated';