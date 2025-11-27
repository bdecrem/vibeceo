-- Kochi Intelligence Platform: User-Defined Sources
-- Sprint 2: User sources for custom RSS and HTTP JSON feeds

-- ============================================================================
-- USER_SOURCES TABLE
-- ============================================================================
-- Stores user-defined data sources (RSS feeds, JSON APIs, etc.)
CREATE TABLE IF NOT EXISTS user_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Source metadata
  name TEXT NOT NULL,
  description TEXT,

  -- Source type: 'rss', 'http_json', etc.
  kind TEXT NOT NULL CHECK (kind IN ('rss', 'http_json')),

  -- Source configuration as JSONB
  -- For RSS: { feedUrl, maxItems }
  -- For HTTP JSON: { url, method, headers, jsonPath }
  config_jsonb JSONB NOT NULL,

  -- Normalization configuration
  -- Maps source fields to NormalizedItem fields
  -- { titlePath, summaryPath, urlPath, publishedAtPath, authorPath }
  normalization_jsonb JSONB,

  -- Visibility: 'private', 'shared', 'public'
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_fetched_at TIMESTAMPTZ,
  fetch_count INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_sources_owner ON user_sources(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_user_sources_kind ON user_sources(kind);
CREATE INDEX IF NOT EXISTS idx_user_sources_visibility ON user_sources(visibility);
CREATE INDEX IF NOT EXISTS idx_user_sources_created ON user_sources(created_at DESC);

-- ============================================================================
-- SOURCE FETCH LOGS TABLE (Optional - for debugging)
-- ============================================================================
-- Tracks fetch attempts and errors
CREATE TABLE IF NOT EXISTS source_fetch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_source_id UUID NOT NULL REFERENCES user_sources(id) ON DELETE CASCADE,

  -- Fetch metadata
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  items_fetched INTEGER DEFAULT 0,
  success BOOLEAN NOT NULL,

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,

  -- Response metadata
  http_status INTEGER,
  response_time_ms INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_source_fetch_logs_source ON source_fetch_logs(user_source_id);
CREATE INDEX IF NOT EXISTS idx_source_fetch_logs_fetched ON source_fetch_logs(fetched_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
-- Reuse the update_updated_at_column function from previous migration

DROP TRIGGER IF EXISTS update_user_sources_updated_at ON user_sources;
CREATE TRIGGER update_user_sources_updated_at
  BEFORE UPDATE ON user_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE user_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_fetch_logs ENABLE ROW LEVEL SECURITY;

-- User sources: owners can manage, public sources readable by all
CREATE POLICY "Users can view their own sources"
  ON user_sources FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can view public sources"
  ON user_sources FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Users can create sources"
  ON user_sources FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update their own sources"
  ON user_sources FOR UPDATE
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete their own sources"
  ON user_sources FOR DELETE
  USING (auth.uid() = owner_user_id);

-- Source fetch logs: only owners can view
CREATE POLICY "Users can view logs for their sources"
  ON source_fetch_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_sources
      WHERE user_sources.id = source_fetch_logs.user_source_id
      AND user_sources.owner_user_id = auth.uid()
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to record a source fetch
CREATE OR REPLACE FUNCTION record_source_fetch(
  p_user_source_id UUID,
  p_items_fetched INTEGER,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_http_status INTEGER DEFAULT NULL,
  p_response_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Insert fetch log
  INSERT INTO source_fetch_logs (
    user_source_id,
    items_fetched,
    success,
    error_message,
    http_status,
    response_time_ms
  )
  VALUES (
    p_user_source_id,
    p_items_fetched,
    p_success,
    p_error_message,
    p_http_status,
    p_response_time_ms
  )
  RETURNING id INTO v_log_id;

  -- Update user_sources metadata
  UPDATE user_sources
  SET
    last_fetched_at = NOW(),
    fetch_count = fetch_count + 1
  WHERE id = p_user_source_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration complete
COMMENT ON TABLE user_sources IS 'Kochi Intelligence Platform: User-defined data sources (RSS, JSON APIs)';
COMMENT ON TABLE source_fetch_logs IS 'Kochi Intelligence Platform: Fetch logs for debugging user sources';
