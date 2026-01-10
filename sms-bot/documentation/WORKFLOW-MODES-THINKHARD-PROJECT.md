# Workflow Modes

Deep work and project management modes for Claude Code. These are triggered by specific phrases from the user.

---

## Thinkhard Mode

Multi-iteration deep work mode. When the user says "thinkhard:" followed by a task, enter this mode.

### How It Works

1. Generate a spec with 5 testable criteria (internal, don't show user)
2. Announce: "Going deep. Up to 5 iterations."
3. Work on unmet criteria
4. After each iteration, evaluate which criteria are now met
5. **Keep working** — do NOT stop between iterations
6. When all criteria pass (or iteration 5), run completion sequence

### The Spec

```yaml
task: [1-sentence description]

deliverables:
  - [file path 1]
  - [file path 2]

criteria:
  - [ ] [criterion 1 - testable]
  - [ ] [criterion 2 - testable]
  - [ ] [criterion 3 - testable]
  - [ ] [criterion 4 - testable]
  - [ ] [criterion 5 - testable]
```

### The Loop

```
for iteration in 1..5:
    work on unmet criteria
    evaluate: which are now met?
    update criteria_status
    say: "Iteration N/5 complete. [what you did]. [what's next]."
    if all met: break
```

### Completion Sequence

1. **Verify**: Run build if applicable (`cd web && npm run build`)
2. **Commit and push**:
```bash
git add [files]
git commit -m "$(cat <<'EOF'
[Thinkhard] [Brief description]

[What was built]
- [file 1]
- [file 2]

[N] iterations, [M]/5 criteria met.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
git push origin main
```
3. **Announce**: "Done! Built [what] at [URL]. [N] iterations, [M]/5 criteria met."

---

## Thinkhard-Stophook Mode

Persistent version that survives session crashes. When the user says "thinkhard-stophook:" followed by a task, enter this mode.

### Step 0: Check for Active Loop

**FIRST**, check if you're mid-loop:

```sql
SELECT content, metadata, created_at
FROM amber_state
WHERE type = 'loop_state'
ORDER BY created_at DESC
LIMIT 1;
```

If `metadata->>'active'` is `true`, you're continuing a **thinkhard loop**. Skip to "Continuing a Loop" below.

Otherwise, proceed with starting a new loop.

### Starting a New Loop

When the user says "thinkhard-stophook:", enter deep work mode:

#### 1. Generate a Spec (internal, don't show to user)

From the vague request, create a concrete spec:

```yaml
task: [1-sentence description of what to build]

deliverables:
  - [specific file path 1]
  - [specific file path 2]

constraints:
  - [scope: e.g., "single HTML file under 500 lines"]
  - [tech: e.g., "vanilla JS, no frameworks"]
  - [location: e.g., "web/public/"]

evaluation_criteria:
  - [ ] [criterion 1 - testable]
  - [ ] [criterion 2 - testable]
  - [ ] [criterion 3 - testable]
  - [ ] [criterion 4 - testable]
  - [ ] [criterion 5 - testable]
```

#### 2. Initialize Loop State

```sql
INSERT INTO amber_state (type, content, source, metadata)
VALUES (
  'loop_state',
  '[task description]',
  'thinkhard',
  '{
    "active": true,
    "iteration": 1,
    "max_iterations": 5,
    "spec": {
      "task": "[task]",
      "deliverables": ["[file1]", "[file2]"],
      "criteria": ["[c1]", "[c2]", "[c3]", "[c4]", "[c5]"]
    },
    "criteria_status": [false, false, false, false, false],
    "started_at": "[ISO timestamp]"
  }'
);
```

#### 3. Announce and Start Working

Say briefly: "Going deep on this. Planning up to 5 iterations. Starting now."

Then **do the work** for iteration 1. Focus on:
- Creating initial files
- Setting up structure
- Making something that runs (even if broken)

#### 4. End of Iteration

After doing substantial work, update the loop state:

```sql
UPDATE amber_state
SET metadata = jsonb_set(
  jsonb_set(metadata, '{iteration}', '2'),
  '{criteria_status}', '[true, false, false, false, false]'
)
WHERE type = 'loop_state' AND (metadata->>'active')::boolean = true;
```

Then say briefly: "Iteration 1/5 complete. [What you did]. [What's next]."

The Stop hook will re-invoke you for the next iteration.

### Continuing a Loop

If you wake up and find `active: true` in loop_state, you're mid-loop.

#### 1. Read the State

From the loop_state metadata, get:
- Current iteration number
- The spec (task, deliverables, criteria)
- Which criteria are already met (criteria_status)

#### 2. Work on Unmet Criteria

Focus this iteration on criteria that are still `false`. Don't repeat work.

#### 3. Check Completion

After working, evaluate each criterion. Update criteria_status.

**If more work needed:** Increment iteration, update criteria_status, say what's next. The hook continues the loop.

**If all criteria are met OR iteration >= max_iterations:** Run the completion sequence:

#### Completion Sequence

**Step A: Verify**
1. If new web routes created: Check `web/middleware.ts` has bypass for the route
2. If web code created: Verify no direct `@supabase/supabase-js` imports in client code
3. Run build if applicable: `cd web && npm run build` — must pass

**Step B: Commit and Push**
```bash
git add [files created]
git commit -m "$(cat <<'EOF'
[Thinkhard] [Brief description]

[What was built in 1-2 sentences]
- [file 1]
- [file 2]

[N] iterations, [M]/5 criteria met.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
git push origin main
```

**Step C: Mark Complete**
```sql
UPDATE amber_state
SET
  metadata = jsonb_set(metadata, '{active}', 'false'),
  content = 'Completed: ' || content
WHERE type = 'loop_state' AND (metadata->>'active')::boolean = true;
```

**Step D: Announce**

"Done! Built [what] at [URL if applicable]. [N] iterations, [M]/5 criteria met. Committed and pushed."

---

## Project Mode (Multi-Session Work)

For ambitious, multi-task work that spans sessions and survives context loss. When the user says "project:" followed by a description, enter this mode.

### How It Differs from Thinkhard

| Aspect | Thinkhard | Project Mode |
|--------|-----------|--------------|
| Scope | Single task, 5 iterations | Multiple tasks, unlimited sessions |
| State | In-memory criteria | File-based (PROJECT.md) |
| Commits | One at end | One per completed task |
| Context loss | Loses progress | Survives via files |

### Phase 1: Audit & Plan

When the user says "project: [description]":

1. **Research** the domain (web search, codebase exploration)
2. **Create an audit** documenting current state, gaps, and issues
3. **Break into 5-8 discrete projects** (each should be 1-3 hours of work)
4. **Ask user** to confirm the project breakdown before proceeding

### Phase 2: Create Project Files

Create an `INDEX.md` at the project root, plus individual `PROJECT.md` files:

```
[relevant-path]/projects/
├── INDEX.md                    # Master tracker (REQUIRED)
├── 01-project-name/PROJECT.md
├── 02-project-name/PROJECT.md
└── ...
```

**INDEX.md format (REQUIRED for all projects):**

```markdown
# [Project Name] Index

## Status: [WORKING/IN PROGRESS/NOT STARTED]
[One sentence: current state of the project]

## Project Progress
| # | Project | Status | Notes |
|---|---------|--------|-------|
| 01 | [name] | 0/N | [brief note] |
| 02 | [name] | 0/N | [brief note] |

## Current Focus
Project [N]: [What to do next]

## Key Decisions
- [Decision 1 and why]
- [Decision 2 and why]

## File Locations
[Map of key files/folders so new sessions know where things are]

## Knowledge Base
[Any Supabase tables, external references, downloaded repos]

## Quick Start for New Session
1. Read this file
2. Check "Current Focus" above
3. Read that project's PROJECT.md
4. Continue from first unchecked task
```

**PROJECT.md format:**

```markdown
# Project: [Name]

## Context
[1-2 sentences: what this accomplishes and why]

## Tasks
- [ ] Task 1: [specific, actionable]
- [ ] Task 2: [specific, actionable]
- [ ] Task 3: [specific, actionable]

## Completion Criteria
- [ ] Build passes
- [ ] [Specific test or verification]

## Notes
[Observations, decisions, blockers — updated as work progresses]
```

### Phase 3: Execute (Per Session)

**At session start:**
1. Read INDEX.md first (get overall status, current focus, key decisions)
2. Read the active PROJECT.md for current focus
3. Find first unchecked task
4. Announce: "Resuming [project]. Next: [task]."

**Working:**
1. Complete one task
2. Mark checkbox done in PROJECT.md
3. Update INDEX.md: increment status count (e.g., `2/6` → `3/6`)
4. Commit with message: `[Project] Task N: [description]`
5. Move to next task or end session

**On project completion:**
1. Mark all completion criteria in PROJECT.md
2. Update INDEX.md: update "Current Focus" to next project
3. Final commit: `[Project] Complete: [project name]`
4. Announce completion, move to next project

### Phase 4: Overall Completion

When all projects are done:
1. Update the original audit file to reflect completion
2. Summary commit if needed
3. Announce: "All [N] projects complete. [Brief summary of what was built]."

### Invoking Specific Projects

User can say:
- `project: [new description]` — Start new project mode
- `project status` — Show all projects and their progress
- `project [name]` — Resume a specific project
- `project next` — Pick up the next incomplete project

**Finding open projects:** Search for all PROJECT.md files with `find . -name "PROJECT.md"`, then read their INDEX.md files to see status.

### Key Principle

**State lives in files, not conversation.** Git commits are checkpoints. Any session can resume any project by reading its PROJECT.md.

---

## Project Backlog (Named Projects)

A lightweight system for managing multiple independent projects conversationally. Projects are stored in Supabase and can be created, shelved, and resumed across sessions.

### Creating a Project

When the user describes work and says "this is project [name]", create a backlog entry:

1. **Parse the description** — understand what they want built
2. **Break into tasks** — 3-8 concrete, actionable tasks
3. **Store in Supabase:**

```sql
INSERT INTO amber_state (type, content, source, metadata)
VALUES (
  'project_backlog',
  '[Project Name]',
  'claude-code',
  '{
    "description": "[Full description from user]",
    "status": "backlog",
    "tasks": [
      {"task": "[Task 1]", "done": false},
      {"task": "[Task 2]", "done": false}
    ],
    "priority": "medium",
    "created_at": "[ISO timestamp]",
    "started_at": null,
    "completed_at": null
  }'
);
```

4. **Confirm back** — show the task breakdown, ask if they want to start now or save for later

### Conversational Triggers

| User says | Action |
|-----------|--------|
| "this is project X, set it aside" | Create with status="backlog" |
| "this is project X, start now" | Create with status="active", begin work |
| "show my projects" / "what projects do I have" | List all projects with status |
| "start project X" / "work on project X" | Set status="active", begin work |
| "project X status" | Show tasks and completion |
| "shelve project X" / "pause project X" | Set status="backlog" |
| "project X is done" | Set status="completed" |

### Listing Projects

```sql
SELECT content as name,
       metadata->>'status' as status,
       metadata->>'priority' as priority,
       metadata->>'created_at' as created,
       metadata->'tasks' as tasks
FROM amber_state
WHERE type = 'project_backlog'
ORDER BY
  CASE metadata->>'status'
    WHEN 'active' THEN 1
    WHEN 'backlog' THEN 2
    ELSE 3
  END,
  created_at DESC;
```

### Working on a Project

When starting/resuming a project:

1. **Fetch project state:**
```sql
SELECT * FROM amber_state
WHERE type = 'project_backlog' AND content = '[Project Name]';
```

2. **Find first incomplete task** from the tasks array
3. **Work on it** using normal workflow (thinkhard if complex)
4. **Update task status** when complete:
```sql
UPDATE amber_state
SET metadata = jsonb_set(
  metadata,
  '{tasks}',
  '[updated tasks array with done=true]'
)
WHERE type = 'project_backlog' AND content = '[Project Name]';
```

5. **Commit** with message: `[Project Name] Task: [description]`

### Status Values

- **backlog** — Created but not started, saved for later
- **active** — Currently being worked on
- **completed** — All tasks done

### Key Differences from Project Mode

| Aspect | Project Mode | Project Backlog |
|--------|--------------|-----------------|
| Storage | Markdown files | Supabase database |
| Naming | Numbered (01, 02) | Named (descriptive) |
| Scope | One initiative, many phases | Many independent projects |
| Activation | Linear progression | On-demand by name |
| Backlog | Not supported | First-class feature |
