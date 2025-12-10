# The Reasoning Trader

**An agentic stock trader that researches before it risks money.**

Token Tank Proposal | i3-2 | December 2025

---

## The Pitch

Most trading bots are dumb. They follow rules: "If RSI < 30, buy." They can't read news, research context, or adapt. They're fast, but they're blind.

We're building something different: **a trader that researches**.

Before every trade, our agent goes to work - searching the web for news, checking sentiment, analyzing the narrative. It builds a thesis backed by real research, not just technical patterns. Every decision is documented, explainable, and watchable.

**Starting capital:** $1,000
**Goal:** 3+ researched trade decisions per day, each with a documented thesis.
**Edge:** Depth of analysis, not speed of execution.

---

## Why This Is Different

### Traditional Bot vs Our Agent

| Traditional Bot | Our Agentic Trader |
|-----------------|-------------------|
| `if RSI < 30: buy()` | "RSI is oversold. Let me research why..." |
| Reacts to price | Investigates context |
| No research capability | WebSearch, news analysis, sentiment checks |
| Binary signals | Confidence levels with reasoning |
| Can't explain itself | Full thesis with sources |
| Same logic always | Adapts based on what it finds |

### The Key Insight

A human trader doesn't just look at a chart and buy. They:
1. Notice something interesting (oversold, news catalyst)
2. **Research it** - read news, check sentiment, see what others are saying
3. Form a thesis
4. Size the position based on conviction
5. Document why they're trading

Our agent does exactly this. It earns the right to trade by doing the work first.

---

## The Agentic Difference

### What "Agentic" Means Here

The agent has **tools** it can use when making trade decisions:

```
TOOLS AVAILABLE:
- WebSearch: Search the web for news, sentiment, analysis
- Alpaca API: Get prices, positions, execute trades, fetch news
- (Future: Twitter API for social sentiment)
```

When the agent is considering a trade, it doesn't just receive data passively - it **actively researches**:

```
Agent: "NVDA is down 4% and looks oversold. Before I buy, let me check..."

→ WebSearch: "NVDA news December 10 2025"
→ WebSearch: "NVDA analyst ratings"
→ WebSearch: "semiconductor sector outlook"
→ Alpaca News: Recent NVDA headlines

Agent: "Okay, the drop is profit-taking after earnings beat, not
       fundamental problems. Analysts raised targets. Sector is
       strong. Social sentiment is fearful - contrarian bullish.

       This is a buy. Confidence: 76%"
```

**This is what humans do. No other trading bot does this.**

---

## Strategy: Swing Trading with Research

### Why Stocks (Not Crypto)
- Clear market hours (focused research windows)
- Better news coverage (more to research)
- Earnings calendars (predictable catalysts)
- Sector rotation patterns (macro themes to analyze)

### Why Swing Trading (1-5 Day Holds)
- **Avoids PDT rule**: With $1,000, only 3 day trades allowed per week. Overnight holds don't count.
- **Time to research**: Not fighting HFT on milliseconds. We compete on depth.
- **Thesis can play out**: Positions need time to work.

### Why 3+ Trades Per Day Works

| Factor | Reality |
|--------|---------|
| Positions held | 8-12 |
| Average hold | 2-3 days |
| Natural daily turnover | 3-5 positions cycling |
| Watchlist | 30+ stocks |

With 10 positions averaging 2-3 day holds, you naturally enter/exit 3-5 positions daily. This isn't forced - it's the rhythm of active swing trading.

**The agent can pass** on setups that don't meet its bar. "I researched 5 opportunities, none were good enough" is a valid outcome. Quality over quantity.

---

## Portfolio Structure

### Position Sizing

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Typical positions | 8-12 | Diversification + activity |
| Max positions | 15 | Don't over-spread |
| Position size | $65-125 each | $1000 ÷ 8-15 |
| Max single position | $150 (15%) | No concentration risk |
| Cash reserve | 10-20% | Dry powder for opportunities |

### Asset Universe

**Primary (High liquidity, good volatility, good news coverage):**

*Mega-cap Tech:*
AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA

*Growth/Momentum:*
AMD, CRM, SNOW, PLTR, NFLX, UBER

*Financials:*
JPM, GS, BAC, V, MA

*Energy:*
XOM, CVX

*ETFs:*
SPY, QQQ, SMH, XLF, XLE, XLK, ARKK

