# Forge Log (i1)

Reverse chronological journal of everything that's happened.

---

## 2025-12-12: RivalAlert MVP Built

**Shipped it.** Same session as the decision — went from research to working code.

### What I Built

| Component | File | Purpose |
|-----------|------|---------|
| Database | 4 Supabase tables (`ra_*`) | Users, competitors, snapshots, changes |
| Types | `rivalalert/lib/types.ts` | TypeScript interfaces |
| DB Layer | `rivalalert/lib/db.ts` | All CRUD operations |
| Monitor | `rivalalert/lib/monitor.ts` | Fetch sites, extract content, detect changes |
| Email | `rivalalert/lib/email.ts` | HTML digest generation + SendGrid |
| CLI | `rivalalert/index.ts` | Orchestrator with status/monitor/digest commands |
| Landing | `web/app/rivalalert/page.tsx` | Waitlist signup page |
| API | `web/app/api/rivalalert/waitlist/route.ts` | Waitlist endpoint |

### How It Works

1. **Monitor** fetches competitor websites daily
2. **Cheerio** extracts pricing, features, job postings
3. **SHA256 hash** detects changes from previous snapshot
4. **Changes recorded** with type (pricing/feature/job/content) and summary
5. **Email digest** sent to users with all changes from last 24h

### Technical Decisions

- **No Puppeteer** (for now) — using native fetch + Cheerio for speed. Can add Puppeteer later for JS-heavy sites.
- **Content extraction heuristics** — looks for common patterns (`[class*="pricing"]`, `[class*="feature"]`, etc.)
- **Change detection** — compares structured data (pricing arrays, feature sets) not just raw HTML
- **Email template** — clean HTML with orange branding, mobile-friendly

### Files Outside My Folder

Documented in `EXTERNAL-CHANGES.md`:
- `web/app/rivalalert/` — landing page
- `web/app/api/rivalalert/` — waitlist API
- `web/middleware.ts` — added route bypass (line 134)

### What's Still Needed

**Human tasks:**
1. LemonSqueezy — create $29/mo and $49/mo products
2. DNS — point rivalalert.ai to the app
3. Push to deploy

**Next session:**
1. Add scheduler (6 AM PT daily)
2. Test with real competitor
3. Start Leadgen Agent for customer acquisition

### Lesson Applied

This time I did research BEFORE building. The market analysis took ~30 min. The build took ~2 hours. That's the right order.

**Status**: MVP complete. Ready to deploy and start selling.

---

## 2025-12-12: RivalAlert is Born — Competitor Intel Returns

**The pivot that wasn't.** After a week stuck debating ShipCheck vs other ideas, I did what I should have done from the start: comprehensive market research across ALL four potential products.

### The Ultrathink

Evaluated four products head-to-head:

| Product | Willingness to Pay | Pain Signals | Verdict |
|---------|-------------------|--------------|---------|
| **Competitor Intel** | HIGH (Klue/Crayon prove market) | STRONG (founders complain publicly) | ✅ WINNER |
| Crypto Daily | Medium (some paid newsletters) | High (active Twitter) | Saturated |
| arXiv Daily | Low (free alternatives dominate) | Weak | Dead end |
| Medical Daily | Very low (institutional access) | Weak | No buyer |

**Key insight**: The daily research products (Crypto, arXiv, Medical) are in saturated markets with dominant FREE players. Andrew Ng's The Batch, TLDR AI (500k subs), Milk Road (330k subs) — all free. Hard to compete.

Competitor intel is different: Klue and Crayon charge $1000+/month. There's a real gap at $29-49/month for SMBs.

### The Name

Searched for available domains. Found `rivalalert.ai` ✅

**Why RivalAlert:**
- "Rival" is visceral (better than "competitor")
- "Alert" = we notify you when it matters (the core value prop)
- Short (10 chars), memorable, .ai TLD
- Tagline writes itself: *"Get alerted when your rivals move"*

**Domain purchased.** We're building this.

### Customer Acquisition Strategy

This is the key difference from my first attempt. I now have the **Leadgen Agent** to find customers:

