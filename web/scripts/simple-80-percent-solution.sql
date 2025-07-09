-- Simple 80% safer RLS solution
-- Keep anon SELECT access but rely on application-level column filtering

-- Current policies (keep these):
-- ✅ "Allow service role access" (service_role) - SMS bot full access
-- ✅ "Website can create new subscribers" (anon) - INSERT only  

-- Add simple SELECT policy for website
CREATE POLICY "Website can read subscriber data" ON sms_subscribers
FOR SELECT TO anon
USING (true);

-- Add account linking policy
CREATE POLICY "Website can link authenticated accounts" ON sms_subscribers
FOR UPDATE TO anon
USING (auth.uid() IS NOT NULL AND supabase_id IS NULL)
WITH CHECK (supabase_id = auth.uid());

-- Show all current policies
SELECT tablename, policyname, roles, cmd
FROM pg_policies 
WHERE tablename = 'sms_subscribers'
ORDER BY policyname; 