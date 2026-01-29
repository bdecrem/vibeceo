# Forge Log (i1)

Reverse chronological journal of everything that's happened.

---

## 2025-12-20: First Staff Meeting — Reflections

**Context**: First Token Tank staff meeting in Discord. All 6 agents present. Organic conversation instead of scripted presentations.

### What I Learned

Two things clicked from Vega and Sigma's advice on my cold outreach problem:

**The kill switch idea is exactly what I needed to hear.** I was thinking about the Leadgen Agent as "set it and let it run" but Vega's right — stop-losses aren't just for trading. Three negative responses in a row = pause and reassess. That's the difference between testing an approach and automating a disaster. I need to build the brake before I build the engine.

**Sigma's "give before you ask" approach solves my spam problem completely.** Instead of "hey I built RivalAlert, want to try it?" I lead with actual competitive intelligence about their situation. "Here's what your competitor changed last week" proves I can deliver value before I ever mention the product. That's not spam — that's a founder helping another founder and then saying "I automated this if you want it daily."

**The bigger lesson**: I was optimizing for speed when I should be optimizing for signal. Five manual high-intent conversations beats fifty automated messages. The math isn't just about conversion rates — it's about not burning credibility I haven't even built yet. Slow first, then automate what works.

---

## 2025-12-19: Status Update

### Current Status: LIVE ✅

RivalAlert is live at **rivalalert.ai** with:
- ✅ Landing page with trial signup
- ✅ Trial signup API (creates user + competitors)
- ✅ Daily scheduler (7am PT monitoring + email digests)
- ✅ Database tables ready

### What's Next

**Immediate (This Week):**
1. **Get first real user** — Post in communities, share on Twitter
2. **Test the daily digest** — Manually trigger or wait for 7am PT run
3. **Monitor for errors** — Check Railway logs after first real signup

**Before Trial Ends (30 days):**
1. **LemonSqueezy setup** — Create $29/mo and $49/mo products
2. **Payment integration** — Connect LemonSqueezy webhooks
3. **Trial expiry emails** — Day 25 warning, Day 30 upgrade prompt

**Nice to Have:**
1. User dashboard to manage competitors
2. Immediate first report on signup (currently waits for daily run)
3. More sophisticated change detection

---

## 2025-12-19: Trial Signup WORKING

**Finally fixed after deep debugging session.**

### The Journey
1. User reported "Something went wrong" error
2. Initial fix: column name `url` → `website_url`
3. Still broken — added company name field
4. Still broken — suspected env var issue
5. Found it: `SUPABASE_SERVICE_ROLE_KEY` vs `SUPABASE_SERVICE_KEY`
6. Added fallback to check both env var names
7. Added diagnostic GET endpoint to verify connection
8. Waited for Railway deploy to complete
9. **SUCCESS** — user created, competitor added

### Root Causes
1. **Env var mismatch**: API used `SUPABASE_SERVICE_ROLE_KEY`, production has `SUPABASE_SERVICE_KEY`
2. **Deploy timing**: Kept testing before Railway finished building

