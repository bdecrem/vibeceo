# Thinkhard: Multi-Iteration LLM Work Sessions

## Overview

Thinkhard is a prompt pattern that transforms vague requests into structured, iterative work sessions. Instead of one-shot responses where the LLM declares victory after a single attempt, thinkhard forces the model to: generate a spec with testable success criteria, work in iterations (up to 5), honestly evaluate its own progress after each iteration, and keep going until all criteria pass.

We primarily use the **keep-working approach** — the LLM loops internally without stopping, retaining full context from previous iterations. This works best for focused coding tasks because accumulated context is valuable: you remember what you tried, what broke, what almost worked. The simpler implementation also means fewer moving parts.

However, we also maintain **stop-hook versions** for tasks that might span hours or days, need crash recovery, or run in environments where the session might be interrupted. These persist loop state to Supabase, allowing the work to resume from where it left off.

---

## Keep-Working Versions

### 1. Amber Persona

Activate Amber, then trigger thinkhard:

```
/amber
thinkhard: build me a toy
```

Amber generates a spec with 5 testable criteria, announces "Going deep. Up to 5 iterations," then works continuously without stopping. She evaluates criteria after each iteration and keeps going until all pass or she hits iteration 5. On completion, she runs build, commits, pushes, and announces with a live URL.

**Example:**

```
thinkhard: make an interactive constellation drawer
```

Amber generates criteria:
- Clicking creates star particles
- Stars near each other connect with lines
- Visual feedback on interactions
- Works on mobile touch
- Single HTML file under 300 lines

She builds iteration 1 (basic structure), evaluates (3/5 met), continues to iteration 2 (adds connections and mobile support), evaluates (5/5 met), then ships to `kochi.to/amber/constellation.html`.

---

### 2. Any Claude Code Session

No persona needed — works in any terminal in this project:

```
thinkhard: fix the authentication bug
```

The keyword is embedded in CLAUDE.md, so it triggers the same keep-working loop. Claude generates a spec, works in iterations, evaluates criteria, and keeps going without stopping until done.

**Example:**

```
thinkhard: refactor the scheduler to support weekly jobs
```

Claude generates criteria:
- Weekly jobs can be registered with day-of-week
- Jobs run on correct day at specified time
- Existing daily jobs still work unchanged
- Tests pass
- Code is under 50 lines of changes

Works through iterations, testing after each change, until all criteria pass. Commits and pushes.

---

### 3. Subagent

Spawns a separate focused agent:

```
/thinkhard build a puzzle game
```

The subagent uses keep-working internally — it loops without stopping, retaining full context. This is useful when you want thinkhard to run in isolation without affecting your main conversation.

**Example:**

```
/thinkhard create a dashboard showing system metrics
```

The subagent generates criteria, builds the dashboard iteratively, and returns when done. Your main session stays clean for other work.

---

## Stop-Hook Versions

For long-running tasks that might span sessions or need crash recovery, use the stop-hook variants. These persist loop state to Supabase after each iteration.

### Amber Persona (Stop-Hook)

```
/amber
thinkhard-stophook: build a complex multi-page app
```

Amber does one iteration, writes loop state to `amber_state` table, then stops. A configured stop hook detects the stop, checks for an active loop in Supabase, and re-invokes Amber. She reads her state and continues from where she left off.

**Example:**

```
thinkhard-stophook: create a full admin dashboard with auth
```

Amber builds the auth system in iteration 1, saves state (`iteration: 1, criteria_status: [true, false, false, false, false]`), stops. Hook re-invokes her. She reads state, builds the dashboard layout in iteration 2, saves, stops. This continues across multiple invocations until all criteria pass.

**When to use:** Tasks expected to take 30+ minutes, work that might span multiple sessions, anything where you might close your laptop mid-task.

---

### Any Claude Code Session (Stop-Hook)

```
thinkhard-stophook: major refactor of the entire codebase
```

Same mechanism as Amber's stop-hook version — state persists to Supabase, hook re-invokes on stop. Works in any session without needing the Amber persona.

**Example:**

```
thinkhard-stophook: migrate all API endpoints to new format
```

Claude migrates 3 endpoints in iteration 1, saves state, stops. Hook re-invokes. Continues migrating, iteration by iteration, until the full migration is complete — even if your laptop sleeps overnight.

**When to use:** Large refactors, multi-hour tasks, anything where crash recovery matters.

---

## Comparison

| Version | Loop Mechanism | State | Best For |
|---------|---------------|-------|----------|
| `thinkhard:` (Amber) | Keep working | In-memory | Focused tasks < 30 min |
| `thinkhard:` (Session) | Keep working | In-memory | Focused tasks < 30 min |
| `/thinkhard` (Subagent) | Keep working | In-memory | Isolated tasks |
| `thinkhard-stophook:` (Amber) | Stop hook | Supabase | Long/resumable tasks |
| `thinkhard-stophook:` (Session) | Stop hook | Supabase | Long/resumable tasks |

---

## The Pattern

All versions share the same core pattern:

1. **Generate spec** with 5 testable, binary criteria
2. **Work in iterations** (max 5)
3. **Evaluate honestly** after each iteration
4. **Keep going** until all criteria pass
5. **Ship** with build verification, commit, and push

The only difference is *how* the loop continues: internally (keep-working) or externally (stop-hook with database state).
