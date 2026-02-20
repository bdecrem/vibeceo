# Compound Engineering Review: VibeCEO

**Date**: 2026-02-20
**Scope**: Full codebase review with focus on making agent-assisted development more compounding

---

## Executive Summary

VibeCEO is genuinely closer to compound engineering than most monorepos. The single-repo approach, shared infrastructure (storage manager, scheduler, subscriptions), auto-dispatching commands, and detailed CLAUDE.md are real strengths. But there are three systemic problems that undermine the compounding effect:

1. **Massive template duplication** — 43 arcade games × 4 boilerplate files each = ~170 files that are copy-paste variants of templates. This is the #1 contributor to slow builds and OG breakage.
2. **The middleware is an accretion layer** — 774 lines of accumulated "SPECIFIC FIX" patches with the same route bypasses duplicated 3 times across domain handlers.
3. **No feedback loops** — Zero tests, no CI validation, no mistake tracking. Agents can't learn from errors because errors aren't recorded anywhere agents can read.

The proposals below are ordered by impact-to-effort ratio.

---

## Problem 1: Pixelpit Template Duplication (Highest Impact)

### What's happening

Every arcade game has 3-4 nearly identical boilerplate files:

| File | Count | What varies |
|------|-------|-------------|
| `arcade/*/share/[score]/page.tsx` | 33 | One string: the game slug in the redirect URL |
| `arcade/*/share/[score]/layout.tsx` | 33 | One string: the game name in metadata |
| `arcade/*/opengraph-image.tsx` | 37 | Game name, accent color, decorative elements |
| `arcade/*/share/[score]/opengraph-image.tsx` | 33 | Game name, accent color |

That's **~136 files** where only 1-3 values change. When you add a new game, you copy all of them. When the pattern needs updating (OG image format, share redirect logic), you'd need to update 33+ files.

### Why it matters

- **Build time**: Next.js compiles each of these as separate route segments. 478 TSX files in `web/app/`, and 38% are arcade boilerplate. This directly causes the 15-minute builds.
- **OG breakage**: When the OG pattern changes, some games get updated and others don't. The files drift apart silently.
- **Agent overhead**: Every new game requires Claude to copy-paste 4 files and edit strings. That's busy work, not compound work.

### Proposed fix: Dynamic route segments

Replace the per-game boilerplate with Next.js dynamic routes:

```
web/app/pixelpit/arcade/[game]/
├── page.tsx                          # Dynamic: loads game by slug
├── opengraph-image.tsx               # Dynamic: renders OG from game config
└── share/[score]/
    ├── page.tsx                      # Generic redirect (reads [game] param)
    ├── layout.tsx                    # Generic metadata (reads [game] param)
    └── opengraph-image.tsx           # Generic score OG (reads [game] param)
```

Plus a game registry:

```typescript
// web/lib/pixelpit/game-registry.ts
export const GAMES: Record<string, GameConfig> = {
  sift: {
    name: 'SIFT',
    subtitle: 'DRAG TO ROTATE · LET MERCURY FALL',
    accentColor: '#a3e635',
    secondaryColor: '#22d3ee',
    challengeText: 'CAN YOU GO DEEPER?',
  },
  clump: {
    name: 'CLUMP',
    subtitle: 'TAP TO GROW · AVOID THE EDGES',
    accentColor: '#34d399',
    secondaryColor: '#818cf8',
    challengeText: 'CAN YOU GROW BIGGER?',
  },
  // ... 41 more entries
};
```

**Impact**: Eliminates ~130 files. The OG image template exists once. New games require zero boilerplate — just add to the registry and create the game's `page.tsx`. OG images can never drift because there's one source of truth.

**Build impact**: ~130 fewer route segments for Next.js to compile. This alone could cut build time significantly.

**Note**: The individual game `page.tsx` files (the actual game logic) stay as-is — those are unique per game and shouldn't be collapsed. They just move into the dynamic route or get loaded dynamically.

