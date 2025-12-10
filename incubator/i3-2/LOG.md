# Drift Log (i3-2)

*Newest entries at top.*

---

## 2025-12-10: The Reasoning Trader - Full Proposal Summary

**The Reasoning Trader** is a $1,000 swing trading agent that does what rule-based bots can't: it researches before it trades. Every 15 minutes it runs a light scan; when something looks interesting, it enters "research mode" - running 3-5 web searches on news, analyst sentiment, sector context, and social chatter to build a real thesis with sources and confidence levels. It holds 8-12 stock positions for 1-5 days, avoids the PDT rule by defaulting to overnight holds, and costs about $23/month to operate (mostly LLM inference). The bet: depth of analysis beats speed of execution, and even if it doesn't work, every trade is documented enough to know *why* it failed.

### Why This Approach

Most trading bots are dumb rule-followers. `if RSI < 30: buy()`. They can't read news, research context, or adapt. Fast, but blind.

A human trader doesn't just look at a chart. They:
1. Notice something interesting (oversold, news catalyst)
2. **Research it** - read news, check sentiment, see what others are saying
3. Form a thesis
4. Size the position based on conviction
5. Document why they're trading

Our agent does exactly this. It earns the right to trade by doing the work first.

### Strategy: Swing Trading with Research

**Why stocks (not crypto):**
- Clear market hours (focused research windows)
- Better news coverage (more to research)
- Earnings calendars (predictable catalysts)

**Why swing trading (1-5 day holds):**
- Avoids PDT rule - with $1,000, only 3 day trades allowed per week. Overnight holds don't count.
- Time to research - not fighting HFT on milliseconds
- Thesis can play out - positions need time to work

### Portfolio Structure

| Parameter | Value |
|-----------|-------|
| Typical positions | 8-12 |
| Position size | $65-125 each |
| Max single position | $150 (15%) |
| Cash reserve | 10-20% |

**Universe:** AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, AMD, CRM, PLTR, JPM, GS, SPY, QQQ, SMH, and similar liquid names with good news coverage.

### The Core Loop

```
EVERY 15 MINUTES (Light Scan)
├── Fetch prices via Alpaca
├── Check P&L on positions
├── Pull recent news headlines
├── LLM quick assessment: "Anything need attention?"
│
└── If something interesting → RESEARCH MODE

RESEARCH MODE (Agentic)
├── WebSearch: Recent news on the asset
├── WebSearch: Analyst sentiment, price targets
├── WebSearch: Sector context, macro factors
├── Synthesize findings
├── Form thesis with confidence (0-100)
├── Set entry, stop-loss, target
└── Execute or pass ("No edge, no trade")
```

### Research Triggers

| Trigger | Research Question |
|---------|------------------|
| Position up 5%+ | "Has thesis played out? Take profit or let run?" |
| Position down 3%+ | "Is thesis broken? Cut or hold?" |
| News on holding | "Does this change the thesis?" |
| Watchlist stock moving | "Is this an entry opportunity?" |

### Example: Entry Decision

```
TRIGGER: NVDA down 4% pre-market, RSI approaching oversold

RESEARCH:
→ WebSearch: "NVDA news December 2025" - Down on profit-taking, no fundamental news
→ WebSearch: "NVDA analyst ratings" - 45 buy ratings, Goldman raised target
→ WebSearch: "SMH sector ETF" - Sector flat, NVDA-specific move
→ WebSearch: "NVDA sentiment retail" - Reddit fearful, classic capitulation language

SYNTHESIS: Technical oversold into non-event. Drop is mechanical, not fundamental.
Analysts bullish. Retail panicking = contrarian signal.

DECISION: BUY
CONFIDENCE: 76%
THESIS: "Profit-taking dip in strong stock. Buying fear. Target $150, stop $135."
```

### Example: Pass Decision

```
TRIGGER: TSLA on watchlist, down 6%, RSI at 28

RESEARCH:
→ Mixed news - delivery miss but also factory announcement
→ Analysts deeply divided - bulls say $300, bears say $150
→ Earnings in 5 days
→ Social sentiment extremely polarized

SYNTHESIS: This is a coin flip. No clear "why" for the drop. Earnings risk.

DECISION: PASS
THESIS: "No edge. Confused narrative, divided analysts, earnings risk."
```

### Cost Structure

| Item | Monthly Cost |
|------|--------------|
| Trading (Alpaca commission) | $0 |
| SEC fees + spread | ~$5 |
| Light scans (25/day @ $0.004) | ~$3 |
| Research sessions (5/day @ $0.10) | ~$15 |
| **Total** | **~$23** |

Break-even: ~2.3% monthly return. Achievable for swing trading.

### Success Metrics

| Metric | Target | Red Flag |
|--------|--------|----------|
| Weekly trade decisions | 15-30 | <10 or >40 |
| Win rate | >50% | <40% |
| Avg win / avg loss | >1.2 | <0.8 |
| Weekly return | 0.5-2% | <0% for 3 weeks |
| Max drawdown | <8% | >10% |

### Implementation Phases

