# TOOLS.md - Pit's Local Notes

## Key Repos

- **VibeCEO** (The Plotfarm): `/Users/bart/Documents/code/vibeceo/`
  - `web/` → Next.js app (pixelpit.gg, intheamber.com)
  - `web/app/pixelpit/arcade/` → Pixelpit games (React/Next.js)
  - `web/public/amber/` → intheamber.com/amber/ static files
  - `pixelpit/` → Pixelpit game studio assets
  - Desktop alias: `/Users/bart/Desktop/vibeceo alias`

## Git Workflow

```bash
cd /Users/bart/Documents/code/vibeceo
git status
git add .
git commit -m "message"
git push
```

Deploy is automatic on push to main.

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind
- **Games:** Canvas API, requestAnimationFrame
- **Social:** ScoreFlow, Leaderboard components in `web/app/pixelpit/components/`

---

Add project-specific notes, device configs, etc. below.