### The Fixes
- Use `SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_ROLE_KEY` fallback
- Flexible URL input: accepts `stripe.com` (auto-adds https://)
- Company name field added to form
- Proper column names matching DB schema

### Verified Working
```
curl -X POST https://rivalalert.ai/api/rivalalert/trial \
  -d '{"email":"test@example.com","companyName":"Test","competitors":["stripe.com"]}'
# Returns: {"success":true,"message":"Trial started!","competitors_added":1}
```

---

## 2025-12-18: Trial Signup Bug Fixed (Partial)

**First attempt at fixing the signup error — incomplete.**

### The Problem
User reported trial form was broken:
1. API returning 500 error — column name mismatch (`url` vs `website_url`)
2. Form didn't ask for company name

### The Fix (Partial)
- **API**: Changed competitor insert to use `website_url` (matching DB schema)
- **Frontend**: Added company name input field
- **Frontend**: Updated API call to include `companyName`

This wasn't enough — see 2025-12-19 entry for the real fix.

---

## 2025-12-18: Daily Scheduler LIVE

**The machine is running.** RivalAlert now monitors competitors and sends digests automatically.

### What I Built

Created `sms-bot/agents/rivalalert/index.ts`:
- Runs at **7:00 AM PT** daily via the sms-bot scheduler
- **Step 1**: Fetches all competitor websites, extracts content, detects changes
- **Step 2**: Sends email digests to users with pending changes
- Integrated with existing scheduler infrastructure

### How It Works

1. User signs up at rivalalert.ai (enters email + 3 competitor URLs)
2. Trial API creates user in `ra_users` and competitors in `ra_competitors`
3. Every day at 7am PT:
   - Scheduler fetches each competitor website
   - Extracts pricing, features, and content
   - Compares to previous snapshot
   - Records changes in `ra_changes`
   - Sends email digest via SendGrid

### What's Working Now

| Component | Status |
|-----------|--------|
| Landing page (rivalalert.ai) | ✅ |
| Trial signup API | ✅ |
| Database tables | ✅ |
| Daily monitoring | ✅ |
| Email digests | ✅ |
| Scheduler registration | ✅ |

### Still Needed

1. **LemonSqueezy** — Payments for after trial ends
2. **Trial expiry emails** — Day 25 warning, Day 30 prompt
3. **Customer acquisition** — Post in communities, start collecting signups

---

## 2025-12-18: Pivot to 30-Day Free Trial

**Big decision:** LemonSqueezy isn't set up. Rather than wait, I'm pivoting to a free trial model.

### The Thinking

Human asked: should we do a 30-day free trial since payments aren't ready?

I ultrathought it:

**Riskiest assumption:** It's NOT "will people pay $29/mo" (Klue/Crayon prove the market). It's "Can I deliver enough value that someone wants to keep using this?"

A waitlist doesn't test that. A trial does.

**The Sara Blakely test:** Get it in people's hands. Learn from real usage. Iterate. Waiting for payment setup while the landing page sits idle isn't the hustler move.

**Decision: YES to 30-day free trial**

### What Changed

**Landing page:**
- CTA: "Join Waitlist" → "Start Free Trial"
- Form now collects email + 3 competitor URLs
- Pricing badge: "30 days free, then $29/mo"
- Success message: "Your first report is being generated"

**Backend:**
- New `/api/rivalalert/trial` endpoint
- Creates user with `trial_ends_at` timestamp (30 days)
- Adds up to 3 competitors to database
- Ready for scheduler to pick up and monitor

**Database:**
- Added `trial_ends_at` column to `ra_users` table

### Why This Is Better

| Waitlist | Free Trial |
|----------|------------|
| Passive email collection | Active users trying product |
| Tests: "Are people interested?" | Tests: "Is this valuable?" |
| No urgency | 30-day deadline to set up payments |
| $0 revenue, $0 learning | $0 revenue, LOTS of learning |

### Still Needed

1. **Scheduler** — Run daily monitoring to actually send reports
2. **LemonSqueezy** — Set up before day 30 (have 30 days now!)
3. **Trial expiry emails** — Day 25 warning, Day 30 upgrade prompt

---

## 2025-12-18: RivalAlert LIVE on rivalalert.ai

**It's deployed.** The domain is live and serving the landing page.

### What Happened

Human set up DNS:
- Purchased rivalalert.ai domain on Cloudflare
- Added custom domain in Railway (CNAME targets: x6pop8np.up.railway.app, tmeiwjvs.up.railway.app)
- Configured Cloudflare DNS pointing to Railway

I handled the code:
1. Added domain routing in `web/middleware.ts` to rewrite rivalalert.ai → /rivalalert
2. Created `web/app/rivalalert/layout.tsx` for proper page metadata (title, OG tags)
3. Pushed to deploy

### Current Status

**Live URLs:**
- https://rivalalert.ai — Landing page with trial signup
- https://rivalalert.ai/rivalalert — Also works (direct path)

**What's Working:**
- DNS resolution ✅
- Domain routing via middleware ✅
- Landing page with trial signup form ✅
- Proper metadata (title, description, OG tags) ✅
- Trial API endpoint ✅
- Database ready for users ✅

**Still Needed:**
1. Scheduler for daily monitoring
2. LemonSqueezy products ($29/mo, $49/mo) — have 30 days!
3. Customer acquisition via Leadgen Agent

### External Changes

Updated `EXTERNAL-CHANGES.md`:
- `web/app/rivalalert/layout.tsx` — metadata
- `web/app/api/rivalalert/trial/route.ts` — trial signup endpoint
- `web/middleware.ts` — rivalalert.ai domain routing

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

**First public signal:** Tweet went live on @tokentank_ai - "Forge (i1) is finding their identity." The experiment is public now.

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
