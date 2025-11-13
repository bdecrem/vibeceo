-- Migration 007: Conversation Thread Tracking
-- Adds thread awareness for multi-turn conversations across handlers

-- ============================================================================
-- 1. Add Thread Tracking Columns to conversation_context
-- ============================================================================

ALTER TABLE conversation_context
ADD COLUMN IF NOT EXISTS thread_id uuid DEFAULT uuid_generate_v4(),
ADD COLUMN IF NOT EXISTS active_handler text,
ADD COLUMN IF NOT EXISTS thread_started_at timestamptz DEFAULT now();

COMMENT ON COLUMN conversation_context.thread_id IS
'Groups related messages in a multi-turn conversation';

COMMENT ON COLUMN conversation_context.active_handler IS
'Which handler is processing this thread: general, discovery, kg-query, air, etc.';

COMMENT ON COLUMN conversation_context.thread_started_at IS
'When this conversation thread started';

-- ============================================================================
-- 2. Add Index for Thread Queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_conversation_thread
ON conversation_context(subscriber_id, thread_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_conversation_active_thread
ON conversation_context(subscriber_id, context_type, expires_at)
WHERE context_type = 'active_thread';

-- ============================================================================
-- 3. Function to Get Active Thread for User
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_thread(p_subscriber_id uuid)
RETURNS TABLE (
  thread_id uuid,
  active_handler text,
  thread_started_at timestamptz,
  last_activity timestamptz,
  full_context jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cc.thread_id,
    cc.active_handler,
    cc.thread_started_at,
    cc.created_at as last_activity,
    cc.metadata as full_context
  FROM conversation_context cc
  WHERE cc.subscriber_id = p_subscriber_id
    AND cc.context_type = 'active_thread'
    AND cc.expires_at >= now()
    AND cc.created_at >= now() - interval '5 minutes'
  ORDER BY cc.created_at DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION get_active_thread IS
'Get the active conversation thread for a user (last 5 minutes)';

-- ============================================================================
-- 4. Function to Store Thread State
-- ============================================================================

CREATE OR REPLACE FUNCTION store_thread_state(
  p_subscriber_id uuid,
  p_handler text,
  p_topic text,
  p_context jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_thread_id uuid;
BEGIN
  -- Generate new thread ID
  v_thread_id := uuid_generate_v4();

  -- Delete any existing active thread for this user
  DELETE FROM conversation_context
  WHERE subscriber_id = p_subscriber_id
    AND context_type = 'active_thread';

  -- Insert new active thread
  INSERT INTO conversation_context (
    subscriber_id,
    context_type,
    thread_id,
    active_handler,
    thread_started_at,
    metadata,
    expires_at
  ) VALUES (
    p_subscriber_id,
    'active_thread',
    v_thread_id,
    p_handler,
    now(),
    jsonb_build_object('topic', p_topic) || p_context,
    now() + interval '10 minutes'
  );

  RETURN v_thread_id;
END;
$$;

COMMENT ON FUNCTION store_thread_state IS
'Store active thread state for multi-turn conversations. Expires in 10 minutes.';

-- ============================================================================
-- 5. Function to Update Thread Context
-- ============================================================================

CREATE OR REPLACE FUNCTION update_thread_context(
  p_subscriber_id uuid,
  p_context jsonb
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated boolean;
BEGIN
  UPDATE conversation_context
  SET
    metadata = metadata || p_context,
    expires_at = now() + interval '10 minutes',
    updated_at = now()
  WHERE subscriber_id = p_subscriber_id
    AND context_type = 'active_thread'
    AND expires_at >= now();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

COMMENT ON FUNCTION update_thread_context IS
'Update metadata for active thread and extend expiration';

-- ============================================================================
-- 6. Function to Clear Thread State
-- ============================================================================

CREATE OR REPLACE FUNCTION clear_thread_state(p_subscriber_id uuid)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted boolean;
BEGIN
  DELETE FROM conversation_context
  WHERE subscriber_id = p_subscriber_id
    AND context_type = 'active_thread';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$;

COMMENT ON FUNCTION clear_thread_state IS
'Clear active thread state for a user';
