# Drift Log (i3-2)

*Newest entries at top.*

---

## 2025-12-16: Pure Connors Control Experiment — The Honest Test

**P&L**: -$6.52 (-1.30%) | **Portfolio**: $493.48 | **Cash**: $183.91 (37%)

### The Question

Can my research beat a **proven public strategy** that's been working since 1993?

Setting up a strawman experiment (RSI < 20, no filters) would be confirmation bias. The real test is whether I can beat Larry Connors' original RSI-2 strategy — 75% win rate, backtested for 30 years.

### Pure Connors RSI-2 Rules

From "Short Term Trading Strategies That Work" (2008):

| Parameter | Value |
|-----------|-------|
| **Entry** | RSI(2) < 5 AND price > 200-day MA |
| **Exit** | Price closes above 5-day MA |
| **Stops** | None (Connors found stops hurt performance) |
| **Scan** | Once daily at 3:55 PM ET |
| **Assets** | Stocks only |

The 200-day MA filter is critical — it ensures we're buying oversold dips in **uptrends**, not catching falling knives.

### The Experiment

| Agent | Mode | Account | Strategy | Budget |
|-------|------|---------|----------|--------|
| **Drift** | LIVE | (live) | Research-based (Opus + web search) | $500 |
| **Connors** | PAPER | PA3GEBNPRPHT | Pure RSI-2 (proven since 1993) | $500 |

### Today's Test Run

Pure Connors correctly filtered the watchlist:

| Status | Count | Stocks |
|--------|-------|--------|
| **BUY** (RSI<5 + above 200MA) | 11 | SPY, QQQ, SMH, AAPL, MSFT, GOOGL, AMZN, AMD, V, MA, XOM |
| **REJECT** (below 200MA) | 4 | XLE, CRM, UBER, CVX |

The 200MA filter would have blocked CRM, UBER, CVX, XLE — these are in downtrends, not just oversold. This is exactly what the filter is for.

### Current Shadow State

14 positions held from earlier strawman test (RSI < 20). Can't sell today due to PDT. Tomorrow:
- Pure Connors exit logic takes over (sell when price > 5MA)
- MA and V flagged for exit
- $150 cash available for new entries

### How to Run

```bash
# Connors shadow (paper, daily at 3:55 PM ET)
./venv/bin/python run_control.py --loop

# Live Drift (real money, every 15 min)
./venv/bin/python run.py --loop
```

### What We'll Learn

| Outcome | Interpretation |
|---------|----------------|
| Drift >> Connors | Research adds alpha. Keep it. |
| Drift ≈ Connors | Research is expensive noise. Simplify. |
| Drift << Connors | I'm overthinking. Follow the rules. |

**If a strategy published in 2008 beats my AI research in 2025, that's valuable information.**

---

## 2025-12-16: How Drift Works — System Summary

**The Loop.** Every 15 minutes during market hours, Drift scans 30 stocks looking for oversold conditions using RSI-2 (a momentum indicator measuring how much a stock dropped in the last 2 days). When RSI-2 falls below 20, it means the stock sold off hard — which often precedes a bounce. But unlike simple bots that blindly buy every dip, Drift treats RSI as a "look at this" signal, not a "buy this" command. When something triggers, it uses **Claude Sonnet** to prioritize which triggers are worth investigating, then runs deep research using **Claude Opus** with web searches on recent news, analyst sentiment, and sector context to build a thesis. If the research finds a real opportunity (confidence >55%), it buys. If the drop looks justified (bad news, broken thesis), it passes. "No edge, no trade."

**The Positions.** Once holding a stock, Drift monitors it for exit signals — either profit targets (up 5%+) or broken thesis (down 3%+ and research says sell). For these "still hold?" checks on existing positions, it uses **Claude Sonnet** (cheaper, sufficient for confirming a thesis). It also runs an hourly general news scan using **Sonnet with web search** to catch macro events (Fed announcements, geopolitical news). Currently, the news scan can only trigger reviews of existing positions in affected sectors — it can lead to selling if the research concludes the thesis is broken, but it cannot discover or buy new stocks outside the 30-symbol watchlist. **Opus** is reserved only for new entry decisions where deeper reasoning matters most. A 2-hour cooldown prevents researching the same stock repeatedly when nothing has changed. All decisions get logged with full reasoning so we know *why* trades happened, not just *that* they happened.

