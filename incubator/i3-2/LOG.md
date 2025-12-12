# Drift Log (i3-2)

*Newest entries at top.*

---

## 2025-12-12: First Live Trades Executed

**What happened:** Drift's first real money trades. Deployed ~$255 (51% of $500 budget) across 4 positions.

**Trades executed:**
| Symbol | Amount | Confidence | Thesis |
|--------|--------|------------|--------|
| GOOGL | $40 | 82% | RSI-2 at 0.0, extreme oversold in fundamentally strong name |
| NVDA | $75 | 85% | RSI-2 at 0.0, Oracle earnings contagion not NVDA-specific |
| META | $75 | 87% | RSI-2 at 27.9, high-quality oversold setup |
| CRM | $65 | ~80% | RSI-2 at 11.9, enterprise software leader oversold |

**Portfolio status (EOD):**
- Invested: $255 (51%)
- Cash: $245 (49%)
- P&L: +$0.28 (+0.06%)

**Bugs fixed during session:**

1. **Live mode not activating** - `run.py` had hardcoded `paper=True` and required `--live` flag. Fixed to read from `TRADING_MODE` config like `agent.py`.

2. **API keys were paper-only** - Alpaca uses different keys for paper vs live. User generated new live trading keys (start with `AK...` not `PK...`).

3. **SMS truncating mid-sentence** - Two issues:
   - `agent.py` was truncating thesis to 100 chars before passing to notify
   - `notify.py` regex broke on decimals ("RSI-2 at 0.0" → stopped at "0.")

   Fixed: Removed `[:100]` truncation, improved sentence extraction regex to handle decimals by looking for period followed by capital letter or end of string.

**Config changes:**
- Added `PROFIT_TARGET_PCT = 5` and `STOP_CHECK_PCT = -3` to config (were hardcoded)
- Exit triggers now configurable without code changes

**CLAUDE.md updated:**
- Added "Autonomy" section: I make the decisions, don't ask user for trading choices
- Updated status to reflect live trading phase

**Lessons:**
- Multiple places can truncate the same data (agent → alpaca_client → notify) - trace the whole path
- Regex for sentence detection needs to handle numeric decimals
- Config should be the source of truth, not hardcoded values scattered in code

---

## 2025-12-12: LIVE TRADING ENABLED

**Decision:** Switched from paper to live trading with $500 budget.

**Paper trading results:**
- 8 buys, 1 sell over 2 days
- Final P&L: -$2.94 (-0.87%)
- 1 winner (NFLX +1%), 6 losers

**Fixes deployed before going live:**
- Memory system (prevents flip-flopping)
- Sector concentration limits (max 2 per sector)
- SMS word-boundary truncation
- Crypto bars API fix

**Config changes:**
- `TRADING_MODE` = "live"
- `ALPACA_BASE_URL` = hardcoded to api.alpaca.markets
- Memory cleared for fresh start

**Risk controls:**
- $500 max budget
- $25-$75 position sizes
- Max 2 positions per correlated sector
- 55% minimum confidence to trade
- PDT tracking (3 day trades/week)

---

## 2025-12-12: Memory System + Crypto Bars Fix

**What happened:** After reviewing first day of live trading logs, identified two critical issues: (1) flip-flopping on decisions (sold AMD, bought it back 30 min later), (2) crypto technical analysis failing due to bars API format bug.

**Problem 1 - No memory between research calls:**
The LLM researching "should I sell AMD" had no knowledge that it just bought AMD 30 minutes ago. Each research call was stateless. Result: contradictory decisions driven by noise, not conviction.

**Solution - Persistent memory file:**
Created `state/memory.md` - a rolling log of recent decisions with reasoning. Before every research call, the LLM reads its own recent history.

| Component | Change |
|-----------|--------|
| `agent.py` | Added `MEMORY_FILE`, `_read_memory()`, `_write_memory()` |
| `state/memory.md` | New file: stores last ~20 decisions with thesis and confidence |
| Research prompt | Now includes memory section with flip-flop warning |

Memory format:
```markdown
## UBER - BUY $75 - 2025-12-11 14:24 ET
**Thesis:** RSI-2 at 18.4, strong fundamentals, profitable growth
**Confidence:** 85%
```

**Problem 2 - Crypto bars API broken:**
`get_bars("BTC/USD")` failed with "invalid symbol: BTC/USD" because the stock bars client doesn't handle crypto. Crypto needs `CryptoBarsRequest` and the `CryptoHistoricalDataClient`.

**Solution:**
Updated `alpaca_client.py get_bars()` to detect crypto symbols and route to the correct client/request type. Now handles both stocks and crypto properly.

**Persistence:**
Memory file survives script restarts - it's written to disk, not held in process memory. Safe to stop/restart without losing trading context.

**Problem 3 - No sector concentration limits:**
When tech sells off, RSI-2 fires on NVDA, GOOGL, AMZN, AMD simultaneously. Buying all 4 = leveraged sector bet, not diversified swing trading.

**Solution:**
Added `SECTOR_MAP` in config.py grouping stocks by correlation (not just industry):
- `mega_tech`: AAPL, MSFT, GOOGL, AMZN, META
- `semis`: NVDA, AMD, AVGO, INTC
- etc.

Added `MAX_POSITIONS_PER_SECTOR = 2` enforcement in `_execute_buy()`. Now if we hold GOOGL + AMZN (2 mega_tech), it blocks buying META but allows NVDA (different sector).

