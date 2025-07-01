-- WTAF Social Network Features Migration
-- Date: 2025-01-27
-- Purpose: Add social network functionality including follows, remixes, and trending

BEGIN;

-- =====================================================
-- 1. CREATE NEW TABLES
-- =====================================================

-- Social relationships (follows, remix credits, etc.)
CREATE TABLE IF NOT EXISTS wtaf_social_connections (
    id BIGSERIAL PRIMARY KEY,
    follower_user_slug TEXT NOT NULL,        -- User doing the following
    following_user_slug TEXT NOT NULL,       -- User being followed  
    connection_type TEXT NOT NULL DEFAULT 'follow', -- 'follow', 'remix_credit'
    source_app_slug TEXT,                    -- Which app caused this connection
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_social_connection UNIQUE(follower_user_slug, following_user_slug, connection_type)
);

-- Track full remix genealogy
CREATE TABLE IF NOT EXISTS wtaf_remix_lineage (
    id BIGSERIAL PRIMARY KEY,
    child_app_id UUID NOT NULL,              -- The new remixed app (from wtaf_content.id)
    parent_app_id UUID NOT NULL,             -- The original app being remixed  
    child_user_slug TEXT NOT NULL,           -- Who did the remixing
    parent_user_slug TEXT NOT NULL,          -- Original creator
    remix_prompt TEXT,                       -- What the remix request was
    generation_level INTEGER DEFAULT 1,      -- How many steps from original (1=direct remix, 2=remix of remix, etc)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. ADD INDEXES FOR PERFORMANCE
-- =====================================================

-- Social connections indexes
CREATE INDEX IF NOT EXISTS idx_social_follower ON wtaf_social_connections(follower_user_slug);
CREATE INDEX IF NOT EXISTS idx_social_following ON wtaf_social_connections(following_user_slug);
CREATE INDEX IF NOT EXISTS idx_social_type ON wtaf_social_connections(connection_type);
CREATE INDEX IF NOT EXISTS idx_social_created ON wtaf_social_connections(created_at);

-- Remix lineage indexes
CREATE INDEX IF NOT EXISTS idx_remix_child ON wtaf_remix_lineage(child_app_id);
CREATE INDEX IF NOT EXISTS idx_remix_parent ON wtaf_remix_lineage(parent_app_id);
CREATE INDEX IF NOT EXISTS idx_remix_child_user ON wtaf_remix_lineage(child_user_slug);
CREATE INDEX IF NOT EXISTS idx_remix_parent_user ON wtaf_remix_lineage(parent_user_slug);
CREATE INDEX IF NOT EXISTS idx_remix_created ON wtaf_remix_lineage(created_at);
CREATE INDEX IF NOT EXISTS idx_remix_generation ON wtaf_remix_lineage(generation_level);

-- =====================================================
-- 3. EXTEND EXISTING TABLES
-- =====================================================

-- Add social features to wtaf_content
ALTER TABLE wtaf_content 
ADD COLUMN IF NOT EXISTS remix_count INTEGER DEFAULT 0,           -- How many times this has been remixed
ADD COLUMN IF NOT EXISTS is_remix BOOLEAN DEFAULT FALSE,          -- Is this app a remix?
ADD COLUMN IF NOT EXISTS parent_app_id UUID,                      -- Direct parent if this is a remix
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,       -- Manual homepage featuring
ADD COLUMN IF NOT EXISTS featured_at TIMESTAMPTZ,                 -- When it was featured
ADD COLUMN IF NOT EXISTS last_remixed_at TIMESTAMPTZ;             -- For trending calculations

-- Add social stats to sms_subscribers  
ALTER TABLE sms_subscribers
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_remix_credits INTEGER DEFAULT 0,   -- Total times their work was remixed
ADD COLUMN IF NOT EXISTS apps_created_count INTEGER DEFAULT 0;

-- =====================================================
-- 4. ADD INDEXES FOR EXTENDED COLUMNS
-- =====================================================

-- wtaf_content social indexes
CREATE INDEX IF NOT EXISTS idx_wtaf_remix_count ON wtaf_content(remix_count);
CREATE INDEX IF NOT EXISTS idx_wtaf_is_remix ON wtaf_content(is_remix);
CREATE INDEX IF NOT EXISTS idx_wtaf_parent_app ON wtaf_content(parent_app_id);
CREATE INDEX IF NOT EXISTS idx_wtaf_featured ON wtaf_content(is_featured, featured_at);
CREATE INDEX IF NOT EXISTS idx_wtaf_trending ON wtaf_content(last_remixed_at, remix_count);

-- =====================================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

-- Table comments
COMMENT ON TABLE wtaf_social_connections IS 'Social relationships: follows, remix credits, and other user connections';
COMMENT ON TABLE wtaf_remix_lineage IS 'Full genealogy tree of app remixes showing parent-child relationships';

-- Column comments for wtaf_social_connections
COMMENT ON COLUMN wtaf_social_connections.follower_user_slug IS 'User slug of the person doing the following';
COMMENT ON COLUMN wtaf_social_connections.following_user_slug IS 'User slug of the person being followed';
COMMENT ON COLUMN wtaf_social_connections.connection_type IS 'Type of connection: follow, remix_credit, etc.';
COMMENT ON COLUMN wtaf_social_connections.source_app_slug IS 'App slug that triggered this connection (e.g., remix that caused auto-follow)';

-- Column comments for wtaf_remix_lineage
COMMENT ON COLUMN wtaf_remix_lineage.child_app_id IS 'UUID of the new remixed app (from wtaf_content.id)';
COMMENT ON COLUMN wtaf_remix_lineage.parent_app_id IS 'UUID of the original app being remixed';
COMMENT ON COLUMN wtaf_remix_lineage.generation_level IS 'Remix depth: 1=direct remix, 2=remix of remix, etc.';
COMMENT ON COLUMN wtaf_remix_lineage.remix_prompt IS 'The user prompt that created this remix';

-- Column comments for extended tables
COMMENT ON COLUMN wtaf_content.remix_count IS 'Number of times this app has been remixed by others';
COMMENT ON COLUMN wtaf_content.is_remix IS 'True if this app is a remix of another app';
COMMENT ON COLUMN wtaf_content.parent_app_id IS 'UUID of direct parent app if this is a remix';
COMMENT ON COLUMN wtaf_content.is_featured IS 'True if this app is manually featured on homepage';
COMMENT ON COLUMN wtaf_content.featured_at IS 'Timestamp when this app was featured';
COMMENT ON COLUMN wtaf_content.last_remixed_at IS 'Timestamp of most recent remix (for trending calculations)';

COMMENT ON COLUMN sms_subscribers.follower_count IS 'Number of users following this user';
COMMENT ON COLUMN sms_subscribers.following_count IS 'Number of users this user is following';
COMMENT ON COLUMN sms_subscribers.total_remix_credits IS 'Total number of times this users apps have been remixed';
COMMENT ON COLUMN sms_subscribers.apps_created_count IS 'Total number of apps this user has created';

-- =====================================================
-- 6. CREATE USEFUL VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for trending apps (last 7 days)
CREATE OR REPLACE VIEW trending_apps_7d AS
SELECT 
    wc.id,
    wc.user_slug,
    wc.app_slug,
    wc.remix_count,
    wc.last_remixed_at,
    wc.created_at,
    COUNT(rl.child_app_id) as recent_remixes
FROM wtaf_content wc
LEFT JOIN wtaf_remix_lineage rl ON wc.id = rl.parent_app_id 
    AND rl.created_at >= NOW() - INTERVAL '7 days'
WHERE wc.status = 'published'
GROUP BY wc.id, wc.user_slug, wc.app_slug, wc.remix_count, wc.last_remixed_at, wc.created_at
ORDER BY recent_remixes DESC, wc.remix_count DESC;

-- View for user's complete social stats
CREATE OR REPLACE VIEW user_social_stats AS
SELECT 
    s.slug as user_slug,
    s.follower_count,
    s.following_count,
    s.total_remix_credits,
    s.apps_created_count,
    COUNT(DISTINCT wc.id) as published_apps,
    COALESCE(SUM(wc.remix_count), 0) as total_remixes_received
FROM sms_subscribers s
LEFT JOIN wtaf_content wc ON s.slug = wc.user_slug AND wc.status = 'published'
GROUP BY s.slug, s.follower_count, s.following_count, s.total_remix_credits, s.apps_created_count;

COMMIT;

-- =====================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =====================================================
/*
To rollback this migration:

BEGIN;
DROP VIEW IF EXISTS trending_apps_7d;
DROP VIEW IF EXISTS user_social_stats;
DROP TABLE IF EXISTS wtaf_social_connections;
DROP TABLE IF EXISTS wtaf_remix_lineage;
ALTER TABLE wtaf_content DROP COLUMN IF EXISTS remix_count;
ALTER TABLE wtaf_content DROP COLUMN IF EXISTS is_remix;
ALTER TABLE wtaf_content DROP COLUMN IF EXISTS parent_app_id;
ALTER TABLE wtaf_content DROP COLUMN IF EXISTS is_featured;
ALTER TABLE wtaf_content DROP COLUMN IF EXISTS featured_at;
ALTER TABLE wtaf_content DROP COLUMN IF EXISTS last_remixed_at;
ALTER TABLE sms_subscribers DROP COLUMN IF EXISTS follower_count;
ALTER TABLE sms_subscribers DROP COLUMN IF EXISTS following_count;
ALTER TABLE sms_subscribers DROP COLUMN IF EXISTS total_remix_credits;
ALTER TABLE sms_subscribers DROP COLUMN IF EXISTS apps_created_count;
COMMIT;
*/ 