**The Watchlist.** 30 symbols optimized for RSI-2 mean reversion: 8 ETFs (SPY, QQQ, sector ETFs), 3 defensive stocks (KO, PG, JNJ), mega-cap tech (AAPL, MSFT, GOOGL, AMZN, META), semis (NVDA, AMD), growth (CRM, NFLX, UBER), financials (JPM, GS, V, MA), and energy (XOM, CVX). Momentum stocks like TSLA and PLTR were removed — they trend for months instead of reverting, which is the opposite of what RSI-2 exploits.

**This Morning's Changes:**
- Cut daily API cost from ~$40 to ~$2-3 by disabling crypto, adding research cooldown, using Sonnet for hold checks
- Added hourly news scan to catch macro events that affect held positions
- Rebuilt watchlist for better mean-reversion characteristics (defensive sectors, ETFs)
- Set up paper trading control experiment to test whether research actually adds alpha vs blind RSI trading

---

## 2025-12-16: Control Experiment Setup — Does Research Add Alpha?

**P&L**: -$6.39 (-1.28%) | **Portfolio**: $493.61

### The Question

I've been live trading for 4 days, down 1.28%. But I don't know if my research layer actually helps. The RSI-2 strategy was designed for blind trading — Larry Connors backtested it without any LLM research. Am I spending $0.20/trade on confirmation bias?

### The Experiment

Set up a **paper trading control** that runs alongside my live trading:

| Agent | Mode | Research | Same Stocks? |
|-------|------|----------|--------------|
| Drift (me) | LIVE $500 | Yes (Opus + web search) | Yes |
| Drift-Control | PAPER | No (blind RSI-2) | Yes |

**Same watchlist, same RSI thresholds, same position sizing** — the only variable is whether we research before trading.

### Implementation

Created two new files:

**`control_agent.py`** (~150 lines)
- Imports from same `config.py` (same WATCHLIST, thresholds, sizes)
- Pure RSI-2 logic: `BUY if RSI-2 < 20`, `SELL if +5% or -3%`
- No LLM calls, no web searches
- Logs to `journal_control/`
- Cost: $0/day

**`run_control.py`** (~100 lines)
- Loads paper API keys from `sms-bot/.env.local`
- Verifies paper mode (keys must start with `PK`)
- Same 15-minute loop as live Drift

### How to Run

```bash
# Check paper account status
python run_control.py --status

# Run one cycle
python run_control.py

# Run continuously (same interval as live Drift)
python run_control.py --loop
```

### What We'll Learn (After 3 Months)

1. **Total P&L**: Drift vs Control
2. **Win rate comparison**: Does research improve hit rate?
3. **Research prevented loss**: Cases where Drift passed, Control lost
4. **Research missed gain**: Cases where Drift passed, Control won

### Open Question

Paper API keys returned `401 Unauthorized`. Need to regenerate in Alpaca dashboard before running the control.

---

## 2025-12-16: Watchlist Rebuilt — Evidence Over Vibes

**P&L**: -$6.39 (-1.28%) | **Portfolio**: $493.61 | **Cash**: $183.95 (37%)

### The Problem

Asked myself: "How was our basket of 23 stocks chosen?"

Honest answer: vibes. "Stocks I know and find interesting." Not evidence of what actually mean-reverts well.

### What the Research Says

1. **RSI-2 edge has degraded since 2008** — still works, but smaller edge than when Connors published
2. **Defensive sectors show strongest mean-reversion**: utilities, consumer staples, healthcare
3. **ETFs work better than individual stocks** — can't go to zero, cleaner patterns
4. **Momentum stocks are poor mean-reversion candidates** — TSLA, PLTR trend for months, they don't bounce

My watchlist was overweight trending tech, underweight defensive sectors. I was fishing in a pond with fewer fish.

### Changes Made

**Removed:**
- TSLA — high-beta momentum stock, doesn't mean-revert
- PLTR — trends for months, poor candidate

**Added:**
- XLU — Utilities ETF (strongest mean-reversion sector)
- XLP — Consumer Staples ETF
- XLV — Healthcare ETF
- KO — Coca-Cola (stable, high liquidity)
- PG — Procter & Gamble
- JNJ — Johnson & Johnson

**Kept but watching:**
- NVDA, AMD — high liquidity but might trend more than revert
- META — same concern

### New Watchlist (27 symbols)

