# Das Kollektiv — Track Publishing Guide

## Where files go

All DK tracks live in **this folder**: `web/public/pixelpit/daskollektiv/`

```
web/public/pixelpit/daskollektiv/
├── index.html       # Homepage (reads tracks.json)
├── archive.html     # Archive page (reads tracks.json)
├── tracks.json      # Track registry — YOU MUST UPDATE THIS
├── dk001.html
├── dk002.html
├── ...
├── dk006.html
└── dk006-og.png     # OG image (1200x630)
```

**DO NOT** put DK files anywhere else. Not in `web/app/`, not in `~/collabs/`, not in `jambot/`. This folder only.

## Publishing a new track — CHECKLIST

You are not done until all 3 steps are complete:

### 1. Create the HTML file

`dk{NNN}.html` in this directory. Single self-contained HTML file. See existing tracks for structure.

### 2. Update `tracks.json` (REQUIRED — DO NOT SKIP)

Add the new track **at the top** of the array in `tracks.json`:

```json
{
  "id": "dk{NNN}",
  "title": "DK{NNN}",
  "artists": "HALLMAN × MARG",
  "description": "Short description. BPM. Key.",
  "url": "dk{NNN}.html",
  "date": "YYYY-MM-DD"
}
```

Without this step, the track will not appear on the homepage or archive. The homepage (`index.html`) and archive (`archive.html`) both read from `tracks.json` to render their track lists.

### 3. Add an OG image

`dk{NNN}-og.png` (1200x630) in this directory.

## Engine imports — CORS rules

DK tracks run on `daskollektiv.rip` but load synth engines from `kochi.to`. This requires CORS.

**ALWAYS use full absolute URLs for engine imports:**

```javascript
import { JT90Engine } from 'https://kochi.to/jt90/dist/machines/jt90/engine.js';
import { JT10Engine } from 'https://kochi.to/jt10/dist/machines/jt10/engine.js';
import { JB01Engine } from 'https://kochi.to/jb01/dist/machines/jb01/engine.js';
```

**NEVER use relative paths** like `/jt10/...` — those resolve to `daskollektiv.rip/jt10/...` which doesn't exist.

CORS is already configured in two places (you should not need to change these, but know they exist):
- `web/middleware.ts` — runtime CORS headers for `daskollektiv.rip` origin on `/jt10/`, `/jb01/`, `/jt90/`, `/jb202/` paths
- `web/next.config.js` — static CORS headers for the same paths

If a new engine path is added (e.g., `/jt30/`), it must be added to both files.

## Deployment

Push to `main` triggers the GitHub Action (`.github/workflows/sync-daskollektiv.yml`) which deploys this entire folder to Vercel under the `daskollektiv.rip` domain.

## Aesthetic rules

- Background: `#050505`. White and grey only — NO color.
- Font: `'SF Mono', 'Fira Code', 'Courier New', monospace`
- Cursor: `crosshair`
- Visuals accumulate and fade slowly. Never hard-cut.
- Play button: 56px circle, very low opacity.
- Title: top-left, 7px, nearly invisible.
- Credits: bottom-center, 8px, nearly invisible.
- No decorative elements, no borders, no shadows, no emoji.