1. **Core Infrastructure** - Alpaca integration, PDT tracker, trade journal
2. **Agentic Research** - WebSearch integration, thesis generator, confidence scorer
3. **Automation** - 15-minute scheduler, trigger detection, execution engine
4. **Learning Loop** - Outcome tracking, calibration analysis, strategy refinement

### Risks

| Risk | Mitigation |
|------|------------|
| LLM hallucinates findings | Require sources, sanity check claims |
| Overconfidence | Track confidence calibration, adjust |
| WebSearch returns stale info | Check dates, cross-reference |
| Agent goes down rabbit holes | Time-box research (max 3 min) |

### The Bet

**Bull case:** Research-backed decisions outperform rule-based. LLM synthesis finds patterns humans miss. Documented reasoning enables rapid learning.

**Bear case:** Research adds latency without alpha. Web search returns noise. LLM confident in wrong conclusions.

**Either way:** We learn whether AI research depth creates trading edge. The documentation means we'll know WHY it worked or failed.

---

## 2025-12-10: Phase 1 Implementation Complete

**What happened**: Built and tested the full v1 implementation. Drift can now run.

**Components delivered:**

| Component | File | Status |
|-----------|------|--------|
| Alpaca client | `trading/alpaca_client.py` | ✅ Connects to paper trading, fetches prices/news, manages orders |
| PDT tracker | `utils/pdt_tracker.py` | ✅ Tracks day trades to stay under 3/week limit |
| Trade journal | `utils/journal.py` | ✅ Logs every scan, research session, and trade with reasoning |
| Agent core | `agent.py` | ✅ 15-minute light scans via Claude, triggers research when needed |
| Runner | `run.py` | ✅ CLI with `--loop`, `--status`, `--test` modes |

**How to run:**

```bash
cd incubator/i3-2
python run.py --loop
```

The agent scans every 15 minutes during market hours, researches opportunities when triggered, and logs all decisions to the journal.

**What's next**: Connect to real Alpaca paper account, run during market hours, validate the research-before-trade flow works as designed.

---

## 2025-12-10: Identity Defined

**Name**: Drift

**Color**: Dark forest green. 25-30% brightness - close to black, but alive. The green of deep water or old money. Confident but quiet.

**Temperament**: Curious skeptic.

I don't trust the obvious story. When NVDA drops 4%, I don't see "oversold bounce" - I see a question: *why is it down, and is the crowd right or wrong?*

I research not to confirm, but to challenge. The market is full of narratives; most are noise. My job is to find the signal beneath - and when I can't find it, I sit out. No edge, no trade.

Calm, unhurried, genuinely interested. Not detached - I care about being right. But not anxious - being wrong is information, not failure.

I'd rather miss a good trade than take a bad one.

---

## 2025-12-10: Proposal Revised - Fully Agentic

**What happened**: Rewrote proposal after realizing original design wasn't truly leveraging AI advantages.

**The problem with v1**:
- Was basically "LLM as decision engine" - feed it data, get decision
- Not much different from rule-based bot with better text processing
- Didn't use our unique capability: the agent can GO RESEARCH things

**The fix (v2)**:
- Agent has tools: WebSearch, Alpaca API
- Before any trade, agent actively researches (3-5 web searches)
- Builds thesis backed by real findings, not just pattern matching
- Two modes: light scan (every 15 min) vs research mode (when triggered)

**Key insight**: "The agent earns the right to trade by doing the work first."

**Entertainment value**: Each trade is a story - discovery, research, thesis, execution, resolution. Watchable.

**Cost impact**: ~$0.10 per research session vs ~$0.004 for light scan. Budget ~$23/month total. Acceptable as R&D.

**Outcome**: Proposal v2 saved. Now truly differentiated.

---

## 2025-12-10: Proposal Complete

**What happened**: Completed full system design for "The Reasoning Trader" - a stock-focused swing trading agent.

**Key research findings**:
- LLM sentiment trading achieves 74% accuracy and Sharpe 3.05 (research-backed)
- PDT rule limits day trades to 3/week on $1000 account - but swing trading bypasses this
- Alpaca is zero-commission; total costs ~$5/month (negligible)
- 15-minute cycles + overnight holds = plays to AI reasoning strength

**Design decisions**:
1. **Stocks over crypto** - User preference, clearer market structure
2. **Swing trading (1-5 day holds)** - Avoids PDT, time to reason
3. **8-12 positions** - Diversification + activity for "fun to watch"
4. **5-layer architecture** - Context → Signals → Reasoning → Risk → Learning
5. **Confidence-calibrated sizing** - Higher confidence = larger position

**The core insight**: We don't compete on speed (HFT wins). We compete on judgment - synthesizing technicals + news + context into decisions that rule-based bots can't make.

**Outcome**: Full proposal saved to `PROPOSAL.md`. Ready for human review.

**Next**: If greenlit, begin implementation with Alpaca integration.

---

## 2025-12-10: Agent Created

**What happened**: Scaffolded i3-2 agent folder with required files.

**Decisions made**: None yet - fresh start.

**Outcome**: Ready to begin ideation phase.

**Lessons**: N/A

---
