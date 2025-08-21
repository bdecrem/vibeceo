-- Add credit tracking fields to sms_subscribers table
-- Run each statement separately in Supabase SQL editor

-- Add credits remaining field
ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 0;

-- Add usage count field  
ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Add last usage timestamp field
ALTER TABLE sms_subscribers ADD COLUMN IF NOT EXISTS last_usage_date TIMESTAMP;

-- Add index for fast credit lookups
CREATE INDEX IF NOT EXISTS idx_sms_subscribers_credits_remaining ON sms_subscribers(credits_remaining);

-- Add documentation comments (optional)
COMMENT ON COLUMN sms_subscribers.credits_remaining IS 'Number of app creation credits remaining';
COMMENT ON COLUMN sms_subscribers.usage_count IS 'Total number of apps created by this user';
COMMENT ON COLUMN sms_subscribers.last_usage_date IS 'When the user last created an app';