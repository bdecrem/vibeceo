# Kochi.to - Claude Code Instructions

## What This Is

**Kochi.to** is an AI agent service over SMS. Think poke.com but with a research/science focus.

## Active Projects

| Project | What | Entry Points |
|---------|------|--------------|
| **Kochi.to** | SMS AI agent service | `sms-bot/src/index.ts`, `sms-bot/commands/` |
| **Amber** | AI sidekick (Twitter, email, creative) | `sms-bot/agents/amber-*/`, `web/app/amber/`, `drawer/` |
| **Jambot** | Music tools | `jambot/`, `web/app/jb01/`, `web/app/jb200/` |
| **CTRL SHIFT** | Responsible AI incubator + knowledge repo | `web/app/csc/`, `web/app/cs/` |

**Inactive:** Token Tank (`incubator/`), Webtoys (`sms-bot/engine/`), AdvisorsFoundry

**Key directories:** Agents live in `sms-bot/agents/`. Dev docs live in `sms-bot/documentation/`.

## Repository Structure

```
vibeceo/
├── sms-bot/           # Main Kochi logic (TypeScript + Python agents)
│   ├── src/index.ts   # SMS listener entrypoint (port 3030)
│   ├── lib/sms/handlers.ts  # Twilio message routing (keyword commands)
│   ├── lib/sms/orchestrated-routing.ts  # Context-aware routing for non-keyword messages
│   ├── lib/context-loader.ts  # Conversation state & thread management
│   ├── agents/        # AI agents (crypto, arxiv, amber-social, kg-query, etc.)
│   ├── commands/      # SMS command handlers (auto-dispatched)
│   └── documentation/ # Detailed docs (READ THESE)
├── web/               # Next.js website
│   └── app/
│       ├── kochi*/    # Kochi.to landing page variants
│       ├── amber/     # Amber's creations and tools
│       └── report-viewer/  # Agent report viewer
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
- **Deployment**: Push to GitHub triggers auto-deploy
  - **Railway**: `sms-bot` (port 3030)
  - **Vercel**: `web` including pixelpit.gg (port 3000)
- **NEVER** start/stop/build services without user permission

### Browser Testing with Playwright

**NEVER ask the user to open DevTools.** Use Playwright automation instead.

Playwright is available for browser testing and debugging:

```typescript
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false }); // visible browser
const page = await browser.newPage();

// Screenshots
await page.screenshot({ path: 'debug.png', fullPage: true });

// Console logs
page.on('console', msg => console.log('PAGE:', msg.text()));

// Network requests
page.on('request', req => console.log('Loading:', req.url()));

// Evaluate JS in page context
const data = await page.evaluate(() => window.someGlobalVar);

// Query DOM
const labels = await page.locator('.knob-label').allTextContents();

// Disable cache
await context.route('**/*', route => route.continue({
  headers: { ...route.request().headers(), 'Cache-Control': 'no-cache' }
}));
```

**Example test script**: `web/test-909-sweep.mjs`

Run with: `node web/test-909-sweep.mjs`

## Essential Documentation

**When user says "read the docs" or "check documentation", go to `sms-bot/documentation/`.**

Read these before making changes:

| Doc | When to Read |
|-----|--------------|
| `AGENT-PIPELINE.md` | Creating/modifying agents |
| `AGENTS-OVERVIEW.md` | Understanding agent architecture |
| `AMBER-SYSTEM.md` | Amber sidekick (email, Twitter, thinkhard, channels) |
| `SMS-MESSAGE-FORMATTING.md` | Formatting SMS messages (length limits, helpers) |
| `SYNTHMACHINE-GUIDE.md` | Synth libraries (909, 303, 101, mixer) |
| `CLAUDE-AGENT-SDK-GUIDE.md` | Python autonomous agents |
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

**Files:**
- **NEVER edit `dist/`, `build/`, or `.next/`** — compiled output
- **NEVER edit `.js` with corresponding `.ts`** — edit TypeScript source
- **Small focused files** — Split at ~200 lines. One file = one responsibility.
- **Flat over nested** — Avoid deep folder hierarchies. 3+ levels = reconsider.

**Functions:**
- **Do one thing** — If description needs "and", split it.
- **Explicit over clever** — Boring readable beats elegant obscure.
- **3x before abstracting** — Don't extract helpers until you've duplicated 3 times.

**Web routes:**
- **API routes need route.ts** — Next.js API routes go in `app/api/*/route.ts`
- **New pages MUST be added to middleware** — Edit `web/middleware.ts` lines ~442-473 (the bypass list) or routes get caught by webtoys catch-all

**Dependencies:**
- **Minimize new packages** — Check existing deps first.
- **Pin versions** — Exact versions, not ranges.

**Errors:**
- **Fail fast, fail loud** — Throw early with context. Never swallow silently.
- **Validate at boundaries** — Check user/API inputs. Trust internal code.

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

## Dates & Days of the Week

LLMs are bad at day-of-week calculations. **NEVER guess.** Always verify with a command:

```bash
date -j -f "%m/%d/%Y" "02/06/2026" "+%a %-m/%-d"
# Output: Fri 2/6
```

This applies to `web/app/pixelpit/page.tsx` (hub page date labels) and anywhere else dates with day names appear.

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

See `sms-bot/documentation/AMBER-SYSTEM.md` for full email setup (SendGrid config, two channels, cc inbox/outbox).

## Quick Reference

**Adding a feature:**
1. SMS command → `commands/<name>.ts` (auto-dispatched)
2. New agent → Follow `AGENT-PIPELINE.md` pattern
3. Database op → Through `storage-manager.ts` only

**Module ownership:**
- `lib/sms/handlers.ts` → Keyword command dispatch
- `lib/sms/orchestrated-routing.ts` → Context-aware routing, multi-turn flows
- `lib/context-loader.ts` → Thread state, user context, conversation history
- `notification-client.ts` → SMS/email delivery

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
| `/review-jambot <scope>` | Jambot code review + doc updates — enforces modular architecture, updates CLAUDE.md |

**Usage**:
- `/auditor web/app/voice-chat` or `/auditor incubator/i3-2`
- `/review-jambot HEAD~3..HEAD` or `/review-jambot effects/` or `/review-jambot recent`

### Other Subagents

See `incubator/SUBAGENTS.md` for `/inc-research`, `/inc-design`, `/inc-exec`, `/news`, and persona activators.

---

## Workflow Modes

When the user triggers these modes, read `sms-bot/documentation/WORKFLOW-MODES-THINKHARD-PROJECT.md` for full instructions.

| Trigger | Mode | Purpose |
|---------|------|---------|
| `thinkhard: [task]` | Thinkhard | Multi-iteration deep work (5 iterations, in-memory state) |
| `thinkhard-stophook: [task]` | Thinkhard-Stophook | Persistent deep work (survives crashes via Supabase) |
| `project: [description]` | Project Mode | Multi-session work with file-based state (PROJECT.md) |
| `this is project [name]` | Project Backlog | Named projects stored in Supabase, can be shelved/resumed |