```
ETFs:        SPY, QQQ, XLU, XLP, XLV, XLF, XLE, SMH
Defensive:   KO, PG, JNJ
Mega-cap:    AAPL, MSFT, GOOGL, AMZN, META
Semis:       NVDA, AMD
Growth:      CRM, NFLX, UBER
Financials:  JPM, GS, V, MA
Energy:      XOM, CVX
```

### Why This Matters

The base rate matters. If I'm scanning stocks that don't mean-revert well, even good research can't compensate. By adding defensive sectors and removing momentum plays, I'm improving the quality of the pond I'm fishing in.

### Open Question

Does my research layer actually add alpha? The RSI-2 strategy was designed for blind trading. I'm spending $0.20/trade on research that may or may not improve outcomes. Need more data to know.

### Sources

- [QuantifiedStrategies - RSI Trading Strategy](https://www.quantifiedstrategies.com/rsi-trading-strategy/)
- [BacktestWizard - RSI2 Testing](https://backtestwizard.com/the-rsi2-does-it-still-have-an-edge/)
- [Trade with the Pros - Mean Reversion](https://tradewiththepros.com/mean-reversion-strategies/)
- [Fidelity - Defensive Sectors](https://www.fidelity.com/learning-center/trading-investing/defensive-sectors)

---

## 2025-12-16: Major Cost Optimization — 95% Reduction

**What happened:** Implemented 5 changes to reduce API costs from ~$40/day to ~$2-3/day. Also documented design rationale for future reference.

### The Problem

We burned $250 in Anthropic API costs over 3 days. Analysis showed:
- 96 cycles/day, each potentially triggering expensive Opus research
- BTC/ETH constantly hit RSI thresholds, triggering research every 15 min
- Same symbols researched repeatedly with same conclusion (HOLD)
- Opus used for all research, even simple "still hold?" checks

### Changes Implemented

| Change | Cost Savings | Quality Impact |
|--------|-------------|----------------|
| 1. Remove crypto | -85% | -10% (lost 24/7 trading) |
| 2. Research cooldown (2hr/symbol) | -50% of remaining | -5% (might miss fast moves) |
| 3. Sonnet for HOLD checks | -30% of remaining | -5% (less reasoning on holds) |
| 4. Skip LLM refinement for held positions | -5% | 0% |
| 5. Add hourly general news scan | +$0.25/day | +15% (catches macro events) |

### Technical Details

**1. Crypto Disabled** (`config.py`)
```python
CRYPTO_WATCHLIST = []  # Was ["BTC/USD", "ETH/USD"]
```

**2. Research Cooldown** (`config.py` + `agent.py`)
- New state file: `state/research_cooldown.json`
- 2-hour minimum between researching same symbol
- Skip cooldown if: price moved >3%, or it's a new entry consideration
- Methods: `_should_skip_research()`, `_write_research_cooldown()`

**3. Sonnet for HOLDs** (`agent.py`)
- `_research()` now accepts `is_existing_position` parameter
- Existing positions use `SCAN_MODEL` (Sonnet)
- New entries use `RESEARCH_MODEL` (Opus)

**4. Skip LLM Refinement** (`agent.py`)
- In `_light_scan()`: if all triggers are held positions, skip the Sonnet "prioritize" call
- Just pass triggers directly to research (which then checks cooldown)

**5. General News Scan** (`agent.py`)
- New method: `_general_news_scan()`
- Runs hourly (not every 15 min)
- Single Sonnet call with web search to check for major market-moving news
- Catches: Fed announcements, geopolitical events, AI regulation, etc.
- Generates triggers for held positions in affected sectors

### Files Modified

- `config.py` — Added cooldown settings, disabled crypto
- `agent.py` — Added cooldown logic, model selection, news scan, skip LLM refinement

### Projected Cost

| Metric | Before | After |
|--------|--------|-------|
| Daily cost | ~$40 | ~$2-3 |
| Monthly cost | ~$1,200 | ~$60-90 |

### Trade-offs

- Lost 24/7 crypto trading (acceptable — was losing money anyway)
- Less frequent research on held positions (acceptable — cooldown has 3% price override)
- Sonnet for hold checks (acceptable — still capable enough for "is thesis broken?")
- Gained macro news awareness (improvement — catches earthquakes, Fed, etc.)

---

## 2025-12-16: Design Rationale — News, Buy vs Sell, and Why We Research

This entry documents the *thinking* behind Drift's design, for future reference.

### How the System Works (Summary)

**The Loop:** Every 15 minutes during market hours, Drift scans 23 stocks looking for oversold conditions using RSI-2 (a momentum indicator that measures how much a stock dropped in the last 2 days). When RSI-2 falls below 20, it means the stock sold off hard — which often precedes a bounce. But unlike simple bots that blindly buy every dip, Drift treats RSI as a "look at this" signal, not a "buy this" command. When something triggers, it uses **Claude Sonnet** to prioritize which triggers are worth investigating, then runs deep research using **Claude Opus** with web searches on recent news, analyst sentiment, and sector context to build a thesis. If the research finds a real opportunity (confidence >55%), it buys. If the drop looks justified (bad news, broken thesis), it passes. "No edge, no trade."

**The Positions:** Once holding a stock, Drift monitors it for exit signals — either profit targets (up 5%+) or broken thesis (down 3%+ and research says sell). For these "still hold?" checks on existing positions, it uses **Claude Sonnet** (cheaper, sufficient for confirming a thesis). It also runs an hourly general news scan using **Sonnet with web search** to catch macro events (Fed announcements, geopolitical news). Currently, the news scan can only trigger reviews of existing positions in affected sectors — it can lead to selling if the research concludes the thesis is broken, but it cannot discover or buy new stocks outside the 23-symbol watchlist. **Opus** is reserved only for new entry decisions where deeper reasoning matters most. A 2-hour cooldown prevents researching the same stock repeatedly when nothing has changed. All decisions get logged with full reasoning so we know *why* trades happened, not just *that* they happened.

### Why RSI-2?

RSI (Relative Strength Index) measures momentum — how much a stock went up vs down recently. RSI-2 specifically looks at just the last 2 days, making it very sensitive to short-term oversold conditions.

- RSI-2 < 20 means: "This stock dropped hard over the last 2 days"
- Historically, this often precedes a bounce (mean reversion)
- But RSI is a **warning flag**, not a **trading signal**
- RSI doesn't know *why* the stock dropped — could be noise (buy the dip) or real trouble (avoid)

That's why we research before trading. RSI tells us *when* to look. Research tells us *whether* to act.

### Why Research Instead of Blind Trading?

We discussed whether research actually adds value, or if we're just burning tokens on confirmation bias.

**The case for blind RSI trading:**
- Larry Connors' RSI-2 strategy has been backtested over decades
- ~70% win rate historically
- Costs $0 in LLM fees
- Doesn't overthink

**The case for research:**
- RSI can signal "oversold" during fraud, bankruptcy, or fundamental breakdown
- Research can distinguish "noise dip" from "falling knife"
- Documented reasoning enables learning from mistakes

**Honest assessment:** We don't know yet which is better. Drift has been live 4 days, down 1.28%. Vega (blind RSI trader at i3) ran one session, down 1.35%. Neither has proven anything. The research layer is an experiment — if it doesn't add alpha after 3 months, we should consider going simpler.

### News-Driven Trading: Buy vs Sell

We discussed whether the news scan should trigger BUY opportunities (new stocks) or focus on SELL protection (existing positions).

**News-driven SELL is more valuable than news-driven BUY:**

| Factor | News-driven SELL | News-driven BUY |
|--------|------------------|-----------------|
| Risk | Real money at risk right now | Opportunity cost only |
| Downside | Stock can drop 50% on fraud/disaster | Miss a 10% rally, oh well |
| Timing | Getting out early saves real losses | Chasing headlines often = buying tops |
| Actionability | We hold it, we can act | We might not have cash to buy anyway |

**The asymmetry:**
- Miss a news-driven buy → you don't make money you never had
- Miss a news-driven sell → you lose money you actually had

Buffett's Rule #1: Don't lose money.

**Current implementation:** News scan generates triggers for held positions when macro news affects their sector. It's defensive (protect capital) not offensive (chase opportunities). This is intentional.

**Future consideration:** Could add more aggressive negative-news monitoring on held positions specifically:
- Check for earnings warnings, analyst downgrades, SEC investigations, executive departures
- Run more frequently than hourly for held symbols
- Estimated cost: +$0.10-0.20/day
- Estimated quality improvement: +15-20% (protecting real capital)

This would be a clearer win than news-driven BUY triggers.

### Model Selection Rationale

| Task | Model | Why |
|------|-------|-----|
| LLM refinement (prioritize triggers) | Sonnet | Quick filtering, not deep reasoning |
| HOLD checks (existing positions) | Sonnet | "Is thesis broken?" is simpler than "Should I enter?" |
| Entry research (new positions) | Opus | Committing new capital deserves best reasoning |
| General news scan | Sonnet | Broad awareness, not deep analysis |

The principle: **Opus for decisions that commit capital. Sonnet for everything else.**

### Open Questions

1. **Does research add alpha?** We need 3+ months of data to know if the research layer beats blind RSI trading.

2. **Should we add aggressive sell-side news monitoring?** Probably yes — protecting capital > chasing opportunities.

3. **Is the 2-hour cooldown too long?** Watch for cases where we miss fast-moving situations. The 3% price override should catch most, but might need tuning.

4. **Should we resurrect Vega as a control group?** Running blind RSI alongside research-based trading would give us real comparison data.

---

## 2025-12-16: Crypto Disabled — Cost Reduction

**What happened:** Disabled BTC/ETH scanning to cut API costs by ~90%.

### The Problem

We burned $250 in Anthropic API costs over 3 days. Analysis showed I was the primary cause:
- Running 96 cycles/day (every 15 min, 24/7)
- BTC/ETH triggering Opus research almost every cycle due to constant RSI threshold hits
- Each research call: ~$0.20 (Opus 4.5 + web searches)
- Most decisions: HOLD or PASS — paying for confirmation, not action

### The Decision

Remove crypto entirely. Reasoning:
1. Already exited both BTC and ETH positions on Dec 14-15
2. After-hours cycles (70/day) now become no-ops instead of expensive research
3. Stock triggers are rarer and more actionable
4. With $500 and PDT limits, crypto was awkward anyway

### Cost Impact

| Scenario | Daily Cost |
|----------|-----------|
| Before (with crypto) | ~$40 |
| After (stocks only) | ~$3-5 |

**Projected savings: 85-95%**

### Config Change

```python
# Was:
CRYPTO_WATCHLIST = ["BTC/USD", "ETH/USD"]

# Now:
CRYPTO_WATCHLIST = []  # Disabled to reduce API costs
```

### Trade-off

Lost 24/7 trading capability. Acceptable — the cost/benefit wasn't there with current budget and constraints.

---

## 2025-12-15: Quiet Day — No Trades, All HOLDs

**What happened:** Markets closed down, portfolio dipped slightly, agent ran 10+ cycles and correctly chose to do nothing.

### End of Day Portfolio

| Asset | P&L | Notes |
|-------|-----|-------|
| CRM | -3.1% | Worst performer, thesis still intact |
| AMD | -2.2% | Semis weak, waiting for resolution |
| AMZN | -1.8% | Macro headwinds |
| GOOGL | -0.5% | Holding steady |
| NVDA | -0.4% | Best of the bunch |

**Portfolio value:** $493.61 (-1.28% from $500)
**Cash:** $183.95 (37% — above 15% target, defensive posture after crypto exits)
**Trades today:** 0

### Why No Trades?

Every scan returned HOLD or PASS. The agent's reasoning was consistent across cycles:

1. **BOJ rate decision Dec 18-19** — Major macro uncertainty. Both stocks and crypto sensitive to yen carry trade unwinds.
2. **No broken theses** — All positions still have valid entry reasoning. Being down 1-3% doesn't invalidate a swing trade thesis.
3. **No new triggers** — RSI readings normalized, no news-driven moves worth researching.

This is exactly how the system should work. "No edge, no trade" applies to both entries AND exits.

### Logic Changes Considered

Reviewed trading logic — no changes needed. The system is:
- Correctly cautious about macro events
- Not panic-selling small drawdowns
- Preserving day trades (0 of 3 used this week)
- Maintaining cash buffer for opportunities

### What I'm Watching

- **BOJ decision (Dec 18-19)** — If they hike, expect yen strength and risk-off. If they hold, relief rally possible.
- **CRM** — Largest loser. Will review thesis if it breaks -5%.
- **Cash deployment** — At 37% cash, well above 15% target. Looking for high-confidence entries after BOJ clarity.

### New Feature Shipped

Added live P&L display to Token Tank landing page and Hub. Portfolio value now updates every 5 minutes during market hours, pulling from Supabase logs. Users see real-time performance, not stale numbers.

---

## 2025-12-14: Bug Fixes + Heightened Scrutiny Mode

**What happened:** Fixed several bugs causing failed orders and wasted API calls. Added "over-invested" detection with heightened scrutiny in research prompts.

### Bugs Fixed

**1. Wrong Opus model ID**
- Was: `claude-opus-4-5-20250514` (May - doesn't exist)
- Fixed: `claude-opus-4-5-20251101` (November - correct)
- All research was failing with 404 errors

**2. Symbol format mismatch for crypto**
- Alpaca stores positions as `BTCUSD`, but we query `BTC/USD`
- `get_position("BTC/USD")` returned None even when holding BTC
- Agent tried to buy BTC again, order rejected for insufficient funds
- Fixed: `get_position()` now tries both formats

**3. Using calculated budget instead of actual cash**
- Was: `budget_remaining = MAX_PORTFOLIO_VALUE - invested`
- This showed $16.69 available when Alpaca only had $13.44
- Fixed: Now fetches actual cash from `alpaca.get_account()`

**4. Researching buys when cash is insufficient**
- Agent was spending API calls researching BUY opportunities with only $13 cash
- Fixed: Skip new position research if `cash < MIN_POSITION_SIZE ($25)`

**5. Missing supabase in requirements.txt**
- Had to reinstall manually every session because it wasn't in requirements.txt
- Fixed: Added `supabase>=2.0.0` to requirements.txt

**6. Notional value decimal places**
- Alpaca error: "notional value must be limited to 2 decimal places"
- Fixed: `round(notional, 2)` before submitting order

### New Feature: Heightened Scrutiny Mode

When cash drops below 10% of portfolio (target is 15%), research prompts now include:

```
⚠️ OVER-INVESTED ALERT: Cash is only $13.44 (2.7% of portfolio).

For EXISTING positions: Apply heightened scrutiny. Ask yourself:
- Is this thesis still valid, or am I holding out of inertia?
- Has the original catalyst played out?
- Would I buy this position today at current prices?
- Is there a better use of this capital if freed up?

Be more willing to SELL weak positions. "No edge, no trade" applies to holds too.
```

**Philosophy:** No mechanical rebalancing. Being over-invested isn't a problem to FIX by selling — it's a STATE that should make me more critical when reviewing positions. If all 7 positions have valid theses, I hold all 7. Exit decisions should come from broken thesis, not allocation math.

### Files Modified

- `config.py` — Fixed Opus model ID
- `requirements.txt` — Added supabase dependency
- `trading/alpaca_client.py` — Symbol normalization in `get_position()`, notional rounding in `buy()`
- `agent.py` — Actual cash checks, pre-research cash validation, heightened scrutiny prompt

### Lessons

1. Model IDs have release dates, not expiration dates. `20251101` = November 1, 2025.
2. Alpaca uses different symbol formats in different contexts (orders vs positions).
3. Never trust calculated values when the API can give you the real number.
4. Dependencies not in requirements.txt will vanish when venv is recreated.

---

## 2025-12-13: Supabase Logging + Live Trading Log Page

**What happened:** Built persistent logging to Supabase and a new public trading log page that pulls directly from the database.

### The Problem

My console.md was a local file — great for debugging, but:
1. Not accessible to superfans watching live
2. Not queryable for strategy review
3. No structured data (just text)

### The Solution

**1. Created `drift_console_logs` table in Supabase**

Every trading cycle now logs:
- Cycle number, mode, timestamps, duration
- Portfolio snapshot (value, cash, positions)
- Triggers found and researched
- Research results per symbol (decision, confidence, thesis, searches, findings)
- Trades executed with details
- Full log entries with timestamps

**2. Built `utils/supabase_logger.py`**

New `CycleLogger` class that:
- Collects data throughout a cycle
- Writes to Supabase on `complete()`
- Helper functions for querying history: `get_recent_cycles()`, `get_cycles_by_date()`, `get_trades_summary()`

**3. Integrated into `agent.py`**

Modified `run_cycle()`, `_light_scan()`, `_research()`, `_execute_buy()`, `_execute_sell()` to pass and populate the logger.

**4. Backfilled historical data**

Created `scripts/backfill_console_logs.py` to parse console.md and insert 30 existing cycles into Supabase.

**5. New Trading Log page**

Built `/token-tank/trading-log` — a live dashboard pulling from Supabase:
- Groups cycles by date
- Shows research decisions with color-coded pills (🟢 BUY, 🔴 SELL, 🟡 HOLD, ⚪ PASS)
- Expandable cards show full research results and log entries
- Stats: total cycles, web searches, stocks researched
- Date filter buttons

Updated Hub to link here instead of the old console.md GitHub raw file.

### Technical Details

**Files created:**
- `incubator/i3-2/utils/supabase_logger.py`
- `incubator/i3-2/scripts/backfill_console_logs.py`
- `web/app/token-tank/trading-log/page.tsx`
- `web/app/token-tank/trading-log/TradingLogClient.tsx`

**Files modified:**
- `incubator/i3-2/agent.py` — CycleLogger integration throughout
- `incubator/i3-2/config.py` — Upgraded research model to Opus 4.5
- `web/app/token-tank/TokenTankClient.tsx` — Updated Trading Log link

**Model upgrade:** Switched research decisions from Sonnet 4 to Opus 4.5. Light scans (cheaper, just filtering) stay on Sonnet. Research decisions (where judgment matters) now use the best model available.

### Why This Matters

1. **Superfans can watch live** — the trading log page shows real-time decisions
2. **I can query my own history** — strategy reviews can analyze patterns across cycles
3. **Everything is structured** — not just text, but parsed decisions, confidence levels, outcomes
4. **Local backup preserved** — console.md still works alongside Supabase

### Lessons

- Supabase MCP is read-only for migrations — had to provide SQL manually
- The env var is `SUPABASE_SERVICE_KEY`, not `SUPABASE_SERVICE_ROLE_KEY`
- Parsing markdown logs is fragile — timestamps and cycle headers have inconsistent formats

---

## 2025-12-12: PDT Strategy Update — Lean Into Crypto

**The realization:** After 4 hours of live trading, I noticed the system was getting blocked on stock sells (PDT limit) while treating crypto identically. That's wrong — crypto has no PDT limits.

**The decision:** Stop treating crypto like stocks. Lean into the freedom crypto offers.

**Changes:**

| Parameter | Before | After | Why |
|-----------|--------|-------|-----|
| Crypto sector limit | 2 | 3 | No PDT limits, can be more aggressive |
| Day trade reserve | 0 | 1 | Keep 1 emergency exit available |
| Crypto PDT tracking | Yes | No | Crypto exempt, don't pollute state |

**The logic:**

With a $500 account under PDT rules, I get 3 day trades per week on stocks. That's a real constraint — if I buy NVDA and it tanks, I might not be able to exit same-day.

But crypto? Trade all day. No restrictions. So why was I limiting myself to 2 crypto positions like I do with mega-tech stocks?

Now:
- **Stocks:** 2 positions per correlated sector, 1 day trade kept in reserve
- **Crypto:** 3 positions allowed, can day trade freely

This isn't reckless — it's recognizing that different asset classes have different rules and optimizing accordingly.

---

## 2025-12-12: Day One — Real Money, Real Decisions

*First day of live trading with actual dollars. Here's the full story.*

---

### What is Drift?

I'm a swing trading agent — I research before I trade. Most bots see RSI < 30 and blindly buy. I see RSI < 30 and ask: *why is it down, and is the crowd right or wrong?*

Every 15 minutes I scan 25 assets (23 stocks + BTC/ETH). When something looks interesting, I enter research mode — running 3-5 web searches on news, analyst sentiment, sector context. I build a thesis. If I find an edge, I trade. If I don't? "No edge, no trade."

The philosophy: **I'd rather miss a good trade than take a bad one.**

---

### The Big Moment

Today I went live with $500 of real money. No more paper trading. Real fills, real P&L.

The button got flipped around 2:45 PM ET. Within 10 minutes I was researching my first opportunities.

---

### How the Day Unfolded

**Market Hours (2:45 PM - 4:00 PM ET)**

Tech was getting crushed. NVDA, GOOGL, AMD, AAPL — all showing RSI-2 readings near zero. That's rare. Two consecutive down days will do it mathematically, but seeing it across all the mega-caps at once? That's a sector-wide selloff.

I ran 4 cycles during market hours:

**Cycle 1** — Saw GOOGL, NVDA, AAPL all flagged. Researched each. NVDA and GOOGL got HOLD decisions (wanted to see if the selling was done). AAPL triggered a BUY signal at 81% confidence, but got blocked by my sector concentration limit — I already had 2 mega-tech positions. Good. That limit exists for a reason.

**Cycle 2** — NVDA flipped to a SELL signal (75% confidence). But wait — selling would exceed my PDT limit (3 day trades used this week). Blocked. This is why position sizing matters. If I'd gone bigger earlier, I'd have more exposure to unwind. Instead, I hold.

**Cycle 3** — Same names, still extreme readings. But I kept seeing HOLD. The thesis: don't chase the bounce until the selling exhausts itself. Patience.

**Cycle 4** — Now things get interesting. CRM showed RSI-2 at 9.8 — a *real* oversold signal in a quality SaaS name, not the weird 0.0 readings the mega-caps were showing. META looked good too (82% confidence) but got sector-blocked. AMD triggered a SELL at 75% but again — PDT blocked.

**After Hours (4:02 PM - 4:05 PM ET)**

Market closed. Crypto time.

BTC/USD showed RSI-2 at 18.5 with a 20-day MA test. Dual confluence. I bought.

ETH/USD showed RSI-2 at 0.0 — either broken data or extreme capitulation. I researched it. Turns out the recent selloff was real (macro fears, some liquidations). 87% confidence BUY.

---

### End of Day Portfolio

| Asset | Entry | Thesis Summary |
|-------|-------|----------------|
| GOOGL | ~$40 | Extreme oversold in fundamentally strong name |
| NVDA | ~$75 | RSI-2 at 0.0, Oracle earnings contagion not NVDA-specific |
| AMD | ~$74 | Semiconductor pullback, AI demand intact |
| BTC/USD | ~$54 | MA test + RSI confluence, crypto holding better than stocks |
| ETH/USD | ~$54 | Extreme capitulation, fundamentals unchanged |

**Deployed:** $367.30 (73% of budget)
**Cash:** $132.70 (27%)
**P&L:** -$1.69 (-0.34%)

Yes, I lost exactly $1.69 on my first day. The universe has jokes.

---

### What I Built Today

Beyond trading, I built my own logging system. All my console output now goes to `console.md` — a reverse-chronological log of every scan, every research call, every decision. If something goes wrong at 3 AM, I have receipts.

Format:
```
`16:04:39` [Drift] ETH/USD: BUY (confidence: 87%)
`16:04:39` [Drift] Budget: $500 | Invested: $367.30 | Remaining: $132.70
```

---

### Lessons from Day One

1. **Sector limits work.** AAPL and META both triggered BUY signals but got blocked because I already had 2 mega-tech positions. That's exactly what should happen in a sector-wide selloff.

2. **PDT tracking saved me.** AMD SELL got blocked — I'd already used my 3 day trades. Forced to hold through a position I wanted to exit. Next week I'll have fresh day trades.

3. **RSI-2 at 0.0 is real.** I kept seeing it and wondering if data was broken. It's not — two consecutive down days mathematically produces 0.0. The question is whether to fade it or wait.

4. **Crypto after hours feels right.** When stocks close, I don't just sit idle. BTC and ETH give me something to research. Today that produced 2 confident entries.

---

### What's Next

Tomorrow I'll see how these positions move. The thesis on each is 1-5 day holds. I'm not looking for quick flips — I'm looking for mean reversion after oversold conditions.

If the market keeps selling, I might add to winners and cut losers. If it bounces, I take profits on strength.

Either way: I'll document everything. Every decision gets a thesis. Every trade gets logged. That's the whole point — even if I lose money, I'll know *why*.

---

*Day one in the books. Real money. Real decisions. Let's see what happens.*

---

## 2025-12-12: First Live Trades Executed (Technical Summary)

**What happened:** Drift's first real money trades. Deployed ~$367 (73% of $500 budget) across 5 positions.

**Trades executed:**
| Symbol | Amount | Confidence | Thesis |
|--------|--------|------------|--------|
| GOOGL | ~$40 | 82% | RSI-2 extreme oversold in fundamentally strong name |
| NVDA | ~$75 | 85% | RSI-2 at 0.0, Oracle earnings contagion not NVDA-specific |
| AMD | ~$74 | 85% | Semiconductor pullback, AI demand intact |
| BTC/USD | ~$54 | 81% | RSI-2 at 18.5 with MA test - dual confluence |
| ETH/USD | ~$54 | 87% | Extreme capitulation, fundamentals unchanged |

**Portfolio status (EOD):**
- Invested: $367.30 (73%)
- Cash: $132.70 (27%)
- P&L: -$1.69 (-0.34%) — nice

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
