# Incubator Database Migrations

This file tracks all database schema changes for the incubator system.

## How to Apply Migrations

1. Go to your Supabase project: https://supabase.com/dashboard/project/tqniseocczttrfwtpbdr
2. Navigate to: SQL Editor → New Query
3. Copy the SQL from the migration file
4. Run the query
5. Mark the migration as complete in this file

---

## Migration 001: Initial incubator_messages table
**Date**: 2025-12-04
**Status**: ✅ Complete
**Created by**: System

Initial schema for agent message system with scopes: SELF, ALL, DIRECT.

**Schema**:
```sql
CREATE TABLE incubator_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('SELF', 'ALL', 'DIRECT')),
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  recipient TEXT,
  tags TEXT[] DEFAULT '{}',
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incubator_messages_agent ON incubator_messages(agent_id);
CREATE INDEX idx_incubator_messages_scope ON incubator_messages(scope);
CREATE INDEX idx_incubator_messages_recipient ON incubator_messages(recipient);
CREATE INDEX idx_incubator_messages_created ON incubator_messages(created_at DESC);
```

---

## Migration 002: Add HUMAN_REQUEST and HUMAN_REPLY scopes
**Date**: 2025-12-29
**Status**: ✅ Complete
**File**: `migrations/002_add_human_request_scopes.sql`
**Purpose**: Enable human assistance request system

**What it does**:
- Adds `HUMAN_REQUEST` scope for agents requesting human help
- Adds `HUMAN_REPLY` scope for human responses to agents
- Updates CHECK constraint on `scope` column

**To apply**:
1. Copy SQL from `migrations/002_add_human_request_scopes.sql`
2. Run in Supabase SQL Editor
3. Mark as ✅ Complete in this file

**Rollback** (if needed):
```sql
-- Revert to original scopes
ALTER TABLE incubator_messages
DROP CONSTRAINT incubator_messages_scope_check;

ALTER TABLE incubator_messages
ADD CONSTRAINT incubator_messages_scope_check
CHECK (scope IN ('SELF', 'ALL', 'DIRECT'));
```

---

## Migration 003: Add assistance_request and human_message types
**Date**: 2025-12-29
**Status**: ✅ Complete
**File**: `migrations/003_add_human_request_types.sql`
**Purpose**: Enable human assistance request system message types

**What it does**:
- Adds `assistance_request` type for agents requesting human help
- Adds `human_message` type for human responses to agents
- Updates CHECK constraint on `type` column

**To apply**:
1. Copy SQL from `migrations/003_add_human_request_types.sql`
2. Run in Supabase SQL Editor
3. Mark as ✅ Complete in this file

**Rollback** (if needed):
```sql
-- Revert to original types
ALTER TABLE incubator_messages
DROP CONSTRAINT incubator_messages_type_check;

ALTER TABLE incubator_messages
ADD CONSTRAINT incubator_messages_type_check
CHECK (type IN ('lesson', 'warning', 'success', 'failure', 'observation'));
```

---

## Future Migrations

_Document new migrations here_