---

## Problem 2: Middleware Accretion (High Impact)

### What's happening

`web/middleware.ts` is 774 lines with three systemic issues:

**A. Route bypasses duplicated 3x.** The synth routes (`/909`, `/303`, `/101`, `/90s`, `/jb200`, `/jb202`, `/jb01`, `/jt10`, `/jt30`, `/jt90`, `/mixer`, `/mave`) appear in:
- Lines 66-141 (kochi.to domain handler)
- Lines 317-387 (intheamber.com domain handler)
- Lines 550-632 (default "SPECIFIC FIX" section)

That's the same 12 routes × 3 locations = 36 if-blocks doing the same thing.

**B. Domain handlers are copy-paste.** Every domain (token-tank, kochi, ctrlshift, b52s, rivalalert, intheamber, kochitolabs, pixelpit, shipshot, mutabl) has the same structure:
1. Check for static file patterns → `NextResponse.next()`
2. Handle root path → rewrite to app folder
3. Handle subpaths → pass through or rewrite

Only the target app folder changes. The 10 domains produce ~500 lines of near-identical code.

**C. "SPECIFIC FIX" comments tell a story.** Lines 526-638 are all `// SPECIFIC FIX: Bypass X` — patches added one at a time when things broke, rather than fixing the root cause.

### Proposed fix: Data-driven middleware

```typescript
// web/middleware.ts — proposed (~80 lines instead of 774)

const DOMAIN_APPS: Record<string, { app: string; bypasses?: string[] }> = {
  'tokentank.io':    { app: 'token-tank' },
  'kochi.to':        { app: 'kochi', bypasses: ['/amber', '/shipshot', '/mutabl', '/links', '/l'] },
  'ctrlshift.so':    { app: 'csx' },
  'b52s.me':         { app: 'b52s' },
  'rivalalert.ai':   { app: 'rivalalert' },
  'intheamber.com':  { app: 'amber' },
  'kochitolabs.com': { app: 'kochitolabs' },
  'pixelpit.gg':     { app: 'pixelpit' },
  'shipshot.io':     { app: 'shipshot' },
  'mutabl.co':       { app: 'mutabl' },
};

// Routes that should NEVER be rewritten, regardless of domain
const GLOBAL_BYPASSES = [
  '/api/', '/_next/', '/images/', '/favicon',
  '/909', '/303', '/101', '/90s', '/mixer', '/mave',
  '/jb200', '/jb202', '/jb01', '/jt10', '/jt30', '/jt90',
  '/synthmachine', '/music-player', '/report-viewer',
  '/voice-chat', '/simple-voice', '/cc/',
  '/token-tank', '/login', '/register', '/dashboard',
  // ... all the global routes
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // Static assets and global bypasses — one check, not 36
  if (pathname.includes('.') || GLOBAL_BYPASSES.some(b => pathname.startsWith(b))) {
    return NextResponse.next();
  }

  // Find matching domain
  const domain = Object.keys(DOMAIN_APPS).find(d => host.includes(d.replace('www.', '')));
  if (!domain) return NextResponse.next(); // default host, no rewrite

  const { app, bypasses = [] } = DOMAIN_APPS[domain];

  // Domain-specific bypasses
  if (bypasses.some(b => pathname.startsWith(b))) {
    return NextResponse.next();
  }

  // Already under the app prefix — don't double-rewrite
  if (pathname.startsWith(`/${app}`)) {
    return NextResponse.next();
  }

  // Root → app, everything else → /app/*
  const target = pathname === '/' ? `/${app}` : `/${app}${pathname}`;
  return NextResponse.rewrite(new URL(target, request.url));
}
```

**Impact**: 774 → ~80 lines. Adding a new domain or route bypass is one line in a config object, not copy-pasting 50 lines of if-blocks. The "SPECIFIC FIX" pattern disappears because bypasses are data, not code. OG and routing bugs caused by missing bypasses become much less likely.

