-- Migration 002: Add raw_response column for debugging
-- Purpose: Store full unprocessed agent output for debugging/auditing
-- The 'content' column remains for clean context, 'raw_response' for debugging

-- Add raw_response column to ps_conversation
ALTER TABLE ps_conversation
ADD COLUMN raw_response TEXT;

-- Comment on the column
COMMENT ON COLUMN ps_conversation.raw_response IS 'Full unprocessed agent response for debugging. Not included in context to keep it lean.';
