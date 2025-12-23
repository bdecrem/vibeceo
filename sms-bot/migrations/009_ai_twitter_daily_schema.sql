-- Migration: AI Twitter Daily & Amber Explain
-- Creates content_sources, covered_content tables and adds preferences column

-- 1. content_sources: Universal source registry for any agent
CREATE TABLE IF NOT EXISTS content_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_slug text NOT NULL,                          -- 'ai-twitter-daily', 'youtube-digest', etc.
  source_type text NOT NULL,                         -- 'twitter_account', 'youtube_channel', 'rss_feed'
  identifier text NOT NULL,                          -- '@karpathy', 'UC...', 'https://...'
  display_name text,
  priority int DEFAULT 50,                           -- Higher = more important
  metadata jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(agent_slug, source_type, identifier)
);

-- Index for efficient agent-based queries
CREATE INDEX IF NOT EXISTS idx_content_sources_agent ON content_sources(agent_slug, active);

-- 2. covered_content: Generalizes covered_papers for any content type
CREATE TABLE IF NOT EXISTS covered_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id int REFERENCES episodes(id) ON DELETE CASCADE,
  content_type text NOT NULL,                        -- 'tweet', 'video', 'article'
  external_id text NOT NULL,                         -- tweet_id, video_id
  title text,
  author text,
  summary text,
  full_text text,
  url text,
  metadata jsonb DEFAULT '{}',                       -- thread_context, timestamps, etc.
  covered_at timestamptz DEFAULT now()
);

-- Index for episode lookups (interactive mode)
CREATE INDEX IF NOT EXISTS idx_covered_content_episode ON covered_content(episode_id, content_type);

-- 3. Add preferences JSONB column to sms_subscribers
-- Example: {"explanation_level": "intermediate", "expertise": {"ai": 0.8}}
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_subscribers' AND column_name = 'preferences'
  ) THEN
    ALTER TABLE sms_subscribers ADD COLUMN preferences jsonb DEFAULT '{}';
  END IF;
END $$;

-- 4. Seed initial AI Twitter accounts (can be expanded via admin command or direct insert)
INSERT INTO content_sources (agent_slug, source_type, identifier, display_name, priority) VALUES
  ('ai-twitter-daily', 'twitter_account', 'karpathy', 'Andrej Karpathy', 100),
  ('ai-twitter-daily', 'twitter_account', 'ylecun', 'Yann LeCun', 95),
  ('ai-twitter-daily', 'twitter_account', 'sama', 'Sam Altman', 90),
  ('ai-twitter-daily', 'twitter_account', 'demaborenstein', 'Dema Borenstein', 85),
  ('ai-twitter-daily', 'twitter_account', 'emaborenstein', 'Ema Borenstein', 85),
  ('ai-twitter-daily', 'twitter_account', 'fchollet', 'Francois Chollet', 80),
  ('ai-twitter-daily', 'twitter_account', 'GaryMarcus', 'Gary Marcus', 75),
  ('ai-twitter-daily', 'twitter_account', 'ilonakorzo', 'Ilona Korzo', 75),
  ('ai-twitter-daily', 'twitter_account', 'drjimfan', 'Jim Fan', 75),
  ('ai-twitter-daily', 'twitter_account', 'AnthropicAI', 'Anthropic', 70),
  ('ai-twitter-daily', 'twitter_account', 'OpenAI', 'OpenAI', 70),
  ('ai-twitter-daily', 'twitter_account', 'GoogleDeepMind', 'Google DeepMind', 70),
  ('ai-twitter-daily', 'twitter_account', 'huggingface', 'Hugging Face', 65),
  ('ai-twitter-daily', 'twitter_account', '_akhaliq', 'AK', 65),
  ('ai-twitter-daily', 'twitter_account', 'ai_explained', 'AI Explained', 60)
ON CONFLICT (agent_slug, source_type, identifier) DO NOTHING;
