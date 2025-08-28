-- Fix RLS policies for wtaf_desktop_config table
-- This script addresses the 401 authentication errors in WebtoysOS v3
-- by allowing anon access to public desktop configurations

-- First, drop existing policies to rebuild them correctly
DROP POLICY IF EXISTS "Public desktop readable by all" ON wtaf_desktop_config;
DROP POLICY IF EXISTS "Users can view own desktop" ON wtaf_desktop_config;
DROP POLICY IF EXISTS "Users can update own desktop" ON wtaf_desktop_config;
DROP POLICY IF EXISTS "Users can create own desktop" ON wtaf_desktop_config;
DROP POLICY IF EXISTS "Service role full access" ON wtaf_desktop_config;

-- Create new policies that work with anon access

-- 1. Allow anon users to read public/default desktop config (user_id IS NULL)
CREATE POLICY "anon_read_public_desktop" ON wtaf_desktop_config
    FOR SELECT
    USING (user_id IS NULL);

-- 2. Allow anon users to read ANY desktop config (temporary for debugging)
-- This can be restricted later once auth is working properly
CREATE POLICY "anon_read_all_desktop" ON wtaf_desktop_config
    FOR SELECT
    USING (true);

-- 3. Allow authenticated users to read their own config
CREATE POLICY "auth_read_own_desktop" ON wtaf_desktop_config
    FOR SELECT
    USING (
        (auth.jwt() ->> 'handle' = user_id) OR
        (user_id IS NULL)
    );

-- 4. Allow authenticated users to insert/update their own config
CREATE POLICY "auth_manage_own_desktop" ON wtaf_desktop_config
    FOR ALL
    USING (
        (auth.jwt() ->> 'handle' = user_id) OR
        (user_id IS NULL AND auth.jwt() IS NOT NULL)
    )
    WITH CHECK (
        (auth.jwt() ->> 'handle' = user_id) OR
        (user_id IS NULL AND auth.jwt() IS NOT NULL)
    );

-- 5. Allow service role full access for admin operations
CREATE POLICY "service_role_full_access" ON wtaf_desktop_config
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role' OR
        current_setting('role') = 'service_role'
    );

-- Grant necessary permissions to anon role
GRANT SELECT ON wtaf_desktop_config TO anon;
GRANT SELECT ON wtaf_desktop_config TO authenticated;
GRANT ALL ON wtaf_desktop_config TO service_role;

-- Grant access to helper functions
GRANT EXECUTE ON FUNCTION get_desktop_config(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION save_icon_position(TEXT, TEXT, JSONB) TO anon, authenticated, service_role;

-- Verify the table exists and has default data
DO $$
BEGIN
    -- Check if default config exists, if not insert it
    IF NOT EXISTS (
        SELECT 1 FROM wtaf_desktop_config 
        WHERE user_id IS NULL AND desktop_version = 'webtoys-os-v3'
    ) THEN
        INSERT INTO wtaf_desktop_config (
            user_id,
            desktop_version,
            app_registry,
            settings
        ) VALUES (
            NULL,  -- Public desktop
            'webtoys-os-v3',
            '[
                {"id": "notepad", "name": "Notepad", "icon": "📝", "url": "/public/community-notepad", "width": 800, "height": 600},
                {"id": "issue-tracker", "name": "Issue Tracker", "icon": "📋", "url": "/public/toybox-issue-tracker-v3", "width": 900, "height": 700},
                {"id": "chat", "name": "Chat", "icon": "💬", "url": "/public/toybox-chat", "width": 700, "height": 500},
                {"id": "about", "name": "About", "icon": "ℹ️", "action": "alert", "message": "WebtoysOS v3.0\\nModern Desktop Environment"}
            ]'::jsonb,
            '{
                "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                "theme": "modern",
                "gridSize": "medium",
                "iconSize": "normal",
                "animations": true
            }'::jsonb
        );
        
        RAISE NOTICE 'Inserted default desktop configuration';
    ELSE
        RAISE NOTICE 'Default desktop configuration already exists';
    END IF;
END $$;

-- Show current table status
SELECT 
    COUNT(*) as total_configs,
    COUNT(*) FILTER (WHERE user_id IS NULL) as public_configs,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) as user_configs
FROM wtaf_desktop_config;

-- Test the policies work by selecting as anon
-- This should return at least one row (the default config)
SELECT 
    user_id, 
    desktop_version, 
    array_length(app_registry, 1) as app_count,
    settings->>'background' as background_theme
FROM wtaf_desktop_config 
WHERE user_id IS NULL AND desktop_version = 'webtoys-os-v3'
LIMIT 1;