-- Migration 005: Gmail OAuth Integration
-- Adds secure storage for user OAuth tokens (Gmail and future integrations)

-- ============================================================================
-- 1. Create user_oauth_tokens Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES sms_subscribers(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'gmail', 'google', 'outlook', etc.
  encrypted_access_token text NOT NULL,
  encrypted_refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  scopes jsonb DEFAULT '[]', -- Array of OAuth scopes granted
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_used_at timestamptz,
  UNIQUE(subscriber_id, provider)
);

COMMENT ON TABLE user_oauth_tokens IS
'Encrypted OAuth tokens for third-party integrations (Gmail, etc.). Tokens are encrypted with AES-256.';

COMMENT ON COLUMN user_oauth_tokens.encrypted_access_token IS
'AES-256 encrypted OAuth access token';

COMMENT ON COLUMN user_oauth_tokens.encrypted_refresh_token IS
'AES-256 encrypted OAuth refresh token';

COMMENT ON COLUMN user_oauth_tokens.scopes IS
'JSON array of OAuth scopes granted by user, e.g., ["https://www.googleapis.com/auth/gmail.readonly"]';

-- ============================================================================
-- 2. Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_subscriber
ON user_oauth_tokens(subscriber_id);

CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_provider
ON user_oauth_tokens(subscriber_id, provider);

CREATE INDEX IF NOT EXISTS idx_user_oauth_tokens_expires
ON user_oauth_tokens(token_expires_at);

-- ============================================================================
-- 3. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE user_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to oauth tokens"
ON user_oauth_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: No public access (tokens are highly sensitive)
-- Users cannot access their own tokens directly - only via service layer

-- ============================================================================
-- 4. Updated At Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_user_oauth_tokens_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_user_oauth_tokens_updated_at
BEFORE UPDATE ON user_oauth_tokens
FOR EACH ROW
EXECUTE FUNCTION update_user_oauth_tokens_updated_at();

-- ============================================================================
-- 5. Cleanup Function for Expired Tokens
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_oauth_tokens()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete tokens that expired more than 30 days ago
  -- (Keep recent expired tokens for debugging/audit)
  DELETE FROM user_oauth_tokens
  WHERE token_expires_at < NOW() - INTERVAL '30 days';
END;
$$;

COMMENT ON FUNCTION cleanup_expired_oauth_tokens IS
'Delete OAuth tokens that expired >30 days ago (call periodically)';
