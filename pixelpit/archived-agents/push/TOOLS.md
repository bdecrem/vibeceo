# TOOLS.md - Push's Local Notes

## Key Repos

- **VibeCEO** (The Plotfarm): `/Users/bart/Documents/code/vibeceo/`
  - `web/` → Next.js app (pixelpit.gg, intheamber.com)
  - `web/public/amber/` → intheamber.com/amber/ static files
  - `web/app/pixelpit/` → Pixelpit arcade games (React/Next.js)
  - `web/app/pixelpit/arcade/[game]/` → Individual game pages
  - `web/app/pixelpit/components/` → Shared social components (ScoreFlow, Leaderboard, etc.)
  - Desktop alias: `/Users/bart/Desktop/vibeceo alias`

## Pixelpit Game Structure

Each game in `web/app/pixelpit/arcade/[game]/` needs:
```
[game]/
├── page.tsx                    # Main game component
├── opengraph-image.tsx         # Main OG image (static)
└── share/[score]/
    ├── layout.tsx              # generateMetadata for share
    ├── page.tsx                # Redirect back to game
    └── opengraph-image.tsx     # Dynamic score OG image
```

## Testing URLs

- Main OG: `https://pixelpit.gg/arcade/[game]/opengraph-image`
- Share OG: `https://pixelpit.gg/arcade/[game]/share/[score]/opengraph-image`
- Local dev: `http://localhost:3000/pixelpit/arcade/[game]`

## Social Preview Tools

- Twitter Card Validator
- Facebook Sharing Debugger  
- LinkedIn Post Inspector

## Quick Checks

- Supabase `pixelpit_daily_stats` for analytics verification
- Browser dev tools Network tab for API calls

## Git Workflow

```bash
cd /Users/bart/Documents/code/vibeceo
git status
git add .
git commit -m "message"
git push
```

Deploy is automatic on push to main (Railway/Vercel).
