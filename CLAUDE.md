# vibeceo — Claude Code Instructions

## Active Projects

| Project | What | Entry Points |
|---------|------|--------------|
| **Pixelpit** | Game studio — daily arcade games | `web/app/pixelpit/` |
| **Mutabl** | AI-customizable micro-apps (Notabl, Todoit, Contxt) | `web/app/mutabl/`, `web/app/api/mutabl/` |
| **Shipshot** | Product launch tool | `web/app/shipshot/` |
| **Jambot** | Music tools & synth engines | `jambot/`, `web/app/jb01/`, `web/app/jb200/` |
| **Amber** | AI sidekick (Twitter, email, creative) | `sms-bot/agents/amber-*/`, `web/app/amber/` |
| **Kochi.to** | SMS AI agent service | `sms-bot/src/index.ts`, `sms-bot/commands/` |

**Background/Inactive:** Token Tank (`incubator/`), CTRL SHIFT (`web/app/cs/`)

## Repository Structure

```
vibeceo/
├── web/               # Next.js website (Railway + Vercel for Pixelpit)
│   ├── app/           # Next.js app router pages
│   ├── public/        # Static HTML pages & assets
│   └── middleware.ts   # Domain & route handling (CRITICAL)
├── sms-bot/           # Kochi SMS bot + agents (TypeScript + Python)
│   ├── agents/        # AI agents
│   ├── commands/      # SMS command handlers
│   └── documentation/ # Detailed docs (READ THESE)
├── jambot/            # Music tools (Node.js)
└── incubator/         # Token Tank experiments (ISOLATED)
```

## Build & Deploy

- **Build website**: `cd web && npm run build`
- **Build SMS bot**: `cd sms-bot && npm run build`
- **Deployment**: Push to GitHub triggers auto-deploy
  - **Railway**: Deploys `sms-bot/` (port 3030), `web/`, and websocket server
  - **Vercel (Pixelpit only)**: `web/app/pixelpit/` copied via GitHub Action to separate repo
    - For Pixelpit/Vercel URL routing, use `vercel.json` rewrites (not `next.config.cjs`)
- **NEVER** start/stop/build services without user permission

**After code changes:**
- Inform user if rebuild/restart needed
- SMS bot changes → `cd sms-bot && npm run build` then restart listener
- **Jambot changes → ALWAYS run `node jambot/tests/run-tests.js` before committing. Fix any failures.**

## Web Pages & Routing Guide

### Two Ways to Add Web Pages

**Option A: Static HTML** (standalone pages, no React needed)
- Put `.html` files in `web/public/<folder>/`
- URL: `kochi.to/<folder>/filename.html`
- Import paths must be **absolute** from root: `/jb01/dist/...` NOT `../../public/jb01/...`

**Option B: Next.js React Pages** (full app features, SSR, API routes)
- Create `web/app/<folder>/page.tsx`
- URL: `kochi.to/<folder>`

### Middleware — REQUIRED for New Routes

Every new top-level route MUST be added to `web/middleware.ts` or it gets caught by the webtoys catch-all and rerouted. **Two places to update:**

1. **Inside the kochi.to domain handler** (~line 180 area) — add a bypass:
```typescript
if (pathname.startsWith('/yourapp')) {
  return NextResponse.next()
}
```

2. **In the general bypass list** (~line 470 area) — add to the `pathname.startsWith(...)` chain:
```typescript
pathname.startsWith('/yourapp') ||
```

**Miss either one → 404 or wrong content.**

### Domain Routing

| Domain | Root rewrites to | Notes |
|--------|-----------------|-------|
| `kochi.to` | `/kochi` | Most routes bypassed, others → `/kochi/*` |
| `pixelpit.gg` | `/pixelpit` | `/pp/*` → `/pixelpit/arcade/*` |
| `intheamber.com` | `/amber` | All paths get `/amber` prefix except synth routes |
| `shipshot.io` | `/shipshot` | |
| `mutabl.co` | `/mutabl` | |

### API Routes

- **API routes need `route.ts`** — Next.js API routes go in `app/api/*/route.ts`
- **Web apps NEVER call Supabase directly** — always go through API routes
- Frontend uses `fetch('/api/...')`, API routes handle Supabase server-side

## OpenGraph Images

