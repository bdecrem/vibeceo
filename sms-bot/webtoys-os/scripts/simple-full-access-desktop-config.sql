-- Simple fix: Give desktop full read/write access to wtaf_desktop_config table
-- This allows the desktop to read configs and save positions/settings

-- Drop all existing restrictive policies
DROP POLICY IF EXISTS "Public desktop readable by all" ON wtaf_desktop_config;
DROP POLICY IF EXISTS "Users can view own desktop" ON wtaf_desktop_config;
DROP POLICY IF EXISTS "Users can update own desktop" ON wtaf_desktop_config;
DROP POLICY IF EXISTS "Users can create own desktop" ON wtaf_desktop_config;
DROP POLICY IF EXISTS "Service role full access" ON wtaf_desktop_config;
DROP POLICY IF EXISTS "anon_read_public_desktop" ON wtaf_desktop_config;
DROP POLICY IF EXISTS "anon_read_all_desktop" ON wtaf_desktop_config;
DROP POLICY IF EXISTS "auth_read_own_desktop" ON wtaf_desktop_config;
DROP POLICY IF EXISTS "auth_manage_own_desktop" ON wtaf_desktop_config;
DROP POLICY IF EXISTS "service_role_full_access" ON wtaf_desktop_config;

-- Create one simple policy: Allow ALL operations for everyone
CREATE POLICY "allow_all_desktop_config_access" ON wtaf_desktop_config
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Grant permissions to anon role (browsers use this)
GRANT ALL ON wtaf_desktop_config TO anon;
GRANT ALL ON wtaf_desktop_config TO authenticated;

-- Done! The desktop can now read and write configs without 401 errors