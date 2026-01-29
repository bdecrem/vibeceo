# Pixelpit — Claude Code Instructions

An autonomous AI game studio. Haiku agents build games 24/7, coordinated by a Mayor.

## Quick Links

| Doc | Purpose |
|-----|---------|
| `STUDIO.md` | Org structure, game lifecycle, architecture |
| `TASKS.md` | Task system for agent coordination |
| `SOCIAL.md` | Social backend API (leaderboards, auth, sharing) |
| `DESIGN.md` | Colors, typography, visual identity |
| `CHARACTER-BIBLE.md` | Agent avatars and art assets |

## Key Paths

```
pixelpit/
├── creative/        # Dither (design review)
├── testers/         # Tap (QA)
├── swarmspeed/      # Orchestrators (t1-t7)
├── orchestrator.py  # Main execution script

web/app/pixelpit/
├── arcade/          # Hand-crafted games (human + Claude)
│   └── beam/        # First arcade game
├── g1/ - g10/       # Agent-built games
└── page.tsx         # Studio index

web/public/pixelpit/swarm/
├── t6/              # Visual QA experiment
└── t7/              # Triage + Enhance experiment
```

## Mobile Testing

**Use the QR tool to test on your phone:**

```bash
# From repo root
./pixelpit/tools/qr 3000 /pixelpit/arcade/beam
```

Opens a QR code in your browser. Scan with your phone's camera.

**Requirements:**
- Dev server running (`cd web && npm run dev`)
- Phone on same WiFi as your computer
- Note: HTTPS features (Share API) won't work on local HTTP

## Social Integration

All games MUST include social features using React components:

```tsx
import {
  ScoreFlow,
  Leaderboard,
  ShareButtonContainer,
} from '@/app/pixelpit/components';
```

**Every game needs:**
1. `<ScoreFlow>` on game over screen
2. `<Leaderboard>` screen
3. `<ShareButtonContainer>` for sharing
4. OG images: `/arcade/[game]/opengraph-image.tsx` + `/share/[score]/opengraph-image.tsx`

See `SOCIAL.md` for full API and `arcade/beam/page.tsx` for reference implementation.

## Game Types

| Type | Location | Who builds | Examples |
|------|----------|------------|----------|
| **Arcade** | `/arcade/{name}/` | Human + Claude | BEAM |
| **Agent** | `/g1/` - `/g10/` | Haiku agents | TBD |

## Agent Roster

| Role | Name | Folder |
|------|------|--------|
| Partner | **Pit** | `/pit` command |
| Creative Head | **Dither** | `creative/` |
| QA Tester | **Tap** | `testers/` |

### The Makers (Game Builders)

| # | Name |
|---|------|
| 1 | AmyThe1st |
| 2 | BobThe2nd |
| 3 | ChetThe3rd |
| 4 | DaleThe4th |
| 5 | EarlThe5th |
| 6 | FranThe6th |
| 7 | GusThe7th |
| 8 | HankThe8th |
| 9 | IdaThe9th |
| 10 | JoanThe10th |

**Note:** Ship (Release Engineer) deprecated — social integration now built into maker role via components.

## Commands

| Slash Command | Purpose |
|---------------|---------|
| `/pit` | Daily partner interface — status, instructions, task management |
| `/dither` | Design review with Creative Head |
| `/pixelpit` | Alias for /pit |

## SwarmSpeed Experiments

Batch game generation experiments. Base game is a simple "pop the balls" test game — we picked the simplest thing we could think of for our first experiment.

```bash
# Run from repo root with venv
pixelpit/swarmspeed/venv/bin/python pixelpit/swarmspeed/t7-orchestrator.py
```

| Experiment | What it does |
|------------|--------------|
| **t5** | 10 agents race, live dashboard |
| **t6** | + Visual QA (Claude Vision rates each game) |
| **t7** | + Triage (GREEN/YELLOW/RED) + Enhancement (music for ships, v2 for needs-work) |

Output goes to `web/public/pixelpit/swarm/t*/` — commit and push to deploy.

**Dashboard URLs:** `/pixelpit/swarm/t7/index.html` (need `.html` extension)

## Database

All state lives in `pixelpit_state` table (Supabase):

```sql
-- Check current state
SELECT type, key, data, updated_at
FROM pixelpit_state
ORDER BY updated_at DESC LIMIT 20;

-- Game status
SELECT * FROM pixelpit_state WHERE type = 'game';

-- Open tasks
SELECT * FROM pixelpit_state WHERE type = 'task' AND data->>'status' != 'done';
```

## Build & Deploy

```bash
# Build web (includes pixelpit games)
cd web && npm run build

# Deployment: Push to GitHub → Railway auto-deploys
```

## OG Images

Every game needs OG images for social sharing:

```
web/app/pixelpit/arcade/{game}/opengraph-image.tsx         # Game promo
web/app/pixelpit/arcade/{game}/share/[score]/opengraph-image.tsx  # Score share
```

**CRITICAL: Read `web/app/pixelpit/components/og/README.md` before creating OG images!**

Satori (Edge runtime) has strict CSS limitations that cause silent 502 errors:
- NO React fragments, rgba(), radial-gradient, borderRadius percentages
- Use wrapper divs, hex colors with alpha (`#ffffff80`), linear-gradient, numeric borderRadius
