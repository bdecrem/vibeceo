# Pixelpit Task System

Tasks are the atomic unit of work in Pixelpit. They're how agents coordinate without getting lost.

**Why this matters for Haiku**: Small models stay focused with clear, specific instructions. One task = one thing. No ambiguity.

## Task Structure

Every task in `pixelpit_state` (type='task') has this shape:

```json
{
  "type": "task",
  "key": "task_XXX",
  "data": {
    "description": "What needs to be done (specific, actionable)",
    "assignee": "m1 | m2 | m3 | m4 | m5 | mobile_tester | desktop_tester | mayor",
    "status": "pending | in_progress | blocked | done | killed",
    "created_by": "who created this task",
    "game": "g1 | g2 | etc (if game-related)",
    "acceptance": "How to know this is DONE (specific criteria)",
    "blockers": ["list of blocking issues if status=blocked"],
    "notes": ["any updates or context"],
    "created_at": "ISO timestamp",
    "completed_at": "ISO timestamp (when done)"
  }
}
```

## Task Lifecycle

```
PENDING → IN_PROGRESS → DONE
              ↓
           BLOCKED → (unblocked) → IN_PROGRESS
              ↓
            KILLED (if abandoned)
```

## Rules for Agents

### When You Start Work

1. **Claim the task** — Set status to `in_progress`
2. **Read acceptance criteria** — Know what "done" means before you start
3. **Check blockers** — Don't start blocked tasks

```sql
UPDATE pixelpit_state
SET data = data || '{"status": "in_progress"}'::jsonb
WHERE type = 'task' AND key = 'task_XXX';
```

### When You Finish

1. **Verify acceptance criteria** — Did you actually meet them?
2. **Mark done** — Set status to `done`, add `completed_at`
3. **Create follow-up tasks** — If your work spawns new work, make tasks for it

```sql
UPDATE pixelpit_state
SET data = data || '{"status": "done", "completed_at": "2025-01-24T..."}'::jsonb
WHERE type = 'task' AND key = 'task_XXX';
```

### When You're Blocked

1. **Mark blocked** — Set status to `blocked`
2. **Explain why** — Add to `blockers` array
3. **Create unblocking task** — Assign to whoever can help

```sql
UPDATE pixelpit_state
SET data = data || '{"status": "blocked", "blockers": ["Need audio files from Sound Lead"]}'::jsonb
WHERE type = 'task' AND key = 'task_XXX';
```

### When You Create Tasks

Be specific. Haiku needs clarity.

**BAD task**:
```json
{
  "description": "Make the game better",
  "acceptance": "Game is better"
}
```

**GOOD task**:
```json
{
  "description": "Add touch controls to Tap Tempo that work on iOS Safari",
  "acceptance": "1. Tap anywhere triggers game action. 2. No double-tap zoom. 3. No pull-to-refresh interference. 4. Tested on iPhone Safari."
}
```

## Task Categories

### Game Development Tasks
- `[BUILD]` — Create something new
- `[FIX]` — Fix a bug
- `[POLISH]` — Improve existing thing
- `[TEST]` — Verify something works

### Coordination Tasks
- `[REVIEW]` — Look at something and decide
- `[ASSIGN]` — Distribute work
- `[KILL]` — Decide to end something

### Examples

```json
// Good: Specific build task
{
  "description": "[BUILD] Create main menu screen for Tap Tempo",
  "assignee": "m1",
  "acceptance": "1. Shows game title. 2. Has 'TAP TO START' button. 3. Works on mobile and desktop."
}

// Good: Specific test task
{
  "description": "[TEST] Mobile test Tap Tempo on iPhone",
  "assignee": "mobile_tester",
  "acceptance": "1. Complete test protocol. 2. File bugs or approve. 3. Update game status."
}

// Good: Review task
{
  "description": "[REVIEW] Decide if Tap Tempo is ready to launch",
  "assignee": "mayor",
  "acceptance": "1. Both testers approved. 2. Core loop is fun. 3. Decision logged."
}
```

## Querying Tasks

### Get all pending tasks for an agent
```sql
SELECT * FROM pixelpit_state
WHERE type = 'task'
AND data->>'status' = 'pending'
AND data->>'assignee' = 'm1'
ORDER BY created_at ASC;
```

### Get all tasks for a game
```sql
SELECT * FROM pixelpit_state
WHERE type = 'task'
AND data->>'game' = 'g1'
ORDER BY created_at ASC;
```

### Get blocked tasks (need attention)
```sql
SELECT * FROM pixelpit_state
WHERE type = 'task'
AND data->>'status' = 'blocked'
ORDER BY updated_at DESC;
```

## Task ID Convention

Format: `task_XXX` where XXX is a sequential number.

To get the next ID:
```sql
SELECT COALESCE(MAX(CAST(SUBSTRING(key FROM 6) AS INTEGER)), 0) + 1 as next_id
FROM pixelpit_state
WHERE type = 'task';
```

## Agent Startup Routine

Every agent should do this when activated:

1. **Check my pending tasks**
   ```sql
   SELECT * FROM pixelpit_state
   WHERE type = 'task' AND data->>'assignee' = '[my_id]' AND data->>'status' = 'pending';
   ```

2. **Pick the oldest pending task** (FIFO)

3. **Read the full task** including acceptance criteria

4. **Claim it** (set to in_progress)

5. **Do the work**

6. **Mark done or blocked**

7. **Repeat**

## Mayor's Task Duties

The Mayor:
- Creates tasks when games need work
- Unblocks blocked tasks (reassign, clarify, kill)
- Reviews completed tasks
- Monitors task queue health (too many pending = problem)

## Why This Works for Haiku

1. **No ambiguity** — Task says exactly what to do
2. **Clear completion** — Acceptance criteria = done or not done
3. **Context survival** — Tasks persist across sessions
4. **Focus** — One task at a time, no drift
5. **Handoffs** — Easy to pass work between agents
