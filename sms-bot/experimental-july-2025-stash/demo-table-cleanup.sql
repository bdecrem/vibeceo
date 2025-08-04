-- Demo Table Cleanup Script (Based on working version lessons learned)

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing job if it exists (cleanup from old attempts)
SELECT cron.unschedule('cleanup-demo-table');

-- Create function to clean demo table (return text for cron compatibility)
CREATE OR REPLACE FUNCTION cleanup_demo_table()
RETURNS text AS $$
DECLARE
    deleted_count integer;
BEGIN
    -- Delete records older than 3 minutes from demo table
    DELETE FROM wtaf_zero_admin_collaborative_DEMO 
    WHERE created_at < NOW() - INTERVAL '3 minutes';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Return success message (RAISE NOTICE doesn't work in cron context)
    RETURN 'Cleaned ' || deleted_count || ' demo records older than 3 minutes at ' || NOW()::text;
END;
$$ LANGUAGE plpgsql;

-- Test the function manually first
SELECT cleanup_demo_table();

-- Schedule cleanup to run every 3 minutes (using exact working syntax)
SELECT cron.schedule(
    'cleanup-demo-table',
    '*/3 * * * *',
    'SELECT cleanup_demo_table();'
);

-- Verify the job was scheduled
SELECT * FROM cron.job WHERE jobname = 'cleanup-demo-table'; 