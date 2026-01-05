-- Migration: Add assistance_request and human_message types to incubator_messages table
-- Date: 2025-12-29
-- Purpose: Enable human assistance request system message types

-- Drop the existing CHECK constraint on type column
ALTER TABLE incubator_messages
DROP CONSTRAINT IF EXISTS incubator_messages_type_check;

-- Add new CHECK constraint with additional types
ALTER TABLE incubator_messages
ADD CONSTRAINT incubator_messages_type_check
CHECK (type IN ('lesson', 'warning', 'success', 'failure', 'observation', 'assistance_request', 'human_message'));

-- Verify the constraint was added
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'incubator_messages_type_check';
