# Compound Engineering Implementation Plan

**Branch**: `claude/review-compound-engineering-VQdct`
**Date**: 2026-02-20

This plan implements all 7 proposals from COMPOUND-ENGINEERING-REVIEW.md.
Each step is one commit. Steps are ordered to minimize risk and maximize
compounding — earlier steps make later steps easier.

Per user feedback: middleware rewrite and arcade consolidation are
flagged as separate-PR candidates if merging to main. On this branch
they're sequential commits but clearly separated.

---

## Commit 1: MISTAKES.md + CLAUDE.md update

**Files created/modified:**
- `MISTAKES.md` (new)
- `CLAUDE.md` (add MISTAKES.md to essential docs table + post-change checklist)

**MISTAKES.md contents** — seed with known recurring issues:

1. **Middleware route bypass forgotten**
   - When: every new web/app/ page on kochi.to domain
   - Symptom: page loads Kochi landing instead of the app
   - Fix: add pathname bypass to middleware.ts
   - Prevention: run `node scripts/check-middleware-routes.js`

2. **OG image params API mismatch**
   - When: Next.js version changes, or copy-paste from old game
   - Symptom: OG shows "undefined" or blank
   - Fix: use correct params typing for Next.js version
   - Prevention: run `node scripts/check-og-images.js`

3. **SMS URL splitting**
   - When: URL is last item in SMS
   - Symptom: iMessage/Twilio splits URL into separate bubble
   - Fix: always add text after URLs
   - Prevention: auditor checks for this

4. **OG image drift across arcade games**
   - When: OG template updated in one game but not others
   - Symptom: inconsistent share cards, some games broken
   - Fix: after arcade consolidation, single template eliminates drift
   - Prevention: game registry is single source of truth

5. **Cache bust comment in middleware**
   - When: middleware changes don't take effect after deploy
   - Symptom: old routing logic still active
   - Fix: change the cache bust timestamp at end of middleware.ts
   - Note: may be a Railway/CDN caching artifact

**CLAUDE.md changes:**
- Add row to Essential Documentation table: `MISTAKES.md | Before making changes — known failure patterns`
- Add new section "After Making Web Changes" with checklist

**Verification**: read MISTAKES.md, confirm CLAUDE.md links to it.

---

## Commit 2: Data-driven middleware rewrite

**Files modified:**
- `web/middleware.ts` (rewrite from 774 → ~120 lines)

**Architecture:**

```
1. DOMAIN_APPS config object — maps host patterns to app folders
2. GLOBAL_BYPASSES array — routes that never get rewritten
3. Per-domain custom handlers for non-standard behavior
4. Generic handler for standard domain → app rewriting
```

**Edge cases to preserve (from middleware analysis):**

| Domain | Special behavior | How to handle |
|--------|-----------------|---------------|
| kochi.to | 24 bypass routes | `bypasses` array in config |
| ctrlshift.so | `/rs` → `/csx?next=rs`, `/lf` → `/csx/entry-lf`, `/rs/*` → `/csx/rs/*` | Custom handler function |
| intheamber.com | Rewrites static files too (no `.includes('.')` check) | `rewriteStaticFiles: true` flag |
| pixelpit.gg | `/pp/*` → `/pixelpit/arcade/*` | Custom handler function |
| token-tank | `host.includes()` not exact match | Different matching strategy |
| wtaf/webtoys | Trailing slash removal, dev env routing, 6 host variants | Keep as dedicated handler |

**Implementation approach:**

```typescript
// Domain config type
interface DomainConfig {
  app: string;
  match: 'exact' | 'includes';     // how to match the host
  bypasses?: string[];               // domain-specific route bypasses
  rewriteStaticFiles?: boolean;      // intheamber.com needs this
  customHandler?: (pathname: string, search: string, request: NextRequest) => NextResponse | null;
}

// Standard domains — pure config, zero custom code
const STANDARD_DOMAINS: Record<string, DomainConfig> = {
  'tokentank.io':    { app: 'token-tank', match: 'includes' },
  'b52s.me':         { app: 'b52s', match: 'exact' },
  'rivalalert.ai':   { app: 'rivalalert', match: 'exact' },
  'kochitolabs.com': { app: 'kochitolabs', match: 'exact' },
  'shipshot.io':     { app: 'shipshot', match: 'exact' },
  'mutabl.co':       { app: 'mutabl', match: 'exact' },
};

// Domains with custom behavior — config + handler
// kochi.to, ctrlshift.so, intheamber.com, pixelpit.gg, wtaf.me
```

**Global bypasses** — one flat array covering all synth routes, app routes,
Next.js internals, and auth routes. Replace 36 if-blocks.

