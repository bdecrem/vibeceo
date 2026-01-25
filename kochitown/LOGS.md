# Kochitown Log System

When the human says **"log this"**, it gets stored in Supabase. Next `/kochitown` session processes all logs.

## Log Entry Structure

```sql
INSERT INTO kochitown_state (type, key, data) VALUES
('log', 'log_YYYYMMDD_HHMMSS', '{
  "timestamp": "ISO timestamp",
  "source": "human | kochitown | mayor | m1 | etc",
  "content": "The actual thing to log",
  "status": "pending",
  "context": {}
}'::jsonb);
```

### Status Values

| Status | Meaning | Loaded on startup? |
|--------|---------|-------------------|
| `pending` | New, needs processing | YES |
| `done` | Processed, no action needed | YES (for reference) |
| `task_created` | Converted to a task | YES (for reference) |
| `archived` | Old, skip loading | NO |

## "Log This" Flow

**Human says:** "log this: need to add high score saving to Tap Tempo"

**Kochitown does:**
```sql
INSERT INTO kochitown_state (type, key, data) VALUES
('log', 'log_20250124_223000', '{
  "timestamp": "2025-01-24T22:30:00Z",
  "source": "human",
  "content": "need to add high score saving to Tap Tempo",
  "status": "pending",
  "context": {"game": "g1"}
}'::jsonb);
```

**Response:** "Logged."

## Startup Processing

When `/kochitown` launches:

### 1. Load Active Logs
```sql
SELECT * FROM kochitown_state
WHERE type = 'log' AND data->>'status' != 'archived'
ORDER BY created_at ASC;
```

### 2. Process Each Pending Log

For each `status = 'pending'`:

**Option A: DONE** — It's just info, no action needed
```sql
UPDATE kochitown_state
SET data = data || '{"status": "done", "processed_at": "..."}'::jsonb
WHERE type = 'log' AND key = 'log_XXX';
```

**Option B: CREATE TASK** — This needs work
```sql
-- Create the task
INSERT INTO kochitown_state (type, key, data) VALUES
('task', 'task_XXX', '{...}'::jsonb);

-- Mark log as converted
UPDATE kochitown_state
SET data = data || '{"status": "task_created", "task_key": "task_XXX"}'::jsonb
WHERE type = 'log' AND key = 'log_XXX';
```

**Option C: ASK** — Need clarification from human
Present the log and ask what to do with it.

### 3. Archive Old Logs

Logs older than 7 days with status `done` or `task_created` get archived:
```sql
UPDATE kochitown_state
SET data = data || '{"status": "archived"}'::jsonb
WHERE type = 'log'
AND data->>'status' IN ('done', 'task_created')
AND created_at < NOW() - INTERVAL '7 days';
```

## Quick Reference

**To log something:**
```sql
INSERT INTO kochitown_state (type, key, data) VALUES
('log', 'log_' || TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS'), '{
  "timestamp": "' || NOW() || '",
  "source": "human",
  "content": "YOUR CONTENT HERE",
  "status": "pending"
}'::jsonb);
```

**To get pending logs:**
```sql
SELECT key, data->>'content' as content, created_at
FROM kochitown_state
WHERE type = 'log' AND data->>'status' = 'pending'
ORDER BY created_at ASC;
```

**To mark done:**
```sql
UPDATE kochitown_state
SET data = data || '{"status": "done"}'::jsonb
WHERE type = 'log' AND key = 'log_XXX';
```

**To archive:**
```sql
UPDATE kochitown_state
SET data = data || '{"status": "archived"}'::jsonb
WHERE type = 'log' AND key = 'log_XXX';
```
