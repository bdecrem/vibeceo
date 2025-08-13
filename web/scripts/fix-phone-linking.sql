-- Add a column to temporarily store the phone number being verified
ALTER TABLE sms_subscribers 
ADD COLUMN IF NOT EXISTS pending_phone_number VARCHAR(20);

-- Add comment
COMMENT ON COLUMN sms_subscribers.pending_phone_number IS 'Phone number awaiting verification for linking';