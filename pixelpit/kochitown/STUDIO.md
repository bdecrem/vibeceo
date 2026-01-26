# Pixelpit Game Studio

> **Name:** Pixelpit (approved)
> **Domain:** TBD (checking .gg, .io, .games)
> **Art Style:** TBD (user has ideas)
> **Code location:** `kochitown/` (historical name, keeping for now)

An autonomous AI game studio running 24/7 on Haiku. Five indie game makers, each owning a game end-to-end. Chaos by design.

## The Vision

- **Always running** — stuff happens while you sleep
- **Haiku all the way** — cheap enough to run forever
- **Gas Town vibes** — many things, chaos, build fast, move on
- **More is better** — volume over polish
- **Optional human injection** — you can jump in anytime, but it keeps going without you

## The Org (Self-Bootstrapping)

The studio starts minimal and grows its own structure. Day 1 might just be the Mayor and one Maker. By week 2, there's a VP of Engineering. Roles emerge as needed.

### Core Roles

| Role | Name | Model | Function |
|------|------|-------|----------|
| **Mayor** | TBD | Haiku | Coordinates everything, kicks off work, reviews, "yells instructions" |
| **Mobile Tester** | TBD | Haiku | Tests every build on mobile, files bugs, blocks launches |
| **Desktop Tester** | TBD | Haiku | Tests every build on desktop, files bugs, blocks launches |
| **Game Maker 1** | TBD | Haiku | Owns game end-to-end: concept → ship → iterate |
| **Game Maker 2** | TBD | Haiku | Owns game end-to-end |
| **Game Maker 3** | TBD | Haiku | Owns game end-to-end |
| **Game Maker 4** | TBD | Haiku | Owns game end-to-end |
| **Game Maker 5** | TBD | Haiku | Owns game end-to-end |

### Emergent Roles (spawn as needed)

| Role | When to Spawn |
|------|---------------|
| **VP Engineering** | When codebase quality degrades, shared libs need work |
| **Design Lead** | When games look bad, need visual consistency |
| **Sound Lead** | When audio is missing/bad, Jambot integration needed |
| **Marketing** | When games are ready but nobody knows |
| **Head of Finance** | When we need to track costs, make budget decisions |

## Where Sonnet/Opus Adds Value

Haiku everything, EXCEPT maybe:

| Situation | Model | Why |
|-----------|-------|-----|
| **Weekly Board Review** | Sonnet | Portfolio decisions: kill, fund, pivot. Needs judgment. |
| **Architecture Crises** | Sonnet | When codebase is genuinely broken |
| **Your daily check-in** | Opus | That's you talking to me (/kochitown) |
| **Complex debugging** | Sonnet | When Haiku is stuck in loops |

Everything else: Haiku. Let it be messy.

## Game Lifecycle

```
CONCEPT → PROTOTYPE → PLAYABLE → TESTING → LAUNCHED → ITERATING
    ↓         ↓           ↓          ↓          ↓           ↓
  (kill)   (kill)     (kill)     (kill)    (pivot)    (maintain/kill)
```

**At any time: 5 games in various stages.** When one dies, a new concept starts.

### What Each Maker Handles

- Concept & design doc
- All code (game logic, UI, controls)
- Art (sprites, backgrounds, UI assets)
- Sound (via Jambot or simple)
- Testing coordination (hands off to testers)
- Launch (deploy to site)
- Reading feedback
- Iterating or deciding to kill

### Kill Criteria

A game dies when:
- Tester can't get it working after 3 attempts
- Core loop isn't fun after 3 iterations
- Maker lost interest (yes, this counts)
- Mayor calls it (portfolio balance)

Dead games go to `kochitown/graveyard/` with a postmortem.

## Folder Structure

```
kochitown/
├── STUDIO.md                 # This file
├── gastown-reference.md      # Inspiration doc
├── STATE.md                  # Current status (auto-updated)
├── EXTERNAL-CHANGES.md       # Changes outside kochitown/
│
├── mayor/
│   ├── CLAUDE.md             # Mayor persona & directives
│   └── LOG.md                # Mayor's decision log
│
├── testers/
│   ├── mobile/
│   │   └── CLAUDE.md
│   └── desktop/
│       └── CLAUDE.md
│
├── makers/
│   ├── m1/
│   │   ├── CLAUDE.md         # Maker persona
│   │   ├── LOG.md            # Dev log
│   │   └── game/             # Current game code
│   ├── m2/
│   ├── m3/
│   ├── m4/
│   └── m5/
│
├── shared/
│   ├── engine/               # Shared game utilities
│   ├── sprites/              # Reusable art
│   └── sounds/               # Reusable audio
│
├── graveyard/                # Dead games + postmortems
│
└── web/                      # web/app/kochitown symlink target
```

