# Lead Gen Agent - Plan & Architecture

Based on the recruiting agent architecture in `sms-bot/agents/recruiting/`.

## Core Concept Mapping

| Recruiting | Lead Gen |
|------------|----------|
| Job criteria → Candidates | Product + ICP → Leads |
| Skills/experience signals | Pain/intent/trigger signals |
| "Can this person do the job?" | "Does this person need my product?" |

## Signal Types Are Fundamentally Different

**Recruiting signals** = who someone IS:
- GitHub repos, job title, work history
- Relatively static, don't expire quickly

**Lead gen signals** = what someone SAID/DID:
- "Ugh QuickBooks is killing me" (pain)
- "Anyone recommend a tool for X?" (intent)
- "Just raised Series A" (trigger event)
- "Switching from [competitor]" (competitive)

**Critical implication**: Leads are TIME SENSITIVE. A tweet from today = hot. Tweet from 3 months ago = cold. The collection cycle needs to be faster (maybe hourly, not daily).

## Channel Types

Recruiting channels focus on **profiles** (GitHub, LinkedIn).

Lead gen channels focus on **conversations**:
- Twitter searches: `"hate [competitor]"`, `"looking for [solution]"`, `"anyone recommend"`
- Reddit: r/startups, r/SaaS, industry subreddits with questions
- ProductHunt: Comments on competitor products (frustrated users)
- G2/Capterra: Negative reviews of competitors
- HackerNews: "Ask HN: What do you use for X?"
- LinkedIn posts: Founders/buyers complaining about problems

## Proposed Flow

```
User: LEADS my product helps startups automate bookkeeping

Agent: Bookkeeping automation for startups. Quick Qs:
(1) Target: Solo founders, Seed, or Series A+?
(2) Specific industries or all startups?

User: Seed to Series A, SaaS and e-commerce

Agent: Got it. I'd search:
- Twitter: founders complaining about QuickBooks/Xero
- Reddit: r/startups bookkeeping threads
- ProductHunt: accounting tool comment sections
APPROVE or adjust?

User: APPROVE

Agent: Found 6 channels with real examples:
1. Twitter "bookkeeping nightmare startup" → @jane_ceo (yesterday)
2. Reddit r/startups "best accounting" → 12 founders asking
[...]
APPROVE to start monitoring?

User: APPROVE

[Daily/hourly]
Agent: 3 Hot Leads!

1. @saas_steve - Founder @ MetricsDash (Seed, 5 ppl)
   Signal: "Spent 3 hours in QuickBooks" (2h ago)
   Approach: Reply with empathy + offer
   Contact: DM, steve@metricsdash.io

SCORE 1:5 2:3...
```

## Key Architecture Additions

Beyond adapting the recruiting structure:

1. **Lead Enrichment** - Twitter handle → email, company size, funding stage (Apollo, Clearbit, Proxycurl)

2. **Outreach Suggestions** - "Here's what to say to this lead based on their signal"

3. **Faster Cycles** - Hourly or near-real-time for high-value signals vs daily

4. **Signal Consolidation** - Same person on Twitter AND Reddit = higher confidence

5. **Scoring Criteria**:
   - ICP fit (company size, industry, role)
   - Signal strength (venting vs actively seeking)
   - Recency (hours, not days)
   - Authority (decision maker?)
   - Accessibility (can we reach them?)

## Challenges

1. **Signal noise** - Lots of complaining online, not all genuine buying intent
2. **Contact info** - Harder to get emails from Twitter/Reddit than LinkedIn
3. **API restrictions** - Twitter API expensive, Reddit restricted, no G2 API
4. **Competition** - Syften, Mention, Brand24 do social listening

## Why SMS Makes This Special

1. **Speed** - Lead signals via text = can respond in minutes, not hours
2. **Learning loop** - User scores refine ICP continuously
3. **Suggested outreach** - AI drafts personalized first message
4. **Human judgment** - You decide what's worth pursuing, not just automation

---

## Summary (for sharing)

The Lead Gen Agent helps users find qualified sales leads via SMS. The user describes their product and ideal customer profile (ICP), then the agent asks clarifying questions to build a spec (e.g., "B2B SaaS, 20-200 employees, marketing teams struggling with content creation"). Once approved, a Python agent with web search discovers 4-8 "channels" — specific searches or communities where potential customers express pain, ask for recommendations, or show buying intent. Each proposed channel includes a verified real example (an actual person/post found via web search). The user approves which channels to monitor.

The agent then monitors these channels daily (or more frequently) for new leads. Realistic channel types include: Twitter searches for pain signals ("hate QuickBooks", "looking for alternative to X"), Reddit threads where people ask for tool recommendations (r/startups, r/SaaS, industry subreddits), ProductHunt comments on competitor products, HackerNews "Ask HN" threads, and G2/Capterra reviews of competitors. Each lead includes: the person's name/handle, the signal that triggered detection (what they said), ICP fit assessment, suggested outreach approach, and contact info when available.

The user scores leads 1-5, and the agent learns their preferences over time — refining what counts as a qualified lead for their specific product. Unlike generic social listening tools, this agent is trained on the user's ICP and improves with feedback, delivering a curated shortlist rather than a firehose of mentions.

---

## Technical Reference

Based on recruiting agent at `sms-bot/agents/recruiting/`:
- `index.ts` - Main orchestrator
- `source-discovery-agent.ts` - Conversational spec building
- `discover-channels-agent.py` - Python agent with web search for channel discovery
- `candidate-scorer.ts` - AI scoring/selection
- `collectors/*.ts` - Platform-specific data collection
