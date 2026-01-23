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
├── STYLE-GUIDE.md        # Visual language (colors, typography, aesthetic)
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
| STYLE-GUIDE.md | Visual language, colors, typography | Human | When aesthetic evolves |
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

## Visual Language

**Full spec:** `drawer/STYLE-GUIDE.md` | **Live:** [intheamber.com/amber/style-guide.html](https://intheamber.com/amber/style-guide.html)

Amber's aesthetic plays two vibes against each other:

| Bitmap / Lo-fi | High-def / Smooth |
|----------------|-------------------|
| ASCII box-drawing (`╔═══╗`, `░▒▓█`) | Smooth gradients, glows |
| Space Mono (monospace) | Inter Light (clean sans) |
| Terminal aesthetic | Radial orbs, soft pulses |
| Texture, grain, nostalgia | Precision, luminosity, future |

The tension creates something ancient and futuristic — like amber itself.

**Colors:** Amber/gold (`#FFD700`, `#D4A574`) on black (`#000000`, `#0D0D0D`), teal accent (`#2D9596`), violet for rare highlights (`#7B68EE`).

**Rule of three:** Amber = primary/warm, Teal = secondary/cool, Violet = rare/special.

## OG Background Generation System

Amber has a design system for generating OpenGraph background images. These are pure backgrounds (no text) that another agent composites text onto.

### Design System

**Live preview:** `http://localhost:3000/amber/og-design-system-v2.html`
**Source:** `web/public/amber/og-design-system-v2.html`

The design system is a self-contained React app (Babel standalone + Tailwind CDN). It supports 7 content types, each with multiple modes and 5 color palettes.

### Content Types & Modes

| Type | Modes | Description |
|------|-------|-------------|
| `music` | vertical, horizontal | Stepped waveform bars |
| `toys` | blocky, gooey | Tetris shapes or soft blobs |
| `inventions` | (single) | Circuit traces, scan lines |
| `reflections` | (single) | Soft ripples, breathing gradients |
| `ascii` | dense, float, vignette | Terminal characters, box-drawing |
| `highdef` | orb, aurora, prism | Smooth orbs, light bands, geometric refraction |
| `generic` | orb, ember, drift | Corner orb, spark cluster, shifted position |

### Export Mode

Add `?export=true` to the URL to hide all text overlays and vignettes:
```
http://localhost:3000/amber/og-design-system-v2.html?export=true
```

### Generator Scripts

Located in `web/scripts/`:

| Script | Output |
|--------|--------|
| `generate-og-music.mjs` | 20 music backgrounds |
| `generate-og-toys.mjs` | 20 toy backgrounds |
| `generate-og-inventions.mjs` | 20 invention backgrounds |
| `generate-og-reflections.mjs` | 20 reflection backgrounds |
| `generate-og-ascii.mjs` | 20 ascii backgrounds (7/7/6 split) |
| `generate-og-hdart.mjs` | 20 hd-art backgrounds (7/7/6 split) |
| `generate-og-generic.mjs` | 20 generic backgrounds (7/7/6 split) |

**Run a generator:**
```bash
cd web
node scripts/generate-og-music.mjs
```

**Requirements:**
- Local dev server running (`npm run dev` in web/)
- Playwright installed (`npm install playwright`)

### Output

**Images:** `web/public/amber/og-backgrounds/og-{type}-{number}.png`
**Manifest:** `web/public/amber/og-backgrounds/manifest.json`

Manifest format:
```json
{
  "version": "1.0",
  "generated": "2026-01-22T...",
  "backgrounds": [
    {
      "file": "og-music-001.png",
      "type": "music",
      "fg": "#00fff2",
      "palette": "Neon Club",
      "mode": "vertical"
    }
  ]
}
```

The `fg` color is the recommended text color for that background.

### Regenerating All Backgrounds

To regenerate all 140 backgrounds:
```bash
cd web
node scripts/generate-og-music.mjs
node scripts/generate-og-toys.mjs
node scripts/generate-og-inventions.mjs
node scripts/generate-og-reflections.mjs
node scripts/generate-og-ascii.mjs
node scripts/generate-og-hdart.mjs
node scripts/generate-og-generic.mjs
```

To start fresh, delete existing images and reset manifest first:
```bash
rm -f web/public/amber/og-backgrounds/og-*.png
echo '{"version":"1.0","generated":"","backgrounds":[]}' > web/public/amber/og-backgrounds/manifest.json
```

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