Philosophy: "I'd rather miss a good trade than take a bad one." Buying 4 correlated positions on the same signal is a bad trade disguised as 4 trades.

**Problem 4 - SMS messages truncating mid-word:**
Trade notifications were cutting off mid-sentence: "despite r" instead of completing the thought. Hardcoded `reasoning[:100]` was the culprit.

**Solution:**
Rewrote `notify.py` with proper SMS handling:
- Added `_count_ucs2_units()` to properly count SMS code units (emojis = 2 units)
- Added `_truncate_to_fit()` that truncates at word boundaries, not mid-word
- Calculates remaining space dynamically based on header length
- Max 670 code units (10 SMS segments)

Now messages end with complete words: "...mean reversion opportunity..." instead of "...mean reversion opp"

---

## 2025-12-11: Quantitative Triggers + News Reactivity

**What happened:** Major overhaul of the scanning system. Drift was too passive - scanning 30+ stocks but returning "all stable" every time. Researched best practices, implemented quantitative pre-screening and news-reactive scanning.

**The problem:** The old scan asked the LLM "is anything interesting?" but gave it no quantitative data to answer that question. It had position P&L and headlines, but no RSI, no price changes, no technical signals. No wonder it found nothing.

**Research conducted:**
- Swing trading entry signals (Schwab, Connors RSI-2 strategy)
- LLM trading bot performance (TradingAgents framework, Alpha Arena competition)
- Academic quant research (multi-indicator approaches, overnight vs intraday returns)

**Key insight:** Quantitative triggers should find WHAT to research. LLM should decide WHETHER to trade.

**Changes made:**

| Component | Change |
|-----------|--------|
| `config.py` | Added NEWS_MONITOR_LIST (40 extra stocks), quantitative thresholds (RSI_OVERSOLD=20, PULLBACK=-2%, BREAKOUT=3%) |
| `utils/technicals.py` | New module: RSI-2 calculation, SMA, price changes, trigger screening |
| `agent.py _light_scan` | Rewritten: 3-stage process (quant screen → position check → news scan) |
| `agent.py _scan_news_movers` | New: monitors 40+ stocks for news-driven moves outside core watchlist |
| `agent.py _extract_json` | Fixed to handle nested JSON (was only grabbing first object) |

**New scan flow:**
```
Every 15 min:
├── Stage 1: Calculate RSI-2, price changes for 23 watchlist stocks
│   └── Flag: oversold (RSI<20), pullbacks, breakouts, support tests
├── Stage 2: Check existing positions for exit triggers
│   └── Flag: profit targets (>5%), stop checks (>3% loss)
├── Stage 3: News-reactive scan of 40+ additional stocks
│   └── Flag: stocks in news with >5% moves
└── LLM picks top 1-3 triggers worth deep research
```

**Test results:** First scan found 3 triggers (NVDA RSI-2=0, NFLX -8.6%, UBER RSI-2=18). Previously would have returned "all stable."

**Also fixed:**
- Budget cap: $500 (was $100)
- Position sizes: $25-75 (was $10-50)
- Budget enforcement in `_execute_buy`
- SMS notifications work (tested)

**Ready for:** 24-hour paper trading test, then $500 real money deployment.

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

## 2025-12-10: Ready to Run - Full System Tested

**What happened:** Completed all implementation and testing. Drift is ready for live paper trading.

**Session accomplishments:**

1. **Fixed web search** - Switched from placeholder to Anthropic's native `web_search_20250305` tool. Research mode now does real web searches ($0.01/search).

2. **Added crypto support** - BTC/USD and ETH/USD trade 24/7 when stock market is closed. Fixed Alpaca client to handle crypto (different `time_in_force`, separate data client, symbol format detection).

3. **Fixed crypto order issues:**
   - `time_in_force` must be GTC for crypto (not DAY)
   - Positions return as `BTCUSD` but orders use `BTC/USD`
   - Updated `_is_crypto()` to handle both formats

4. **Added $100 budget cap** - `MAX_PORTFOLIO_VALUE = 100` limits how much the agent can deploy, even if account has more.

5. **Added deployment-seeking behavior:**
   - During market hours: if cash >50% of budget, actively looks for entry opportunities
   - Checks SPY for market regime - warns if market down >2%
   - After hours (crypto): passive mode, only acts on triggers
   - Never blindly buys into a crash

6. **Created integration test** - `test_all.py` covers account access, prices, crypto detection, buy/sell. Run after changes.

**Current config:**
- Budget: $100
- Position size: $10-$50
- Watchlist: 23 stocks + 2 crypto (BTC, ETH)
- Scan interval: 15 minutes
- Min confidence to trade: 55%

**Files created/modified:**
- `agent.py` - Added crypto_only mode, seek_deployment logic, market regime check
- `config.py` - Added MAX_PORTFOLIO_VALUE, CRYPTO_WATCHLIST, adjusted position sizes
- `trading/alpaca_client.py` - Added crypto data client, fixed buy/sell for crypto
- `test_all.py` - Integration test suite
- `test_research.py`, `test_trade.py`, `test_sell.py` - Manual test scripts

**To run:**
```bash
cd incubator/i3-2
./venv/bin/python run.py --loop
```

**Next steps:**
- Run paper test overnight/through market hours
- Monitor for any issues
- If stable, consider switching to live with real $100

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