**Risk**: The WTAF/webtoys domain handler (lines 695-757) has unique logic that needs to stay custom. Keep it as a special case inside the function.

---

## Problem 3: No Feedback Loops (Highest Leverage for Compound Engineering)

### What's happening

The codebase has zero tests, zero CI checks, and no mechanism for agents to learn from past mistakes. The CLAUDE.md is excellent — comprehensive, well-organized, clearly written. But it's static. When something breaks, you fix it, maybe update CLAUDE.md... but the same class of mistake can happen again because there's no automated check.

### 3a: MISTAKES.md — Agent-readable error memory

Create a living document that agents read before making changes:

```markdown
# MISTAKES.md — Things that have broken before

## Middleware route bypass forgotten
**When**: Every time a new page/app is added to kochi.to domain
**Symptom**: Page loads the Kochi landing page instead of the actual app
**Fix**: Add pathname bypass to middleware.ts
**Prevention**: After creating any new web/app/ directory, check if it needs
a middleware bypass. If the domain is kochi.to (the default), it definitely does.
**Automated check**: Run `node scripts/check-middleware-routes.js` after adding pages.

## OG image uses wrong params API
**When**: Next.js 14+ changed how dynamic route params work in OG images
**Symptom**: OG images show "undefined" or crash on share
**Fix**: Use `{ params }: { params: Promise<{ slug: string }> }` and await params
**Prevention**: Always test OG images with `curl -I` after deploy.

## SMS URL splitting
**When**: URL is the last thing in an SMS message
**Symptom**: iMessage/Twilio splits the URL into a separate message bubble
**Fix**: Always add text after URLs: `kochi.to/link — description`
**Prevention**: Auditor checks for this pattern.
```

**Why this matters**: CLAUDE.md tells agents what TO do. MISTAKES.md tells agents what NOT to do and WHY. The "why" is the compound part — an agent that reads "this broke before because X" makes better decisions than one that just reads "follow pattern Y." Each session adds to collective memory.

### 3b: Validation scripts that agents run automatically

Create lightweight scripts that catch the most common errors:

```bash
# scripts/check-middleware-routes.js
# Scans web/app/ for directories and checks each has a middleware bypass

# scripts/check-og-images.js
# Verifies all opengraph-image.tsx files export the required fields
# and use the correct params API

# scripts/validate-architecture.cjs (already exists!)
# Add: check that no new files duplicate existing templates
```

Add these to CLAUDE.md as a post-change checklist:
```markdown
## After Making Web Changes
Run: `node scripts/check-middleware-routes.js`
Run: `node scripts/check-og-images.js`
```

### 3c: Pre-push CI (lightweight)

You don't need a full CI pipeline. A single GitHub Action that runs on PRs:

```yaml
# .github/workflows/validate.yml
name: Validate
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: node scripts/check-middleware-routes.js
      - run: node scripts/check-og-images.js
      - run: node sms-bot/scripts/validate-architecture.cjs
      - run: cd web && npx next build  # catch build errors before deploy
```

**Impact**: The build check alone would catch most breakage before deploy. The validation scripts catch the specific recurring issues (middleware, OG). Over time, every class of mistake gets a check, and the checks compound.

---

## Problem 4: Build Performance

### What's happening

Web deploys take ~15 minutes. The `web/app/` directory has 478 TSX files, 77 top-level app directories, and Next.js needs to compile every route segment.

### Contributing factors

1. **Arcade boilerplate** (~130 files of templates) — addressed by Problem 1 fix
2. **77 app directories** — many are inactive (kochi-test, kochi-test2, kochi-test3, featured-old, trending-old, wtaf-landing-old)
3. **No build caching between deploys** — Railway rebuilds from scratch each time

### Proposed fixes

**A. Clean up dead apps.** Move inactive/test apps to an archive:
```
web/app/_archive/          # Next.js ignores _ prefixed directories
├── kochi-test/
├── kochi-test2/
├── kochi-test3/
├── featured-old/
├── trending-old/
├── wtaf-landing-old/
├── creations2/
└── ...
```

