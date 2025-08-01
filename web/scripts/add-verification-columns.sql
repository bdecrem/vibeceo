-- Add verification columns to sms_subscribers table
-- These columns are used for phone number verification when linking accounts

ALTER TABLE sms_subscribers 
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMPTZ;

-- Add comments to document the columns
COMMENT ON COLUMN sms_subscribers.verification_code IS 'Temporary 6-digit code for phone verification';
COMMENT ON COLUMN sms_subscribers.verification_expires IS 'Expiration time for the verification code';

-- Create an index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_sms_subscribers_phone ON sms_subscribers(phone_number);

-- Optional: Create a function to clean up expired verification codes
CREATE OR REPLACE FUNCTION clean_expired_verifications()
RETURNS void AS $$
BEGIN
    UPDATE sms_subscribers 
    SET verification_code = NULL, 
        verification_expires = NULL
    WHERE verification_expires < NOW()
      AND verification_code IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- You can run this function periodically or set up a cron job:
-- SELECT clean_expired_verifications();