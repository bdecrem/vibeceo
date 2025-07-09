-- Correct view-based security approach
-- Create a view with ONLY non-PII data that website needs

-- Step 1: Create the public view with only safe columns
DROP VIEW IF EXISTS sms_subscribers_public;
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

-- Step 2: Grant SELECT permission to anon role on the view
GRANT SELECT ON sms_subscribers_public TO anon;

-- Step 3: Create policies for what anon can do on main table
-- (Only INSERT for new signups, UPDATE for account linking)

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Website can create new subscribers" ON sms_subscribers;
CREATE POLICY "Website can create new subscribers" ON sms_subscribers
FOR INSERT TO anon
WITH CHECK (consent_given = true AND confirmed = false);

DROP POLICY IF EXISTS "Website can link authenticated accounts" ON sms_subscribers;
CREATE POLICY "Website can link authenticated accounts" ON sms_subscribers
FOR UPDATE TO anon
USING (auth.uid() IS NOT NULL AND supabase_id IS NULL)
WITH CHECK (supabase_id = auth.uid());

-- Step 4: Remove any existing SELECT policies for anon on main table
-- This ensures anon can only read via the view, not the main table
DROP POLICY IF EXISTS "Website can read index files" ON sms_subscribers;
DROP POLICY IF EXISTS "Website can read safe subscriber data" ON sms_subscribers;
DROP POLICY IF EXISTS "Website can read subscriber data" ON sms_subscribers;
DROP POLICY IF EXISTS "Website can read via public view" ON sms_subscribers;

-- Show what we have
SELECT table_name, privilege_type, grantee 
FROM information_schema.role_table_grants 
WHERE table_name IN ('sms_subscribers', 'sms_subscribers_public')
AND grantee = 'anon';

SELECT tablename, policyname, roles, cmd
FROM pg_policies 
WHERE tablename = 'sms_subscribers'
ORDER BY policyname; 