-- AIR (AI Research) Personalized Agent Schema
-- Migration 002: Add Supabase support for personalized research reports

-- 1. Add preferences JSONB column to existing agent_subscriptions table
-- This allows each agent to store custom preferences without schema changes
ALTER TABLE agent_subscriptions
ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_preferences
  ON agent_subscriptions USING gin(preferences);

COMMENT ON COLUMN agent_subscriptions.preferences IS 'Agent-specific preferences stored as JSON. For AIR: {natural_language_query, notification_time, last_delivery_status, consecutive_failures}';

-- 2. Create general conversation_context table (future-proof for any conversational agent)
CREATE TABLE IF NOT EXISTS conversation_context (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id uuid NOT NULL REFERENCES sms_subscribers(id) ON DELETE CASCADE,
  context_type text NOT NULL,              -- 'air', 'general', 'kg_query', etc.
  conversation_history jsonb DEFAULT '[]', -- Array of {role, content, timestamp}
  metadata jsonb DEFAULT '{}',             -- Feature-specific context data
  expires_at timestamptz,                  -- NULL = never expires, or set timeout
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- One context per user per type
  UNIQUE(subscriber_id, context_type)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_conversation_context_subscriber_type
  ON conversation_context(subscriber_id, context_type);

CREATE INDEX IF NOT EXISTS idx_conversation_context_expires
  ON conversation_context(expires_at)
  WHERE expires_at IS NOT NULL;

COMMENT ON TABLE conversation_context IS 'General conversation context storage for any agent that needs to track multi-turn conversations';
COMMENT ON COLUMN conversation_context.context_type IS 'Namespace for different conversation types: air, general, kg_query, crypto, etc.';
COMMENT ON COLUMN conversation_context.conversation_history IS 'Array of message objects: [{role: "user"|"assistant", content: "...", timestamp: "..."}]';
COMMENT ON COLUMN conversation_context.metadata IS 'Feature-specific data. For AIR: {last_report_date, last_report_preview, standing_query}';

-- 3. Create personalized reports table
CREATE TABLE IF NOT EXISTS ai_research_reports_personalized (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscriber_id uuid NOT NULL REFERENCES sms_subscribers(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  markdown_content text,
  audio_url text,
  paper_count int,
  query_used text,                         -- Natural language query that generated this report
  created_at timestamptz DEFAULT now(),

  -- One report per user per day
  UNIQUE(subscriber_id, report_date)
);

-- Index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_air_reports_subscriber_date
  ON ai_research_reports_personalized(subscriber_id, report_date DESC);

COMMENT ON TABLE ai_research_reports_personalized IS 'Personalized daily AI research reports, one per user per day';
COMMENT ON COLUMN ai_research_reports_personalized.query_used IS 'The natural language query used to generate this report (e.g., "physical ai", "researchers in california")';

-- Enable Row Level Security (RLS) on new tables
ALTER TABLE conversation_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_research_reports_personalized ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only service role can access these tables (server-side only)
-- Users should not have direct access to conversation context or personalized reports

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Service role can manage conversation_context" ON conversation_context;
DROP POLICY IF EXISTS "Service role can manage ai_research_reports" ON ai_research_reports_personalized;

-- Create policies for service role only
CREATE POLICY "Service role can manage conversation_context"
  ON conversation_context
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage ai_research_reports"
  ON ai_research_reports_personalized
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verification queries (run these manually to verify migration)
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agent_subscriptions' AND column_name = 'preferences';
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('conversation_context', 'ai_research_reports_personalized');
