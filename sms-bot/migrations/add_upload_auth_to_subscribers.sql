-- Add upload authentication columns to existing sms_subscribers table
-- Much simpler than creating a separate table

ALTER TABLE public.sms_subscribers 
ADD COLUMN IF NOT EXISTS upload_auth_code TEXT,
ADD COLUMN IF NOT EXISTS upload_auth_expires TIMESTAMP WITH TIME ZONE;

-- Index for efficient code lookup
CREATE INDEX IF NOT EXISTS idx_subscribers_upload_auth 
  ON public.sms_subscribers (upload_auth_code, upload_auth_expires) 
  WHERE upload_auth_code IS NOT NULL;

-- Function to clean up expired codes (can be run periodically)
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

-- Add comments
COMMENT ON COLUMN public.sms_subscribers.upload_auth_code IS '6-digit SMS verification code for upload access (NULL when no active code)';
COMMENT ON COLUMN public.sms_subscribers.upload_auth_expires IS 'When the upload auth code expires (typically 10 minutes after creation)';