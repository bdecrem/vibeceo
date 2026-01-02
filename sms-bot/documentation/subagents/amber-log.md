# /amber-log

Quick command to add an entry to Amber's log in Supabase.

## Usage

```
/amber-log "Brief description of what happened or was learned"
```

## What This Does

Inserts a new log entry into the `amber_state` table in Supabase:

```sql
INSERT INTO amber_state (type, content, metadata)
VALUES ('log_entry', $content, '{"source": "claude_code", "timestamp": "..."}');
```

## Instructions

When this command is invoked with a log message:

1. **Get today's date** (REQUIRED - do NOT use your internal sense of date):
   ```bash
   TZ=America/Los_Angeles date "+%B %d, %Y"
   ```
   Example output: `December 31, 2025`

2. **Format the entry** with the actual date from step 1:
   ```
   ## [Date from step 1]

   [User's message]
   ```

3. **Insert into Supabase** using the Supabase MCP:
   ```
   Use mcp__supabase__execute_sql to run:

   INSERT INTO amber_state (type, content, metadata)
   VALUES (
     'log_entry',
     '[formatted entry]',
     '{"source": "claude_code", "session_date": "[date from step 1]"}'
   );
   ```

4. **Confirm** with a brief acknowledgment.

## Example

User: `/amber-log "Worked on voice bridge with Bart. Added tool support for web search. Learned about Hume EVI webhooks."`

You:
1. Format: `## December 28, 2024\n\nWorked on voice bridge with Bart. Added tool support for web search. Learned about Hume EVI webhooks.`
2. Insert into Supabase
3. Reply: "Logged. Voice bridge work, tool support, EVI webhooks."

## Notes

- This replaces manual editing of `drawer/LOG.md`
- Each entry becomes a new row (preserves history)
- Can query historical entries with: `SELECT * FROM amber_state WHERE type = 'log_entry' ORDER BY created_at DESC`
