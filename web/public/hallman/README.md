# Hallman

Browser-based drum machine tracks using JB01/JT90 engines.

## Pages

| File | URL | Description |
|------|-----|-------------|
| `index.html` | `kochi.to/hallman/` | **Mills Hats v1** — Minimal player with step dots, section labels. 133 BPM, JB01 engine. |
| `viz.html` | `kochi.to/hallman/viz.html` | **Closed System** — Full-screen immersive visualizer for the Mills Hats track. Hat decay/tone automation drives color, geometry, and intensity. |
| `tribal-aggressive.html` | `kochi.to/hallman/tribal-aggressive.html` | Tribal aggressive variant. |
| `page.tsx` | `kochi.to/hallman` | Next.js route page. |

## Technical Notes

- **Engine imports:** Always use absolute paths from root: `/jb01/dist/machines/jb01/engine.js`
- **File sync:** Source lives in `web/app/hallman/`. Must be copied to `web/public/hallman/` after edits (Next.js serves from public/).
- **Middleware:** `/hallman` is bypassed in `web/middleware.ts` — no rewrites needed.
- **OG images:** Static PNG files in `web/public/hallman/` (e.g. `viz-og.png`). Referenced in `<meta>` tags.

## Color Palette (Visualizer)

Black → deep crimson → hot amber → white-gold. No blue, no green. Tone automation drives color temperature.
