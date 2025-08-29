-- Script to remove the About icon from existing desktop configurations
-- Run this in Supabase SQL Editor to update the database

-- Update the default/public desktop configuration
UPDATE wtaf_desktop_config
SET app_registry = (
    SELECT jsonb_agg(app)
    FROM jsonb_array_elements(app_registry) AS app
    WHERE app->>'id' != 'about'
),
updated_at = CURRENT_TIMESTAMP
WHERE user_id IS NULL 
AND desktop_version = 'webtoys-os-v3';

-- Update all user desktop configurations to remove About icon
UPDATE wtaf_desktop_config
SET app_registry = (
    SELECT jsonb_agg(app)
    FROM jsonb_array_elements(app_registry) AS app
    WHERE app->>'id' != 'about'
),
updated_at = CURRENT_TIMESTAMP
WHERE desktop_version = 'webtoys-os-v3'
AND app_registry @> '[{"id": "about"}]'::jsonb;

-- Remove any icon positions for the About icon
UPDATE wtaf_desktop_config
SET icon_positions = icon_positions - 'about',
updated_at = CURRENT_TIMESTAMP
WHERE desktop_version = 'webtoys-os-v3'
AND icon_positions ? 'about';

-- Show results
SELECT 
    CASE 
        WHEN user_id IS NULL THEN 'Default Desktop'
        ELSE 'User: ' || user_id
    END as config_owner,
    array_length(
        ARRAY(SELECT jsonb_array_elements(app_registry)), 
        1
    ) as app_count,
    CASE 
        WHEN app_registry @> '[{"id": "about"}]'::jsonb THEN 'Still has About'
        ELSE 'About removed'
    END as about_status
FROM wtaf_desktop_config
WHERE desktop_version = 'webtoys-os-v3'
ORDER BY user_id NULLS FIRST;