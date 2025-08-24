-- Add recurring alerts support to existing wtaf_alerts table

-- Add new columns for recurring alerts
ALTER TABLE public.wtaf_alerts 
ADD COLUMN IF NOT EXISTS alert_type TEXT NOT NULL DEFAULT 'event',
ADD COLUMN IF NOT EXISTS schedule_time TIME,
ADD COLUMN IF NOT EXISTS schedule_days TEXT, -- 'daily', 'weekdays', 'monday,friday', etc
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles';

-- Update constraint to include new alert types
ALTER TABLE public.wtaf_alerts 
DROP CONSTRAINT IF EXISTS wtaf_alerts_status_check;

ALTER TABLE public.wtaf_alerts 
ADD CONSTRAINT wtaf_alerts_status_check CHECK (
  status IN ('active', 'triggered', 'paused', 'deleted')
);

-- Add constraint for alert type
ALTER TABLE public.wtaf_alerts 
ADD CONSTRAINT wtaf_alerts_type_check CHECK (
  alert_type IN ('event', 'recurring')
);

-- Add index for efficient recurring alert queries
CREATE INDEX IF NOT EXISTS idx_wtaf_alerts_recurring 
  ON public.wtaf_alerts USING btree (alert_type, schedule_time, schedule_days) 
  TABLESPACE pg_default
  WHERE alert_type = 'recurring' AND status = 'active';

-- Comments for new columns
COMMENT ON COLUMN public.wtaf_alerts.alert_type IS 'Type of alert: "event" (traditional) or "recurring" (time-based)';
COMMENT ON COLUMN public.wtaf_alerts.schedule_time IS 'Time of day to send recurring alert (e.g., 07:00:00)';
COMMENT ON COLUMN public.wtaf_alerts.schedule_days IS 'Days to send: "daily", "weekdays", "monday,wednesday", etc';
COMMENT ON COLUMN public.wtaf_alerts.timezone IS 'Timezone for schedule_time (default Pacific Time)';