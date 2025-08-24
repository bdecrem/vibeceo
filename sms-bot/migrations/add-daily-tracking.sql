-- Add columns to track daily alert limits
ALTER TABLE public.wtaf_alerts 
ADD COLUMN IF NOT EXISTS last_trigger_date DATE,
ADD COLUMN IF NOT EXISTS daily_trigger_count INTEGER NOT NULL DEFAULT 0;

-- Add comments
COMMENT ON COLUMN public.wtaf_alerts.last_trigger_date IS 'Date of last trigger (for daily limit tracking)';
COMMENT ON COLUMN public.wtaf_alerts.daily_trigger_count IS 'Number of triggers today (resets daily)';

-- Create function to safely increment daily trigger count
CREATE OR REPLACE FUNCTION increment_daily_trigger_count(alert_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.wtaf_alerts 
  SET 
    trigger_count = COALESCE(trigger_count, 0) + 1,
    daily_trigger_count = CASE 
      WHEN last_trigger_date = CURRENT_DATE THEN COALESCE(daily_trigger_count, 0) + 1
      ELSE 1  -- Reset to 1 if it's a new day
    END,
    last_trigger_date = CURRENT_DATE
  WHERE id = alert_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_daily_trigger_count(UUID) TO anon, authenticated;