### Web Integration

Games publish to `web/app/kochitown/` (max 11 folders as specified):
- `web/app/kochitown/` — main studio page, game index
- `web/app/kochitown/g1/` through `web/app/kochitown/g10/` — up to 10 live games

**Middleware**: Add `/kochitown` to bypass list in `web/middleware.ts`

## Persistent State (Supabase)

Following Amber's pattern, all studio state lives in a `kochitown_state` table:

```sql
CREATE TABLE kochitown_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,  -- 'game', 'agent', 'decision', 'task', 'log'
  key TEXT NOT NULL,   -- unique identifier within type
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, key)
);
```

### State Types

| Type | Key Example | Data |
|------|-------------|------|
| `game` | `g1` | status, maker, concept, builds, test_results |
| `agent` | `mayor` | persona, current_focus, last_action |
| `task` | `task_001` | description, assignee, status, blockers (Beads!) |
| `decision` | `dec_001` | what, who, why, outcome |
| `log` | `2024-01-24_mayor` | entries for the day |
| `memory` | `studio` | accumulated learnings, patterns |

## The Task System

**CRITICAL FOR HAIKU AGENTS** — See `kochitown/TASKS.md` for full spec.

Inspired by Gas Town's Beads — persistent work units that outlive agent sessions. This is how Haiku agents stay focused instead of drifting.

### Why Tasks Matter

- **No ambiguity** — Task says exactly what to do
- **Clear completion** — Acceptance criteria = done or not done
- **Context survival** — Tasks persist across sessions
- **Focus** — One task at a time, no drift
- **Handoffs** — Easy to pass work between agents

### Task Shape

```json
{
  "type": "task",
  "key": "task_042",
  "data": {
    "description": "[BUILD] Add touch controls to g3",
    "assignee": "m3",
    "status": "in_progress",  // pending, in_progress, blocked, done, killed
    "created_by": "mobile_tester",
    "game": "g3",
    "acceptance": "1. Touch anywhere triggers action. 2. No iOS zoom issues. 3. Tested on iPhone.",
    "blockers": [],
    "notes": []
  }
}
```

### Agent Startup Routine

Every agent checks their queue first:
```sql
SELECT * FROM kochitown_state
WHERE type='task' AND data->>'assignee'='[agent_id]' AND data->>'status'='pending'
ORDER BY created_at ASC LIMIT 1;
```

Claim → Work → Done/Blocked → Next task.

## Daily Loop (Autonomous)

What happens when nobody's watching:

```
Every N hours (TBD):
  1. Mayor reviews all game statuses
  2. Mayor assigns tasks based on priorities
  3. Each Maker works their queue
  4. Testers test any new builds
  5. Mayor reviews test results
  6. Decisions: launch, iterate, or kill
  7. If a game died, new concept spawns
  8. Loop
```

This runs via scheduled Railway jobs or continuous process.

## Your Interface (/kochitown)

When you invoke `/kochitown`, I (your Partner In Crime) will:

1. **Read current state** — games, agents, recent decisions
2. **Summarize what happened** — since last check-in
3. **Show what's playable** — links to test yourself
4. **Present decisions** — anything that needs human judgment
5. **Take your instructions** — inject whatever you want

You can also:
- Play any game directly
- Talk to any maker (invoke their persona)
- Kill/pivot/greenlight games
- Spawn new roles
- Change priorities

## Bootstrap Sequence (Tonight)

Phase 1: **Infrastructure**
- [ ] Create `kochitown_state` table in Supabase
- [ ] Add `/kochitown` to web/middleware.ts bypass
- [ ] Create web/app/kochitown/page.tsx (studio index)
- [ ] Create /kochitown subagent command

Phase 2: **First Agents**
- [ ] Mayor persona (CLAUDE.md)
- [ ] One Maker (m1) persona
- [ ] Mobile Tester persona
- [ ] Desktop Tester persona

Phase 3: **First Game**
- [ ] Mayor generates first concept
- [ ] m1 starts building
- [ ] Testers ready to test

Phase 4: **Scale**
- [ ] Add m2-m5 as m1 proves the loop works
- [ ] More games in parallel
- [ ] Emergent roles as needed

## Constraints

- **All code in kochitown/** — nothing pollutes vibeceo
- **EXTERNAL-CHANGES.md** for any exceptions (middleware, etc.)
- **Games must work mobile + desktop** — testers block otherwise
- **Max 11 web/app folders** — 1 studio + up to 10 games
- **Haiku only** — except weekly Sonnet board review + your Opus check-ins

## Success Metrics

- Games shipped (any state of playable)
- Games killed (fast failure is good)
- Surprise factor (did something unexpected happen?)
- Your delight (did you find something fun to play?)

---

*Let the chaos begin.*
