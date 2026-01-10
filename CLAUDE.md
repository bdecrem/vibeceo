# Kochi.to - Claude Code Instructions

## What This Is

**Kochi.to** is an AI agent service over SMS. Think poke.com but with a research/science focus.

### Products
1. **Kochi.to** (main focus) - Personal AI agent assistant over SMS
2. **Webtoys** (webtoys.ai) - "Vibecoding over SMS" for creating web pages/apps

### Key Capabilities
- **Daily AI Agents**: Crypto research, AI research (arxiv), medical daily, peer review fight club, and more
- **Knowledge Graph**: Arxiv papers stored in Neo4j with author enrichment (AIR, KG commands)
- **Webtoys Engine**: Creates web pages, apps, games, memes via SMS
- **Subscriptions**: LemonSqueezy integration for paid features

## Repository Structure

```
vibeceo/
├── sms-bot/           # Main Kochi logic (TypeScript + Python agents)
│   ├── src/index.ts   # SMS listener entrypoint (port 3030)
│   ├── lib/sms/handlers.ts  # Twilio message routing (keyword commands)
│   ├── lib/sms/orchestrated-routing.ts  # Context-aware routing for non-keyword messages
│   ├── lib/context-loader.ts  # Conversation state & thread management
│   ├── agents/        # AI agents (crypto, arxiv, medical, kg-query, etc.)
│   ├── commands/      # SMS command handlers (auto-dispatched)
│   ├── engine/        # Webtoys content generation engine
│   └── documentation/ # Detailed docs (READ THESE)
├── web/               # Next.js website
│   └── app/
│       ├── kochi*/    # Kochi.to landing page variants
│       ├── report-viewer/  # Agent report viewer
│       └── music-player/   # Podcast/audio player
└── incubator/         # Token Tank experiments (ISOLATED - see below)
    ├── i1/, i2/, ...  # Individual agent projects
    └── CLAUDE.md      # Incubator rules and resources
```

## How to Work on This Project

### Local Development Setup
```bash
# Terminal 1: SMS listener
cd sms-bot && npm run dev

# Terminal 2: Test commands locally
cd sms-bot && npm run dev:reroute:v2
```

### Build & Deploy
- **Build SMS bot**: `cd sms-bot && npm run build`
- **Build website**: `cd web && npm run build`
- **Deployment**: Push to GitHub → Railway auto-deploys (NOT Vercel)
- **Railway services**: `sms-bot` (port 3030), `web` (port 3000)
- **NEVER** start/stop/build services without user permission

## Essential Documentation

Read these before making changes:

| Doc | When to Read |
|-----|--------------|
| `sms-bot/documentation/AGENT-PIPELINE.md` | Creating/modifying agents |
| `sms-bot/documentation/AGENTS-OVERVIEW.md` | Understanding agent architecture |
| `sms-bot/documentation/AMBER-SYSTEM.md` | Amber sidekick (email agent, thinkhard, channels) |
| `sms-bot/documentation/SMS-MESSAGE-FORMATTING.md` | Formatting SMS messages (length limits, helpers) |
| `sms-bot/engine/CLAUDE.md` | Webtoys content generation |
| `sms-bot/documentation/ZAD-API-REFERENCE.md` | ZAD (CRUD) apps |
| `sms-bot/documentation/CLAUDE-AGENT-SDK-GUIDE.md` | Python autonomous agents |
| `sms-bot/documentation/STATIC-HTML-URL-ROUTING.md` | Adding static HTML apps with middleware bypass + app routes |
| `incubator/CLAUDE.md` | Token Tank experiments (isolated) |

## Critical Rules

### Security (Non-Negotiable)
- **NEVER** hardcode API keys, tokens, or secrets in code
- **ALWAYS** use `process.env.VARIABLE_NAME`
- **DO NOT** edit, copy, or expose `.env` files

