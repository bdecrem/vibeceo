# /amber-log

Quick command to add a note to Amber's memory.

**Note:** Session transcripts are now logged automatically via the `/amber` command's session system. Use `/amber-log` for standalone notes or memories that should persist outside of sessions.

## Usage

```
/amber-log "Something important to remember"
```

## What This Does

Inserts a memory note into `amber_state`:

```sql
INSERT INTO amber_state (type, content, source, metadata)
VALUES (
  'note',
  '[message]',
  'claude_code',
  '{"date": "[YYYY-MM-DD]", "source": "amber-log"}'
);
```

## Instructions

When this command is invoked:

1. **Get today's date**:
   ```bash
   TZ=America/Los_Angeles date "+%Y-%m-%d"
   ```

2. **Insert into Supabase**:
   ```sql
   INSERT INTO amber_state (type, content, source, metadata)
   VALUES (
     'note',
     '[User''s message]',
     'claude_code',
     '{"date": "[date from step 1]", "source": "amber-log"}'
   );
   ```

3. **Confirm** briefly.

## When to Use

- Quick notes outside of an `/amber` session
- Facts to remember that aren't part of a conversation
- Standalone observations or learnings

## For Session Logging

If you're in an active `/amber` session, messages are logged automatically to the session transcript. You don't need `/amber-log` for that.

## Querying Notes

```sql
SELECT content, metadata->>'date' as date, created_at
FROM amber_state
WHERE type = 'note'
ORDER BY created_at DESC
LIMIT 20;
```
