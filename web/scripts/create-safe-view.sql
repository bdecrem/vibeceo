-- Create safe view for website access to sms_subscribers
-- This view only includes non-PII columns that the website needs

-- Step 1: Create the public view with only safe columns
CREATE VIEW sms_subscribers_public AS
SELECT 
    slug,
    index_file, 
    hide_default,
    apps_created_count,
    total_remix_credits,
    role,
    is_admin,
    created_at,
    updated_at
FROM sms_subscribers;

-- Step 2: Create policy on underlying table for website to read via view
-- The view will limit which columns are visible, this policy controls row access
CREATE POLICY "Website can read via public view" ON sms_subscribers
FOR SELECT TO anon
USING (true);

-- Step 4: Create policy for website to link authenticated accounts
CREATE POLICY "Website can link authenticated accounts" ON sms_subscribers
FOR UPDATE TO anon
USING (auth.uid() IS NOT NULL AND supabase_id IS NULL)
WITH CHECK (supabase_id = auth.uid());

-- Step 5: Show current policies
SELECT schemaname, tablename, policyname, roles
FROM pg_policies 
WHERE tablename IN ('sms_subscribers', 'sms_subscribers_public')
ORDER BY tablename, policyname; 