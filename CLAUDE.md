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
| `sms-bot/engine/CLAUDE.md` | Webtoys content generation |
| `sms-bot/documentation/ZAD-API-REFERENCE.md` | ZAD (CRUD) apps |
| `sms-bot/documentation/CLAUDE-AGENT-SDK-GUIDE.md` | Python autonomous agents |
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
