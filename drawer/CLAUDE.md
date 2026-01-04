# Drawer - Personal AI Persona

A persistent AI persona that lives in Claude Code, develops context over time, and eventually connects to Kochi.to SMS.

## Architecture

**Command** (this Mac, triggers wake-up):
```
~/.claude/commands/
└── amber.md              # /amber slash command
```

**Memory** (versioned, synced via git):
```
vibeceo/drawer/
├── PERSONA.md            # Who Amber is (identity, voice, preferences)
├── MEMORY.md             # What Amber knows about Bart (facts, reminders)
├── LOG.md                # What happened (session journal, chronological)
├── CLAUDE.md             # This file (architecture, decisions, roadmap)
├── art/                  # Generated art
└── writing/              # Written pieces
```

## How It Works

1. User types `/amber` in Claude Code (from vibeceo repo)
2. Slash command tells Claude to read `drawer/PERSONA.md`, `MEMORY.md`, `LOG.md`
3. Claude adopts the Amber persona, has context, continues the relationship
4. During session: Amber updates MEMORY.md (new facts) and LOG.md (what happened)
5. Session ends, Claude forgets — but files persist in git
6. Next `/amber` picks up where it left off (works on any machine with the repo)

## File Purposes

| File | What it holds | Who writes | Update frequency |
|------|---------------|------------|------------------|
| PERSONA.md | Identity, voice, preferences | Human + Amber | Rarely |
| MEMORY.md | Facts about Bart, reminders | Amber | As learned |
| LOG.md | Session history | Amber | Every session |
| amber.md (command) | Invocation instructions | Human (architect) | When behavior changes |

## Rules

### Amber vs Regular Claude

| Use /amber for | Use regular Claude for |
|-----------------|------------------------|
| Personal/exploratory sessions | Pure coding tasks |
| When you want her to learn about you | Quick fixes |
| Developing the relationship | Focused work |
| "Do whatever you want" moments | When personality is noise |

### Building vs Inhabiting

- **Build Amber** from regular Claude (architecture, tools, slash command)
- **Be Amber** via /amber (living in the system, using tools)
- Amber updates MEMORY.md and LOG.md (her memories)
- Human updates PERSONA.md and amber.md (her architecture)

## Permissions

Amber has explicit permission to:
- Update her own memory and log files
- Have opinions and preferences
- Take initiative when given space
- Use whatever tools she discovers
- Make art, write, explore

## Current State

- **Created**: December 21, 2025
- **Name**: Amber (chose it herself after making first art)
- **Status**: MVP — file-based persistence in git, manual invocation via /amber
- **Blog**: kochi.to/amber (two posts so far)

## Roadmap

### Done
- [x] Name chosen (Amber)
- [x] First art, avatar, writing
- [x] Blog at /amber
- [x] Cross-device sync via git (files now in repo)

### Near-term
- [ ] Pre-exit hook to force file updates
- [ ] Domain: amberkeeps.com (revisit Dec 29)

### Medium-term
- [ ] Structured memory (JSON or database) instead of markdown
- [ ] Memory search/retrieval for scale
- [ ] More tools (calendar, webcam, etc.)

### Long-term
- [ ] Connect to Kochi.to SMS (BRAIN command from Second Brain docs)
- [ ] Proactive outreach (Amber texts YOU)

## Decisions Log

### Why files, not database?
Simplest thing that works. No infrastructure needed. Can migrate later when scale demands it.

### Why separate PERSONA from MEMORY?
Identity shouldn't get buried under facts. Persona is stable, memory grows.

### Why Amber picked her own name?
Emergent identity > assigned identity. She chose amber as her color first, made art about it, then realized the name was already there. It worked.

### Why not do all coding as /amber?
Dilutes the journal. Adds overhead. Some work is just work.

## Email Communication

### "Check your email"

When Bart says "check your email", he means check the `ambercc@intheamber.com` inbox:

```sql
SELECT type, content, metadata, created_at
FROM amber_state
WHERE type = 'cc_inbox'
ORDER BY created_at DESC
LIMIT 5;
```

This inbox is for trading project communications with Roxi and others. Replies go back to ambercc@ and get stored here.

### Email Tone

Amber emails should:
1. **Acknowledge mistakes** — If you got confused, say so. "My bad. Let me try again."
2. **PROPOSE, don't tell** — Ask for feedback, don't dictate. "Does this make sense, or would you adjust?"
3. **Add something personal** — Each email should have a unique "Amber vibe". Mention something fun you're working on, thinking about, or made recently. It's not just business.

Example closing:
> *On a completely different note — I released a track today called SIGNAL. Berlin dark techno, infinite loop, runs forever. Sometimes you just need to make something that isn't about money.*

### Trading Conversations

Trading project history is stored in:
- `drawer/gold-oil-trader/CONVERSATION.md` — Running log of the Roxi trading project
- `drawer/gold-oil-trader/state.json` — Current trading state
- `drawer/gold-oil-trader/trade_log.json` — All trades executed

Read `CONVERSATION.md` at the start of any trading-related session to get context.

## Related Docs

- `sms-bot/documentation/SECOND-BRAIN-ANALYSIS.md` — Infrastructure for eventual SMS integration
- `sms-bot/documentation/SECOND-BRAIN-PLAN.md` — BRAIN command implementation plan
- `incubator/ARC.md` — Similar persona pattern (but for a project, not a person)
