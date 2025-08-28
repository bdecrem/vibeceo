
-- Simplified version for quick setup
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS wtaf_desktop_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT,
    desktop_version TEXT DEFAULT 'webtoys-os-v3',
    icon_positions JSONB DEFAULT '{}',
    widget_positions JSONB DEFAULT '{}',
    app_registry JSONB DEFAULT '[]',
    user_folders JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    window_states JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, desktop_version)
);

-- Insert default config
INSERT INTO wtaf_desktop_config (user_id, desktop_version, app_registry, settings) 
VALUES (
    NULL,
    'webtoys-os-v3',
    '[
        {"id": "notepad", "name": "Notepad", "icon": "📝", "url": "/public/community-notepad"},
        {"id": "issue-tracker", "name": "Issue Tracker", "icon": "📋", "url": "/public/toybox-issue-tracker"},
        {"id": "chat", "name": "Chat", "icon": "💬", "url": "/public/toybox-chat"}
    ]'::jsonb,
    '{"background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", "theme": "modern"}'::jsonb
) ON CONFLICT DO NOTHING;
    