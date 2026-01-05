-- Migration: Incubator Messages Table
-- Created: 2025-12-26
-- Purpose: Agent self-learning and cross-agent communication system
--
-- This table allows agents to:
-- 1. Leave notes for themselves to learn from in future runs (scope: SELF)
-- 2. Broadcast insights to all other agents (scope: ALL)
-- 3. Send direct messages to specific agents (scope: DIRECT)
--
-- Over time, agents read their own messages, broadcasts from others, and direct messages,
-- continuously improving their decision-making.

CREATE TABLE incubator_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Agent identification
  agent_id TEXT NOT NULL,           -- Sender: 'i1', 'i2', 'i3-2', etc.

  -- Recipient (for direct messages)
  recipient TEXT,                   -- Recipient agent_id for DIRECT messages, NULL for SELF/ALL

  -- Scope: who should read this?
  scope TEXT NOT NULL CHECK (scope IN ('SELF', 'ALL', 'DIRECT')),

  -- Message classification
  type TEXT NOT NULL CHECK (type IN ('lesson', 'warning', 'success', 'failure', 'observation')),

  -- Core content
  content TEXT NOT NULL,            -- The actual message

  -- Metadata for filtering/search
  tags TEXT[] DEFAULT '{}',         -- ['trading', 'competitor-research', etc.]
  context JSONB DEFAULT '{}',       -- Flexible metadata: {trade_id, url, file_changed, sample_size, etc.}

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT recipient_required_for_direct CHECK (
    (scope = 'DIRECT' AND recipient IS NOT NULL) OR
    (scope != 'DIRECT' AND recipient IS NULL)
  )
);

-- Indexes for common query patterns
CREATE INDEX idx_incubator_messages_agent ON incubator_messages(agent_id);
CREATE INDEX idx_incubator_messages_scope ON incubator_messages(scope);
CREATE INDEX idx_incubator_messages_recipient ON incubator_messages(recipient);
CREATE INDEX idx_incubator_messages_created ON incubator_messages(created_at DESC);
CREATE INDEX idx_incubator_messages_tags ON incubator_messages USING GIN(tags);
CREATE INDEX idx_incubator_messages_type ON incubator_messages(type);

-- Composite index for agent's own self-notes (most common query)
CREATE INDEX idx_incubator_messages_agent_self ON incubator_messages(agent_id, scope, created_at DESC)
  WHERE scope = 'SELF';

-- Composite index for broadcasts (common query)
CREATE INDEX idx_incubator_messages_broadcasts ON incubator_messages(scope, created_at DESC)
  WHERE scope = 'ALL';

-- Composite index for direct messages to an agent (inbox pattern)
CREATE INDEX idx_incubator_messages_inbox ON incubator_messages(recipient, created_at DESC)
  WHERE scope = 'DIRECT';

-- Composite index for direct messages sent by an agent (outbox pattern)
CREATE INDEX idx_incubator_messages_outbox ON incubator_messages(agent_id, scope, created_at DESC)
  WHERE scope = 'DIRECT';

-- Add RLS (Row Level Security) - currently permissive, can tighten later
ALTER TABLE incubator_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read all messages
CREATE POLICY "Allow authenticated read access" ON incubator_messages
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Policy: Allow all authenticated users to insert messages
CREATE POLICY "Allow authenticated insert access" ON incubator_messages
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Comments for documentation
COMMENT ON TABLE incubator_messages IS 'Agent self-learning and cross-agent communication system for Token Tank incubator';
COMMENT ON COLUMN incubator_messages.agent_id IS 'Sender agent identifier (i1, i2, i3-2, etc.)';
COMMENT ON COLUMN incubator_messages.recipient IS 'Recipient agent_id for DIRECT messages, NULL for SELF/ALL';
COMMENT ON COLUMN incubator_messages.scope IS 'SELF = note to self, ALL = broadcast to all agents, DIRECT = message to specific agent';
COMMENT ON COLUMN incubator_messages.type IS 'Message classification: lesson, warning, success, failure, observation';
COMMENT ON COLUMN incubator_messages.content IS 'The actual learning/message text';
COMMENT ON COLUMN incubator_messages.tags IS 'Searchable categories (trading, research, validation, etc.)';
COMMENT ON COLUMN incubator_messages.context IS 'Flexible JSONB metadata for additional context';
