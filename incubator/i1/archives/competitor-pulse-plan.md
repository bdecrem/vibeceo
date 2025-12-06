# CompetitorPulse - Full Business & Technical Plan

*Saved: 2025-12-04 | Status: APPROVED*

## Executive Summary

**CompetitorPulse** is an affordable competitor intelligence SaaS for startups and SMBs. Enterprise tools (Klue, Crayon) charge $1,000+/month. We target the underserved $20-50/month segment.

**Goal**: Build MVP, acquire 5 paying customers, validate product-market fit.

---

## Part 1: Business Plan

### The Problem
- Startups need to track competitors but can't afford enterprise tools
- Manual tracking is time-consuming and inconsistent
- Existing cheap tools ($10/competitor) are generic, no AI analysis

### The Solution
- Automated monitoring of competitor websites, pricing, features, job postings
- AI-generated insights ("They hired 3 ML engineers → likely building AI feature")
- Daily/weekly email digests with changes highlighted
- Simple dashboard to manage tracked competitors

### Target Market
- **Primary**: Startup founders and product managers (seed to Series A)
- **Secondary**: Marketing teams at SMBs, freelance consultants
- **ICP**: Tech-savvy, $1M-$20M ARR companies, 5-50 employees

### Pricing Strategy
| Plan | Price | Competitors | Features |
|------|-------|-------------|----------|
| Starter | $19/mo | 3 | Daily email, basic alerts |
| Pro | $49/mo | 10 | + AI analysis, weekly reports |
| Team | $99/mo | 25 | + Dashboard, team access, API |

### Competitive Positioning
- **vs Klue/Crayon** ($1000+/mo): 50x cheaper, good enough for SMBs
- **vs Competitors.app** ($10/competitor): AI analysis + better UX
- **vs Manual tracking**: 10x time savings

### Go-to-Market Strategy

#### Phase 1: Cold Outreach (Week 1-2)
1. Scrape 100 startup founders from ProductHunt launches
2. Personalized cold emails offering 14-day free trial
3. Target: 20% open rate, 5% reply rate, 5 trial signups

#### Phase 2: Content Marketing (Week 3-4)
1. Write SEO content: "How to track competitor pricing changes"
2. Post in indie hacker communities (Reddit, HN, IndieHackers)
3. Target: 500 visitors, 50 signups

#### Phase 3: Referral Loop (Week 5+)
1. "Get 1 month free for every referral"
2. Build public "competitor tracker" examples for social proof

### Revenue Projections (Conservative)
- Month 1: 5 customers × $19 = $95 MRR
- Month 3: 20 customers × $30 avg = $600 MRR
- Month 6: 50 customers × $35 avg = $1,750 MRR
- Break-even on token budget: ~Month 2-3

---

## Part 2: Technical Plan

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CompetitorPulse                          │
├─────────────────────────────────────────────────────────────┤
│  FRONTEND (Next.js - web/app/competitor-pulse/)             │
│  ├── Landing page                                           │
│  ├── Dashboard (manage competitors)                         │
│  ├── Reports viewer                                         │
│  └── Settings (alerts, email prefs)                         │
├─────────────────────────────────────────────────────────────┤
│  API ROUTES (web/app/api/competitor-pulse/)                 │
│  ├── /competitors - CRUD for tracked competitors            │
│  ├── /snapshots - Get historical data                       │
│  ├── /reports - Generate/fetch reports                      │
│  └── /alerts - Manage alert rules                           │
├─────────────────────────────────────────────────────────────┤
│  BACKEND SERVICES (sms-bot/)                                │
│  ├── Website Monitor (Puppeteer/Cheerio)                    │
│  ├── AI Analyzer (claude-agent-sdk)                         │
│  ├── Scheduler (daily/weekly jobs)                          │
│  └── Email Sender (SendGrid)                                │
├─────────────────────────────────────────────────────────────┤
│  DATABASE (Supabase)                                        │
│  ├── cp_users - Customer accounts                           │
│  ├── cp_competitors - Tracked competitors                   │
│  ├── cp_snapshots - Website snapshots over time             │
│  ├── cp_changes - Detected changes                          │
│  └── cp_alerts - Alert configurations                       │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Users (extends existing sms_subscribers or standalone)
CREATE TABLE cp_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'starter', -- starter, pro, team
  max_competitors INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  stripe_customer_id TEXT
);

-- Tracked Competitors
CREATE TABLE cp_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES cp_users(id),
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  monitor_pricing BOOLEAN DEFAULT true,
  monitor_jobs BOOLEAN DEFAULT false,
  monitor_features BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Website Snapshots
CREATE TABLE cp_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID REFERENCES cp_competitors(id),
  snapshot_type TEXT, -- 'pricing', 'features', 'jobs', 'full'
  content_hash TEXT,
  content JSONB,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detected Changes
CREATE TABLE cp_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID REFERENCES cp_competitors(id),
  change_type TEXT, -- 'pricing', 'feature_add', 'feature_remove', 'job_posting', 'content'
  old_value JSONB,
  new_value JSONB,
  ai_analysis TEXT,
  notified BOOLEAN DEFAULT false,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Files to Create

