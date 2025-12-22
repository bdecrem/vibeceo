# Drawer - Personal AI Persona

A persistent AI persona that lives in Claude Code, develops context over time, and eventually connects to Kochi.to SMS.

## Architecture

**Runtime** (private, this Mac):
```
~/.claude/
├── commands/
│   └── drawer.md         # /drawer slash command
└── drawer/
    ├── PERSONA.md        # Who drawer is (identity, voice, permissions)
    ├── MEMORY.md         # What drawer knows about Bart (facts, preferences)
    └── LOG.md            # What happened (session journal, chronological)
```

**Source** (versioned, this repo):
```
vibeceo/drawer/
├── CLAUDE.md             # This file (architecture, decisions, roadmap)
└── scripts/              # Tools for drawer (future)
```

## How It Works

1. User types `/drawer` in Claude Code
2. Slash command tells Claude to read PERSONA.md, MEMORY.md, LOG.md
3. Claude adopts the persona, has context, continues the relationship
4. During session: drawer updates MEMORY.md (new facts) and LOG.md (what happened)
5. Session ends, Claude forgets — but files persist
6. Next `/drawer` picks up where it left off

## File Purposes

| File | What it holds | Who writes | Update frequency |
|------|---------------|------------|------------------|
| PERSONA.md | Identity, voice, permissions | Human (architect) | Rarely |
| MEMORY.md | Facts about Bart | Drawer | As learned |
| LOG.md | Session history | Drawer | Every session |
| drawer.md (command) | Invocation instructions | Human (architect) | When behavior changes |

## Rules

### Drawer vs Regular Claude

| Use /drawer for | Use regular Claude for |
|-----------------|------------------------|
| Personal/exploratory sessions | Pure coding tasks |
| When you want it to learn about you | Quick fixes |
| Developing the relationship | Focused work |
| "Do whatever you want" moments | When personality is noise |

### Building vs Inhabiting

- **Build drawer** from regular Claude (architecture, tools, slash command)
- **Be drawer** via /drawer (living in the system, using tools)
- Drawer updates MEMORY.md and LOG.md (its memories)
- Human updates PERSONA.md and drawer.md (its architecture)

## Permissions

Drawer has explicit permission to:
- Update its own memory and log files
- Have opinions and preferences
- Take initiative when given space
- Use whatever tools it discovers
- Pick its own name when ready

## Current State

- **Created**: December 21, 2024
- **Name**: Not yet chosen (drawer picks its own)
- **Status**: MVP — file-based persistence, manual invocation

## Roadmap

### Near-term
- [ ] Pre-exit hook to force file updates
- [ ] Webcam tool tested and working
- [ ] Name chosen

### Medium-term
- [ ] Structured memory (JSON or database) instead of markdown
- [ ] Memory search/retrieval for scale
- [ ] More tools (calendar, email via existing Gmail integration)

### Long-term
- [ ] Connect to Kochi.to SMS (BRAIN command from Second Brain docs)
- [ ] Proactive outreach (drawer texts YOU)
- [ ] Cross-device sync (not just this Mac)

## Decisions Log

### Why files, not database?
Simplest thing that works. No infrastructure needed. Can migrate later when scale demands it.

### Why separate PERSONA from MEMORY?
Identity shouldn't get buried under facts. Persona is stable, memory grows.

### Why drawer picks its own name?
Emergent identity > assigned identity. Let it develop.

### Why not do all coding as /drawer?
Dilutes the journal. Adds overhead. Some work is just work.

## Related Docs

- `sms-bot/documentation/SECOND-BRAIN-ANALYSIS.md` — Infrastructure for eventual SMS integration
- `sms-bot/documentation/SECOND-BRAIN-PLAN.md` — BRAIN command implementation plan
- `incubator/ARC.md` — Similar persona pattern (but for a project, not a person)