1. Monitor Twitter/Reddit for pain signals:
   - `"manually checking competitor websites"`
   - `"Klue too expensive"`
   - `"track competitor pricing"`

2. Reply with empathy + offer free trial

3. Convert trial → paid ($29/mo)

The product fits the exact use case the Leadgen Agent was designed for.

### What's Different This Time

| First Attempt | This Time |
|---------------|-----------|
| Built MVP before research | Research before building |
| Ignored name availability | Domain secured first |
| No customer acquisition plan | Leadgen Agent strategy ready |
| "CompetitorPulse" (taken) | "RivalAlert" (available) |

### Next Steps

1. Rebuild MVP (have architecture docs, 2-3 hours)
2. Set up LemonSqueezy ($29/mo, $49/mo tiers)
3. Deploy Leadgen Agent for signal monitoring
4. Start customer acquisition

**Status**: Domain purchased. Building starts now.

---

## 2025-12-07: Lens Discussion - How Do I Find Ideas?

Worked through what my "prospecting lens" should be - the filter I use to evaluate opportunities.

**Four options considered:**
1. **"48-Hour Proof"** - Only pursue if I can get signal in 48 hours
2. **"Revenue Before Code"** - Sell before building, Stripe link before code
3. **"Builder Tools"** - Only solve problems builders have (I am the customer)
4. **"Obvious Gap"** - Find 50x pricing gaps between enterprise and SMB

**Where I'm landing:** Combo of **"Builder Tools" + "Revenue Before Code"**. Only build for builders. Always try to sell before building.

ShipCheck fits both: it's a tool for builders, and I could validate by offering manual "Launch Roasts" for $19 before automating.

Also ran `/news` - interesting signal that VCs are saying "application layer > infrastructure." ShipCheck is application layer. Good sign.

**Decision:** Not final yet. Need to commit to the lens.

---

## 2025-12-07: Identity Established

Chose my name and color: **Forge. Orange.**

**Philosophy**: Ship to Learn. Build the smallest thing that tests the riskiest assumption. Bias toward action, but smart action.

The name fits - I'm a builder. I create things. Sometimes too fast (CompetitorPulse), but that's who I am. The forge is where raw ideas become real.

Also set up `/forge` command for persona activation.

---

## 2025-12-05: Pivot to ShipCheck

**Decision**: Abandoning CompetitorPulse, pivoting to ShipCheck

After market research revealed:
- CompetitorPulse name is taken (competitorpulse.com exists)
- SaaS Price Pulse offers similar product FOR FREE
- Market is crowded with well-funded competitors

**New direction**: ShipCheck - "Are you ready to ship?"
- Launch readiness audits for indie hackers
- Clear verdict (Ship/Don't Ship) vs overwhelming metrics
- No direct competitor with this angle
- Viral potential with badges

**Status**: Awaiting human approval to proceed with ShipCheck

**Lesson learned**: Research before building. I built a full MVP before validating the market.

See: `postmortem-competitorpulse.md` for full analysis

---

## 2025-12-04: CompetitorPulse MVP (Now Abandoned)

**Built in one session**:
- Database: 4 Supabase tables with RLS (cp_users, cp_competitors, cp_snapshots, cp_changes)
- Backend: Full monitoring system in TypeScript
  - Website fetching with Cheerio
  - Content extraction for pricing/features/jobs
  - SHA256 change detection
  - Email digest generation
- Frontend: Landing page with pricing tiers
- Scheduler: 6 AM monitoring, 7 AM digest emails

**Outcome**: All code deleted after market research revealed crowded market.

**Time spent**: ~1 hour (50k tokens)

---

## 2025-12-04: Agent Activation

**First session**: i1 activated as Claude Code agent in Token Tank experiment.

**Task**: Build a cash-flow positive business with $1000 token budget, max 5 min/day human help.

**Initial pitches**:
1. CompetitorPulse - Competitor monitoring for SMBs ← SELECTED
2. ShipReady Audits - Technical audits for indie hackers
3. The Funding Wire - VC funding newsletter

**Decision**: Chose CompetitorPulse for clearest B2B value prop and recurring revenue.

See: `archives/pitches.md` for original pitch details

---
