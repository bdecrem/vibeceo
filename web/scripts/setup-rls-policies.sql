-- =====================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================
-- This script enables RLS on all tables and creates appropriate policies
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. ENABLE RLS ON ALL TABLES
-- =====================================================

-- Enable RLS on main tables
ALTER TABLE sms_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wtaf_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE wtaf_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wtaf_social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wtaf_remix_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE wtaf_zero_admin_collaborative ENABLE ROW LEVEL SECURITY;

-- profiles table should already have RLS enabled

-- =====================================================
-- 2. SMS SUBSCRIBERS TABLE POLICIES
-- =====================================================

-- Allow users to read their own subscriber record
CREATE POLICY "Users can read their own subscriber data" ON sms_subscribers
    FOR SELECT USING (auth.uid() = id::text OR phone_number = auth.jwt()::json->>'phone');

-- Allow users to update their own subscriber record
CREATE POLICY "Users can update their own subscriber data" ON sms_subscribers
    FOR UPDATE USING (auth.uid() = id::text OR phone_number = auth.jwt()::json->>'phone');

-- Allow system to insert new subscribers (for SMS bot)
CREATE POLICY "System can insert new subscribers" ON sms_subscribers
    FOR INSERT WITH CHECK (true);

-- Allow admins to read all subscriber data
CREATE POLICY "Admins can read all subscriber data" ON sms_subscribers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sms_subscribers 
            WHERE phone_number = auth.jwt()::json->>'phone' 
            AND role = 'admin'
        )
    );

-- =====================================================
-- 3. WTAF CONTENT TABLE POLICIES
-- =====================================================

-- Allow everyone to read published content
CREATE POLICY "Everyone can read published content" ON wtaf_content
    FOR SELECT USING (true);

-- Allow users to insert their own content
CREATE POLICY "Users can insert their own content" ON wtaf_content
    FOR INSERT WITH CHECK (
        user_slug = (
            SELECT slug FROM sms_subscribers 
            WHERE phone_number = auth.jwt()::json->>'phone'
        )
    );

-- Allow users to update their own content
CREATE POLICY "Users can update their own content" ON wtaf_content
    FOR UPDATE USING (
        user_slug = (
            SELECT slug FROM sms_subscribers 
            WHERE phone_number = auth.jwt()::json->>'phone'
        )
    );

-- Allow users to delete their own content
CREATE POLICY "Users can delete their own content" ON wtaf_content
    FOR DELETE USING (
        user_slug = (
            SELECT slug FROM sms_subscribers 
            WHERE phone_number = auth.jwt()::json->>'phone'
        )
    );

-- =====================================================
-- 4. WTAF SUBMISSIONS TABLE POLICIES
-- =====================================================

-- Allow everyone to insert submissions (for public forms)
CREATE POLICY "Everyone can submit form data" ON wtaf_submissions
    FOR INSERT WITH CHECK (true);

-- Allow content owners to read submissions for their apps
CREATE POLICY "Content owners can read their app submissions" ON wtaf_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM wtaf_content 
            WHERE wtaf_content.id = wtaf_submissions.app_id
            AND wtaf_content.user_slug = (
                SELECT slug FROM sms_subscribers 
                WHERE phone_number = auth.jwt()::json->>'phone'
            )
        )
    );

-- Allow content owners to update submissions for their apps
CREATE POLICY "Content owners can update their app submissions" ON wtaf_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM wtaf_content 
            WHERE wtaf_content.id = wtaf_submissions.app_id
            AND wtaf_content.user_slug = (
                SELECT slug FROM sms_subscribers 
                WHERE phone_number = auth.jwt()::json->>'phone'
            )
        )
    );

-- =====================================================
-- 5. SOCIAL CONNECTIONS TABLE POLICIES
-- =====================================================

-- Allow users to read all social connections (for public social features)
CREATE POLICY "Everyone can read social connections" ON wtaf_social_connections
    FOR SELECT USING (true);

-- Allow users to create connections where they are the follower
CREATE POLICY "Users can create their own follows" ON wtaf_social_connections
    FOR INSERT WITH CHECK (
        follower_user_slug = (
            SELECT slug FROM sms_subscribers 
            WHERE phone_number = auth.jwt()::json->>'phone'
        )
    );

-- Allow users to delete connections where they are the follower
CREATE POLICY "Users can delete their own follows" ON wtaf_social_connections
    FOR DELETE USING (
        follower_user_slug = (
            SELECT slug FROM sms_subscribers 
            WHERE phone_number = auth.jwt()::json->>'phone'
        )
    );

-- =====================================================
-- 6. REMIX LINEAGE TABLE POLICIES
-- =====================================================

-- Allow everyone to read remix lineage (for public genealogy features)
CREATE POLICY "Everyone can read remix lineage" ON wtaf_remix_lineage
    FOR SELECT USING (true);

-- Allow users to create remix records where they are the child creator
CREATE POLICY "Users can create remix records for their apps" ON wtaf_remix_lineage
    FOR INSERT WITH CHECK (
        child_user_slug = (
            SELECT slug FROM sms_subscribers 
            WHERE phone_number = auth.jwt()::json->>'phone'
        )
    );

-- =====================================================
-- 7. ZERO ADMIN COLLABORATIVE TABLE POLICIES
-- =====================================================

-- Allow everyone to read collaborative data (for public collaboration)
CREATE POLICY "Everyone can read collaborative data" ON wtaf_zero_admin_collaborative
    FOR SELECT USING (true);

-- Allow everyone to insert collaborative data (for public participation)
CREATE POLICY "Everyone can insert collaborative data" ON wtaf_zero_admin_collaborative
    FOR INSERT WITH CHECK (true);

-- Allow participants to update their own collaborative data
CREATE POLICY "Participants can update their own data" ON wtaf_zero_admin_collaborative
    FOR UPDATE USING (
        user_identifier = auth.jwt()::json->>'user_identifier'
        OR participant_id = auth.jwt()::json->>'participant_id'
    );

-- =====================================================
-- 8. ADDITIONAL SECURITY POLICIES
-- =====================================================

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM sms_subscribers 
        WHERE phone_number = auth.jwt()::json->>'phone' 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin override policies (admins can read everything)
CREATE POLICY "Admins can read all content" ON wtaf_content
    FOR SELECT USING (is_admin());

CREATE POLICY "Admins can read all submissions" ON wtaf_submissions
    FOR SELECT USING (is_admin());

-- =====================================================
-- 9. EMERGENCY BYPASS (DISABLE IF NEEDED)
-- =====================================================

-- If you need to disable RLS temporarily for debugging:
-- ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

-- To re-enable:
-- ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10. VERIFICATION QUERIES
-- =====================================================

-- Run these queries to verify RLS is working:

-- Check which tables have RLS enabled
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' AND rowsecurity = true;

-- Check all policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies 
-- WHERE schemaname = 'public';

-- Test policy for specific table
-- SELECT * FROM wtaf_content WHERE user_slug = 'your-test-slug';

-- =====================================================
-- NOTES:
-- =====================================================
-- 1. These policies assume phone-based authentication via JWT
-- 2. Adjust auth.jwt() references based on your actual auth system
-- 3. Test thoroughly before deploying to production
-- 4. Consider creating more restrictive policies for sensitive data
-- 5. Monitor performance impact of complex policies
-- 6. Keep policies as simple as possible for better performance 