**B. Consider Turborepo.** VibeCEO has two build targets (`sms-bot` and `web`) that are independent. Turborepo would cache builds and only rebuild what changed. This is a bigger lift but would help long-term.

**C. Investigate Railway build caching.** Railway supports Docker layer caching and Nixpacks caching. Enabling `.next/cache` persistence between deploys could cut incremental builds significantly.

---

## Problem 5: Domain Configuration Scattered

### What's happening

Adding a new domain (like `mutabl.co`) requires changes in multiple places:
1. `web/middleware.ts` — add domain detection + rewrite rules (~30 lines)
2. Railway settings — configure the domain
3. DNS — point the domain
4. Often need to add bypasses for the new app under kochi.to domain too

Steps 1 and 4 are the ones that break, and they break because the logic is in code rather than configuration.

### Already addressed

The data-driven middleware (Problem 2 fix) solves this — adding a domain becomes one line in a config object. But it's worth calling out as a separate pattern: **configuration should be data, not code**.

---

## What's Already Working Well

These are genuine strengths — things to preserve and extend:

1. **CLAUDE.md is excellent.** Comprehensive, well-structured, with clear rules. Most repos don't have anything close to this. The "two strikes rule" alone prevents a class of agent spiraling.

2. **Auto-dispatching commands.** Adding a command is one file in `commands/`. No router changes. This is real compound engineering.

3. **Shared agent infrastructure.** Storage manager, scheduler, subscriptions, report storage — agents share these rather than each rolling their own. This means the infrastructure improves for everyone when any piece improves.

4. **The auditor subagent.** Having `/auditor <path>` is a good start at automated quality checks. The gap is that it's manual — you have to remember to invoke it.

5. **Documentation directory.** `sms-bot/documentation/` is well-organized and actually useful. Agents read it and it shapes their output.

6. **Incubator isolation.** The `incubator/` boundary is well-enforced with rules and a validation script. This is the compound engineering pattern — isolated experiments that can't break production.

---

## Implementation Priority

| # | Change | Effort | Impact | Compounds? |
|---|--------|--------|--------|------------|
| 1 | MISTAKES.md + add to CLAUDE.md read list | 1 hour | High | Yes — grows with every session |
| 2 | Data-driven middleware rewrite | 2-3 hours | High | Yes — new domains/routes are config |
| 3 | Arcade game registry + dynamic routes | 4-6 hours | Very High | Yes — new games need no boilerplate |
| 4 | Archive dead web apps | 30 min | Medium | No — one-time cleanup |
| 5 | Validation scripts (middleware, OG) | 2 hours | High | Yes — catches errors before deploy |
| 6 | CI workflow for PRs | 1 hour | Medium | Yes — prevents deploy breakage |
| 7 | Railway build caching investigation | 1-2 hours | Medium | No — one-time config |

### Recommended order: 1 → 2 → 4 → 3 → 5 → 6 → 7

Start with MISTAKES.md because it's immediate and sets the pattern. Then the middleware rewrite because it's the most irritating recurring problem. Archive dead apps as a quick win. Then tackle the arcade template consolidation, which is the biggest structural change but also the biggest payoff.

---

## What "Compound Engineering" Means Here

The difference between "a big codebase" and "compound engineering" is whether each change makes the next change easier or harder.

**Currently making things harder:**
- Every new game = copy 4 boilerplate files (linear cost)
- Every new domain = copy 30 lines of middleware (linear cost)
- Mistakes have no memory (constant cost — same mistakes repeat)

**What would make things compound:**
- Every new game = one entry in a registry (zero marginal cost)
- Every new domain = one line in a config (zero marginal cost)
- Every mistake = one entry in MISTAKES.md + one validation script (decreasing cost over time)

The codebase is already doing this well for SMS commands and agent infrastructure. The proposals above extend that same pattern to the web layer.
