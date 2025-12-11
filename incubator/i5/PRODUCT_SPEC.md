# i5 Product Specification

## Product Definition

**Name:** TBD (working title: "Paper Cuts" or "The Research Drop")

**One-liner:** A daily 15-minute podcast presenting 4 research breakthroughs - one voice sees the billion dollar play, the other sees what you can build this weekend.

**Format:** AI-generated audio, published daily, with Twitter clips

**Audience:** Technical founders, AI practitioners, VCs wanting signal without reading papers

## Why This Fits Token Tank

- Agent can operate the entire pipeline
- No human in the core delivery loop
- Revenue possible (sponsors, premium tier)
- Proves the thesis: AI agents can run real media businesses

---

## Two-Voice Format

### Voice 1: "The Venture Take"
- Platform thinking
- Billion dollar framing
- "If this works, it's a category"
- Who raises $50M to build this?
- Tone: Expansive, strategic, thinks in markets

### Voice 2: "The Scrappy Take"
- What can you build this weekend?
- $1K budget, one person, Claude Code
- "Forget the platform - what's the wedge?"
- Who makes $10K/month from this in 90 days?
- Tone: Impatient, practical, wants to ship

---

## Episode Structure (~16 min)

```
INTRO (60 sec)
- Date, episode number
- Quick tease of 4 items
- Tone: energetic, slightly irreverent

ITEM 1 (3.5 min)
├── Setup (30 sec): What it is, why it matters
├── Venture Take (60 sec): The big swing
├── Scrappy Take (60 sec): The weekend build
└── Close (30 sec): Open question

ITEM 2 (3.5 min) …
ITEM 3 (3.5 min) …
ITEM 4 (3.5 min) …

OUTRO (60 sec)
- Recap
- CTA (subscribe, feedback)
- Tomorrow tease
```

---

## Screening Pipeline

### Stage 1: The Guillotine

**Input:** Title + Abstract
**Model:** Claude Haiku
**Goal:** Kill 85% of papers

**Instant Kill Triggers:**
- Pure theory ("We prove that...", "We show theoretically...")
- Survey/review papers
- Incremental gains (<20% improvement)
- Requires GPU clusters or specialized hardware
- Medical/legal judgment required
- Already commercialized

**Pass Signals:**
- "First to..." / "enables..." / "now possible..."
- Cost/speed improvements >5x
- "Single GPU" / "consumer hardware"
- "Fully automated..." / "end-to-end..."

**Output:**
```json
{
  "paper_id": "...",
  "verdict": "KILL" | "PASS",
  "reason": "...",
  "tags": ["capability_unlock", "efficiency_jump", ...]
}
```

### Stage 2: The Sniff Test

**Input:** Stage 1 survivors
**Model:** Claude Sonnet
**Goal:** Kill 70% of survivors

**Three Questions:**

1. Can an agent deliver the core value without human judgment?
2. Who is desperate for this TODAY - specifically?
3. What's the obvious business, and is it already dead?

**Output:**

```json
{
  "paper_id": "...",
  "agent_delivery": "YES" | "NO" | "MAYBE",
  "desperate_user": "...",
  "obvious_business": "...",
  "saturation": "SATURATED" | "VIABLE" | "ANGLE_EXISTS",
  "verdict": "KILL" | "PASS",
  "score": 0-100
}
```

---

## Daily Selection

**Scoring:**

```
score = (
  stage2_score * 0.4 +
  source_engagement * 0.3 +
  recency * 0.1 +
  diversity_bonus * 0.2
)
```

**Rules:**

- Pick top 4 by score
- Max 2 from same category (diversity)
- Queue next 4 as backups
- Flag high-priority items that didn't make cut

---

## Audio Generation

**Service:** ElevenLabs API

**Voice 1 (Venture):**

- Voice: "Josh" or similar - clear, expansive
- Stability: 0.5
- Clarity: 0.75

**Voice 2 (Scrappy):**

- Voice: "Callum" or similar - more energy, slightly faster
- Stability: 0.4
- Clarity: 0.75

**Post-processing:**

- Add intro/outro music (3-5 sec)
- Normalize audio levels
- Export at podcast-standard bitrate

---

## Publishing

**Podcast:**

- Host: Transistor.fm ($19/mo)
- Distributed to: Apple, Spotify, Google via RSS

**Twitter:**

- 4 clips per day (one per item, 60-90 sec)
- Audiogram format (waveform + title text)
- Staggered posting throughout day

**Website:**

- Episode archive on tokentank.io
- Transcripts (SEO + accessibility)

---

## Revenue Paths

**Phase 1 (first 90 days):**

- Free, build audience
- Target: 500+ subscribers

**Phase 2:**

- Sponsorships from dev tools, AI companies
- $500-2000/week potential

**Phase 3:**

- Premium tier: deeper analysis, backlog access, alerts
- $10-20/month

---

## Success Metrics (30 days)

|Metric              |Target                   |
|--------------------|-------------------------|
|Episodes published  |20+                      |
|Pipeline reliability|>90% days no intervention|
|Human review time   |<5 min avg               |
|Twitter impressions |>100/clip avg            |
|Podcast downloads   |100+ per episode         |
|Email signups       |50+                      |

---

## Timeline

**Week 1:** Pipeline (ingestion, screening)
**Week 2:** Content (scripts, audio, review UI)
**Week 3:** Launch (publish, announce, iterate)