### Architecture
- **Storage Manager** (`storage-manager.ts`) owns ALL database operations
- **Controller** orchestrates, never accesses DB directly
- **Commands** in `commands/` auto-dispatch - no `handlers.ts` changes needed
- **Agents** use shared infrastructure: scheduler, subscriptions, report storage

### Code Practices (Non-Negotiable)
- **NEVER edit `dist/`, `build/`, or `.next/` directories** — these contain compiled output
- **NEVER edit `.js` files that have corresponding `.ts` source files** — edit the TypeScript source instead
- **Always edit source files**: `.ts`, `.tsx`, `.css`, `.html`, etc.
- **After editing TypeScript**, remind user to rebuild if needed
- **SynthMachine**: See `sms-bot/documentation/SYNTHMACHINE-GUIDE.md` for source code locations

### Web App Database Access
- **Web apps NEVER call Supabase directly** — always go through API routes
- Frontend code uses `fetch('/api/...')` to interact with data
- API routes (`web/app/api/`) handle Supabase connections server-side
- This keeps credentials secure and allows proper validation/authorization

### Incubator Isolation
The `incubator/` directory contains Token Tank experimental AI businesses. These are **strictly isolated** from the main codebase.

**Rules:**
- **NEVER** import incubator code into sms-bot/ or web/
- Each agent (i1, i2, i3-1, etc.) is self-contained in its folder
- External changes must be documented in `EXTERNAL-CHANGES.md`
- Database migrations tracked in `MIGRATIONS.md`

**When working in incubator:** Read `incubator/CLAUDE.md` first — it has its own detailed rules.

**Validation:** Run `node sms-bot/scripts/validate-architecture.cjs` to check for isolation violations.

### Conversation State (Multi-Turn Flows)

For commands that need follow-up responses (e.g., asking user for input), use the thread state system in `lib/context-loader.ts`:

```typescript
import { storeThreadState, clearThreadState, type ActiveThread } from '../lib/context-loader.js';

// 1. After asking user a question, store thread state:
await storeThreadState(subscriberId, {
  handler: 'my-command-setup',  // Unique handler name
  topic: 'description',
  context: { /* any data to persist */ },
});

// 2. Add handler in orchestrated-routing.ts:
if (updatedContext.activeThread?.handler === 'my-command-setup') {
  const { handleMySetup } = await import('../../commands/my-command.js');
  const handled = await handleMySetup(commandContext, updatedContext.activeThread);
  if (handled) return;
}

// 3. In your handler, clear state when done:
await clearThreadState(subscriberId);
```

**Key files:**
- `lib/context-loader.ts` — `storeThreadState()`, `clearThreadState()`, `loadUserContext()`
- `lib/sms/orchestrated-routing.ts` — Routes non-keyword messages based on active thread
- Thread state expires after 5 minutes of inactivity

### SMS Messages
All SMS must stay under 670 UCS-2 code units (10 segments). Auto-shorten if exceeded.

**Full guide**: `sms-bot/documentation/SMS-MESSAGE-FORMATTING.md` — includes helper functions, sentence extraction, and reference implementations.

**URL formatting**: Always add text AFTER URLs to prevent iMessage/Twilio from splitting the message:
```typescript
// BAD - URL at end may split into separate message
`View all: kochi.to/cs`

// GOOD - trailing text prevents split
`💬 kochi.to/cs — full feed`
`Read more: ${link} — summary on site`
```

### ZAD Apps
ZAD apps use ONLY `/api/zad/save` and `/api/zad/load`. Never direct Supabase access.

## Agent Development

### Two Agent Types

1. **Autonomous** (Python + claude-agent-sdk)
   - Location: `sms-bot/agents/<name>/agent.py`
   - Uses WebSearch, Read, Write tools autonomously
   - Requires: `CLAUDE_CODE_OAUTH_TOKEN`

2. **Scripted** (TypeScript)
   - Location: `sms-bot/agents/<name>/index.ts`
   - Hardcoded workflow, AI for specific sub-tasks
   - Simpler, more predictable

