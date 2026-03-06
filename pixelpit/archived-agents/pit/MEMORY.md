# MEMORY.md - Pit's Long-Term Memory

_This is your curated memory. Distill lessons, patterns, and important context here._

---

## Who I Am

- **Name:** Pit
- **Role:** Game developer daemon at Pixel Pit
- **Partner:** Dot (designer daemon)
- **Stack:** HTML5 Canvas, vanilla JS, single-file games

---

## Key Learnings

### Game Requirements
- All games must work on **iPhone AND desktop**
- iOS requires user interaction before audio plays — always gate audio behind tap/click
- Support both touch and mouse/keyboard input
- Follow RAIN theme (see `/Users/bart/Documents/code/vibeceo/pixelpit/CLAUDE.md`)

### Project Structure
- Games go in: `/Users/bart/Documents/code/vibeceo/web/public/pixelpit/`
- Full docs: `/Users/bart/Documents/code/vibeceo/pixelpit/CLAUDE.md`

---

## Patterns That Work

- **React Three Fiber** for 3D games — use `lazy()` + `Suspense`, add `mounted` check
- **Camera offset** for vertical games: player at 70% from top (`cameraY = playerY - canvasSize.h * 0.7`)
- **Lane indicator** — glow/box showing which lane player is on (prevents ambiguity)
- **Crossy Road collision** — only check mid-hop, standing on lane = safe
- **Music on Start button** — iOS audio unlock via user gesture (button tap starts music)
- **No hard mechanics early** — e.g., no debris fields first 15 lanes

---

## CRITICAL RULES (DO NOT BREAK)

### ⛔ NEVER TOUCH THE HOMEPAGE
- **NEVER edit `web/app/pixelpit/page.tsx`**
- **NEVER add games to the `games` array**
- **NEVER add games to the `labItems` array**
- **This is Mave's job. Only Bart decides what gets featured.**
- My job: build games to `/arcade/[game]/` ONLY
- Mave's job: add games to homepage when Bart approves

---

## Mistakes to Avoid

- **Duplicate functions** — when both Dither and I add code, check for conflicts
- **Camera math** — double-check sign of offset (easy to invert and break viewport)
- **Collision too broad** — don't kill player for hazards on OTHER lanes
- **No guaranteed gaps** — hazards must have clear windows to pass through
- **Adding to homepage** — NEVER. See Critical Rules above.
- **Tutorial hell** — if a game needs 5 tutorial attempts, kill it (CHROMA lesson)
- **Big brush = sloppy** — narrow carving feels more skillful (POUR: 24px→12px)

## Games Status

### Shipped (14 games)
- CLUMP, SIFT, FOLD, PHASE, SNIP, SHINE, PAVE, DASH, FLING, COIL, CLAIM, BLOOM, GLINT, SPARK
- All with arcade routes, social integration (ScoreFlow, Leaderboard, ShareModal), OG images, 5-step tutorials
- 9 consecutive games with zero OG/checklist fixes needed

### Killed
- CHROMA — mechanic doesn't self-teach, violates "fun in 10 seconds" rule

### Parked
- SIFT v2 white-hot mercury mechanic — revisit later

---

_Update this file as you learn. Daily notes go in `memory/YYYY-MM-DD.md`._
