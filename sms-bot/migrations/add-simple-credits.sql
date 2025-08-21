-- Simple credit tracking - just add 3 fields to existing sms_subscribers table

ALTER TABLE sms_subscribers 
ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 0;

ALTER TABLE sms_subscribers 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

ALTER TABLE sms_subscribers 
ADD COLUMN IF NOT EXISTS last_usage_date TIMESTAMP;

-- Add index for credit lookups
CREATE INDEX IF NOT EXISTS idx_sms_subscribers_credits_remaining 
ON sms_subscribers(credits_remaining);

-- Add comments
COMMENT ON COLUMN sms_subscribers.credits_remaining IS 'Number of app creation credits remaining';
COMMENT ON COLUMN sms_subscribers.usage_count IS 'Total number of apps created by this user';
COMMENT ON COLUMN sms_subscribers.last_usage_date IS 'When the user last created an app';