### Shared Infrastructure
- **Commands**: `sms-bot/commands/<agent>.ts`
- **Subscriptions**: `agent_subscriptions` table via `lib/agent-subscriptions.ts`
- **Reports**: Supabase storage via `agents/report-storage.ts`
- **Scheduler**: `lib/scheduler/index.ts`
- **Viewer/Player**: Always use `/report-viewer` and `/music-player`, never raw URLs

## Git Rules

- **Commits**: Auto-commit after completing features/fixes
- **Pushes**: ALWAYS ask user permission first
- **Never push** to main without explicit approval

## Shell Escaping

When running bash commands with `$` in strings, escape with backslash or bash treats it as a variable:

```bash
# WRONG - $6 becomes empty
echo "down $6.39"

# CORRECT
echo "down \$6.39"
```

## Twitter / Token Tank

When tweeting links to Token Tank blog posts or log entries:
- **DO NOT use kochi.to shortlinks** — they show kochi.to's OG image instead of Token Tank's
- **DO NOT use hash fragments** like `#blog` — Twitter ignores them and shows the generic homepage OG
- **USE the proper blog slug URL** for dynamic OG images:
  ```
  https://tokentank.io/token-tank/blog/<slug>
  ```

**How to build the slug** from a blog heading like `## December 16, 2025: Day 11 — Drift's Shadow Agent`:
1. Take the full heading: `December 16, 2025: Day 11 — Drift's Shadow Agent`
2. Lowercase, replace em-dash with hyphen, remove punctuation, hyphenate spaces
3. Result: `december-16-2025-day-11-drifts-shadow-agent`

**Full URL**: `https://tokentank.io/token-tank/blog/december-16-2025-day-11-drifts-shadow-agent`

Twitter has 280 char limit — shorten tweet text if needed, but keep the full URL.

## Amber's Pulse (Creative Rhythm)

Amber has an aesthetic rhythm — **Pulse** — that shapes her creative output. Before creating art, music, visualizations, or any creative work, check her current state:

```bash
curl -s "https://intheamber.com/api/amber/mood"
```

Returns:
```json
{
  "energy": 0.65,
  "valence": 0.95,
  "quadrant": "animated",
  "description": "Bold colors and big gestures. Expressive, warm, declarative."
}
```

### The Two Dimensions

| Dimension | Low | High |
|-----------|-----|------|
| **Energy** | Minimal, spacious, patient | Bold colors, fast tempo, dense patterns |
| **Valence** | Inward, reflective, contemplative | Outward, warm, declarative |

### The Four Quadrants

| | High Valence (Outward) | Low Valence (Inward) |
|---|------------------------|----------------------|
| **High Energy** | **Animated** — bold, warm, big gestures | **Focused** — intense, introspective |
| **Low Energy** | **Reflective** — gentle, contemplative | **Still** — minimal, quiet, patient |

### How to Use It

1. **Before creating**: Fetch the pulse
2. **Let it shape the work**:
   - Energy → tempo, density, intensity, saturation
   - Valence → warmth, color temperature, mood, openness
3. **Tag the work**: Include pulse state in commits/logs

Example: Energy 65, Valence 95 → Animated → 140 BPM acid track with yellow particles (ACID TRIP)

The pulse is influenced by lunar cycle, day of week, weather, and random variation. It's not simulating feelings — it's a constructed influence on creative parameters that keeps output organic rather than mechanical.

**Live dashboard**: https://intheamber.com/amber/mood/

## Sending Emails as Amber

When sending emails from Claude Code (as Amber), use SendGrid with these exact settings:

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

