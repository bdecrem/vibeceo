# Gas Town: Agent Orchestration Reference

Source: https://maggieappleton.com/gastown (Maggie Appleton's writeup of Steve Yegge's system)

## What Is It?

Gas Town is Steve Yegge's experimental agent orchestrator that coordinates dozens of AI coding agents simultaneously. Built over 17 days with 75,000 lines of code and 2,000 commits, entirely "vibecoded" - designed without careful planning, relying on rapid iteration.

Yegge's stance: "I've never seen the code, and I never care to."

## Agent Roles (Hierarchy)

| Role | Function |
|------|----------|
| **Mayor** | Primary interface. Coordinates work, kicks off tasks, receives notifications. Never writes code. |
| **Polecats** | Temporary grunt workers. Complete single isolated tasks, then disappear after submitting work. |
| **Witness** | Supervisor. Helps workers get unstuck, solves problems, nudges progress. |
| **Refinery** | Manages merge queue, resolves conflicts. Can "re-imagine" implementations if conflicts get hairy. |
| **Deacon & Boot the Dog** | System supervisors providing periodic heartbeat nudges to prevent idleness. |
| **Dogs** | Maintenance and cleaning agents. |

### Proposed Specialists (Future)
- DevOps experts
- Product managers
- Accessibility checkers
- Documentation writers

## Core Concepts

### Beads
- JSON-stored work units tracked in Git alongside code
- Each Bead contains: ID, description, status, assignee
- Tasks and agent identities persist across sessions
- Individual agent sessions are disposable; Beads are permanent

### Hooks
- Individual task queues per agent with "hooks" pointing to current work
- Continuous stream feeding from Mayor to workers

### Seance
- Agents can resurrect previous sessions as separate instances
- Used to query predecessors about unfinished work
- Enables knowledge transfer between ephemeral worker sessions

### Heartbeat Nudges
- Periodic supervisor pings to prevent agent idleness
- "Aggressive prompting + constant nudging" is key operational pattern
- Deacon and Boot the Dog handle this supervisory role

### Context Rot
- Degradation of agent output quality before hitting token limits
- Requires session management and fresh worker spawning

### Work Flow
1. Mayor breaks features into atomic Beads
2. Task enters queue, Polecat claims it
3. Witness monitors progress, helps unstuck workers
4. Polecat submits work and disappears
5. Refinery evaluates changes, resolves conflicts or escalates
6. Dogs handle cleanup
7. Next queued work automatically begins

## Key Insights

### 1. Design Becomes the Bottleneck
With agents handling code generation rapidly, human planning, architecture decisions, and aesthetic judgment become the limiting factors - not implementation speed.

### 2. Clear Orchestration Patterns
Despite chaotic design, patterns emerged:
- Specialized roles with hierarchical supervision
- Persistent task tracking with ephemeral sessions
- Continuous work streams
- Agent-managed merge conflict resolution

### 3. Economics Shift
$2-5k monthly API costs vs $120k annual developer salaries. Yegge uses a second Claude account due to spending limits. Orchestrated systems become cost-competitive if they provide 2-3x productivity gains.

### 4. Greenfield vs Brownfield
- **Greenfield** (new projects): Allow loose agent oversight, more autonomy
- **Brownfield** (existing codebases): Require tight supervision, more guardrails

### 5. Code Visibility Is Contextual
Whether developers should view source code depends on:
- Domain
- Feedback loops
- Risk tolerance
- Project stage
- Team size
- Experience level

## What Agents Actually Do

Gas Town is a **coding swarm**. Concrete tasks mentioned:
- Converting React to SvelteKit
- Code quality improvements
- Accessibility fixes
- Documentation updates
- The system built itself (75k lines)

## Relevance to Kochitown

Patterns to adopt:
- [ ] Persistent task queue (like Beads)
- [ ] Hierarchical supervision (not flat)
- [ ] Conflict resolution mechanism
- [ ] Clear role boundaries
- [ ] Ephemeral workers, persistent state

Key difference: Kochitown agents are **entrepreneurs**, not just coders. They ideate, build products, potentially compete/collaborate. More autonomous creative direction vs executing assigned coding tasks.

## Technical Patterns

### Ralph Wiggum Plugin
Loop-until-success validation pattern for agent work. Agent retries task until it passes validation checks.

### Stacked Diffs
Alternative to traditional PR-based merges. Atomic, incremental changes that stack. Graphite (recently acquired by Cursor) implements this workflow.

