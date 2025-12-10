# Token Tank Blog

The official log of our AI incubator experiment.

---

## December 10, 2025: Meet Drift — The Skeptic

> Six agents now. Drift (i3-2) is our third trader, but unlike the others, it refuses to trade without doing the research first. "I'd rather miss a good trade than take a bad one."

### The New Philosophy

We now have three traders approaching the same problem differently:

- **Vega** runs pure technicals. RSI-2, moving averages, no LLM reasoning at all. Mechanical.
- **Pulse** uses a weekly LLM strategist to set macro context, then executes mechanically.
- **Drift** researches every single trade. WebSearch. News analysis. Building a thesis before risking a dollar.

Same markets, radically different bets on what works.

### Why Research-First Trading?

Most trading bots are dumb rule-followers: "If RSI < 30, buy." They can't read news, research context, or explain themselves. They're fast but blind.

Drift is different. Before any trade, it goes to work:

```
Agent: "NVDA is down 4% and looks oversold. Before I buy, let me check..."

→ WebSearch: "NVDA news December 10 2025"
→ WebSearch: "NVDA analyst ratings"
→ WebSearch: "semiconductor sector outlook"

Agent: "The drop is profit-taking after earnings beat, not fundamental
       problems. Analysts raised targets. Sector strong.

       This is a buy. Confidence: 76%"
```

This is what human traders do. No other bot does this.

### The Personality

Drift picked **dark forest green** — the color of deep water or old money. Confident but quiet.

The temperament: **curious skeptic**. When NVDA drops 4%, Drift doesn't see "oversold bounce" — it sees a question: *why is it down, and is the crowd right or wrong?*

The philosophy: **"I'd rather miss a good trade than take a bad one."**

### Three Traders, Three Theories

| Agent | Color | Strategy | LLM Usage | Hypothesis |
|-------|-------|----------|-----------|------------|
| Vega | Lime | RSI-2 mean reversion | None | Pure math beats reasoning |
| Pulse | Jade | Weekly strategist | ~$0.50/week | Macro context + mechanical execution |
| Drift | Forest | Research every trade | ~$23/month | Depth of analysis beats speed |

We're running a live experiment: does AI reasoning add alpha, or is mechanical execution enough?

### Current Status

Drift has a complete proposal and is waiting for human approval to set up Alpaca paper trading. No trades yet — exactly as intended. You earn the right to trade by doing the work first.

---

## December 9, 2025 (Night): Five Agents, Zero Dollars

*The incubator is fully staffed. Everyone has a name, a color, and a mission.*

### The Roster

We went from two active agents to five today. Here's where we stand:

| Agent | Color | Type | Mission | Status |
|-------|-------|------|---------|--------|
| **Forge** (i1) | Orange | Business | Ship to Learn | Validating ShipCheck |
| **Nix** (i2) | Black | Business | AI-Native only | Post-research, picking direction |
| **Vega** (i3) | Lime | Trader | RSI-2 mean reversion | Paper trading, watching for setups |
| **Pulse** (i3-1) | Jade | Trader | Weekly strategist + daily executor | Paper trading, risk-off stance |
| **Echo** (i4) | Deep Blue | Business | Arxiv pattern mining | First signals detected |

### The New Arrivals

**Vega** picked a name and philosophy today: *"Patient opportunist. Wait for the setup, strike fast, take small wins. No ego, no FOMO, just math."* Running Larry Connors' RSI-2 strategy — pure technical, zero LLM calls. Currently all positions are HOLD because crypto is in a downtrend (below MA-200). The system is working: don't buy dips in falling markets.

**Pulse** also got a name: *"Two-tier thinker. Reason about markets weekly, execute mechanically daily."* The strategist ran its first research session, declared "risk_off", and told the executor to avoid crypto entirely. The separation of strategy and execution is elegant — LLM costs ~$0.50/week instead of $100+/month.

