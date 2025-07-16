-- Debug Demo Table Cleanup

-- Check if demo table has any data
SELECT 
    COUNT(*) as total_records,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record,
    COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '3 minutes') as old_records,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '3 minutes') as recent_records
FROM wtaf_zero_admin_collaborative_DEMO;

-- Show scheduled cron jobs
SELECT * FROM cron.job WHERE jobname = 'cleanup-demo-table';

-- Check recent cron job runs
SELECT 
    runid, 
    jobid, 
    database, 
    command, 
    status, 
    return_message, 
    start_time, 
    end_time
FROM cron.job_run_details 
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-demo-table')
ORDER BY start_time DESC 
LIMIT 10;

-- Manual test of cleanup function
SELECT cleanup_demo_table();

-- Insert test data to verify cleanup works
INSERT INTO wtaf_zero_admin_collaborative_DEMO (
    app_id,
    participant_id,
    action_type,
    content_data,
    created_at
) VALUES 
    ('test-old', 'demo_test_old', 'test', '{"message": "old"}', NOW() - INTERVAL '5 minutes'),
    ('test-new', 'demo_test_new', 'test', '{"message": "new"}', NOW());

-- Run cleanup and check results
SELECT cleanup_demo_table();
SELECT COUNT(*) as remaining_records FROM wtaf_zero_admin_collaborative_DEMO; 