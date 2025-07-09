-- Clean up old RLS policies that gave anon access to main sms_subscribers table
-- Now anon should only access the safe view, not the main table

-- Drop the old policies that gave anon too much access
DROP POLICY IF EXISTS "Website can read index files" ON sms_subscribers;
DROP POLICY IF EXISTS "Website can read safe subscriber data" ON sms_subscribers;

-- Show remaining policies
SELECT tablename, policyname, roles, cmd
FROM pg_policies 
WHERE tablename IN ('sms_subscribers', 'sms_subscribers_public')
ORDER BY tablename, policyname; 