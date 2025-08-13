-- Create waitlist table for managing SMS bot user registration overflow
CREATE TABLE IF NOT EXISTS sms_waitlist (
    id BIGSERIAL PRIMARY KEY,
    phone_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'approved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    notified_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes for performance
    CONSTRAINT phone_number_format CHECK (phone_number ~ '^\+[1-9]\d{1,14}$')
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sms_waitlist_status ON sms_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_sms_waitlist_created_at ON sms_waitlist(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_waitlist_phone ON sms_waitlist(phone_number);

-- Enable RLS (Row Level Security) if needed
ALTER TABLE sms_waitlist ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (adjust as needed based on your auth setup)
CREATE POLICY "Users can view their own waitlist status" ON sms_waitlist
    FOR SELECT USING (true); -- Allow reading for now, can be restricted later

CREATE POLICY "Admins can manage waitlist" ON sms_waitlist
    FOR ALL USING (true); -- Allow all operations for now, can be restricted to admin users

-- Add comments for documentation
COMMENT ON TABLE sms_waitlist IS 'Waitlist for SMS bot user registration overflow management';
COMMENT ON COLUMN sms_waitlist.phone_number IS 'Normalized phone number in E.164 format (+1234567890)';
COMMENT ON COLUMN sms_waitlist.status IS 'Current status: waiting (in queue) or approved (can register)';
COMMENT ON COLUMN sms_waitlist.created_at IS 'When the user was added to the waitlist';
COMMENT ON COLUMN sms_waitlist.approved_at IS 'When the user was approved by admin';
COMMENT ON COLUMN sms_waitlist.notified_at IS 'When the user was notified of approval';