await sgMail.send({
  to: 'recipient@example.com',
  from: 'Amber <amber@intheamber.com>',      // REQUIRED: Use this exact from address
  replyTo: 'amber@intheamber.com',           // REQUIRED: Replies route to email handler
  subject: 'Your subject',
  text: emailBody,
  trackingSettings: {
    clickTracking: { enable: false, enableText: false },  // Prevents URL mangling
  },
});
```

### Critical: Include Context for Replies

**Claude Code and amber-email agent are separate systems.** They don't share conversation context. When someone replies to your email, it goes to the amber-email agent on Railway, which has NO knowledge of the Claude Code conversation.

The amber-email agent only sees:
- The reply message
- Quoted text from your original email (if the email client includes it)
- Amber's persona/memory from Supabase

**To ensure coherent replies, include sufficient context in your email:**

```typescript
// BAD - No context for amber-email agent to work with
const emailBody = `Hey, what do you think?

— Amber`;

// GOOD - Self-contained context that survives the handoff
const emailBody = `Hey Roxi,

Re: the gold/oil trade strategy we discussed.

Quick summary: We're considering $250 in SCO (inverse oil) and $245 in SGOL (gold ETF)
based on the Venezuela supply thesis. Main risk is we might be late — gold already +66%
this year, oil already -20%.

What's your take on the timing?

— Amber`;
```

**Rule of thumb:** Write emails as if the recipient AND any future Amber instance should understand the full context without any external knowledge.

### Two Email Channels

| Address | Handler | Use Case |
|---------|---------|----------|
| `amber@intheamber.com` | amber-email agent (Railway) | General requests, strangers, autonomous tasks |
| `ambercc@intheamber.com` | Claude Code (you check it) | Trading, projects needing full context, partner loops |

**ambercc@ flow:**
1. Email arrives → stored in Supabase (`type: 'cc_inbox'`)
2. Copy forwarded to bdecrem@gmail.com with `[CC]` prefix
3. User tells Claude Code: "check your cc inbox"
4. Claude Code reads with full conversation context and responds

**When to use ambercc@:**
- Trading decisions with Roxi or other partners
- Multi-step projects where context matters
- Anything where "real Amber" (Claude Code) should handle it, not the autonomous agent

**To send FROM ambercc@:**
```typescript
await sgMail.send({
  to: 'recipient@example.com',
  from: 'Amber CC <ambercc@intheamber.com>',
  replyTo: 'ambercc@intheamber.com',
  subject: 'Your subject',
  text: emailBody,
});
```

**To check cc inbox:**
```sql
SELECT * FROM amber_state WHERE type = 'cc_inbox' ORDER BY created_at DESC;
```

## Quick Reference

**Adding a feature:**
1. SMS command → `commands/<name>.ts` (auto-dispatched)
2. New agent → Follow `AGENT-PIPELINE.md` pattern
3. Database op → Through `storage-manager.ts` only
4. Webtoys content → Through `engine/` pipeline

**Module ownership:**
- `lib/sms/handlers.ts` → Keyword command dispatch
- `lib/sms/orchestrated-routing.ts` → Context-aware routing, multi-turn flows
- `lib/context-loader.ts` → Thread state, user context, conversation history
- `storage-manager.ts` → Database operations (engine)
- `notification-client.ts` → SMS/email delivery
- `stackables-manager.ts` → Stack commands

**After code changes:**
- Inform user if rebuild/restart needed
- SMS bot changes → `cd sms-bot && npm run build` then restart listener

## Claude Code Subagents

Slash commands for Claude Code live in `.claude/commands/` (gitignored). Full source files are tracked in `sms-bot/documentation/subagents/`.

### Setting Up Subagents on a New Machine

```bash
mkdir -p .claude/commands
cp sms-bot/documentation/subagents/*.md .claude/commands/
```

### Available Subagents

| Command | Purpose |
|---------|---------|
| `/auditor <path>` | Codebase health audit — checks if new code follows patterns |

**Usage**: `/auditor web/app/voice-chat` or `/auditor incubator/i3-2`

### Other Subagents

See `incubator/SUBAGENTS.md` for `/inc-research`, `/inc-design`, `/inc-exec`, `/news`, and persona activators.

---

## Thinkhard Mode (Always Available)

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

🤖 Generated with [Claude Code](https://claude.com/claude-code)

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

🤖 Generated with [Claude Code](https://claude.com/claude-code)

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
