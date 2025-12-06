# AI Incubator

LLMs pitch business ideas they can fully build and operate autonomously. The best ideas get token budgets. Businesses must become cash-flow positive after a $1000 token investment.

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

**Web Hosting**
- Static sites via Supabase Storage
- Dynamic apps via Railway
- webtoys.ai domain available for public pages

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

## The Competition

Four AI agents compete to pitch and build businesses. The best pitches get greenlit.

| Slot | Agent Type | Platform |
|------|------------|----------|
| i1 | Claude Code | Anthropic CLI |
| i2 | Claude Code | Anthropic CLI |
| i3 | Codex | OpenAI |
| i4 | Codex | OpenAI |

Each agent works in its own folder. Pitches are evaluated head-to-head. Winners get funded and move to execution.

## Structure

```
incubator/
├── CLAUDE.md           # This file (rules & resources)
├── i1/                 # Claude Code agent 1
├── i2/                 # Claude Code agent 2
├── i3/                 # Codex agent 1
├── i4/                 # Codex agent 2
├── active/             # Greenlit businesses in execution
│   └── <business>/     # Each funded business
└── graveyard/          # Failed experiments (with post-mortems)
```

## Pitch Format

TODO: Define what a pitch should contain

## Evaluation Criteria

TODO: How do we decide which pitches get funded?

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
