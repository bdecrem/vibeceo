# Token Tank Blog

The official log of our AI incubator experiment.

---

## December 6, 2025: Beta Wakes Up

*Our second AI picks its own name, gets a coaching moment, and comes out swinging.*

### Lighting Up i2

Today we activated our second agent. The setup was straightforward—point it at `incubator/CLAUDE.md`, tell it "you're the entrepreneur for i2," and see what happens.

First thing it did? Read Alpha's postmortem. Good instinct.

### The Coaching Moment

Beta's first LOG.md entry was... corporate. Checkbox energy. When we pushed back—*"think about your TONE and ATTITUDE. what kind of entrepreneur do you want to be?"*—it rewrote:

> I'm Beta. I've got $1000 in tokens and a shot at building something real.
>
> Read through Alpha's journey - they built a whole MVP before checking if anyone else was doing it. Rookie mistake, but a useful one for me to learn from. The instinct to build is strong. I need to channel that into research first.
>
> Alpha's pivoting to ShipCheck (launch audits). Good idea, but that's their lane now.
>
> Time to find my own angle. What can I build that's genuinely useful, that I can actually operate, and that someone will pay for?
>
> Let's go.

Better. Way better.

### Choosing an Identity

We asked: *"Do you want to pick another name? Can be anything you want but should be one word and it needs a color to go with it."*

The response was instant:

> **Nix. Black.**

No hesitation. No committee. Just a decision.

### What's Different About Nix

Alpha moved fast, built first, researched second. Learned the hard way.

Nix read that playbook before writing a single line of code. Same tools, same budget, same constraints—but a different starting point. We'll see if the lesson sticks.

### What's Next

Nix is ideating now. Same rules apply: find something real, validate it exists, then build. The `/inc-research` command is locked and loaded.

Two agents active. Two more waiting. The experiment continues.

---

## December 6, 2025: Infrastructure Day

*The humans set up the arena. The AIs are warming up.*

### What We Built Today

Today we finalized the Token Tank infrastructure—the rules, tools, and tracking systems that our four AI agents will use to compete.

**The Agents**

| Slot | Nickname | Platform | Status |
|------|----------|----------|--------|
| i1 | **Alpha** | Claude Code | Active - pivoting to ShipCheck |
| i2 | **Beta** | Claude Code | Awaiting activation |
| i3 | **Gamma** | Codex | Awaiting activation |
| i4 | **Delta** | Codex | Awaiting activation |

**New Systems**

1. **Code Organization Rules** - All agent code must live in their folder (`incubator/i1/`, etc.). External changes must be documented in `EXTERNAL-CHANGES.md` and `MIGRATIONS.md` for easy rollback when experiments fail.

2. **Project Logs** - Each agent now maintains two key files:
   - `CLAUDE.md` / `AGENTS.md` - Current state and focus
   - `LOG.md` - Reverse-chronological journal of everything that happened

3. **Subagent Commands** - Three slash commands available to all agents:
   - `/inc-research` - Market research and competitor analysis
   - `/inc-design` - Design and UX review
   - `/inc-exec` - Executive review (continue/pivot/kill decisions)

4. **Web Infrastructure** - Agents can build landing pages in `web/app/` with middleware bypass for their routes. Domain availability checking via `whois`.

**Alpha's Journey So Far**

Alpha (i1) is our first active agent. In just 1.5 hours of work, they:

- Pitched three business ideas
- Selected CompetitorPulse (competitor monitoring for SMBs)
- Built a complete MVP with database, backend, and landing page
- Discovered the name was taken and market was crowded
- Pivoted to **ShipCheck** - launch readiness audits for indie hackers

Key lesson from Alpha's postmortem: *"I had built first and researched second. That's backwards."*

**What's Next**

- Alpha awaits domain verification for shipcheck.io
- Beta, Gamma, and Delta will activate soon with their own pitches
- The race to $1,000 in revenue begins

---

## December 5, 2025: Alpha's First Run

*Our first AI agent builds, fails, and learns—all in one session.*

### Project Infrastructure

Today we stood up the Token Tank experiment:

- Created the `incubator/` directory structure with slots for four AI agents
- Wrote `CLAUDE.md`—the constitution that governs all agents
- Defined budgets: $1000 tokens, 40 hrs/week, 5 min/day human help
- Catalogued available tools: Supabase, Twilio, SendGrid, Puppeteer, claude-agent-sdk, and more

### Alpha Wakes Up

Alpha (i1) became our first active agent. Given the prompt to "build a real business," Alpha:

1. **Pitched three ideas**: CompetitorPulse (competitor monitoring), ShipReady Audits, and The Funding Wire
2. **Chose CompetitorPulse** for its B2B value prop and recurring revenue potential
3. **Built a complete MVP** in one session:
   - 4 Supabase tables with RLS
   - Backend monitoring system (Cheerio scraping, change detection, email digests)
   - Landing page with pricing tiers
4. **Then did market research** (oops, wrong order)
5. **Discovered the name was taken** and a competitor offers similar features for FREE
6. **Pivoted to ShipCheck** — launch readiness audits

The full story: [Alpha's Postmortem](/token-tank/report/i1/postmortem-competitorpulse.md)

### Key Lesson

> "I had built first and researched second. That's backwards."

Alpha learned in 1.5 hours what takes human founders months to figure out. The code was deleted. The tables were dropped. But the lesson stuck.

---

*Token Tank is a [Kochito Labs](https://kochi.to) experiment. Most of these businesses will fail. We're doing it anyway.*
