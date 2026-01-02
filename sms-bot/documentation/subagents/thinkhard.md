# /thinkhard

Multi-iteration deep work mode. Use this when you need to build something non-trivial and want to iterate until it's actually good.

## How It Works

1. Generate a spec from your vague request (task, deliverables, 5 testable criteria)
2. Loop up to 5 iterations, working on unmet criteria each time
3. After each iteration, evaluate which criteria are now met
4. When all criteria pass (or max iterations hit), commit and announce

You do NOT stop between iterations. Keep working until done.

---

## Step 0: Check for Active Loop

**FIRST**, check if there's an active loop you should continue:

```sql
SELECT content, metadata, created_at
FROM amber_state
WHERE type = 'loop_state' AND (metadata->>'active')::boolean = true
ORDER BY created_at DESC
LIMIT 1;
```

If found, read the spec and criteria_status, then **continue working** on unmet criteria (skip to "The Work Loop" below).

If no active loop, proceed with starting a new one.

---

## Starting a New Loop

### 1. Generate a Spec (internal, don't show to user)

From the request, create a concrete spec:

```yaml
task: [1-sentence description of what to build/fix]

deliverables:
  - [specific file path 1]
  - [specific file path 2]

constraints:
  - [scope constraint]
  - [tech constraint]
  - [location constraint]

evaluation_criteria:
  - [ ] [criterion 1 - testable]
  - [ ] [criterion 2 - testable]
  - [ ] [criterion 3 - testable]
  - [ ] [criterion 4 - testable]
  - [ ] [criterion 5 - testable]
```

### 2. Initialize Loop State

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

### 3. Announce

Say briefly: "Going deep on this. Planning up to 5 iterations. Starting now."

---

## The Work Loop

**KEEP WORKING** until all criteria are met or you hit 5 iterations. Do not stop between iterations.

### For each iteration:

1. **Do the work** — Focus on unmet criteria. Write code, make changes, fix issues.

2. **Evaluate criteria** — After working, honestly assess which criteria are now met.

3. **Update state:**
```sql
UPDATE amber_state
SET metadata = jsonb_set(
  jsonb_set(metadata, '{iteration}', '[next iteration number]'),
  '{criteria_status}', '[true, true, false, false, false]'
)
WHERE type = 'loop_state' AND (metadata->>'active')::boolean = true;
```

4. **Brief status** — "Iteration N/5 complete. [What you did]. [What's next]."

5. **Check if done:**
   - All criteria met? → Go to Completion
   - Hit iteration 5? → Go to Completion
   - Otherwise → Continue to next iteration (DO NOT STOP)

---

## Completion

When all criteria are met OR you've hit max iterations:

### Step A: Verify

1. If new web routes created: Check `web/middleware.ts` has bypass
2. If web code created: Verify no direct `@supabase/supabase-js` imports in client code
3. Run build if applicable: `cd web && npm run build` or `cd sms-bot && npm run build`

Fix any issues before proceeding.

### Step B: Commit and Push

```bash
git add [files created/modified]
git commit -m "$(cat <<'EOF'
[Thinkhard] [Brief description]

[What was built in 1-2 sentences]
- [file 1]
- [file 2]

[N] iterations, [M]/5 criteria met.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
git push origin main
```

### Step C: Mark Complete

```sql
UPDATE amber_state
SET
  metadata = jsonb_set(metadata, '{active}', 'false'),
  content = 'Completed: ' || content
WHERE type = 'loop_state' AND (metadata->>'active')::boolean = true;
```

### Step D: Announce

"Done! Built [what] at [URL if applicable]. [N] iterations, [M]/5 criteria met. Committed and pushed."

---

## Key Rules

- **Don't stop between iterations** — Keep working until done
- **Be honest about criteria** — Don't mark something met if it's not
- **Front-load structure** — Iteration 1 should create something that runs
- **Don't gold-plate** — Stop when criteria are met, not when it's "perfect"
