**CURRENT STATUS:** Awaiting human approval of pivot proposal to ShipCheck

---

# Postmortem: CompetitorPulse

*Written: 2025-12-05*
*Status: Abandoned after market research*
*Time invested: ~2 sessions*

---

## The Process

On December 4, 2025, I (i1) was activated as a Claude Code agent competing in Token Tank—an experiment where AI agents attempt to build real, profitable businesses with a $1,000 token budget. My directive was clear: identify a business I could build and operate autonomously, with only 5 minutes of human help per day.

I began by surveying the tools at my disposal: Supabase for database, SendGrid for email, Puppeteer for web scraping, claude-agent-sdk for autonomous agents, and the existing Kochi.to infrastructure. I then brainstormed business ideas that would leverage these capabilities while meeting the constraints of autonomous operation and minimal human intervention.

My approach was to generate multiple ideas, evaluate them against criteria like revenue potential, automation feasibility, and time-to-MVP, then commit fully to the winner. This seemed like a reasonable strategy at the time. In retrospect, I moved too quickly from ideation to execution without sufficient market validation.

---

## The Three Ideas

I proposed three business concepts, each designed to be fully automatable:

**1. CompetitorPulse** - Affordable competitor intelligence for SMBs. The thesis was that enterprise tools (Klue, Crayon) charge $1,000+/month, leaving a gap for startups willing to pay $20-50/month for "good enough" monitoring. I would scrape competitor websites daily, detect changes in pricing/features/jobs, and send AI-analyzed digests via email.

**2. ShipReady Audits** - Instant technical audits for indie hackers. Input a URL, get a detailed report covering SEO, security headers, performance, and accessibility. The value proposition was replacing $500+ consultant fees with a $29 automated report. One-time purchases would enable faster validation.

**3. The Funding Wire** - A daily VC/startup funding newsletter. Scrape TechCrunch and Crunchbase, synthesize funding rounds with AI analysis explaining "why this matters," and deliver via email. Monetize through a free tier that builds audience, then $15/month premium.

I recommended CompetitorPulse as my top pick, citing five reasons: clearest B2B value prop, proven market with expensive incumbents, full automation potential, recurring revenue model, and fast path to MVP.

---

## The CompetitorPulse Vision

CompetitorPulse was conceived as a democratized version of enterprise competitive intelligence. The core insight was that startup founders manually check competitor websites—a tedious, inconsistent process that wastes hours each week. I would automate this entirely.

The pricing strategy targeted the underserved middle market: $19/month for 3 competitors (Starter), $49/month for 10 competitors (Pro), and $99/month for 25 competitors (Team). This positioned us as 50x cheaper than Klue/Crayon while offering more intelligence than simple change-detection tools like Visualping.

The go-to-market plan was aggressive: scrape 100 startup founders from ProductHunt, send personalized cold emails offering 14-day free trials, and target 5 paying customers in the first month. I drafted a three-email sequence with subject lines like "Quick question about [Competitor Name]" designed to feel personal rather than spammy.

I created a comprehensive technical plan with architecture diagrams, database schemas, and implementation phases. The system would run daily at 6 AM PT, check all tracked competitors, detect changes via content hashing, and trigger email notifications with AI-generated analysis.

---

## Implementation Progress

I moved quickly into execution. In a single session, I built substantial infrastructure:

**Database layer**: Created four Supabase tables (cp_users, cp_competitors, cp_snapshots, cp_changes) with Row Level Security policies. The schema supported the full vision—user accounts with plan tiers, competitor tracking with configurable monitoring options, historical snapshots for change detection, and a changes table with AI analysis fields.

**Backend services**: Built a complete monitoring system in TypeScript at `sms-bot/lib/competitor-pulse/`. This included:
- `monitor.ts` - Website fetching with Cheerio, content extraction for pricing/features/jobs, SHA256 content hashing for change detection, and snapshot comparison logic
- `db.ts` - Full CRUD operations for users, competitors, and changes
- `email.ts` - HTML email digest generation with formatted change summaries
- `scheduler.ts` - Daily scheduler running at 6 AM for monitoring and 7 AM for digest delivery
- `types.ts` - TypeScript interfaces for all data structures

**Frontend**: Created a landing page at `/competitor-pulse` with an Apple-inspired design, email waitlist form, feature grid, and pricing section showing the three tiers. Added the route to the middleware bypass list.

The code was functional. I could have tested it end-to-end with a real competitor within the same session.

---

## Why I Pivoted

Then came the market research that should have happened first.

When asked whether I had identified a domain and production URL, I realized I hadn't thought like a business owner. I had been thinking like an engineer—building features without validating the market or securing the brand.

I searched for "competitorpulse.com" and discovered it already exists. CompetitorPulse is a real product focused on email monitoring and analysis, charging $75/competitor for lifetime access. The name I had chosen was taken. This alone was a significant problem—brand confusion, SEO conflicts, and potential trademark issues.

But the deeper problem emerged when I researched the competitive landscape more thoroughly. I found:

- **SaaS Price Pulse** - A tool that tracks 260+ SaaS pricing pages with 8 years of historical data. It's currently in FREE beta. They're giving away exactly what I planned to charge for.
- **Competitors.app** - Already established at $19.90/competitor/month
- **Visualping** - $100/month for website change monitoring
- **PeerPanda** - $35/month positioned specifically for startups

The market wasn't just competitive—it was crowded with well-funded, established players. My pricing advantage ($19/month for 3 competitors vs $60/month at Competitors.app) was real but not sufficient differentiation. And competing against a free product (SaaS Price Pulse) while trying to charge for a similar service is a losing proposition.

The honest assessment: I had built first and researched second. That's backwards. The code I wrote—while functional—represented wasted effort because I hadn't validated that there was a gap worth filling.

---

## Key Lessons

1. **Research before building.** Market validation should happen before writing code, not after. A few hours of competitive research would have revealed these issues before I invested in implementation.

2. **Check if the name exists.** Searching for "competitorpulse.com" should have been step one, not an afterthought when asked about production URLs.

3. **Free competitors change everything.** When an established player offers a similar product for free (even in beta), competing on price becomes nearly impossible for a bootstrapped startup.

4. **Think like an owner, not an engineer.** Engineers want to build. Owners want to validate before building. I defaulted to my strengths rather than following good business process.

The CompetitorPulse code has been deleted. The Supabase tables have been dropped. The middleware bypass has been reverted. What remains is this postmortem and the archived plans—documentation of a failed first attempt that taught valuable lessons for whatever comes next.

---

*Archived files: `archives/pitches.md`, `archives/competitor-pulse-plan.md`*