Every page/game needs OG images for social sharing.

**File:** `opengraph-image.tsx` in your route folder.

```tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'YOUR TITLE';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{
        background: '#0a0a0a',
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 120, fontWeight: 700, color: '#ffffff' }}>TITLE</div>
        <div style={{ fontSize: 28, color: '#888888' }}>subtitle</div>
      </div>
    ),
    { ...size }
  );
}
```

### Score Share Routes (games)

```
arcade/[game]/share/[score]/
├── layout.tsx           # generateMetadata()
├── page.tsx             # Client redirect back to game
└── opengraph-image.tsx  # Dynamic score image
```

Use `createScoreShareImage()` from `@/app/pixelpit/components` for consistent styling.

### Satori CSS Limitations (causes silent 502s)

| Don't Use | Use Instead |
|---|---|
| `<>...</>` fragments | `<div>` wrapper |
| `radial-gradient()` | `linear-gradient` only |
| `rgba(r,g,b,a)` | Hex: `#rrggbbaa` |
| `transparent` | `#00000000` |
| `borderRadius: '50%'` | `borderRadius: 9999` |
| `filter`, `backdrop-filter` | Remove |
| `calc()`, CSS vars | Literal values |

Hex alpha: 50%=`80`, 25%=`40`, 15%=`26`, 0%=`00`

**Test:** Visit `https://domain/route/opengraph-image` directly.

### metadataBase (CRITICAL)

Layout MUST set this or OG URLs use wrong domain:
```tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://yourdomain.com'),
};
```

## Compound Engineering Principles

These are standing instructions for every session:

1. **Don't copy — consolidate.** If you're about to copy-paste a file, make it config-driven instead. The right number of places to update a template is one.
2. **Grow the validation scripts.** When you find a new class of thing that can silently break, write a check script for it. No category of mistake should happen twice.
3. **Update MISTAKES.md when you hit a wall.** If you spent real effort debugging something non-obvious, write it down before moving on. Future sessions read that file.
4. **Shrink the codebase.** Actively look for dead code, unused files, and stale directories. Line count should stay flat or go down as capabilities grow.
5. **Make CLAUDE.md the single source of truth.** When you discover something undocumented about the repo, add it here. If it's not in CLAUDE.md, it gets rediscovered from scratch every time.

## Critical Rules

### Problem Solving
- **Two strikes rule**: If an approach fails twice, STOP. Don't try a third variation.
  Summarize what was tried, why it failed, and propose 2-3 genuinely different alternatives.

### Security (Non-Negotiable)
- **NEVER** hardcode API keys, tokens, or secrets in code
- **ALWAYS** use `process.env.VARIABLE_NAME`
- **DO NOT** edit, copy, or expose `.env` files

### Code Practices
- **NEVER edit `dist/`, `build/`, or `.next/`** — compiled output
- **NEVER edit `.js` with corresponding `.ts`** — edit TypeScript source
- **Small focused files** — Split at ~200 lines
- **Explicit over clever** — Boring readable beats elegant obscure
- **3x before abstracting** — Don't extract helpers until you've duplicated 3 times
- **Minimize new packages** — Check existing deps first. Pin versions.
- **Fail fast, fail loud** — Throw early with context. Never swallow silently.

### Git Rules
- **Commits**: Auto-commit after completing features/fixes
- **Pushes**: ALWAYS ask user permission first
- **Never push** to main without explicit approval

### Dates & Days of the Week

LLMs are bad at day-of-week calculations. **NEVER guess.** Always verify:

```bash
date -j -f "%m/%d/%Y" "02/06/2026" "+%a %-m/%-d"
# Output: Fri 2/6
```

## Browser Testing with Playwright

**NEVER ask the user to open DevTools.** Use Playwright automation instead.

```typescript
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.screenshot({ path: 'debug.png', fullPage: true });
```

## Reference: SMS & Agent Docs

For SMS bot and agent work, read docs in `sms-bot/documentation/`:
- `AGENT-PIPELINE.md` — Creating/modifying agents
- `AMBER-SYSTEM.md` — Amber sidekick (email, Twitter, creative)
- `SMS-MESSAGE-FORMATTING.md` — SMS length limits, helpers
- `SYNTHMACHINE-GUIDE.md` — Synth libraries (909, 303, 101)