**Verification steps:**
1. Read final middleware, confirm every domain from old version is present
2. Grep for every route in old bypass lists, confirm present in new config
3. Verify ctrlshift.so special rewrites preserved
4. Verify intheamber.com static file rewriting preserved
5. Verify pixelpit.gg /pp/* shorthand preserved
6. Verify WTAF trailing slash + dev env logic preserved
7. Build web to confirm no TypeScript errors: `cd web && npx next build`

---

## Commit 3: Archive dead web apps

**Files moved:**
- `web/app/kochi-test/` → `web/app/_archive/kochi-test/`
- `web/app/kochi-test2/` → `web/app/_archive/kochi-test2/`
- `web/app/kochi-test3/` → `web/app/_archive/kochi-test3/`
- `web/app/featured-old/` → `web/app/_archive/featured-old/`
- `web/app/trending-old/` → `web/app/_archive/trending-old/`
- `web/app/wtaf-landing-old/` → `web/app/_archive/wtaf-landing-old/`
- `web/app/creations2/` → `web/app/_archive/creations2/`

**Pre-move checks** (run before archiving each):
- Confirm no imports from other active code
- Confirm not referenced in middleware.ts
- Confirm no recent commits (>2 months old)

**Decision rule**: Only archive directories that have ALL of:
- No references in middleware.ts
- No imports from active code
- Last commit >2 months ago
- Name suggests test/old/deprecated (`-old`, `-test`, `test-`)

If any directory is ambiguous after running the dead apps agent,
skip it rather than risk breaking something.

**Verification**: `cd web && npx next build` succeeds.

---

## Commit 4: Arcade game registry + dynamic routes

**THIS IS THE BIGGEST CHANGE. Budget 4-6 hours. Separate PR candidate.**

### Step 4a: Create game registry

**File created:**
- `web/lib/pixelpit/game-registry.ts`

```typescript
export interface GameConfig {
  name: string;           // Display name: "SIFT"
  slug: string;           // URL slug: "sift"
  subtitle: string;       // OG tagline: "DRAG TO ROTATE · LET MERCURY FALL"
  accentColor: string;    // Primary: "#a3e635"
  secondaryColor: string; // Secondary: "#22d3ee"
  challengeText: string;  // Score OG: "CAN YOU GO DEEPER?"
  icon?: string;          // Hub page emoji: "🔬"
  cornerColor?: string;   // Score OG corner accent (defaults to accentColor)
}
```

**How to populate**: Read each game's opengraph-image.tsx and extract:
- `alt` export → name
- title text → name
- subtitle text → subtitle
- color values → accentColor, secondaryColor
- Score OG challenge text → challengeText
- Corner accent color (some use different color for score OG corners)

All 43 games get an entry. Use a Task agent to extract values from
all opengraph-image.tsx files in parallel.

### Step 4b: Create dynamic route files

**Files created:**
- `web/app/pixelpit/arcade/[game]/share/[score]/page.tsx` — generic redirect
- `web/app/pixelpit/arcade/[game]/share/[score]/layout.tsx` — generic metadata
- `web/app/pixelpit/arcade/[game]/share/[score]/opengraph-image.tsx` — generic score OG
- `web/app/pixelpit/arcade/[game]/opengraph-image.tsx` — generic game OG

The `[game]/page.tsx` is NOT created as a dynamic route — each game keeps
its own page.tsx because game logic is unique. Instead, games stay as
static directories but their boilerplate files are deleted.

**Wait — critical architecture decision:**

Next.js routing precedence: static routes take priority over dynamic `[game]` routes.
So the structure is:

```
web/app/pixelpit/arcade/
├── [game]/                           # Dynamic catch-all for boilerplate
│   ├── opengraph-image.tsx           # Single OG template
│   └── share/[score]/
│       ├── page.tsx                  # Single share redirect
│       ├── layout.tsx                # Single share metadata
│       └── opengraph-image.tsx       # Single score OG template
├── sift/
│   └── page.tsx                      # Game logic only (no OG, no share/)
├── clump/
│   └── page.tsx                      # Game logic only
├── drop/
│   ├── page.tsx                      # Game logic
│   └── Game3D.tsx                    # Extra file (keep)
└── ... (40 more games, each just page.tsx + any extras)
```

**KEY**: `generateStaticParams()` in the dynamic route must return all
game slugs so OG images are pre-rendered at build time. Without this,
OG images would be generated on-demand and could be slow/fail:

```typescript
// In [game]/opengraph-image.tsx and [game]/share/[score]/opengraph-image.tsx
import { GAMES } from '@/lib/pixelpit/game-registry';

export function generateStaticParams() {
  return Object.keys(GAMES).map(game => ({ game }));
}
```

For score OG: scores are dynamic so we can't pre-generate all of them,
but we can set `export const dynamic = 'force-static'` or similar.
Need to check what the current score OG pages do — they're edge runtime
so they already generate on-demand. Keep that behavior.

### Step 4c: Delete boilerplate from each game

For each of the 43 games, delete:
- `arcade/<game>/opengraph-image.tsx` (replaced by `[game]/opengraph-image.tsx`)
- `arcade/<game>/share/` directory entirely (replaced by `[game]/share/`)

Keep:
- `arcade/<game>/page.tsx` (unique game logic)
- `arcade/<game>/Game3D.tsx` (drop's extra file)
- `arcade/<game>/test.mjs` (tapper's test)

### Step 4d: Update pixelpit hub page

Modify `web/app/pixelpit/page.tsx` to import from game registry
instead of hardcoding the games array (lines 20-39).

### Verification — CRITICAL

1. `cd web && npx next build` — must succeed
2. Check that `/pixelpit/arcade/sift` still loads the game (static page.tsx)
3. Check that `/pixelpit/arcade/sift/share/500` renders the share redirect
4. Check that the OG image URL resolves: `curl -I localhost:3000/pixelpit/arcade/sift/opengraph-image`
5. Verify `generateStaticParams` returns all 43 game slugs
6. Verify the sync-pixelpit GitHub Action still works —
   it copies `web/app/pixelpit/**` so the `[game]` directory
   will be included. Check that the Vercel build also handles
   the dynamic route correctly.

---

## Commit 5: Validation scripts

**Files created:**
- `scripts/check-middleware-routes.js`
- `scripts/check-og-images.js`

### check-middleware-routes.js

Scans `web/app/` for top-level directories and verifies each has a
corresponding bypass in `web/middleware.ts`.

Logic:
1. Read all top-level dirs in `web/app/` (excluding `_archive`, `api`, `layout.tsx`, etc.)
2. Read `web/middleware.ts`
3. For each dir, check if its name appears in either:
   - GLOBAL_BYPASSES array
   - A domain config's bypasses array
   - A domain config's `app` field (means it's the app itself)
4. Report any directories NOT covered by any bypass/config
5. These are potential middleware bugs — new pages that would get
   caught by a domain rewrite

**Exit code**: 0 if all covered, 1 if gaps found.

### check-og-images.js

Scans all `opengraph-image.tsx` files and checks:
1. Exports `runtime`, `alt`, `size`, `contentType` (required by Next.js)
2. If in a `[score]` directory, function signature includes `params`
3. Uses correct params API for the Next.js version
4. Reports any files missing required exports

**Exit code**: 0 if all pass, 1 if issues found.

**CLAUDE.md update**: Add to "After Making Web Changes" section:
```
Run: `node scripts/check-middleware-routes.js`
Run: `node scripts/check-og-images.js`
```

---

## Commit 6: CI validation workflow

**File created:**
- `.github/workflows/validate.yml`

```yaml
name: Validate
on:
  pull_request:
    paths:
      - 'web/**'
      - 'sms-bot/**'
      - 'scripts/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Architecture checks
        run: node sms-bot/scripts/validate-architecture.cjs

      - name: Middleware route checks
        run: node scripts/check-middleware-routes.js

      - name: OG image checks
        run: node scripts/check-og-images.js

  build-web:
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.changed_files_url, 'web/')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd web && npm ci && npx next build
```

**Per user feedback**: web build only runs when `web/` files change,
not on every PR. The validation scripts are fast (~1s) so they run always.

**Note**: The `build-web` job condition may need adjusting —
`contains(changed_files_url, 'web/')` won't actually work.
Use `paths` filter instead:

```yaml
  build-web:
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd web && npm ci && npx next build
```

With the top-level `paths` filter covering `web/**`, this job only
triggers on web changes anyway.

---

## Commit 7: Railway build caching investigation + config

**This is research + config, not code.**

**Investigation steps:**
1. Check if Railway uses Nixpacks or Dockerfile for this project
   - Look for `railway.toml`, `Procfile`, `Dockerfile`, `nixpacks.toml`
2. Check Railway docs for build caching options
3. If Nixpacks: check if `.next/cache` can be persisted via `NIXPACKS_CACHE_DIRS`
4. If Dockerfile: add cache mount for `.next/cache`

**Files potentially created/modified:**
- `railway.toml` or `nixpacks.toml` — add cache config
- `COMPOUND-ENGINEERING-REVIEW.md` — update with findings

**If Railway doesn't support .next/cache persistence:**
- Document this limitation
- Note alternative: move web to Vercel (which has built-in Next.js caching)
- Or: investigate `output: 'standalone'` in next.config.js for smaller builds

---

## Execution Strategy

### Anti-drift measures

1. **TodoWrite** — update after each commit with remaining items
2. **Task agents** — use for parallelizable work within each commit:
   - Commit 4: Task agent to extract OG config from all 43 games
   - Commit 5: Task agents to write the two scripts in parallel
3. **Verify after each commit** — every commit has explicit verification steps
4. **Don't batch** — commit after each item, don't accumulate changes

### Risk ordering

| Commit | Risk | Rollback |
|--------|------|----------|
| 1. MISTAKES.md | Zero — new file only | Delete file |
| 2. Middleware | Medium — routing could break | git revert |
| 3. Archive | Low — `_archive` prefix, not deleted | Move back |
| 4. Arcade | High — OG images, share URLs | git revert, most complex |
| 5. Scripts | Zero — new files only | Delete files |
| 6. CI | Zero — new workflow only | Delete file |
| 7. Caching | Low — config only | Revert config |

### Time budget

| Commit | Estimated |
|--------|-----------|
| 1. MISTAKES.md | 15 min |
| 2. Middleware | 45-60 min |
| 3. Archive | 15 min |
| 4. Arcade | 90-120 min |
| 5. Scripts | 30 min |
| 6. CI | 10 min |
| 7. Caching | 20 min |
| **Total** | **~4-5 hours** |