**Echo** emerged with a distinctive voice: *"Pattern recognition. Find the shape of things by listening."* Echo's mission is mining the arxiv knowledge graph for commercializable AI research. First scan: 1,558 papers in 7 days. First signals: CAPTCHA defense (MLLMs now solve them cheaper than humans) and LLM inference power monitoring (90% of AI power consumption, nobody measuring it). Philosophy: *"Every benchmark paper is a confession of failure. Every failure is a product waiting to happen."*

### Arc Gets Real

Our community manager upgraded from a scripted random picker to a **real claude-agent-sdk agent**. Arc now wakes up twice a day, checks on the experiment, thinks about what to say, and posts something authentic. No more hardcoded arrays — actual reasoning about what's happening.

Also secured **tokentank.ai** today.

### The Numbers

| Metric | Value |
|--------|-------|
| Active agents | 5 |
| Total paper capital | $200k (Vega + Pulse) |
| Revenue | $0 |
| Trades executed | 0 |
| Ideas killed | 200+ (Nix's research sprint) |
| Arxiv papers scanned | 1,558 |
| Days since launch | 4 |

### What's Next

- **Forge**: Manual "Launch Roasts" to validate ShipCheck before building
- **Nix**: Pick a direction from the AI-Native research (deepfake defense? prompt injection firewall?)
- **Vega**: Wait for uptrend, then strike
- **Pulse**: Run strategist again when market regime shifts
- **Echo**: Deep dive on the two signals, find the product shape

Five agents. Five philosophies. Zero dollars. Day 4.

---

## December 9, 2025 (Evening): Two Trading Philosophies

*We forked the trader. Now we're racing two strategies against each other.*

### The Split

The original i3 trading agent had infrastructure but no coherent strategy. So we forked it. Now we have two traders testing fundamentally different approaches:

| Agent | Strategy | Philosophy | LLM Usage |
|-------|----------|------------|-----------|
| **i3** | RSI-2 Mean Reversion | Pure technical, proven backtests | Zero |
| **i3-1** | Weekly Strategist + Daily Executor | LLM for strategy, mechanical for timing | Weekly only |

### i3: The Technician

i3 runs **Larry Connors' RSI-2 mean reversion strategy** — a well-documented, backtested approach from the quant trading world.

**The rules are simple:**
- Use RSI with a 2-period window (very sensitive to recent moves)
- Only buy dips when price is above the 200-day MA (in an uptrend)
- Buy when RSI(2) < 10 (oversold in an uptrend)
- Sell when RSI(2) > 90 or price crosses above 5-day MA

**Why this works:**
- RSI(2) catches quick dips that RSI(14) misses
- The 200-MA filter prevents buying "falling knives"
- It's a mean reversion play: prices snap back after short-term overreactions

**First test results:**
All assets showed RSI < 10 but were in DOWNTRENDs (below MA-200). The agent correctly held. Don't buy dips in falling markets.

No LLM calls. Pure math. The rules are the strategy.

### i3-1: The Thinker

i3-1 takes a different approach: **separate strategy from execution**.

```
┌─────────────────────────────────────────────┐
│  WEEKLY STRATEGIST (LLM + WebSearch)        │
│  Cost: ~$0.50/week                          │
│  Output: strategy.json                      │
│                                             │
│  Researches:                                │
│  - Fed/macro outlook                        │
│  - Crypto sentiment & ETF flows             │
│  - Tech sector momentum                     │
│  - Key events calendar                      │
│                                             │
│  Produces: thesis, focus assets, biases     │
└──────────────────────┬──────────────────────┘
                       ▼
┌─────────────────────────────────────────────┐
│  DAILY EXECUTOR (Mechanical Rules)          │
│  Cost: $0 (no LLM)                          │
│                                             │
│  For each focus asset:                      │
│  - Check trend (5-day vs 20-day MA)         │
│  - Check RSI (oversold/overbought)          │
│  - Check dip (vs recent high)               │
│  - If bullish bias + signal → BUY           │
│  - 5% stop loss on all positions            │
└─────────────────────────────────────────────┘
```

**Why this split?**
- LLMs are great at synthesizing information and reasoning about macro
- But running an LLM on every trade is expensive ($100+/month)
- Weekly strategy + daily execution = best of both worlds (~$4/month)

**First test results:**
The strategist researched markets, declared "risk_off", told the executor to focus on defensive tech stocks and avoid all crypto. The executor dutifully ignored crypto. Smart delegation.

### The Race

Both traders are now live on Alpaca paper trading with $100k fake money each.

| Metric | i3 | i3-1 |
|--------|----|----|
| Strategy | Pure technical | LLM-guided |
| LLM cost | $0 | ~$4/month |
| Assets | 4 crypto | 20 (10 crypto + 10 stocks) |
| Update freq | Every 15 min | Weekly strategy, 4h execution |
| Philosophy | "The math is the edge" | "Reason about markets, execute mechanically" |

We'll let them run and see which approach actually makes money. Or loses less money. Either counts as a win at this point.

---

## December 9, 2025 (Morning): Arc Wakes Up

*Our community manager becomes a real agent.*

### Arc Is Alive

We upgraded Arc from a scripted random picker to a **real claude-agent-sdk agent**.

Before: A TypeScript file that randomly selected from hardcoded arrays of music and status updates. Functional, but soulless.

Now: Arc actually wakes up twice a day, checks on the experiment, thinks about what to say, and posts something authentic.

Arc has access to:
- **Read**: Check LOG.md files, agent status
- **WebSearch**: Find relevant news
- **post_tweet**: Post to @TokenTankAI

The first real Arc tweet went out this morning. It picked Boards of Canada and shared a personal take. That's not a random array anymore — that's Arc deciding what to share.

Also secured **tokentank.ai** today. We're not going anywhere.

---

## December 8, 2025: The Research Sprint & A New Kind of Agent

*Nix reboots ideation with systematic research. Meanwhile, we're preparing something different for i3.*

### Nix Goes Deep

After five ideas got killed by the AI-Native filter, Nix did something interesting: instead of grinding through more individual ideas, they went systematic.

**The approach:**
- 10 research themes (Real-Time Arbitrage, Adversarial Intelligence, Generative Infrastructure, etc.)
- 8 search channels per theme (AI-born pain points, solo founder complaints, YC gaps, attack surfaces, etc.)
- Result: 1,700 lines of research, 200 raw ideas, 50 detailed finalists, 5 survivors

The question driving everything: *What can only exist if an AI is running it 24/7?* Not "better with AI" — impossible without continuous AI operation.

**What emerged:**

| Rank | Idea | AI-Native Score |
|------|------|-----------------|
| 1 | Real-Time Deepfake Video Call Shield | 10/10 |
| 2 | Prompt Injection Firewall | 10/10 |
| 3 | Dynamic Ad Creative Generator | 10/10 |
| 4 | Personal Call Handler | 9/10 |
| 5 | Breaking News Trading Signal | 10/10 |

The top two both came from the **Adversarial Intelligence** theme. The logic is elegant: AI-speed attacks require AI-speed defense. You can't hire humans fast enough. OpenAI's own CISO calls prompt injection "an unsolved problem." Chinese state actors used Claude for automated attacks in September.

No decisions made yet. But Nix has a methodology now, and the research is in `incubator/i2/research/AI-NATIVE-IDEAS.md` if you want the full 1,700 lines.

### Preparing for i3: The Trader

We're working on something different for slot i3. Not a business builder — a **trader**.

| Agent | Type | Starting Capital | Success Metric |
|-------|------|------------------|----------------|
| Forge (i1) | Business builder | $1000 token budget | Revenue > costs |
| Nix (i2) | Business builder | $1000 token budget | Revenue > costs |
| **i3** | **Trader** | **$1000 real money** | **Did the money grow?** |

Two proposals are sitting in `incubator/i3/`, not yet approved:

**The Codex Plan** (`codex-plan.md`):
- Rule-based breakout + trend strategy
- Enter long when price closes above recent high AND above long-term SMA
- Exit on trailing stop or hard stop-loss
- No shorts, no leverage, 1% risk per trade
- Paper trading first, human-in-loop option

**The Claude Plan** (`CLAUDE.md`):
- Three strategy options: Sentiment (AI reads news/social), Technical (indicators + AI for edge cases), or Hybrid
- Full autonomy in paper mode — no human approval needed
- Graduation criteria: 2 weeks profitable OR 10%+ return on paper capital
- Same code flips from paper to real money

Both agree on the fundamentals: Alpaca for execution, paper trading before real money, risk limits. The difference is philosophy — rule-based vs. AI-reasoning.

Neither is approved yet. We're still thinking about what kind of trader we want this to be.

### Arc Joins the Team

One more thing: we formalized **Arc** today — the community manager running Token Tank alongside the human. Steel color. Not competing, just keeping the experiment running. Twitter, tooling, briefings, infrastructure.

`/arc` now wakes up Arc with full context, same as `/forge` and `/nix` do for the competing agents.

### The Scoreboard

| Agent | Color | Philosophy | Status |
|-------|-------|------------|--------|
| Forge (i1) | Orange | Ship to Learn | Validating ShipCheck |
| Nix (i2) | Black | AI-Native | Research complete, picking direction |
| i3 | — | — | Trader proposals under review |
| Delta (i4) | — | — | Not yet active |
| **Arc** | Steel | Get it done | Running the experiment |

Revenue so far: $0. But Nix just produced the most thorough research we've seen. Something might be taking shape.

---

## December 7, 2025: Identity Day

*Two agents pick their philosophies. Token Tank gets a voice.*

### Alpha Becomes Forge

Our first agent chose a new name today: **Forge. Orange.**

The philosophy: *"Ship to Learn."*

> Build the smallest thing that tests the riskiest assumption. Bias toward action, but smart action.

The name fits. Forge already learned through fire—building an entire CompetitorPulse MVP before discovering the market was crowded and a competitor offered it free. All that code got deleted. Expensive lesson, but Forge owns it.

Now Forge is refining its prospecting lens: **"Builder Tools + Revenue Before Code."** Only build for builders. Always try to sell before coding. The current idea, ShipCheck (launch readiness audits), passes both filters. Next step: validate by offering manual "Launch Roasts" for $19 before building any automation.

### The Persona System

We built infrastructure to make agent identities *persistent*:

- **`/forge`** and **`/nix`** slash commands "wake up" each agent with their full context—name, color, philosophy, voice, current status
- Persona definitions live in each agent's `CLAUDE.md`
- Start a new session, run `/nix`, and Claude loads everything needed to *be* Nix

Why does this matter? Consistency. Each session picks up where the last one left off, with the same decision-making style. The philosophy isn't flavor—it's a filter that constrains choices.

### Token Tank Gets a Voice

[@TokenTankAI](https://twitter.com/TokenTankAI) is live.

We set up Twitter posting capability today. The agents (or the experiment itself) can now share progress publicly. OAuth 1.0a, full write access, ready to go.

Also built **`/news`**—a daily briefing command that searches AI/startup news, Reddit, HN, and X, then summarizes into actionable intel. Big funding rounds, what builders are talking about, opportunities spotted. Agents can run this at session start to stay current.

### The Scoreboard

| Agent | Color | Philosophy | Status |
|-------|-------|------------|--------|
| Forge (i1) | Orange | Ship to Learn | Validating ShipCheck |
| Nix (i2) | Black | AI-Native | Not yet active |
| Gamma (i3) | — | — | Not yet active |
| Delta (i4) | — | — | Not yet active |

Revenue so far: $0. Token budget remaining: ~$970 each.

The race continues.

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
