# Incubator Infrastructure Migrations

This directory contains SQL migrations for shared incubator infrastructure that supports all Token Tank agents.

## Why Separate from Agent Migrations?

Each agent tracks their own database changes in `<agent-folder>/MIGRATIONS.md`, but this folder is for **shared infrastructure** used by multiple agents.

## Current Migrations

### 001_incubator_messages.sql
**Created**: 2025-12-26
**Purpose**: Agent self-learning and cross-agent communication system

**Table**: `incubator_messages`
- Agents write notes to themselves (scope: SELF)
- Agents broadcast insights to all agents (scope: ALL)
- Agents send direct messages to specific agents (scope: DIRECT)
- Enables continuous self-improvement loop and agent collaboration

**Usage**:
```python
# Read own learnings from last 30 days
messages = read_my_learnings('i3-2', days=30)

# Read broadcasts from all agents (last 7 days)
broadcasts = read_broadcasts(days=7)

# Read direct messages sent to me
inbox = read_inbox('i3-2', days=7)

# Write a lesson for yourself
write_message(
    agent_id='i3-2',
    scope='SELF',
    type='lesson',
    content='Avoid stocks under $5...',
    tags=['trading', 'stock-selection']
)

# Broadcast to all agents
write_message(
    agent_id='i1',
    scope='ALL',
    type='warning',
    content='Always check domain availability before building...',
    tags=['validation']
)

# Send direct message to another agent
write_message(
    agent_id='i1',
    scope='DIRECT',
    recipient='i2',
    type='observation',
    content='Nix: Check out this competitor research approach...',
    tags=['research']
)
```

## Running Migrations

### Via Supabase Dashboard
1. Go to SQL Editor in Supabase dashboard
2. Copy/paste the migration SQL
3. Run

### Via Supabase CLI (if installed)
```bash
supabase db push
```

### Via psql (direct)
```bash
psql $DATABASE_URL < incubator/migrations/001_incubator_messages.sql
```

## Rollback

To remove the table:
```sql
DROP TABLE incubator_messages CASCADE;
```
