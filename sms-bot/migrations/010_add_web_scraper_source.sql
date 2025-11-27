-- Add web_scraper source type to user_sources
-- Sprint 2 Extension: Web scraper for structured content extraction

-- Update the kind CHECK constraint to include 'web_scraper'
ALTER TABLE user_sources
DROP CONSTRAINT IF EXISTS user_sources_kind_check;

ALTER TABLE user_sources
ADD CONSTRAINT user_sources_kind_check
CHECK (kind IN ('rss', 'http_json', 'web_scraper'));

-- Migration complete
COMMENT ON CONSTRAINT user_sources_kind_check ON user_sources IS 'Allows rss, http_json, and web_scraper source types';