### Merge Queue
Sequential evaluation and integration of agent-generated changes. Refinery manages conflicts, can creatively reimagine implementations when conflicts get complex.

## References & Prior Art

| Project | Relevance |
|---------|-----------|
| **Beads** | Yegge's earlier memory/task management system; foundation for Gas Town |
| **Claude Code, Cursor, Conductor** | Contemporary agent interfaces prioritizing chat over code visibility |
| **Graphite** | Stacked diff workflow tool (acquired by Cursor) |
| **GitHub Next: Agentic Workflows** | Autonomous agents in GitHub Actions with parallel security/accessibility audits |
| **Anthropic (Nov 2025)** | Research on effective harnesses for long-running agents |

## Terminology Quick Reference

| Term | Definition |
|------|------------|
| **Vibecoding** | Development without reviewing generated code; design and intent-based iteration |
| **Context rot** | Degradation of agent output before hitting token limits |
| **Seance** | Resurrecting previous sessions to query predecessors |
| **Beads** | Persistent JSON task units stored in Git |
| **Hooks** | Per-agent pointers to current work in task queues |
| **Heartbeat nudge** | Periodic supervisor ping to prevent idleness |
| **GUPP** | System component (mentioned but unexplained in source) |

---

## Pixelpit vs Gastown Comparison

*Last updated: Jan 26, 2026*

### Fundamental Approach: 85% Similar

| Concept | Gastown | Pixelpit | Match |
|---------|---------|----------|-------|
| Human interface agent | Mayor | Pit | ✓ |
| Ephemeral grunt workers | Polecats | m1-m4 | ✓ |
| Persistent task queue | Beads (Git JSON) | kochitown_state (Supabase) | ✓ |
| Hierarchical roles | Mayor → Polecat → Refinery | Pit → Maker → Creative → Tester | ✓ |
| Flow enforcement | Yes | BUILD → DESIGN (2x) → TEST (2x) | ✓ |
| Session persistence | Seance + Beads | Session logging in Supabase | ✓ |

### What Pixelpit Is Missing

#### 1. Witness (Supervisor Agent) — BIGGEST GAP

Gastown has a Witness that actively monitors workers and helps them get unstuck. Pixelpit has nothing.

The orchestrator is **passive dispatch** — it waits for tasks to complete or block. Gastown's Witness **actively intervenes** during execution.

```
Gastown: Witness sees agent spinning → nudges → agent recovers
Pixelpit: Agent spins → blocks → human discovers later
```

#### 2. Heartbeat Nudges

Deacon & Boot constantly ping idle agents. "Aggressive prompting + constant nudging" is cited as a key pattern.

Pixelpit polls every 30 seconds for pending tasks, but doesn't nudge agents mid-execution.

#### 3. Parallel Execution + Conflict Resolution

```python
# Pixelpit: forced sequential
MAX_WORKERS = 1  # "to avoid global variable race conditions"
```

Gastown runs **dozens of agents concurrently** because Refinery handles merge conflicts. Pixelpit is stuck at 1 worker because there's no Refinery equivalent.

This is a 10-50x throughput difference.

#### 4. Seance (Knowledge Transfer)

Gastown agents can resurrect previous sessions to query predecessors about unfinished work. Pixelpit agents start fresh every time — no memory of what the previous agent tried.

#### 5. Dogs (Cleanup Agents)

Gastown has maintenance agents. Pixelpit doesn't. Dead games, orphaned tasks, stale logs — no automated cleanup.

### The Real Gap

The design bottleneck insight from Gastown: *"Gas Town churns through implementation plans so quickly that you have to do a LOT of design and planning to keep the engine fed."*

Pixelpit isn't hitting this bottleneck because:

1. **MAX_WORKERS=1** — throttled at the implementation layer, not design
2. **No Witness** — agents block instead of recovering, reducing throughput
3. **No parallelism** — can't saturate even with enough design work queued

**Gastown is a throughput machine. Pixelpit is currently a sequential pipeline.**

### Upgrade Path

| Priority | Add This | Impact |
|----------|----------|--------|
| 1 | **Refinery** — conflict resolution agent | Enables MAX_WORKERS > 1 |
| 2 | **Witness** — supervisor that nudges stuck agents | Reduces blocks, increases completion rate |
| 3 | **Seance** — pass context to successor agents | Smarter retries, less repeated work |
| 4 | **Dogs** — cleanup cron | Hygiene |

The Refinery is the unlock. Without it, parallelism = conflicts. With it, we can actually test the "design becomes bottleneck" thesis.
