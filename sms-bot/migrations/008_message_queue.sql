-- Message Queue Schema
-- Stores outbound messages that are queued due to active conversations
-- Messages are processed when conversations end or after expiration

CREATE TABLE IF NOT EXISTS message_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES sms_subscribers(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL, -- Normalized phone number (for quick lookup)
  message TEXT NOT NULL,
  message_type VARCHAR(50), -- 'ai_daily', 'recruiting', 'report', 'command_response', etc.
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10), -- 1-10, higher = more important
  source VARCHAR(50), -- 'scheduler', 'agent', 'command', 'webhook', etc.
  metadata JSONB DEFAULT '{}', -- Additional context (relatedThreadId, canMerge, etc.)
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'sent', 'expired', 'failed', 'merged')),
  routing_decision JSONB, -- Store the routing decision result for debugging
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- When this message expires if not sent
  sent_at TIMESTAMP WITH TIME ZONE, -- When message was actually sent
  failed_at TIMESTAMP WITH TIME ZONE, -- When message failed (if status = 'failed')
  failure_reason TEXT, -- Why message failed
  retry_count INTEGER DEFAULT 0, -- Number of retry attempts
  max_retries INTEGER DEFAULT 3, -- Maximum retry attempts before marking as failed
  twilio_client_config JSONB, -- Store Twilio client config if needed for retry
  CONSTRAINT valid_expires_at CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_queue_subscriber ON message_queue(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_message_queue_phone ON message_queue(phone_number);
CREATE INDEX IF NOT EXISTS idx_message_queue_status ON message_queue(status) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_message_queue_priority ON message_queue(priority DESC, created_at ASC) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_message_queue_expires ON message_queue(expires_at) WHERE status = 'queued' AND expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_message_queue_created ON message_queue(created_at) WHERE status = 'queued';

-- Composite index for common query pattern: get queued messages for a subscriber, ordered by priority
CREATE INDEX IF NOT EXISTS idx_message_queue_subscriber_priority ON message_queue(subscriber_id, priority DESC, created_at ASC) WHERE status = 'queued';

-- Function to automatically expire old queued messages
CREATE OR REPLACE FUNCTION expire_old_messages()
RETURNS void AS $$
BEGIN
  UPDATE message_queue
  SET status = 'expired',
      sent_at = NOW()
  WHERE status = 'queued'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to get next queued message for processing (ordered by priority, then creation time)
CREATE OR REPLACE FUNCTION get_next_queued_message(p_subscriber_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  subscriber_id UUID,
  phone_number TEXT,
  message TEXT,
  message_type VARCHAR,
  priority INTEGER,
  source VARCHAR,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mq.id,
    mq.subscriber_id,
    mq.phone_number,
    mq.message,
    mq.message_type,
    mq.priority,
    mq.source,
    mq.metadata,
    mq.created_at,
    mq.expires_at
  FROM message_queue mq
  WHERE mq.status = 'queued'
    AND (p_subscriber_id IS NULL OR mq.subscriber_id = p_subscriber_id)
    AND (mq.expires_at IS NULL OR mq.expires_at > NOW())
  ORDER BY mq.priority DESC, mq.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to mark message as processing (prevents concurrent processing)
CREATE OR REPLACE FUNCTION mark_message_processing(p_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_status VARCHAR;
BEGIN
  SELECT status INTO v_current_status
  FROM message_queue
  WHERE id = p_id;
  
  IF v_current_status = 'queued' THEN
    UPDATE message_queue
    SET status = 'processing'
    WHERE id = p_id;
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to mark message as sent
CREATE OR REPLACE FUNCTION mark_message_sent(p_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE message_queue
  SET status = 'sent',
      sent_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Function to mark message as failed
CREATE OR REPLACE FUNCTION mark_message_failed(p_id UUID, p_reason TEXT)
RETURNS void AS $$
BEGIN
  UPDATE message_queue
  SET status = 'failed',
      failed_at = NOW(),
      failure_reason = p_reason,
      retry_count = retry_count + 1
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reset message back to queued (for retry)
CREATE OR REPLACE FUNCTION reset_message_for_retry(p_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_retry_count INTEGER;
  v_max_retries INTEGER;
BEGIN
  SELECT retry_count, max_retries INTO v_retry_count, v_max_retries
  FROM message_queue
  WHERE id = p_id;
  
  IF v_retry_count >= v_max_retries THEN
    -- Too many retries, mark as failed
    UPDATE message_queue
    SET status = 'failed',
        failed_at = NOW(),
        failure_reason = 'Max retries exceeded'
    WHERE id = p_id;
    RETURN FALSE;
  ELSE
    -- Reset to queued for retry
    UPDATE message_queue
    SET status = 'queued',
        retry_count = retry_count + 1
    WHERE id = p_id;
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get queued message count for a subscriber
CREATE OR REPLACE FUNCTION get_queued_message_count(p_subscriber_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM message_queue
  WHERE subscriber_id = p_subscriber_id
    AND status = 'queued'
    AND (expires_at IS NULL OR expires_at > NOW());
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE message_queue IS 'Stores outbound SMS messages queued due to active conversations';
COMMENT ON COLUMN message_queue.priority IS '1-10 scale, higher = more important. Messages with priority >= 8 can override active conversations';
COMMENT ON COLUMN message_queue.status IS 'queued: waiting to be sent, processing: currently being sent, sent: successfully sent, expired: expired before sending, failed: failed to send, merged: merged into conversation';
COMMENT ON COLUMN message_queue.routing_decision IS 'Stores the AI routing decision result for debugging and analytics';

