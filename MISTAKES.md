# MISTAKES.md — Things that have broken before

Read this before making changes. Each entry is a class of mistake that has
happened at least once. The "Prevention" field tells you how to avoid repeating it.

---

## Middleware route bypass forgotten

**When**: Every time a new page/app is added to kochi.to domain
**Symptom**: Page loads the Kochi landing page instead of the actual app
**Fix**: Add pathname bypass to middleware.ts (either in domain config bypasses or global bypasses)
**Prevention**: After creating any new `web/app/` directory, run `node scripts/check-middleware-routes.js` to verify it's covered. If the domain is kochi.to (the default), it definitely needs a bypass.
**Automated check**: `node scripts/check-middleware-routes.js`

---

## OG image params API mismatch

**When**: Next.js version changes how dynamic route params work in OG images, or copy-paste from an old game to a new one
**Symptom**: OG images show "undefined" for score/slug, or crash entirely on share
**Fix**: Check the Next.js version's expected params typing. In Next.js 15+, params may be a Promise that needs awaiting.
**Prevention**: Run `node scripts/check-og-images.js`. Test OG images with `curl -I <url>/opengraph-image` after deploy.
**Automated check**: `node scripts/check-og-images.js`

---

## OG image drift across arcade games

**When**: OG template updated for one game but not the others (e.g., fixing corner accent colors, changing branding text)
**Symptom**: Inconsistent share cards — some games have updated OG, others still show old version
**Root cause**: Each game had its own copy of the OG template (~80 files total). Updating all of them was easy to forget.
**Fix**: After arcade consolidation (Commit 4), a single `[game]/opengraph-image.tsx` template eliminates drift entirely.
**Prevention**: Game config lives in `web/lib/pixelpit/game-registry.ts`. OG template is one file. Drift is structurally impossible.

---

## SMS URL splitting

**When**: URL is the last thing in an SMS message body
**Symptom**: iMessage and/or Twilio split the URL into a separate message bubble, breaking the user experience
**Fix**: Always add text AFTER URLs in SMS messages:
```typescript
// BAD
`View all: kochi.to/cs`

// GOOD
`View all: kochi.to/cs — full feed`
```
**Prevention**: The `/auditor` subagent checks for this pattern. See `sms-bot/documentation/SMS-MESSAGE-FORMATTING.md`.

---

## Cache bust comment in middleware

**When**: Middleware changes don't take effect after deploy
**Symptom**: Old routing logic still active despite new code being pushed
**Fix**: Add or change the `// Cache bust <timestamp>` comment at end of `middleware.ts`. This forces Railway/CDN to treat it as a new file.
**Note**: This may be a Railway or CDN edge caching artifact. The permanent fix is to ensure the deploy pipeline invalidates middleware cache.

---

## Incubator code leaking into main codebase

**When**: An experiment in `incubator/` needs something from `sms-bot/` or vice versa
**Symptom**: Build may work locally but violates isolation rules. Changes to shared code can break experiments or vice versa.
**Fix**: Keep incubator strictly isolated. If shared code is needed, copy it into the incubator directory.
**Prevention**: Run `node sms-bot/scripts/validate-architecture.cjs` — it catches cross-boundary imports.
**Automated check**: `node sms-bot/scripts/validate-architecture.cjs`

---

## Web app calling Supabase directly from frontend

**When**: Building a new feature quickly and skipping the API route layer
**Symptom**: Supabase credentials exposed in client bundle, or CORS errors in production
**Fix**: All database access goes through `web/app/api/*/route.ts`. Frontend uses `fetch('/api/...')`.
**Prevention**: The `/auditor` subagent checks for direct Supabase imports in non-API code.

---

## Adding to this file

When you encounter a new class of mistake (not a one-off typo, but a
pattern that could recur), add an entry here with:

1. **When**: What triggers this class of mistake
2. **Symptom**: How you know it happened
3. **Fix**: How to fix it once it happens
4. **Prevention**: How to avoid it in the future
5. **Automated check**: Script or command that catches it (if one exists)

This file is read by agents before making changes. Each entry makes
future sessions smarter. That's compound engineering.
