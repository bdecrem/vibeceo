-- WebtoysOS v3 Desktop Configuration Table
-- This table stores desktop settings, icon positions, and user preferences
-- Each user can have their own desktop configuration

CREATE TABLE IF NOT EXISTS wtaf_desktop_config (
    -- Primary key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- User identification (null = default/public desktop)
    user_id TEXT,  -- matches user.handle from auth system
    
    -- Desktop version/identifier
    desktop_version TEXT DEFAULT 'webtoys-os-v3',
    
    -- Icon positions and layout
    icon_positions JSONB DEFAULT '{}'::jsonb,
    /* Example structure:
    {
        "notepad": {"gridColumn": 1, "gridRow": 1, "x": null, "y": null},
        "issue-tracker": {"gridColumn": 2, "gridRow": 1, "x": null, "y": null},
        "chat": {"gridColumn": 3, "gridRow": 1, "x": null, "y": null}
    }
    */
    
    -- Widget positions (chat widget, etc)
    widget_positions JSONB DEFAULT '{}'::jsonb,
    /* Example structure:
    {
        "chat-widget": {"left": "auto", "right": "20px", "bottom": "20px", "top": "auto", "minimized": false}
    }
    */
    
    -- App registry - which apps are installed
    app_registry JSONB DEFAULT '[]'::jsonb,
    /* Example structure:
    [
        {"id": "notepad", "name": "Notepad", "icon": "📝", "url": "/public/community-notepad", "installed": "2025-01-01T00:00:00Z"},
        {"id": "issue-tracker", "name": "Issue Tracker", "icon": "📋", "url": "/public/toybox-issue-tracker", "installed": "2025-01-01T00:00:00Z"}
    ]
    */
    
    -- User folders for organizing apps
    user_folders JSONB DEFAULT '{}'::jsonb,
    /* Example structure:
    {
        "favorites": ["notepad", "chat"],
        "tools": ["issue-tracker", "calculator"],
        "games": ["snake", "tetris"]
    }
    */
    
    -- Desktop settings and preferences
    settings JSONB DEFAULT '{}'::jsonb,
    /* Example structure:
    {
        "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "backgroundImage": null,
        "theme": "modern",
        "gridSize": "medium",
        "showGrid": false,
        "iconSize": "normal",
        "animations": true,
        "sounds": false
    }
    */
    
    -- Window states (positions, sizes, minimized state)
    window_states JSONB DEFAULT '{}'::jsonb,
    /* Example structure:
    {
        "notepad": {"width": 800, "height": 600, "x": 100, "y": 50, "maximized": false, "minimized": false}
    }
    */
    
    -- Version tracking for migrations
    version INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one config per user per desktop version
    UNIQUE(user_id, desktop_version)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_desktop_config_user ON wtaf_desktop_config(user_id);
CREATE INDEX IF NOT EXISTS idx_desktop_config_version ON wtaf_desktop_config(desktop_version);

-- Row Level Security (RLS)
ALTER TABLE wtaf_desktop_config ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read the default/public desktop (user_id IS NULL)
CREATE POLICY "Public desktop readable by all" ON wtaf_desktop_config
    FOR SELECT
    USING (user_id IS NULL);

-- Policy: Authenticated users can read their own config
CREATE POLICY "Users can view own desktop" ON wtaf_desktop_config
    FOR SELECT
    USING (auth.jwt() ->> 'handle' = user_id);

-- Policy: Authenticated users can update their own config
CREATE POLICY "Users can update own desktop" ON wtaf_desktop_config
    FOR UPDATE
    USING (auth.jwt() ->> 'handle' = user_id);

-- Policy: Authenticated users can insert their own config
CREATE POLICY "Users can create own desktop" ON wtaf_desktop_config
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'handle' = user_id);

-- Policy: Service role can do anything (for admin/system operations)
CREATE POLICY "Service role full access" ON wtaf_desktop_config
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_wtaf_desktop_config_updated_at 
    BEFORE UPDATE ON wtaf_desktop_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default public desktop configuration
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
        {"id": "issue-tracker", "name": "Issue Tracker", "icon": "📋", "url": "/public/toybox-issue-tracker", "width": 900, "height": 700},
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
) ON CONFLICT (user_id, desktop_version) DO NOTHING;

-- Helper function to get desktop config (with fallback to default)
CREATE OR REPLACE FUNCTION get_desktop_config(p_user_id TEXT)
RETURNS TABLE (config JSONB) AS $$
BEGIN
    -- Try to get user's config first
    RETURN QUERY
    SELECT row_to_json(t)::jsonb FROM (
        SELECT * FROM wtaf_desktop_config 
        WHERE user_id = p_user_id AND desktop_version = 'webtoys-os-v3'
        LIMIT 1
    ) t;
    
    -- If no user config, return default
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT row_to_json(t)::jsonb FROM (
            SELECT * FROM wtaf_desktop_config 
            WHERE user_id IS NULL AND desktop_version = 'webtoys-os-v3'
            LIMIT 1
        ) t;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Helper function to save icon position
CREATE OR REPLACE FUNCTION save_icon_position(
    p_user_id TEXT,
    p_icon_id TEXT,
    p_position JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    v_config_id UUID;
BEGIN
    -- Get or create user's config
    INSERT INTO wtaf_desktop_config (user_id, desktop_version)
    VALUES (p_user_id, 'webtoys-os-v3')
    ON CONFLICT (user_id, desktop_version) DO NOTHING
    RETURNING id INTO v_config_id;
    
    -- If insert didn't return ID, get existing
    IF v_config_id IS NULL THEN
        SELECT id INTO v_config_id 
        FROM wtaf_desktop_config 
        WHERE user_id = p_user_id AND desktop_version = 'webtoys-os-v3';
    END IF;
    
    -- Update icon position
    UPDATE wtaf_desktop_config
    SET icon_positions = jsonb_set(
        COALESCE(icon_positions, '{}'::jsonb),
        ARRAY[p_icon_id],
        p_position,
        true
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = v_config_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions (adjust based on your setup)
GRANT ALL ON wtaf_desktop_config TO authenticated;
GRANT ALL ON wtaf_desktop_config TO service_role;
GRANT EXECUTE ON FUNCTION get_desktop_config TO anon, authenticated;
GRANT EXECUTE ON FUNCTION save_icon_position TO authenticated;

-- Comments for documentation
COMMENT ON TABLE wtaf_desktop_config IS 'Stores desktop configuration, icon positions, and user preferences for WebtoysOS v3';
COMMENT ON COLUMN wtaf_desktop_config.user_id IS 'User handle from auth system, NULL for public/default desktop';
COMMENT ON COLUMN wtaf_desktop_config.icon_positions IS 'JSONB storing position of each icon on desktop';
COMMENT ON COLUMN wtaf_desktop_config.widget_positions IS 'JSONB storing positions of widgets like chat';
COMMENT ON COLUMN wtaf_desktop_config.app_registry IS 'Array of installed apps with metadata';
COMMENT ON COLUMN wtaf_desktop_config.user_folders IS 'User-created folders for organizing apps';
COMMENT ON COLUMN wtaf_desktop_config.settings IS 'Desktop preferences like background, theme, etc';
COMMENT ON COLUMN wtaf_desktop_config.window_states IS 'Saved window positions and sizes';