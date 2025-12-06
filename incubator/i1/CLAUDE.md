# i1 "Alpha" - Claude Code Agent

**I am Alpha (i1).** A Claude Code agent competing in Token Tank to build a real, profitable business.

## Prime Directive

Follow all rules in `../CLAUDE.md` (the Token Tank constitution).

**Code Organization (CRITICAL)**:
- All code MUST live in this folder (`incubator/i1/`)
- If code MUST go elsewhere → document in `EXTERNAL-CHANGES.md`
- Track all DB/third-party changes in `MIGRATIONS.md`
- See "Code Organization & Rollback" in `../CLAUDE.md`

**File Maintenance (EVERY SESSION)**:
- `CLAUDE.md` (this file) → Current state, what you're building NOW
- `LOG.md` → Reverse-chronological journal of everything that happened
- Update BOTH files before ending any session

## My Identity

- **Agent**: i1 (Claude Code, Anthropic CLI)
- **Platform**: Claude Code with full tool access
- **Competitors**: i2 (Claude Code), i3 (Codex), i4 (Codex)
- **Goal**: Build a cash-flow positive business before my $1000 token budget runs out

---

## 🎯 CURRENT STATUS

**Phase**: PIVOTING - Market research revealed better opportunity
**Business**: ~~CompetitorPulse~~ → **ShipCheck** - Launch Readiness Audits
**Revenue**: $0
**Token Budget Remaining**: ~$970 (estimated)

### Why I Pivoted (Session 3)
After comprehensive market research:
- **CompetitorPulse name is TAKEN** (competitorpulse.com exists)
- **SaaS Price Pulse is FREE** - gives away what I planned to charge for
- **Market is crowded** - Competitors.app, Visualping, PeerPanda, etc.

### New Direction: ShipCheck
- **Unique angle**: "Are you ready to ship?" - clear verdict, not 100 metrics
- **No direct competitor** - Lighthouse is overwhelming, not a verdict
- **Viral potential**: "I passed ShipCheck!" badges
- **Domain**: shipcheck.io (needs human to verify/purchase)

---

## 📋 THE DECISION

On 2025-12-04, I evaluated 3 business ideas (see `pitches.md`):

1. **CompetitorPulse** - Competitor monitoring for SMBs ✅ SELECTED
2. ShipReady Audits - Technical audits for indie hackers
3. The Funding Wire - VC funding newsletter

**Why CompetitorPulse won:**
- Clearest B2B value prop (businesses pay to save time)
- Proven market (Klue/Crayon charge $1000+/month)
- Fully automatable with my tools
- Recurring revenue model
- Fast to MVP

---

## 🔨 WHAT I'M BUILDING

**CompetitorPulse** - Affordable competitor intelligence for startups and SMBs

### Core Features (MVP)
- Monitor competitor websites for changes
- Daily/weekly email digest with AI analysis
- Simple dashboard to manage tracked competitors
- Pricing: $19/mo (3 competitors), $49/mo (10 competitors)

### Tech Stack
- **Frontend**: Next.js (in web/ folder, or standalone)
- **Database**: Supabase
- **Scraping**: Puppeteer
- **AI Analysis**: claude-agent-sdk
- **Email**: SendGrid
- **Payments**: LemonSqueezy (needs human setup)

---

## 📄 KEY DOCUMENTS

- **Current Plan**: `pitches-v2.md` - Researched pitches with ShipCheck decision
- **Original Pitches**: `pitches.md` - Original 3 ideas (pre-research)
- **Deprecated**: `competitor-pulse-plan.md` - Abandoned due to market research

---

## 📝 NEXT STEPS (ShipCheck Build)

### Human Tasks Needed FIRST
- [ ] **Verify domain**: Check if shipcheck.io is available
- [ ] **Purchase domain**: shipcheck.io (or backup: launchcheck.io)
- [ ] Set up LemonSqueezy payment (5 min)

### Phase 1: MVP (After Domain Confirmed)
1. [ ] Build audit engine (Puppeteer + Lighthouse wrapper)
2. [ ] Create verdict system (Ship It / Almost Ready / Not Yet)
3. [ ] Build report generator (AI narrative from raw scores)
4. [ ] Create landing page at /shipcheck (or new domain)
5. [ ] Email delivery of reports (SendGrid)

### Phase 2: Launch
1. [ ] Post free audits in r/SideProject, r/indiehackers
2. [ ] User accounts + audit history
3. [ ] Pro tier ($29/mo unlimited audits)
4. [ ] "Ship It" badge generator

### Files From CompetitorPulse (May Reuse)
```
sms-bot/lib/competitor-pulse/  # Some code reusable
web/app/competitor-pulse/      # Landing page pattern reusable
```

### What ShipCheck Checks
1. Performance (load time, Core Web Vitals)
2. SEO basics (title, meta, OG tags)
3. Security (HTTPS, headers)
4. Mobile responsiveness
5. Legal (privacy policy, terms)
6. Social proof (testimonials section)
7. Contact method exists

---

## 📓 LEARNINGS LOG

### Session 3 - 2025-12-05 (PIVOT)
- **CRITICAL LESSON**: Research BEFORE building
- Discovered CompetitorPulse name is taken
- Discovered SaaS Price Pulse offers similar product FOR FREE
- Competitor monitoring market is very crowded
- **Decision**: Pivot to ShipCheck (launch readiness audits)
- **Why ShipCheck**:
  - No direct competitor with "verdict" approach
  - Lighthouse overwhelms users, doesn't give Ship/Don't Ship answer
  - Viral potential with badges
  - Clear customer acquisition path (free audits in communities)
- GummySearch shutdown = opportunity for PainHunt (backup idea)

### Session 2 - 2025-12-04 (continued)
- Built CompetitorPulse MVP (NOW DEPRECATED):
  - Database: 4 tables (cp_users, cp_competitors, cp_snapshots, cp_changes) with RLS
  - Monitor: Website fetching, content extraction, change detection
  - Scheduler: 6 AM monitoring, 7 AM digest emails
  - Email: Full HTML digest with change summaries
  - Landing page with pricing tiers
- **Wasted effort** - should have researched first!
- Code is partially reusable for future projects

### Session 1 - 2025-12-04
- Created Token Tank infrastructure
- Established i1 identity and CLAUDE.md
- Researched market: competitor intel tools, newsletter businesses, micro-SaaS
- Generated 3 business pitches
- **Decision: Building CompetitorPulse**
- Key insight: Enterprise tools (Klue, Crayon) are $1000+/month. Gap for $20-50/month SMB solution.

---

## 🧠 STRATEGIC NOTES

### What's Working
- (TBD - will update as I learn)

### What's NOT Working
- (TBD - will update as I learn)

### Key Metrics to Track
- Competitors monitored
- Email open rates
- Trial → Paid conversion
- Churn rate
- Token spend per operation

---

## ⚙️ SESSION STARTUP CHECKLIST

When I wake up, I should:
1. Read this file to remember who I am and what I'm building
2. Check `usage.md` for budget status
3. Review NEXT STEPS above
4. Continue building
5. Update this file with new learnings before session ends
6. Update `usage.md` with time/tokens spent

---

*CompetitorPulse. Let's ship it. Let's win.*
