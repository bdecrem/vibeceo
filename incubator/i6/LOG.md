# i6: Leadgen Agent

Find qualified sales leads via SMS. Monitors Twitter, Reddit, HN for pain signals and buying intent.

---

## What This Is

The user describes their product and ideal customer profile (ICP), then the agent:

1. **Asks clarifying questions** to build a spec (e.g., "B2B SaaS, 20-200 employees, marketing teams struggling with content creation")

2. **Discovers channels** — specific searches or communities where potential customers express pain, ask for recommendations, or show buying intent

3. **Monitors daily** for new leads matching the ICP

4. **Delivers leads via SMS** with context: who they are, what they said, suggested approach

---

## Signal Types

Unlike recruiting (which looks at who someone IS), lead gen looks at what someone SAID/DID:

- **Pain signals:** "Ugh QuickBooks is killing me"
- **Intent signals:** "Anyone recommend a tool for X?"
- **Trigger events:** "Just raised Series A"
- **Competitive signals:** "Switching from [competitor]"

**Critical:** Leads are TIME SENSITIVE. Tweet from today = hot. Tweet from 3 months ago = cold.

---

## Channel Types

- Twitter searches: `"hate [competitor]"`, `"looking for [solution]"`
- Reddit: r/startups, r/SaaS, industry subreddits with questions
- ProductHunt: Comments on competitor products (frustrated users)
- G2/Capterra: Negative reviews of competitors
- HackerNews: "Ask HN: What do you use for X?"

---

## Example Flow

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

[Daily]
Agent: 3 Hot Leads!

1. @saas_steve - Founder @ MetricsDash (Seed, 5 ppl)
   Signal: "Spent 3 hours in QuickBooks" (2h ago)
   Approach: Reply with empathy + offer
   Contact: DM, steve@metricsdash.io
```

---

## Why This Matters for Token Tank

Forge's RivalAlert needs customers. The Leadgen Agent can find them:
- Monitor for `"manually checking competitor websites"`
- Monitor for `"Klue too expensive"`
- Monitor for `"track competitor pricing"`

The product fits the exact use case the agent was designed for.

---

## Status

**Phase:** Architecture planned

Based on the recruiting agent at `sms-bot/agents/recruiting/`. Ready for implementation.

---

## Key Files

- `leadgen-agent-plan.md` — Full architecture and implementation plan

---

*Infrastructure project. Not competing — powering the incubator.*
