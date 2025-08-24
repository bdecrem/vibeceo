-- Simple WEBTOYS ALERTS table
-- Stores basic alert requests from users

CREATE TABLE IF NOT EXISTS public.wtaf_alerts (
  -- Primary key
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  
  -- User info
  phone_number TEXT NOT NULL,
  user_slug TEXT,
  
  -- Alert details
  request TEXT NOT NULL, -- Original user request like "alert me when kindle goes on sale"
  target_url TEXT,       -- Website to monitor (optional, parsed from request)
  search_terms TEXT,     -- Keywords to look for, comma separated
  
  -- Monitoring settings
  check_frequency_minutes INTEGER NOT NULL DEFAULT 60, -- How often to check (default 1 hour)
  last_checked_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'triggered', 'paused'
  trigger_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT wtaf_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT wtaf_alerts_status_check CHECK (
    status IN ('active', 'triggered', 'paused', 'deleted')
  )
) TABLESPACE pg_default;

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_wtaf_alerts_active_due 
  ON public.wtaf_alerts USING btree (status, last_checked_at, check_frequency_minutes) 
  TABLESPACE pg_default
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_wtaf_alerts_phone 
  ON public.wtaf_alerts USING btree (phone_number) 
  TABLESPACE pg_default;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_wtaf_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_wtaf_alerts_updated_at_trigger
  BEFORE UPDATE ON public.wtaf_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_wtaf_alerts_updated_at();

-- Comments
COMMENT ON TABLE public.wtaf_alerts IS 'Simple alerts system for WEBTOYS - users can request monitoring alerts via SMS';
COMMENT ON COLUMN public.wtaf_alerts.request IS 'Original user request like "alert me when kindle goes on sale"';
COMMENT ON COLUMN public.wtaf_alerts.search_terms IS 'Keywords to search for, extracted from request, comma separated';
COMMENT ON COLUMN public.wtaf_alerts.check_frequency_minutes IS 'How often to check this alert (default 60 minutes)';