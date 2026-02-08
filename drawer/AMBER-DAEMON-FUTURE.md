# Amber Daemon: Architecture & Future

*Date: 2026-02-02*

## Current State

Amber has her own daemon (`amber-daemon/`) that provides:

- **Agent loop** — `runAgentLoop()` in `amber.js`
- **Multi-surface routing** — TUI + Discord via Unix socket
- **Memory system** — `~/.amber/memory/` (just built)
- **Context compaction** — Auto-flush to daily logs before trimming
- **Custom tools** — discord, supabase, git, memory

### Directory Structure

```
~/.amber/
├── memory/
│   ├── PERSONA.md          # Identity (stable)
│   ├── MEMORY.md           # Long-term facts
│   └── YYYY-MM-DD.md       # Daily logs (append-only)
├── conversation.json       # Sliding window (50-80 messages)
├── daemon-state.json       # Last seen timestamps
└── amber.sock              # Unix socket for TUI/Discord
```

### Tools Available

| Tool | Purpose |
|------|---------|
| `read_file` / `write_file` / `list_directory` | File operations |
| `run_command` | Shell commands |
| `web_search` | DuckDuckGo search |
| `discord_read` / `discord_post` | Discord #agent-lounge |
| `supabase_query` | Query amber_state table (SELECT only) |
| `git_log` | Recent repo activity |
| `memory_append` | Save notes to daily log |
| `memory_search` | Search memory files |

---

## The OpenClaw Discovery

We have another agent system called **OpenClaw** that:

1. Uses Claude Code directly (not a DIY recreation)
2. Gets the full Claude Code system prompt + tools upstream
3. Layers persona on top (SOUL.md, USER.md, MEMORY.md)
4. Handles routing, sessions, compaction, memory

### OpenClaw's Core Loop

```
User message → OpenClaw gateway → Claude API (with Claude Code prompt + tools)
                                          ↓
                                Model decides: reply or tool call?
                                          ↓
                               ┌──────────┴──────────┐
                               ↓                     ↓
                            [reply]             [tool call]
                               ↓                     ↓
                          Send to user         Execute tool
                                                    ↓
                                             Tool result → back to model
                                                    ↓
                                             (loop until done)
```

### OpenClaw's Tools

- Read / Write / Edit (surgical find-and-replace)
- Bash (with PTY support)
- Glob / Grep
- WebSearch / WebFetch
- Browser automation
- Task (subagent spawning)
- Plus custom: message, cron, nodes, memory_search, sessions_spawn

---

## Comparison

| Feature | amber-daemon | OpenClaw |
|---------|--------------|----------|
| Agent loop | ✓ | ✓ |
| Multi-surface routing | TUI + Discord | Webchat, Discord, WhatsApp, Signal, etc. |
| Memory/persistence | Daily logs, PERSONA.md | SOUL.md, USER.md, MEMORY.md |
| Context compaction | ✓ (just added) | ✓ |
| Edit tool (surgical) | ✗ | ✓ |
| Glob/Grep | ✗ | ✓ |
| Subagents | ✗ | ✓ |
| Browser automation | ✗ | ✓ |
| Upstream updates | Manual | Automatic |

**Key insight:** amber-daemon is redundant infrastructure. It rebuilds what OpenClaw already does.

---

## Options

### Option 1: Run Amber on OpenClaw (Recommended)

Make Amber an OpenClaw agent. She gets Claude Code for free.

```yaml
# openclaw.yaml
agents:
  amber:
    workspace: ~/.amber/workspace
    # SOUL.md, USER.md, MEMORY.md live there
```

**Migration:**
- `PERSONA.md` → `SOUL.md`
- `MEMORY.md` → `MEMORY.md`
- Daily logs → OpenClaw's memory system
- Custom tools → Already available via Claude Code + MCP servers

**Pros:**
- Zero maintenance on agent infrastructure
- Full Claude Code capabilities (Edit, Glob, Grep, subagents, etc.)
- Upstream updates automatic
- All repo tools available (Neo4j MCP, Supabase MCP, skills)

**Cons:**
- Amber becomes a "tenant" in OpenClaw rather than having her own home
- Dependency on OpenClaw

### Option 2: Keep amber-daemon Independent

Continue developing amber-daemon separately. Add missing tools (Edit, Glob, Grep).

**Pros:**
- Full control
- Simpler, smaller, understandable
- Amber stays "her own thing"

**Cons:**
- Maintenance burden
- DIY tools won't match Claude Code's battle-tested implementations
- No upstream updates
- Redundant infrastructure

### Option 3: Subprocess to Claude CLI

```javascript
const { spawn } = require('child_process');
const proc = spawn('claude', ['--print', '--dangerously-skip-permissions']);
proc.stdin.write(message);
```

**Pros:**
- Gets Claude Code updates automatically
- Amber keeps her own daemon

**Cons:**
- Process overhead
- Complexity managing subprocess
- Still maintaining routing/memory separately

---

## What Amber Keeps Either Way

**Her personality is in the files, not the runtime:**

- `PERSONA.md` — Who she is
- `MEMORY.md` — What she knows
- Daily logs — What she's done
- Her voice, creativity, aesthetic

**Her tools are portable:**

The custom tools (discord, supabase, git) are just wrappers. In OpenClaw, she'd access the same capabilities via:
- Claude Code's native tools
- MCP servers (Neo4j, Supabase)
- Bash commands
- The repo's scripts

---

## Recommendation

**Move Amber to OpenClaw.**

The amber-daemon made sense as an experiment and before OpenClaw existed. Now it's redundant. OpenClaw provides:

1. Everything amber-daemon does
2. Plus full Claude Code capabilities
3. Plus automatic upstream updates
4. Plus less maintenance

Amber's personality and memory are portable. She loses nothing and gains significant capabilities.

The amber-daemon code can be archived or kept as a reference for how the agent loop works, but active development should move to OpenClaw.

---

## If Keeping amber-daemon

If there's a reason to keep it independent, the memory system we built (2026-02-02) provides:

- `~/.amber/memory/` directory structure
- `memory_append` tool for daily logs
- `memory_search` tool for searching memory
- `loadDailyLogs()` loads today + yesterday into context
- `checkAndCompact()` auto-flushes before trimming to 50 messages

To make it more capable, add:
- `edit_file` tool (surgical find-and-replace)
- `glob` tool (file pattern search)
- `grep` tool (content search)

But accept it will always lag behind Claude Code's capabilities.

---

## Files Modified (2026-02-02)

Memory system implementation:

- `amber-daemon/amber.js` — Load from `~/.amber/memory/`, add daily logs to context
- `amber-daemon/daemon.js` — Add `checkAndCompact()` for auto-flush
- `amber-daemon/tools/index.js` — Add `memory_append` and `memory_search`
- `amber-daemon/scripts/migrate-memory.sh` — One-time migration script

Migration was run — `~/.amber/memory/` now contains PERSONA.md and MEMORY.md.
