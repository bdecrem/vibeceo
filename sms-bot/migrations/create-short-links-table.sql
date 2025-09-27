-- Create table for custom short links used by SMS and web experiences
CREATE TABLE IF NOT EXISTS short_links (
    slug TEXT PRIMARY KEY,
    target_url TEXT NOT NULL,
    context TEXT,
    created_for TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure we can quickly look up by the original URL to reuse existing slugs
CREATE UNIQUE INDEX IF NOT EXISTS idx_short_links_target_url
    ON short_links (target_url);

-- Allow filtering by context if we later support multiple categories
CREATE INDEX IF NOT EXISTS idx_short_links_context
    ON short_links (context)
    WHERE context IS NOT NULL;
