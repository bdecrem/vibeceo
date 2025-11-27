-- Kochi Intelligence Platform: Agents and Agent Versions
-- Sprint 1: Core agent definition and versioning tables

-- ============================================================================
-- AGENTS TABLE
-- ============================================================================
-- Stores agent metadata and current status
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Agent identity (denormalized from latest version for quick access)
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT,

  -- Agent status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'disabled')),

  -- Versioning
  current_version_id UUID, -- References agent_versions(id), set after first approval

  -- Visibility and features
  is_featured BOOLEAN DEFAULT FALSE,
  is_paid BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_creator ON agents(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_agents_slug ON agents(slug);
CREATE INDEX IF NOT EXISTS idx_agents_category ON agents(category);
CREATE INDEX IF NOT EXISTS idx_agents_featured ON agents(is_featured) WHERE is_featured = TRUE;

-- ============================================================================
-- AGENT VERSIONS TABLE
-- ============================================================================
-- Stores complete agent definitions as JSONB for each version
CREATE TABLE IF NOT EXISTS agent_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Version number (increments for each agent)
  version INTEGER NOT NULL,

  -- Complete agent definition as JSONB
  -- Validated against AgentDefinitionSchema on write
  definition_jsonb JSONB NOT NULL,

  -- Optional custom code for advanced mode (Sprint 5)
  custom_code TEXT,

  -- Version metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changelog TEXT,

  -- Ensure unique version numbers per agent
  UNIQUE(agent_id, version)
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_agent_versions_agent ON agent_versions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_versions_created ON agent_versions(created_at DESC);

-- Add foreign key constraint from agents to agent_versions
ALTER TABLE agents
  ADD CONSTRAINT fk_agents_current_version
  FOREIGN KEY (current_version_id)
  REFERENCES agent_versions(id)
  ON DELETE SET NULL;

-- ============================================================================
-- AGENT RUNS TABLE
-- ============================================================================
-- Tracks every execution of an agent
CREATE TABLE IF NOT EXISTS agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES agent_versions(id) ON DELETE CASCADE,

  -- User context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone_number TEXT,

  -- Run type
  run_type TEXT NOT NULL CHECK (run_type IN ('scheduled', 'command', 'manual', 'preview')),
  trigger_data JSONB,

  -- Execution status
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed', 'timeout')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,

  -- Outputs
  sms_content TEXT,
  report_url TEXT,
  audio_url TEXT,

  -- Performance metrics
  metrics_jsonb JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics and debugging
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_user ON agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_started ON agent_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs_type ON agent_runs(run_type);

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================
-- Tracks user subscriptions to agents
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL, -- For SMS routing
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

  -- Payment tracking
  is_paid BOOLEAN DEFAULT FALSE,
  payment_provider TEXT, -- 'lemonsqueezy', 'stripe', etc.
  provider_subscription_id TEXT,

  -- Subscription status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),

  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Unique constraint: one subscription per user per agent
  UNIQUE(user_id, agent_id),
  UNIQUE(phone_number, agent_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_agent ON subscriptions(agent_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_phone ON subscriptions(phone_number);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON subscriptions(payment_provider, provider_subscription_id);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
-- Auto-update updated_at timestamps

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to agents table
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to subscriptions table
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on all tables

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Agents: Public read for approved, creator can manage their own
CREATE POLICY "Public can view approved agents"
  ON agents FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Creators can view their own agents"
  ON agents FOR SELECT
  USING (auth.uid() = creator_user_id);

CREATE POLICY "Creators can insert agents"
  ON agents FOR INSERT
  WITH CHECK (auth.uid() = creator_user_id);

CREATE POLICY "Creators can update their own agents"
  ON agents FOR UPDATE
  USING (auth.uid() = creator_user_id);

-- Agent versions: Same as agents
CREATE POLICY "Public can view approved agent versions"
  ON agent_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_versions.agent_id
      AND agents.status = 'approved'
    )
  );

CREATE POLICY "Creators can view their agent versions"
  ON agent_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_versions.agent_id
      AND agents.creator_user_id = auth.uid()
    )
  );

CREATE POLICY "Creators can insert agent versions"
  ON agent_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_versions.agent_id
      AND agents.creator_user_id = auth.uid()
    )
  );

-- Agent runs: Users can view their own runs, creators can view runs of their agents
CREATE POLICY "Users can view their own runs"
  ON agent_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Creators can view runs of their agents"
  ON agent_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_runs.agent_id
      AND agents.creator_user_id = auth.uid()
    )
  );

-- Subscriptions: Users can view and manage their own subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create a new agent version
CREATE OR REPLACE FUNCTION create_agent_version(
  p_agent_id UUID,
  p_definition_jsonb JSONB,
  p_changelog TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_next_version INTEGER;
  v_new_version_id UUID;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
  FROM agent_versions
  WHERE agent_id = p_agent_id;

  -- Insert new version
  INSERT INTO agent_versions (agent_id, version, definition_jsonb, changelog, created_by)
  VALUES (p_agent_id, v_next_version, p_definition_jsonb, p_changelog, auth.uid())
  RETURNING id INTO v_new_version_id;

  -- Update agent's updated_at
  UPDATE agents SET updated_at = NOW() WHERE id = p_agent_id;

  RETURN v_new_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve an agent
CREATE OR REPLACE FUNCTION approve_agent(
  p_agent_id UUID,
  p_version_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Update agent status and set current version
  UPDATE agents
  SET
    status = 'approved',
    current_version_id = p_version_id,
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================
-- No initial data needed for Sprint 1

-- Migration complete
COMMENT ON TABLE agents IS 'Kochi Intelligence Platform: Agent definitions and metadata';
COMMENT ON TABLE agent_versions IS 'Kochi Intelligence Platform: Versioned agent definitions stored as JSONB';
COMMENT ON TABLE agent_runs IS 'Kochi Intelligence Platform: Execution logs for agent runs';
COMMENT ON TABLE subscriptions IS 'Kochi Intelligence Platform: User subscriptions to agents';
