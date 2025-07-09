-- Setup RLS for wtaf_submissions (private by default)
-- and wtaf_submissions_public (public access)
-- Privacy is determined by which table the data is in, not by flags

BEGIN;

-- Enable RLS on both tables
ALTER TABLE wtaf_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wtaf_submissions_public ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PRIVATE TABLE (wtaf_submissions) - Restrictive but allows regular user INSERTs
-- ============================================================================

-- Service role gets full access (for SMS bot operations)
CREATE POLICY "service_role_full_access_submissions" ON wtaf_submissions
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Anon role can INSERT (for regular user form submissions like party RSVPs)
CREATE POLICY "anon_insert_submissions" ON wtaf_submissions
FOR INSERT TO anon
WITH CHECK (true);

-- Anon role gets NO direct SELECT access (privacy protection)
-- Admin pages use API endpoints with token validation instead

-- ============================================================================
-- PUBLIC TABLE (wtaf_submissions_public) - Permissive  
-- ============================================================================
-- Data in this table is public by definition (moved here when user marks it public)

-- Service role gets full access
CREATE POLICY "service_role_full_access_submissions_public" ON wtaf_submissions_public
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Anon role can read all public submissions (data is public by being in this table)
CREATE POLICY "anon_read_public_submissions" ON wtaf_submissions_public
FOR SELECT TO anon
USING (true);

-- Anon role can insert public submissions (for public forms)
CREATE POLICY "anon_insert_public_submissions" ON wtaf_submissions_public
FOR INSERT TO anon
WITH CHECK (true);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('wtaf_submissions', 'wtaf_submissions_public');

-- Check policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('wtaf_submissions', 'wtaf_submissions_public')
ORDER BY tablename, policyname; 