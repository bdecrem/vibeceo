-- Create table for upload authentication codes
-- This table stores temporary SMS verification codes for upload access

CREATE TABLE IF NOT EXISTS public.wtaf_upload_auth_codes (
  -- Primary key
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- User relationship
  user_id UUID NOT NULL,
  user_slug TEXT NOT NULL,
  
  -- Authentication code
  code TEXT NOT NULL, -- 6-digit verification code
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  used BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Constraints
  CONSTRAINT wtaf_upload_auth_codes_pkey PRIMARY KEY (id),
  CONSTRAINT wtaf_upload_auth_codes_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES sms_subscribers (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wtaf_auth_codes_user_slug 
  ON public.wtaf_upload_auth_codes USING btree (user_slug) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_wtaf_auth_codes_code 
  ON public.wtaf_upload_auth_codes USING btree (code) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_wtaf_auth_codes_expires 
  ON public.wtaf_upload_auth_codes USING btree (expires_at) 
  TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_wtaf_auth_codes_unused 
  ON public.wtaf_upload_auth_codes USING btree (user_slug, used, expires_at) 
  TABLESPACE pg_default
  WHERE used = FALSE;

-- Function to clean up expired codes (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_auth_codes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM wtaf_upload_auth_codes
  WHERE expires_at < NOW() - INTERVAL '1 day';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE public.wtaf_upload_auth_codes ENABLE ROW LEVEL SECURITY;

-- Policy: API access for upload verification system
CREATE POLICY "API access for uploads" ON public.wtaf_upload_auth_codes
  FOR ALL
  TO postgres, anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE public.wtaf_upload_auth_codes IS 'Stores temporary SMS verification codes for upload page access';
COMMENT ON COLUMN public.wtaf_upload_auth_codes.code IS '6-digit verification code sent via SMS';
COMMENT ON COLUMN public.wtaf_upload_auth_codes.expires_at IS 'When the code expires (typically 10 minutes after creation)';
COMMENT ON COLUMN public.wtaf_upload_auth_codes.used IS 'Whether the code has been used for authentication';