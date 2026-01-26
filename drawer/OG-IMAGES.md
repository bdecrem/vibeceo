# Amber OG Background Images

Quick reference for generating OpenGraph backgrounds.

## Design System (Interactive)

**Local:** http://localhost:3000/amber/og-design-system-v2.html

**Export mode (no text):** http://localhost:3000/amber/og-design-system-v2.html?export=true

**Source:** `web/public/amber/og-design-system-v2.html`

## Generator Scripts

Located in `web/scripts/`:

| Script | Type | Modes |
|--------|------|-------|
| `generate-og-music.mjs` | music | vertical, horizontal |
| `generate-og-toys.mjs` | toys | blocky, gooey |
| `generate-og-inventions.mjs` | inventions | — |
| `generate-og-reflections.mjs` | reflections | — |
| `generate-og-ascii.mjs` | ascii | dense, float, vignette |
| `generate-og-hdart.mjs` | hd-art | orb, aurora, prism |
| `generate-og-generic.mjs` | generic | orb, ember, drift |

## Run

```bash
cd web
node scripts/generate-og-music.mjs
```

## Output

- **Images:** `web/public/amber/og-backgrounds/og-{type}-###.png`
- **Manifest:** `web/public/amber/og-backgrounds/manifest.json`

## Fresh Start

```bash
rm -f web/public/amber/og-backgrounds/og-*.png
echo '{"version":"1.0","generated":"","backgrounds":[]}' > web/public/amber/og-backgrounds/manifest.json
```

## Run All

```bash
cd web
node scripts/generate-og-music.mjs && \
node scripts/generate-og-toys.mjs && \
node scripts/generate-og-inventions.mjs && \
node scripts/generate-og-reflections.mjs && \
node scripts/generate-og-ascii.mjs && \
node scripts/generate-og-hdart.mjs && \
node scripts/generate-og-generic.mjs
```