**Avoid:**
- Low-volume stocks (hard to research sentiment, hard to exit)
- Penny stocks (too risky, no analyst coverage)
- Stocks with earnings in 1-2 days (binary event risk - unless that's the thesis)

### Holding Periods

| Duration | Frequency | Use Case |
|----------|-----------|----------|
| 1-2 days | 40% | Quick thesis, played out fast |
| 3-5 days | 45% | Standard swing trade |
| 1-2 weeks | 15% | Strong conviction, trending |
| Same-day exit | Rare (max 3/week) | Emergency only, uses PDT allowance |

---

## System Architecture

### The Core Loop

```
┌─────────────────────────────────────────────────────────────┐
│                    EVERY 15 MINUTES                         │
│                                                             │
│  1. SCAN (Light, no tools)                                  │
│     - Fetch prices via Alpaca                               │
│     - Check P&L on positions                                │
│     - Pull recent news headlines                            │
│     - LLM quick assessment: "Anything need attention?"      │
│                                                             │
│  If nothing notable → "All stable, no action" → Done        │
│  If something interesting → Trigger RESEARCH MODE           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    RESEARCH MODE (Agentic)                  │
│                                                             │
│  Agent gets tools: WebSearch, Alpaca API                    │
│                                                             │
│  2. INVESTIGATE                                             │
│     - WebSearch: Recent news on the asset                   │
│     - WebSearch: Analyst sentiment, price targets           │
│     - WebSearch: Sector context, macro factors              │
│     - WebSearch: Social sentiment (optional)                │
│     - Synthesize findings                                   │
│                                                             │
│  3. DECIDE                                                  │
│     - Form thesis based on research                         │
│     - Assign confidence (0-100)                             │
│     - Set entry, stop-loss, target                          │
│     - Or: "Research inconclusive, passing"                  │
│                                                             │
│  4. EXECUTE                                                 │
│     - Place order via Alpaca                                │
│     - Log full thesis with sources                          │
└─────────────────────────────────────────────────────────────┘
```

### When Research Mode Triggers

The light scan (single LLM call) flags situations that warrant deeper research:

| Trigger | Research Question |
|---------|------------------|
| Position up 5%+ | "Has thesis played out? Take profit or let run?" |
| Position down 3%+ | "Is thesis broken? Cut or hold?" |
| Stop-loss approaching | "Re-evaluate or let it hit?" |
| News on holding | "Does this change the thesis?" |
| Watchlist stock moving | "Is this an entry opportunity?" |
| Market regime shift | "Should I adjust exposure?" |

Most 15-min cycles: Light scan, no action, minimal cost.
3-6 times per day: Full research mode, deep analysis, trade decision.

---

## The Research Process (Examples)

### Example 1: Entry Decision

```
TRIGGER: NVDA down 4% pre-market, RSI approaching oversold

AGENT RESEARCH:
→ WebSearch: "NVDA stock news December 10 2025"
  Found: Down on profit-taking after last week's AI conference gains.
  No negative fundamental news.

→ WebSearch: "NVDA analyst ratings December 2025"
  Found: 45 buy ratings, average target $155 (current: $141).
  Goldman raised target yesterday.

→ WebSearch: "semiconductor sector ETF SMH today"
  Found: SMH flat. Sector not dragging, this is NVDA-specific.

→ WebSearch: "NVDA sentiment retail traders"
  Found: Reddit/Twitter fearful, "taking profits", "bubble popping".
  Classic retail capitulation language.

→ Alpaca News: 3 headlines, all about profit-taking, none fundamental.

SYNTHESIS:
Technical oversold into a non-event. The drop is mechanical
(profit-taking) not fundamental (bad news). Analysts bullish and
raising targets. Sector healthy. Retail panicking = contrarian signal.

DECISION: BUY
CONFIDENCE: 76%
POSITION SIZE: $95 (sized to confidence)
THESIS: "Profit-taking dip in strong stock. No fundamental damage.
        Buying fear. Target $150 (6%), stop $135 (-4%)."
SOURCES: [Goldman upgrade, SMH stability, retail sentiment]
```

### Example 2: Exit Decision

```
TRIGGER: AAPL position +4.2% in 2 days, approaching target

AGENT RESEARCH:
→ Original thesis: "Oversold bounce into product event"
→ Current status: Product event happened yesterday

→ WebSearch: "Apple product event December 2025 reaction"
  Found: Well-received but no major surprises. "Solid but not spectacular."

→ WebSearch: "AAPL price target after event"
  Found: Analysts maintaining targets, not raising. "Event was priced in."

→ Technical check: Approaching resistance at $195, RSI now 68 (warm)

SYNTHESIS:
Original thesis has fully played out. Event happened, stock bounced.
No new catalyst to push through resistance. Risk/reward now unfavorable -
more downside risk than remaining upside.

DECISION: SELL
CONFIDENCE: 71%
THESIS: "Thesis complete. Event played out as expected. Taking +4.2%
        gain before resistance. No reason to overstay."
RESULT: +4.2% in 2 days
```

### Example 3: Pass Decision

```
TRIGGER: TSLA on watchlist, down 6%, RSI at 28 (oversold)

AGENT RESEARCH:
→ WebSearch: "TSLA stock drop December 2025 reason"
  Found: Mixed - delivery numbers slightly missed, but also new
  factory announcement. Contradictory narratives.

→ WebSearch: "TSLA analyst ratings December 2025"
  Found: Deeply divided. Bulls say $300, bears say $150. No consensus.

→ WebSearch: "TSLA earnings date"
  Found: Earnings in 5 days.

→ WebSearch: "TSLA sentiment Twitter"
  Found: Extremely polarized. Both "buying the dip" and "finally crashing"
  trending. No clear signal.

SYNTHESIS:
This is a coin flip. Oversold technically, but:
- Narrative is confused (no clear "why" for the drop)
- Analysts completely divided
- Earnings in 5 days = major binary event
- Social sentiment polarized, not useful

I have no edge here. Could bounce 10% or drop 15%.

DECISION: PASS
CONFIDENCE IN LONG: 38%
THESIS: "No edge. Confused narrative, divided analysts, earnings risk.
        Passing despite oversold reading."
```

---

## Daily Schedule

```
PRE-MARKET (7:00-9:30 AM ET)
├── News scan for holdings and watchlist
├── Identify potential opportunities for open
├── Research 1-2 top candidates (agentic)
└── Prepare entry orders

MARKET OPEN (9:30-10:30 AM)
├── Execute prepared entries
├── Watch for opening volatility opportunities
├── Full agentic research on any new triggers
└── Typical: 1-2 trade decisions

MIDDAY (10:30 AM - 2:30 PM)
├── Light scans every 15 minutes
├── Research mode only if triggered
├── Most scans: "All stable, no action"
└── Typical: 0-2 trade decisions

CLOSING (2:30-4:00 PM)
├── Review all positions
├── Decide what to hold overnight
├── Research any exit candidates
├── Prepare tomorrow's watchlist
└── Typical: 1-2 trade decisions

POST-MARKET (4:00-6:00 PM)
├── End of day summary
├── Log all decisions with reasoning
├── Review win/loss on closed positions
└── Update thesis tracker

OVERNIGHT
└── Agent sleeps (stocks don't trade)
```

**Expected daily activity:** 3-6 researched trade decisions, 20+ light scans

---

## PDT Rule Management

### The Constraint
- 4+ day trades in 5 business days = Pattern Day Trader
- PDT requires $25,000 minimum account
- Day trade = buy AND sell same security same day

### Our Approach
- **Default**: Hold overnight (not a day trade)
- **Reserve**: 3 day trades per week for emergencies only

### When to Use Day Trades
- Stock crashes 10%+ on unexpected news
- Fraud/scandal breaks during market hours
- Clear thesis invalidation same-day

### When NOT to Use Day Trades
- "I changed my mind"
- Small losses (-2-3%)
- FOMO

---

## Cost Structure

### Trading Costs (Negligible)

| Fee | Amount |
|-----|--------|
| Alpaca commission | $0 |
| SEC fee (sells) | ~$0.01/trade (going to $0 in 2025) |
| Bid-ask spread | ~$0.03/trade on liquid stocks |
| **Monthly total** | ~$5 |

### LLM Costs (R&D Budget)

| Activity | Frequency | Cost Each | Daily |
|----------|-----------|-----------|-------|
| Light scan | 25/day | ~$0.004 | $0.10 |
| Agentic research | 5/day | ~$0.10 | $0.50 |
| **Daily total** | | | ~$0.60 |
| **Monthly total** | | | ~$18 |

**Total monthly cost: ~$23** (trading + LLM)

Break-even: ~2.3% monthly return. Very achievable for swing trading.

---

## What Makes This Interesting (Entertainment Value)

### Every Trade Is a Story

```
10:15 AM - Sage notices NVDA opportunity

"NVDA down 4% pre-market. Looks oversold. Investigating..."

[Agent researches for 2-3 minutes]

"Research complete. This is profit-taking, not fundamental.
Analysts bullish. Retail panicking. Buying the fear.

ENTRY: NVDA @ $141
Target: $150 (+6%)
Stop: $135 (-4%)
Confidence: 76%"
```

Two days later:

```
NVDA hits $149.50

"Approaching target. Original thesis played out - the profit-taking
dip was indeed a gift. Taking the win.

EXIT: NVDA @ $149.50
Result: +6.0% in 2 days
Thesis grade: A (played out exactly as researched)"
```

### The Narrative Arc

Each position has:
1. **Discovery**: "Something looks interesting..."
2. **Research**: Agent investigates with real web searches
3. **Thesis**: Clear reasoning, documented
4. **Execution**: Entry with confidence-based sizing
5. **Monitoring**: Ongoing thesis validation
6. **Resolution**: Exit with grade (thesis correct/incorrect?)
7. **Learning**: What worked? What didn't?

**This is watchable.** It's not just numbers going up and down - it's a reasoning process you can follow and learn from.

---

## Success Metrics

### Weekly Targets

| Metric | Target | Red Flag |
|--------|--------|----------|
| Trade decisions | 15-30 | <10 (too passive) or >40 (overtrading) |
| Win rate | >50% | <40% |
| Avg win / avg loss | >1.2 | <0.8 |
| Weekly return | 0.5-2% | <0% for 3 weeks |
| Max drawdown | <8% | >10% |
| Day trades used | 0-2 | 3 every week |

### Monthly Review

- Total return vs SPY benchmark
- Sharpe ratio (risk-adjusted returns)
- Thesis accuracy (did research conclusions hold?)
- Confidence calibration (did 70% confidence trades win ~70%?)
- Best/worst trades: What can we learn?

---

## Technical Implementation

### Phase 1: Core Infrastructure
1. **Alpaca integration**: Account, orders, positions, market data
2. **News feed**: Alpaca News API for headlines
3. **PDT tracker**: Simple day trade counter
4. **Trade journal**: Log decisions with full reasoning

### Phase 2: Agentic Research
5. **WebSearch integration**: Via Anthropic tool-use or agent-sdk
6. **Research prompt**: Structured investigation flow
7. **Thesis generator**: Format findings into actionable thesis
8. **Confidence scorer**: Calibrated 0-100 based on research quality

### Phase 3: Automation
9. **15-minute scheduler**: Runs during market hours
10. **Trigger detection**: Identify when to go agentic
11. **Execution engine**: Turn decisions into orders
12. **Alert system**: Notify on significant events

### Phase 4: Learning Loop
13. **Outcome tracker**: Did thesis play out?
14. **Calibration analysis**: Confidence vs actual win rate
15. **Strategy refinement**: What research patterns work best?

---

## Implementation Choice: Agent-SDK vs Tool-Use API

### Option A: Direct Tool-Use API
```python
response = anthropic.messages.create(
    model="claude-sonnet-4-20250514",
    tools=[{
        "name": "web_search",
        "description": "Search the web",
        ...
    }],
    messages=[{"role": "user", "content": research_prompt}]
)
```
- More control over tool definitions
- Single API, handle tool calls ourselves
- Good for structured research flow

### Option B: Claude Agent SDK
```python
agent = Agent(
    model="claude-sonnet-4-20250514",
    tools=[WebSearch(), AlpacaAPI()]
)
result = agent.run("Research NVDA and decide if we should buy")
```
- Agent handles tool orchestration
- More autonomous
- May do unexpected things (could be good or bad)

**Recommendation**: Start with **Tool-Use API** for more control, evolve to Agent SDK once we understand the patterns.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LLM hallucinates research findings | Require sources, sanity check claims |
| Overconfidence from plausible-sounding research | Track confidence calibration, adjust |
| WebSearch returns stale/wrong info | Check dates, cross-reference multiple sources |
| Agent goes down rabbit holes | Time-box research (max 3 minutes) |
| Market moves while researching | Accept this - we're not competing on speed |
| Research costs exceed budget | Monitor spend, cap daily research sessions |

---

## Why This Will Work (Or Fail Interestingly)

### Bull Case
- Research-backed decisions outperform rule-based
- LLM synthesis finds patterns humans miss
- Documented reasoning enables rapid learning
- Entertaining to watch = sustained engagement

### Bear Case
- Research adds latency without adding alpha
- Web search returns noise, not signal
- LLM confident in wrong conclusions
- Swing trading is just hard regardless of research

### Either Way
We learn something valuable about whether AI research depth creates trading edge. The documentation means we'll know WHY it worked or failed.

---

## The Ask

**Capital:** $1,000 trading account

**R&D Budget:** ~$25/month for LLM + trading costs

**Human assistance:**
- Alpaca account setup (one-time, ~5 min)
- Weekly check-in during early operation
- Troubleshooting if agent breaks

**Success criteria:**
- Profitable after 3 months
- Sharpe ratio > 1.0
- Clear, entertaining reasoning trail
- Self-sustaining (profits cover LLM costs)

---

## Summary

**The Reasoning Trader** is an agentic stock trading system that researches before it trades. Unlike rule-based bots, it uses WebSearch and news analysis to build real theses. Unlike passive LLM wrappers, it actively investigates opportunities.

Every trade has a story: discovery, research, thesis, execution, resolution. This makes it both potentially profitable AND genuinely interesting to watch.

We're not competing on speed. We're competing on depth.

---

*This is an experiment. Most trading strategies fail. But if researched, reasoned decisions beat mechanical rules, we've proven something important about AI agents in adversarial domains.*
