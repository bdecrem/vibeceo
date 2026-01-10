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

**When user says "read the docs" or "check documentation", go to `sms-bot/documentation/`.**

Read these before making changes:

| Doc | When to Read |
|-----|--------------|
| `AGENT-PIPELINE.md` | Creating/modifying agents |
| `AGENTS-OVERVIEW.md` | Understanding agent architecture |
| `AMBER-SYSTEM.md` | Amber sidekick (email agent, thinkhard, channels) |
| `SMS-MESSAGE-FORMATTING.md` | Formatting SMS messages (length limits, helpers) |
| `SYNTHMACHINE-GUIDE.md` | Synth libraries (909, 303, 101, mixer) |
| `zad-api-reference.md` | ZAD (CRUD) apps |
| `CLAUDE-AGENT-SDK-GUIDE.md` | Python autonomous agents |
| `STATIC-HTML-URL-ROUTING.md` | Adding static HTML apps |
| `sms-bot/engine/CLAUDE.md` | Webtoys content generation |
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

## Workflow Modes

When the user triggers these modes, read `sms-bot/documentation/WORKFLOW-MODES-THINKHARD-PROJECT.md` for full instructions.

| Trigger | Mode | Purpose |
|---------|------|---------|
| `thinkhard: [task]` | Thinkhard | Multi-iteration deep work (5 iterations, in-memory state) |
| `thinkhard-stophook: [task]` | Thinkhard-Stophook | Persistent deep work (survives crashes via Supabase) |
| `project: [description]` | Project Mode | Multi-session work with file-based state (PROJECT.md) |
| `this is project [name]` | Project Backlog | Named projects stored in Supabase, can be shelved/resumed |