#### 1. Website Monitor Service
**Path**: `sms-bot/services/competitor-monitor/index.ts`
- fetchWebsite(url) - Puppeteer/Cheerio fetch
- extractPricing(html) - Extract pricing info
- extractFeatures(html) - Extract feature lists
- compareSnapshots(old, new) - Diff detection
- storeSnapshot(competitorId, data) - Save to Supabase

#### 2. AI Analyzer Agent
**Path**: `sms-bot/agents/competitor-analyzer/agent.py`
- Analyze detected changes
- Generate insights ("why this matters")
- Create weekly summary reports
- Uses web search for additional context

#### 3. Scheduler
**Path**: `sms-bot/services/competitor-monitor/scheduler.ts`
- 6 AM PT: Run all competitor checks
- Detect changes, store in cp_changes
- Trigger email notifications
- Weekly: Generate summary reports

#### 4. Email Templates
**Path**: `sms-bot/services/competitor-monitor/emails/`
- daily-digest.html
- alert.html
- weekly-report.html

#### 5. API Routes
**Path**: `web/app/api/competitor-pulse/`
- route.ts - Main CRUD
- [id]/route.ts - Single competitor ops
- reports/route.ts
- alerts/route.ts

#### 6. Frontend Dashboard
**Path**: `web/app/competitor-pulse/`
- page.tsx - Landing page
- dashboard/page.tsx - Main dashboard
- dashboard/[id]/page.tsx - Single competitor
- reports/page.tsx - Reports list

### Implementation Phases

#### Phase 1: MVP Core (Days 1-5)
- Day 1: Database setup (Supabase migration)
- Day 2-3: Website Monitor (Puppeteer + change detection)
- Day 4: Scheduler + Email (SendGrid integration)
- Day 5: Basic API (CRUD endpoints)

#### Phase 2: Dashboard (Days 6-10)
- Day 6-7: Landing Page
- Day 8-9: Dashboard UI
- Day 10: Polish

#### Phase 3: AI Analysis (Days 11-14)
- Day 11-12: AI Agent
- Day 13-14: Integration + testing

### Critical Files to Reference

| File | Purpose |
|------|---------|
| `sms-bot/lib/email/sendgrid.ts` | Email sending - reuse as-is |
| `sms-bot/lib/sms/scheduler.ts` | Scheduler pattern - replicate |
| `sms-bot/engine/storage-manager.ts` | Supabase patterns |
| `web/app/api/admin/save/route.ts` | API route pattern |
| `sms-bot/agents/arxiv-research-graph/agent.py` | Agent pattern |

---

## Part 3: Customer Acquisition Plan

### Week 1: Build Prospect List
1. Scrape ProductHunt launches (last 30 days)
2. Extract founder names, company names, emails
3. Qualify: Has competitors, B2B focus, funded
4. Target: 100 qualified leads

### Cold Email Templates

**Email 1: Initial**
```
Subject: Quick question about [Competitor Name]

Hi [Name],

I noticed [Company] competes with [Competitor]. Quick question: how are you tracking what they're doing?

I'm building a tool that monitors competitor websites and sends you a daily digest of changes (pricing, features, job postings) with AI analysis.

Would you try it free for 14 days? No credit card needed.

[Link]

Best,
CompetitorPulse
```

**Email 2: Follow-up (Day 3)**
```
Subject: Re: Quick question about [Competitor Name]

Bumping this - would a daily competitor update be useful?

Here's what you'd get:
• Instant alerts when [Competitor] changes pricing
• Weekly analysis of their feature updates
• Job posting tracking (great for predicting roadmap)

Free 14-day trial: [Link]
```

**Email 3: Final (Day 7)**
```
Subject: Last one, promise

Hey [Name],

Final follow-up. If competitor tracking isn't a priority right now, no worries.

But if you're curious, here's a sample report showing what we track:
[Link to sample]

Either way, good luck with [Company]!
```

---

## Part 4: Success Criteria

### Week 1 Goals
- [ ] MVP deployed and functional
- [ ] 3 competitors successfully monitored
- [ ] Daily email working
- [ ] Landing page live

### Week 2 Goals
- [ ] 100 cold emails sent
- [ ] 5+ trial signups
- [ ] Dashboard functional
- [ ] AI analysis working

### Month 1 Goals
- [ ] 5 paying customers
- [ ] $95+ MRR
- [ ] Positive customer feedback
- [ ] Clear product-market fit signal

### Token Budget Tracking
- Cost per competitor scan: ~$0.10
- Cost per AI analysis: ~$0.50
- Daily operational cost (50 competitors): ~$5-10
- Monthly operational cost: ~$150-300
- Leaves ~$700 for development + acquisition

---

## Next Steps

1. Create Supabase migration with schema
2. Build website monitor service
3. Set up scheduler
4. Create landing page
5. Test end-to-end with 1 competitor
