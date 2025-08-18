-- Add upload authentication columns to sms_subscribers table
-- Run this SQL in your Supabase SQL Editor

-- Add the columns
ALTER TABLE public.sms_subscribers 
ADD COLUMN IF NOT EXISTS upload_auth_code TEXT,
ADD COLUMN IF NOT EXISTS upload_auth_expires TIMESTAMP WITH TIME ZONE;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_subscribers_upload_auth 
  ON public.sms_subscribers (upload_auth_code, upload_auth_expires) 
  WHERE upload_auth_code IS NOT NULL;

-- Function to clean up expired codes (optional - can be run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_upload_codes()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE sms_subscribers 
  SET 
    upload_auth_code = NULL,
    upload_auth_expires = NULL
  WHERE 
    upload_auth_expires IS NOT NULL 
    AND upload_auth_expires < NOW();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON COLUMN public.sms_subscribers.upload_auth_code IS '6-digit SMS verification code for upload access (NULL when no active code)';
COMMENT ON COLUMN public.sms_subscribers.upload_auth_expires IS 'When the upload auth code expires (typically 10 minutes after creation)';

-- Test query to verify the columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'sms_subscribers' 
  AND column_name IN ('upload_auth_code', 'upload_auth_expires')
ORDER BY column_name;