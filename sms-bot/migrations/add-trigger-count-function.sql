-- Create function to increment trigger count safely
CREATE OR REPLACE FUNCTION increment_trigger_count(alert_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.wtaf_alerts 
  SET trigger_count = COALESCE(trigger_count, 0) + 1
  WHERE id = alert_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_trigger_count(UUID) TO anon, authenticated;