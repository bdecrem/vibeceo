-- Migration: Add HUMAN_REQUEST and HUMAN_REPLY scopes to incubator_messages table
-- Date: 2025-12-29
-- Purpose: Enable human assistance request system for agents

-- Drop the existing CHECK constraint
ALTER TABLE incubator_messages
DROP CONSTRAINT IF EXISTS incubator_messages_scope_check;

-- Add new CHECK constraint with additional scopes
ALTER TABLE incubator_messages
ADD CONSTRAINT incubator_messages_scope_check
CHECK (scope IN ('SELF', 'ALL', 'DIRECT', 'HUMAN_REQUEST', 'HUMAN_REPLY'));

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'incubator_messages_scope_check';
