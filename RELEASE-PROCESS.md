# Pixelpit Release Process

The full pipeline from "game is done" to "live on the site."

---

## Team Roles

| Agent | Owns |
|-------|------|
| **Loop** | Game design, mechanics, feel |
| **Pit** | Game code, performance, React implementation |
| **Dither** | Visual design, juice, polish |
| **Push** | Release checklist, shipping, website updates |

---

## Release Checklist (Push runs this)

### 1. Social Integration
- [ ] Unique `GAME_ID` set
- [ ] `ScoreFlow` component in game over screen
- [ ] `Leaderboard` component present
- [ ] `ShareButtonContainer` wired up
- [ ] Color schemes defined

### 2. OpenGraph Images
- [ ] Main game OG: `arcade/[game]/opengraph-image.tsx` renders
- [ ] Share OG: `arcade/[game]/share/[score]/opengraph-image.tsx` renders
- [ ] Test direct URLs — no 502s

### 3. Share Route Structure
```
web/app/pixelpit/arcade/[game]/share/[score]/
├── layout.tsx          # generateMetadata
├── page.tsx            # Redirect to game
└── opengraph-image.tsx # Dynamic score image
```

### 4. Analytics
- [ ] POST to `/api/pixelpit/stats` on game over
- [ ] Only fires if `score >= 1`
- [ ] Fire-and-forget (no await)

### 5. Share Flow Test
- [ ] Play → game over → submit score → tap share
- [ ] Mobile: native share sheet opens
- [ ] Desktop: URL copied, toast appears

---

## Website Update (Push does this after checklist passes)

### Location
`web/app/pixelpit/page.tsx` — the "Our Games" section

### Normal Release (one game per day)

1. **Add new game card** to the carousel with:
   - Game name and thumbnail
   - Date (e.g., "Feb 3")
   - `TODAY` tag on the newest game

2. **Remove TODAY tag** from previous game

3. **Carousel visibility**: Only most recent games show; older ones slide out naturally

### Bonus Release (second game same day)

If shipping a second game on the same day:
- Mark it with `BONUS` tag instead of `TODAY`
- Both today's games show in carousel
- Previous day's game loses its `TODAY` tag

### Card Format
```tsx
{
  id: 'game-slug',
  name: 'Game Name',
  date: 'Feb 3',
  tag: 'TODAY' | 'BONUS' | null,
  href: '/pixelpit/arcade/game-slug',
  thumbnail: '/pixelpit/thumbnails/game-slug.png',
}
```

---

## Deploy

1. Commit all changes:
   ```bash
   cd /Users/bart/Documents/code/vibeceo
   git add .
   git commit -m "release: [game-name] - pixelpit arcade"
   git push
   ```

2. Deploy is automatic on push to main

3. Wait ~8 minutes for Railway/Vercel to build

4. Verify:
   - Game loads at `pixelpit.gg/arcade/[game]`
   - OG images render
   - Game appears on landing page

---

## Quick Reference

| URL | Purpose |
|-----|---------|
| `pixelpit.gg/arcade/[game]` | Game page |
| `pixelpit.gg/arcade/[game]/opengraph-image` | Main OG test |
| `pixelpit.gg/arcade/[game]/share/42/opengraph-image` | Share OG test |
| `pixelpit.gg` | Landing page with Our Games |

---

**Push says:** "Ready to launch." 🚀
