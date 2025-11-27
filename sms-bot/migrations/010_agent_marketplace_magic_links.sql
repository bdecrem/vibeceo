-- Agent Marketplace Magic Links
-- Enables SMS users to access the agent marketplace via one-time links

CREATE TABLE IF NOT EXISTS agent_marketplace_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,

  -- Token lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,

  -- Track what the user did with the link
  accessed_count INTEGER DEFAULT 0,

  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_tokens_token ON agent_marketplace_tokens(token);
CREATE INDEX IF NOT EXISTS idx_marketplace_tokens_phone ON agent_marketplace_tokens(phone_number);
CREATE INDEX IF NOT EXISTS idx_marketplace_tokens_expires ON agent_marketplace_tokens(expires_at);

-- Auto-cleanup function for expired tokens (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_expired_marketplace_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM agent_marketplace_tokens
  WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Migration complete
COMMENT ON TABLE agent_marketplace_tokens IS 'One-time magic link tokens for SMS users to access agent marketplace';
