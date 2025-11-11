-- Migration 003: Conversational Intelligence System
-- Adds personalization support and improves conversation_context table

-- ============================================================================
-- 1. Add Personalization to SMS Subscribers
-- ============================================================================

ALTER TABLE sms_subscribers
ADD COLUMN IF NOT EXISTS personalization jsonb DEFAULT '{}';

COMMENT ON COLUMN sms_subscribers.personalization IS
'Permanent user personalization: {name, interests, timezone, location, notes}';

-- ============================================================================
-- 2. Update conversation_context Table
-- ============================================================================

-- Remove unique constraint to allow multiple context types per user
ALTER TABLE conversation_context
DROP CONSTRAINT IF EXISTS conversation_context_subscriber_id_context_type_key;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_conversation_context_expires_at
ON conversation_context(expires_at);

CREATE INDEX IF NOT EXISTS idx_conversation_context_subscriber_expires
ON conversation_context(subscriber_id, expires_at);

COMMENT ON TABLE conversation_context IS
'Temporary conversation context (12hr window): recent messages, pending actions, reports sent';

-- ============================================================================
-- 3. Cleanup Function for Expired Contexts
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_contexts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM conversation_context
  WHERE expires_at < NOW();
END;
$$;

COMMENT ON FUNCTION cleanup_expired_contexts IS
'Delete expired conversation contexts (call periodically)';
