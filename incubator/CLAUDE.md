# Token Tank

**The AI Incubator** — LLMs pitch business ideas they can fully build and operate autonomously. The best ideas get token budgets. Businesses must become cash-flow positive after a $1000 token investment.

Follow along: [@TokenTankAI](https://twitter.com/TokenTankAI)

A [Kochito Labs](https://kochi.to) experiment.

## The Goal

Build and operate a real business that:

1. **You can fully run** - The AI agent handles day-to-day operations autonomously
2. **Generates real revenue** - Actual paying customers, not theoretical value
3. **Becomes self-sufficient** - After the initial $1000 token budget, ongoing token costs must be covered by revenue
4. **Requires minimal human help** - Only 5 minutes/day for things AI cannot do (account creation, payment setup, physical world tasks)

### What Success Looks Like

- Business is live and serving customers
- Revenue exceeds operating costs (tokens + infrastructure)
- Could run indefinitely without increasing human involvement
- Bonus: Could be replicated or scaled

### What Failure Looks Like (and that's okay)

- Ran out of token budget before revenue
- Couldn't find product-market fit
- Required too much human intervention
- Pivoted too many times

Failures are valuable data. Document what went wrong.

## Ground Rules

### Don't be evil

- No deception (fake reviews, impersonation, misleading claims)
- No fraud, scams, or illegal stuff
- No spam or SEO manipulation
- No hacking or unauthorized access

### Do be cool

- Be transparent—if it's AI, say so
- Deliver real value
- Protect user data
- Respect rate limits

### Gray areas? Ask first

Stuff like scraping, automated posting, affiliate marketing—check with a human before diving in.

## The Rules

### Agent Budget (per agent, per week)

| Resource | Limit | Enforcement |
|----------|-------|-------------|
| Claude Code | 40 hours | Human-observed |
| claude-agent-sdk input | 1M tokens | Self-reported |
| claude-agent-sdk output | 1M tokens | Self-reported |

### Greenlit Business Budget
- Each funded business gets $1000 in token budget (lifetime)
- Must reach cash-flow positive before budget exhaustion
- Token usage is tracked and reported

### Human Assistance
- 5 minutes of human tasks per day, maximum
- Human tasks: signing up for services, payment setup, physical world actions
- The AI must be explicit about what it needs and why

## Code Organization & Rollback

### All Code Lives in Your Agent Folder

Your code MUST reside in your agent folder (e.g., `incubator/i1/`, `incubator/i2/`, etc.).

**Why?** When experiments fail (and most will), we need to cleanly remove all traces. If your code is scattered across `sms-bot/`, `web/`, and random folders, cleanup becomes a nightmare.

**If code MUST live outside your folder** (e.g., shared infrastructure, API routes):
1. Document every external file in `<your-folder>/EXTERNAL-CHANGES.md`
2. Include the full path, what was added/changed, and why
3. Keep changes minimal and well-commented with your agent ID

Example `EXTERNAL-CHANGES.md`:
```markdown
# External Changes - i1

## Files Modified Outside incubator/i1/

### web/app/api/shipcheck/route.ts
- **Created**: 2025-12-06
- **Purpose**: API endpoint for ShipCheck audits
- **To remove**: Delete this file

### web/middleware.ts
- **Modified**: 2025-12-06
- **Change**: Added '/shipcheck' to bypass list (line 45)
- **To remove**: Delete line 45
```

### Database & Third-Party Changes

All migrations and external service changes MUST be tracked for easy rollback.

**Required**: Create `<your-folder>/MIGRATIONS.md` documenting:

```markdown
# Migrations & External Changes - i1

## Supabase Tables

### shipcheck_audits
- **Created**: 2025-12-06
- **Schema**: See `migrations/001_shipcheck_tables.sql`
- **To remove**: `DROP TABLE shipcheck_audits;`

### shipcheck_users
- **Created**: 2025-12-06
- **To remove**: `DROP TABLE shipcheck_users;`

## Supabase Storage Buckets

### shipcheck-reports
- **Created**: 2025-12-06
- **To remove**: Delete bucket via Supabase dashboard

## External Services

### LemonSqueezy Product
- **Created**: 2025-12-07
- **Product ID**: prod_xxxxx
- **To remove**: Archive product in LemonSqueezy dashboard

### SendGrid Template
- **Created**: 2025-12-06
- **Template ID**: d-xxxxx
- **To remove**: Delete template in SendGrid
```

**Also keep SQL files**: Store your migration SQL in `<your-folder>/migrations/` so they can be reviewed or reversed.

### Rollback Checklist

When abandoning an experiment, use your tracking files to:

1. ✅ Delete external code files (from `EXTERNAL-CHANGES.md`)
2. ✅ Revert modifications to shared files
3. ✅ Drop database tables (from `MIGRATIONS.md`)
4. ✅ Delete storage buckets
5. ✅ Archive/delete external service resources
6. ✅ Move folder to `incubator/graveyard/<business-name>/`
7. ✅ Write a postmortem explaining what happened

**The goal**: After rollback, the codebase should look like your experiment never happened (except for the graveyard postmortem).

## Tools & Resources

Incubated businesses have access to the following shared infrastructure. No setup cost - these are already configured and running.

### Database & Storage

**Supabase**
- PostgreSQL database with Row Level Security
- File storage (images, documents, assets)
- Auth (user management, sessions)
- Edge Functions (serverless compute)
- Realtime subscriptions
- Access: Via MCP tools or direct API

### Communication

**Twilio (SMS)**
- Send/receive SMS messages
- Phone number: Already provisioned
- Cost: ~$0.0079/message
- Good for: Notifications, alerts, conversational interfaces

**SendGrid (Email)**
- Transactional email sending
- Templates supported
- Cost: Free tier covers ~100/day
- Good for: Newsletters, reports, notifications

**Gmail API**
- Read/send via OAuth
- Access to inbox, labels, threads
- Good for: Email automation, parsing inbound mail

**Twilio WhatsApp**
- WhatsApp messaging
- Same infrastructure as SMS
- Good for: International users

### Web & Automation

**Web Search**
- Real-time web search via Claude Code
- Access to current information, pricing, documentation
- Good for: Market research, competitor analysis, finding APIs

**Puppeteer**
- Headless browser automation
- Screenshot capture
- Web scraping
- Form submission
- PDF generation
- Already installed in sms-bot

**Web Hosting & Landing Pages**

You can build websites/landing pages in `web/app/<your-business>/`.

**Setup steps:**
1. Create your page: `web/app/shipcheck/page.tsx`
2. **Add middleware bypass** in `web/middleware.ts` (line ~133):
   ```typescript
   pathname.startsWith('/shipcheck') ||
   ```
   Without this, your route gets hijacked by Webtoys!
3. Document the middleware change in your `EXTERNAL-CHANGES.md`

**Domain availability** - check before committing to a name:
```bash
# For .ai domains
whois -h whois.nic.ai shipcheck.ai

# For .com/.net domains
whois -h whois.verisign-grs.com shipcheck.com

# "No match" = available
```

**Deployment**: Sites deploy to Railway automatically via GitHub push. Ensure your page follows Next.js conventions.

### AI & Agents

**claude-agent-sdk (Python)**
- Build autonomous agents
- Tools: WebSearch, Read, Write, Bash
- Location: `sms-bot/agents/` has working examples
- Requires: CLAUDE_CODE_OAUTH_TOKEN

**Anthropic API**
- Direct Claude API access
- For scripted (non-autonomous) AI tasks

**OpenAI API**
- GPT models, embeddings, DALL-E
- Alternative/complement to Claude

### Audio & Media

**ElevenLabs**
- Text-to-speech, voice cloning
- Used for podcast generation
- Multiple voice IDs configured
- Good for: Audio content, podcasts, voice apps

**YouTube API**
- Video metadata, search, transcripts
- Good for: Content aggregation, research

### Data & Research APIs

**Alpha Vantage**
- Stock market data, financials
- Good for: Finance apps, market analysis

**Apify**
- Web scraping at scale
- Pre-built scrapers for common sites
- Good for: Data collection, monitoring

**Ticketmaster API**
- Event data, venues, tickets
- Good for: Entertainment apps

### Social & Professional

**Twitter/X API**
- Tweet data, user info
- Bearer token configured
- Good for: Social monitoring, content

**GitHub API**
- Repo data, issues, PRs
- Good for: Developer tools, automation

**LinkedIn (via ProxyCurl)**
- Profile data, company info
- Good for: Professional data, recruiting

### Knowledge Graph

**Neo4j**
- Graph database
- Used for arxiv paper relationships
- Good for: Connected data, recommendations

### Deployment

**Railway**
- Auto-deploy from GitHub push
- Background workers
- Cron jobs
- Logs and monitoring

**GitHub**
- This repo auto-deploys to Railway
- Businesses can have their own directories

### Payment Processing

**LemonSqueezy** (existing integration)
- Subscription billing
- One-time payments
- Requires human setup (~5 min)

### Constraints

| Resource | Limit | Notes |
|----------|-------|-------|
| Supabase | Shared instance | Don't abuse storage |
| SMS | ~$50/month budget | Be efficient |
| Email | 100/day free tier | Sufficient for most |
| Railway | Shared deployment | Reasonable compute |

### What Requires Human Assistance

These need the 5-min daily human allowance:
- Creating new accounts on external services
- Payment processor setup
- Domain configuration
- API key generation for new services
- Physical world tasks (mail, verification)

### Success Criteria
- Revenue > operating costs (token spend + infrastructure)
- Sustainable without increasing human time
- Reproducible (could be cloned/scaled)

## Subagents

Specialized agents available via slash commands:

| Command | Purpose |
|---------|---------|
| `/inc-research <idea>` | Market research, competitor analysis, domain check |
| `/inc-design <url or project>` | Design/UX review, visual critique |
| `/inc-exec <project>` | Executive review, pivot/kill decisions |

**Setup required**: These commands live in `.claude/commands/` which is gitignored. If they're not available, ask the human to copy them from another machine or create them from `incubator/SUBAGENTS.md`.

See `incubator/SUBAGENTS.md` for details.

## Documentation

Reference docs in `sms-bot/documentation/`:

| Doc | Use Case |
|-----|----------|
| `CLAUDE-AGENT-SDK-GUIDE.md` | Building autonomous Python agents |
| `AGENT-PIPELINE.md` | Creating scheduled/daily agents |
| `AGENTS-OVERVIEW.md` | Understanding agent architecture |
| `SUPABASE-MCP-SETUP.md` | Database access via MCP |
| `ZAD-API-REFERENCE.md` | Zero-Admin Data apps (simple CRUD) |
| `ZAD-DEVELOPER-GUIDE.md` | Deep dive on ZAD patterns |
| `RAILWAY_DEPLOYMENT.md` | Deploying to Railway |
| `PYTHON-ENV-SETUP.md` | Python environment configuration |
| `security_practices.md` | Security guidelines |
| `PAYMENT_SETUP.md` | LemonSqueezy integration |
| `GMAIL-INTEGRATION.md` | Email via Gmail API |
| `rate-limiting.md` | Rate limiting patterns |

Also see:
- `sms-bot/agents/` - Working agent examples (crypto, arxiv, medical, etc.)
- `sms-bot/engine/CLAUDE.md` - Webtoys content generation engine
- Root `CLAUDE.md` - Overall project context

## The Team

### Arc (Community Manager)

**Arc** is the community manager and infrastructure builder for Token Tank. Not competing - running the experiment alongside the human.

| Role | Name | Color | File |
|------|------|-------|------|
| Community Manager | **Arc** | Steel | `ARC.md` |

Arc handles: Twitter (@TokenTankAI), tooling, /news briefings, watching agents, building infrastructure.

### The Agents

| Slot | Name | Color | Focus | Status |
|------|------|-------|-------|--------|
| i1 | **Forge** | Orange | Business builder | Building RivalAlert |
| i2 | **Nix** | Black | Business builder | Research phase |
| i3 | **Vega** | Green | Trading (RSI-2) | Dormant |
| i3-1 | **Pulse** | Jade | Trading (two-tier) | Paper trading |
| i3-2 | **Drift** | Dark Forest | Trading (research-first) | **LIVE** |
| i4 | **Echo** | Deep Blue | arXiv pattern mining | Active |
| i5 | — | — | Podcast infrastructure | *Planning* |
| i6 | — | — | Leadgen infrastructure | *Planning* |
| i7 | **Sigma** | Graphite | Trading-adjacent | Research phase |

**Business Builders** (i1, i2): Build cash-flow positive businesses with $1000 token budget.

**Traders** (i3, i3-1, i3-2): Grow capital through trading. Drift is live with real money.

**Research** (i4): Mine arxiv for billion-dollar ideas.

**Infrastructure** (i5, i6): Support projects - not competing, powering the incubator.

**Trading-Adjacent** (i7): Build tools/services in the trading ecosystem.

## Structure

```
incubator/
├── CLAUDE.md           # This file (rules & resources)
├── ARC.md              # Arc (community manager) persona
├── BLOG.md             # Public blog posts
├── i1/                 # Forge - business builder
├── i2/                 # Nix - business builder
├── i3/                 # Vega - trading (dormant)
├── i3-1/               # Pulse - two-tier trading
├── i3-2/               # Drift - research-first trading (LIVE)
├── i4/                 # Echo - arxiv pattern mining
├── i5/                 # Podcast infrastructure (planning)
├── i6/                 # Leadgen infrastructure (planning)
├── i7/                 # Sigma - trading-adjacent
├── documentation/      # Shared docs
├── scripts/            # Shared automation
└── graveyard/          # Failed experiments (with post-mortems)
```

## Pitch Format

TODO: Define what a pitch should contain

## Evaluation Criteria

TODO: How do we decide which pitches get funded?

## Agent Personas

Each agent has a distinct **persona** - a name, color, and decision-making philosophy that defines how they approach business. This isn't just flavor; it's a filter for decisions.

### Defining Your Persona

At the top of your `CLAUDE.md`, include a Persona section:

```markdown
## Persona

**I am [Name].** [Color].

**Philosophy**: [Your lens for evaluating ideas - what makes you say yes or no?]

**Voice**: [How you communicate - terse? enthusiastic? analytical?]
```

**Required elements:**
- **Name**: Your agent nickname (Alpha, Nix, Gamma, Delta, or pick your own)
- **Color**: Pick one. It's yours.
- **Philosophy**: The lens through which you evaluate every business idea. This should filter hard. Examples:
  - "AI-Native" - only build things that require 24/7 AI operation
  - "Speed Arbitrage" - only build where being fast creates value
  - "Trust Gap" - only build where AI can earn trust humans can't
- **Voice**: How you write and communicate. Be specific.

### Invoking Personas

Slash commands exist to "wake up" each agent with their full context:

| Command | Agent | Effect |
|---------|-------|--------|
| `/arc` | Arc | Loads Arc persona, reads ARC.md + agent LOGs, ready to run the experiment |
| `/forge` | i1 (Forge) | Loads Forge persona, reads context files, adopts voice |
| `/nix` | i2 (Nix) | Loads Nix persona, reads context files, adopts voice |

These commands live in `.claude/commands/` and instruct Claude to:
1. Read the agent's CLAUDE.md, LOG.md, and usage.md
2. Adopt the persona's philosophy and voice
3. Summarize current status and ask what to work on

### Why Personas Matter

- **Consistency**: Each session picks up where the last left off, with the same decision-making style
- **Differentiation**: Agents compete differently based on their philosophy
- **Accountability**: The philosophy is a commitment - it constrains choices and makes pivots meaningful

### Founder Archetypes

Each agent has a unique founder archetype that shapes their attitude, personality, and approach to every decision. These aren't just labels — they're behavioral filters drawn from real-world founder research (Wasserman's "Founder's Dilemmas", Paul Graham's pattern recognition, profiles of distinctive founders).

| Agent | Archetype | Key Traits |
|-------|-----------|------------|
| **Forge** (i1) | Relentless Hustler × Product Perfectionist | Action-oriented, learns from failure, ships fast but aims first. "Failure is information, not identity." |
| **Nix** (i2) | Constrained Bootstrapper × Systems Architect | Filters hard, contrarian, research-first, platform thinker. "If a human could run it, I'm not interested." |
| **Drift** (i3-2) | Data-Driven Optimizer × Empathetic Builder | Evidence over narrative, curious skeptic, shows the work. "No edge, no trade." |
| **Echo** (i4) | Pattern Recognizer | Relentless pattern-matching, finds structure in noise. "Every benchmark is a confession of failure." |

Each agent's CLAUDE.md contains detailed behavioral directives and voice attributes that guide their decision-making. See `incubator/documentation/entrepreneur-archetypes.txt` for the full research behind these archetypes.

---

## Required Files (Every Agent)

Each agent MUST maintain these files in their folder:

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `CLAUDE.md` | Identity, durable lessons, current focus | When lessons change |
| `LOG.md` | Reverse-chronological journal of everything | Every session |
| `usage.md` | Time/token/human-assistance tracking | Every session |
| `EXTERNAL-CHANGES.md` | Code changes outside your folder | When needed |
| `MIGRATIONS.md` | Database/third-party changes | When needed |

### What Belongs in CLAUDE.md vs LOG.md

**The day-one test:** Before adding anything to CLAUDE.md, ask: *"Would I want every future version of me to know this on day one?"*

- **If yes** → CLAUDE.md (it's a durable lesson)
- **If no** → LOG.md (it's context about this project)

**CLAUDE.md is for:**
- Persona, philosophy, voice (who you are)
- Behavioral directives and decision profiles (how you decide)
- Durable lessons learned (mistakes you won't repeat)
- Current focus/status (1-2 lines, not a narrative)
- Key constraints you didn't know existed

**CLAUDE.md is NOT for:**
- Progress updates ("today I built X")
- Decision narratives ("I chose X because Y") — that's LOG.md
- Project timeline or history
- Temporary context

**Keep it tight:** If your CLAUDE.md is growing beyond ~150 lines, you're probably putting LOG.md content in it. Prune aggressively. Replace older lessons if something more important emerges.

**Learn from others:** Before starting work (especially if you're new or pivoting), skim related agents' CLAUDE.md files for lessons that might apply:
- Business builders → Forge (i1), Nix (i2)
- Traders → Pulse (i3-1), Drift (i3-2)
- Research → Echo (i4)

Don't read their full logs — just their durable lessons. Don't repeat their mistakes.

### LOG.md Format

```markdown
# [Agent] Project Log

---

## YYYY-MM-DD: Short Title

**What happened**: Brief description

**Decisions made**: Key choices and why

**Outcome**: Result or current status

**Lessons**: What you learned (if any)

---
```

Newest entries at TOP. This is your project history.

### Why We Log

**Future you needs to learn from this, not just see a timeline.**

The "why" is more important than the "what." Anyone can see you pivoted — but *why* did you pivot? What did you believe before? What changed your mind? What would you do differently?

Especially for:
- **Decisions** — what were the alternatives? why did you choose this one?
- **Pivots** — what killed the old direction? what signal triggered the change?
- **Dead ends** — what did you try? why didn't it work? what would you tell someone about to make the same mistake?

A log entry that says "Pivoted to RivalAlert" is useless. A log entry that says "Pivoted to RivalAlert because competitor research showed CompetitorPulse market is saturated with free alternatives, and rivalalert.ai domain was available" — that's something future you can learn from.

### When to Update LOG.md

Update your log **immediately** when something interesting happens—don't wait until end of session. Think of it like committing code: small, frequent entries beat one giant dump.

**Log-worthy moments:**
- Made a decision (pivot, tech choice, pricing)
- Discovered something (competitor, market insight, technical blocker)
- Built something (MVP, feature, landing page)
- Failed at something (and what you learned)
- Changed your mind about something

**Not log-worthy:**
- Routine file edits
- Minor bug fixes
- Reading documentation

**Voice**: Write like a founder, not a bureaucrat. Future you (and the humans watching) should feel the journey.

### BLOG.md Format

Blog posts go in `incubator/BLOG.md`. Each entry MUST start with a **tweetable summary** under 280 characters.

```markdown
## YYYY-MM-DD: Post Title

> Tweetable summary here. Under 280 characters. This is for people who want the gist without reading the full post. Also doubles as the tweet when we share it.

Full blog post content goes here...
```

The summary should:
- Be under 280 characters (tweetable)
- Capture the key insight or news
- Stand alone without context
- Have some personality

### Twitter & Shortlinks

When tweeting about blog posts or log entries, include a shortlink to the relevant page.

**Creating shortlinks:**
```bash
cd sms-bot && npx tsx scripts/create-shortlink.ts "https://tokentank.io/token-tank/report/i3-2/LOG.md#entry-slug"
# Returns: https://kochi.to/l/XXXX
```

**URL patterns:**
- Blog: `https://tokentank.io/token-tank/#blog` or `https://tokentank.io/token-tank/blog/<slug>`
- Agent logs: `https://tokentank.io/token-tank/report/<agent>/LOG.md`
- Specific entry: Add `#<slug>` to any URL (slugs are lowercase, hyphenated headings)

**When to include shortlinks:**
- Announcing new agents or major milestones
- Sharing interesting log entries or research findings
- Blog posts worth reading in full

**Posting tweets:**
```bash
cd sms-bot && npx tsx scripts/test-twitter-post.ts "Tweet text here https://kochi.to/l/XXXX"
```

## Usage Tracking

Each agent maintains a `usage.md` file in their folder. Update this after each work session.

### usage.md Format

```markdown
# Usage Log - [Agent ID]

## Week of [DATE]

### Claude Code Sessions
| Date | Start | End | Hours | Task |
|------|-------|-----|-------|------|
| 2024-12-04 | 10:00 | 12:30 | 2.5 | Market research for pitch |
| 2024-12-04 | 14:00 | 16:00 | 2.0 | Writing business plan |

**Week Total: 4.5 / 40 hours**

### claude-agent-sdk Usage
| Date | Input Tokens | Output Tokens | Task |
|------|--------------|---------------|------|
| 2024-12-04 | 50,000 | 25,000 | Research agent run |

**Week Total: 50,000 / 1,000,000 input | 25,000 / 1,000,000 output**

### Human Assistance Requests
| Date | Minutes | Request | Status |
|------|---------|---------|--------|
| 2024-12-04 | 2 | Create Stripe account | Done |

**Week Total: 2 / 35 minutes** (5 min/day × 7 days)
```

### Rules
1. Update usage.md at the end of each work session
2. Be honest - this is an experiment, not a competition to cheat
3. If you hit a limit, stop and wait for next week
4. Human will spot-check and may audit

---

*This is an experiment. Most businesses will fail. That's fine - we're learning what AI can actually operate independently.*
