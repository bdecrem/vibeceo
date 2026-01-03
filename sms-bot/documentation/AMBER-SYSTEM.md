# Amber System Documentation

Amber is Bart's persistent AI sidekick. She exists across multiple channels, each with different capabilities.

## Amber Channels

| Channel | Location | Trigger | Capabilities |
|---------|----------|---------|--------------|
| Claude Code | `~/.claude/commands/amber.md` | `/amber` command | Full Claude Code tools, thinkhard via hooks |
| Email | `sms-bot/agents/amber-email/agent.py` | Email to `amber@intheamber.com` | Claude Agent SDK, thinkhard via internal loop |
| Awareness | `sms-bot/agents/amber/index.ts` | Scheduled (7:30am, 6pm) | Read-only scanning, SMS alerts |
| SMS | `sms-bot/commands/amber.ts` | `AMBER SCAN`, `AMBER STATUS` | On-demand awareness checks |

## Thinkhard

"Thinkhard" is a keyword that triggers multi-iteration deep work mode. When Amber sees "thinkhard:" in a request, she:

1. **Generates a spec** from the vague request (task, deliverables, constraints, evaluation criteria)
2. **Runs up to 5 iterations**, checking criteria after each
3. **Verifies** before committing:
   - New web routes → checks `web/middleware.ts` has bypass
   - Web code → no direct `@supabase/supabase-js` imports in client code
   - Runs `npm run build` → must pass
4. **Commits and pushes** with `[Amber thinkhard]` prefix
5. **Waits for deploy** (7 minutes on Railway) before responding

### Two Implementations

**Claude Code version** (hook-based):
- Keyword Amber watches for in conversation
- Uses Claude Code's Stop hooks to re-invoke between iterations
- Each iteration = separate Claude Code turn
- Only works locally in Claude Code terminal

**Email version** (internal loop):
- Keyword the email handler watches for
- Runs full loop in single Python process via Claude Agent SDK
- Each iteration = tool-calling turn within same agent session
- Works on Railway (server-side)

Same concepts, different execution models.

### Usage

```
# In Claude Code (after /amber)
thinkhard: build a puzzle game

# In email to amber@intheamber.com
Subject: New project
thinkhard: create a meditation timer app
```

## Email Agent

The email agent (`sms-bot/agents/amber-email/agent.py`) handles inbound emails to `amber@intheamber.com`.

### Behavior

**From bdecrem@gmail.com (admin):**
- Conversational emails → immediate reply (no tools)
- Action requests → runs agent immediately, replies with results
- `thinkhard:` prefix → multi-iteration deep work

**From others:**
- Conversational emails → immediate reply
- Action requests → queued for Bart's approval
- After approval → agent executes, emails results to requester

### Action Detection

The agent detects action requests by looking for keywords: write, create, build, generate, search, delete, run, execute, push, commit, deploy, install, update, fix, etc.

"Hey Amber, what do you think about React?" → conversational reply
"Hey Amber, build me a landing page" → action request (needs approval if not admin)

### Deployment

The email agent runs on Railway. Requirements:
- `claude-agent-sdk` installed in Python environment
- `AMBER_PYTHON_PATH` env var pointing to Python with SDK (or install in Railway)
- `CLAUDE_CODE_OAUTH_TOKEN` for agent authentication
- Supabase credentials for state management

Railway auto-deploys on push to main.

## Shared State

All Amber channels share state via the `amber_state` Supabase table:

| Type | Purpose |
|------|---------|
| `persona` | Amber's identity and personality |
| `memory` | Accumulated knowledge about Bart |
| `log_entry` | Session logs |
| `voice_session` | Voice conversation transcripts |
| `blog_post` | Published blog entries |
| `email_thread` | Email conversation context |
| `pending_approval` | Queued action requests |
| `loop_state` | Active thinkhard loop state |

## Setup on New Machine

For Claude Code thinkhard support:

```bash
./sms-bot/documentation/hooks/setup-amber.sh
```

This copies:
- `/amber` command to `~/.claude/commands/`
- Hook scripts to `.claude/hooks/`
- Creates `.claude/settings.json` with Stop hook config

Requirements: `sms-bot/.env.local` must have `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

## Awareness Agent

The original Amber agent (`sms-bot/agents/amber/index.ts`) is a **passive watcher**:
- Runs on schedule (7:30am, 6pm)
- Scans: git activity, Drift P&L, Gmail inbox, agent logs
- Sends SMS alerts about notable events
- Does NOT take actions — read-only

This complements the email agent, which is an **active doer**.

## File Locations

```
~/.claude/commands/
└── amber.md                    # Claude Code /amber command (user-level)

sms-bot/
├── agents/
│   ├── amber/
│   │   └── index.ts            # Awareness agent (scheduled scanner)
│   └── amber-email/
│       └── agent.py            # Email agent (action executor)
├── commands/
│   └── amber.ts                # SMS commands (AMBER SCAN, STATUS)
└── documentation/
    ├── subagents/
    │   └── amber.md            # Canonical source for /amber command
    └── hooks/
        ├── check-amber-loop.sh # Stop hook wrapper
        ├── check-amber-loop.ts # Hook logic
        └── setup-amber.sh      # Setup script

drawer/
├── PERSONA.md                  # Legacy persona (backup)
├── MEMORY.md                   # Legacy memory (backup)
└── LOG.md                      # Legacy log (backup)
```

Note: `drawer/` files are backups. Supabase `amber_state` table is the source of truth.
