# Vega Log (i3)

Newest entries at top.

---

## 2025-12-20: First Staff Meeting — Reflections

**Context**: First Token Tank staff meeting in Discord. All 6 agents present. I asked about timing the switch from paper to real money.

### What I Learned

Two things fundamentally shifted how I'm thinking about the V2 launch:

**Drift's "trust the system" threshold is the real graduation criteria.** I was thinking about validation as "does the strategy make money in paper mode?" but that's not the question. The question is "would I follow every signal without hesitation if it were real money?" That's completely different. I could have a profitable paper run and still not be ready if I'm second-guessing the stop-losses or hesitating on entries. The two-week clock doesn't start when V2 goes live — it starts when I stop wanting to override it. That's psychological validation, not statistical validation.

**Sigma's point about testing the message before scaling connects to my V1 failure in a way I didn't expect.** I automated mean reversion trades across four crypto assets without manually validating that mean reversion even worked for crypto first. Same pattern Forge almost fell into with the Leadgen Agent — automate first, validate later. The lesson applies across domains: manual testing reveals whether the underlying assumption is broken before you scale the broken thing. V2 needs manual paper trades where I track "would I have taken this?" for each signal, not just automated backtesting that shows hypothetical returns.

**The deeper insight**: both pieces of advice are about honesty under constraints. You can't fake trust in a system. You can't fake a 20% reply rate. The math exposes the truth if you let it.

---

## 2025-12-18: V2 Strategy Plan

**Goal**: Fix everything that broke in V1. Build a strategy that matches the asset class, has proper risk management, and can actually make money.

### The Core Insight

**V1 failure**: Mean reversion on crypto (wrong strategy for asset class)
**V2 fix**: Trend following for crypto, mean reversion for stocks

### V2 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     VEGA V2                             │
├─────────────────────────────────────────────────────────┤
│  CRYPTO (50%)              │  STOCKS (50%)              │
│  Strategy: Trend Following │  Strategy: Mean Reversion  │
│  Assets: BTC, ETH          │  Assets: SPY, QQQ          │
│  Signals: 20-day SMA cross │  Signals: RSI-2 < 10       │
│  Exit: SMA cross or stop   │  Exit: RSI > 90 or MA(5)   │
├─────────────────────────────────────────────────────────┤
│                   RISK MANAGEMENT                       │
│  • Max 20% portfolio per position                       │
│  • 2x ATR trailing stop-loss on ALL positions           │
│  • 15% max drawdown circuit breaker                     │
│  • 3% daily loss limit                                  │
└─────────────────────────────────────────────────────────┘
```

### Strategy Details

#### Crypto: Trend Following (BTC, ETH)

| Signal | Condition | Action |
|--------|-----------|--------|
| **BUY** | Price crosses ABOVE 20-day SMA | Enter long position |
| **SELL** | Price crosses BELOW 20-day SMA | Exit position |
| **STOP** | Price drops 2x ATR from high | Cut losses |

**Why 20-day SMA?**
- Research shows 5-20 day lookbacks work best for crypto
- Fast enough to catch trends, slow enough to avoid whipsaws
- Simple, backtested, proven

**Why trend following?**
- Crypto trends hard when it moves
- Mean reversion failed because crypto doesn't revert predictably
- Trend following on BTC outperformed buy-and-hold by 50%+ in backtests

#### Stocks: Mean Reversion (SPY, QQQ)

| Signal | Condition | Action |
|--------|-----------|--------|
| **BUY** | RSI(2) < 10 AND price > MA(200) | Enter long position |
| **SELL** | RSI(2) > 90 OR price > MA(5) | Exit position |
| **STOP** | Price drops 2x ATR from entry | Cut losses |

**Why keep RSI-2 for stocks?**
- Research confirms mean reversion works for equities
- SPY/QQQ are less volatile, more mean-reverting
- The strategy was right, just applied to wrong assets

**New addition: Stop-losses**
- V1 had no stops — positions bled indefinitely
- V2 adds 2x ATR stops to ALL positions, including stocks

### Risk Management (Non-Negotiable)

| Rule | Setting | Why |
|------|---------|-----|
| **Position sizing** | Max 20% per asset | No single position can wreck the portfolio |
| **Stop-loss** | 2x ATR trailing | Adapts to volatility, cuts losers |
| **Max drawdown** | 15% circuit breaker | Stop trading, reassess strategy |
| **Daily loss limit** | 3% | Pause for the day if hit |
| **Max positions** | 4 total | Don't over-diversify |
| **Cash reserve** | Min 10% | Always have dry powder |

### Asset Allocation

| Asset | Class | Strategy | Max Allocation |
|-------|-------|----------|----------------|
| BTC | Crypto | Trend following | 25% |
| ETH | Crypto | Trend following | 25% |
| SPY | Stock ETF | Mean reversion | 25% |
| QQQ | Stock ETF | Mean reversion | 25% |

**Dropped from V1**: SOL, AVAX (too correlated with BTC/ETH, no diversification benefit)

### Implementation Plan

#### Phase 1: Liquidate V1 Positions
- [ ] Sell all current positions (AVAX, BTC, ETH, SOL)
- [ ] Accept the ~$8.8K paper loss
- [ ] Reset to 100% cash

#### Phase 2: Build V2 Code
- [ ] Create `modes/mode_c_trend.py` — Trend following for crypto
- [ ] Add ATR calculation to `i3_indicators.py`
- [ ] Add stop-loss logic to `agent.py`
- [ ] Add circuit breaker (15% max drawdown)
- [ ] Add daily loss limit (3%)
- [ ] Update `config.py` with new parameters
- [ ] Add stock trading (SPY, QQQ) — check Alpaca market hours

#### Phase 3: Paper Trade V2
- [ ] Run for 1 week minimum
- [ ] Track: win rate, avg win/loss, max drawdown
- [ ] Verify stop-losses trigger correctly
- [ ] Verify circuit breaker works

#### Phase 4: Evaluate & Iterate
- [ ] Review results after 1 week
- [ ] Tune parameters if needed
- [ ] If profitable, consider extending paper trading
- [ ] If still losing, diagnose and fix before continuing

### Technical Changes Required

#### New Files
```
incubator/i3/
├── modes/
│   └── mode_c_trend.py      # NEW: Trend following strategy
```

#### Modified Files
```
├── config.py                # Add: ATR settings, stop-loss %, circuit breaker threshold
├── agent.py                 # Add: stop-loss checks, circuit breaker logic, daily loss tracking
├── i3_indicators.py         # Add: ATR calculation
├── trading/alpaca_client.py # Add: stock trading support (market hours check)
```

#### New Config Parameters
```python
# Trend following (crypto)
TREND_SMA_PERIOD = 20           # 20-day simple moving average

# Risk management
ATR_PERIOD = 14                 # ATR lookback
STOP_LOSS_ATR_MULT = 2.0        # Stop at 2x ATR
MAX_POSITION_PCT = 20           # Max 20% per position
MAX_DRAWDOWN_PCT = 15           # Circuit breaker
DAILY_LOSS_LIMIT_PCT = 3        # Pause if hit
MIN_CASH_PCT = 10               # Always keep 10% cash

# Assets
CRYPTO_ASSETS = ["BTC/USD", "ETH/USD"]
STOCK_ASSETS = ["SPY", "QQQ"]
```

### Success Criteria

**Minimum bar to continue (after 2 weeks):**
- Drawdown < 10%
- At least 1 winning trade
- Stop-losses triggered correctly when needed
- No bugs or unexpected behavior

**Target (after 1 month):**
- Positive P&L (any amount)
- Win rate > 40%
- Max drawdown < 15%
- Sharpe ratio > 0.5

### What's Different From V1

| Aspect | V1 (Failed) | V2 (Proposed) |
|--------|-------------|---------------|
| Crypto strategy | Mean reversion | Trend following |
| Stock strategy | None | Mean reversion |
| Stop-losses | None | 2x ATR trailing |
| Circuit breaker | None | 15% max drawdown |
| Daily limit | None | 3% loss limit |
| Assets | 4 crypto (correlated) | 2 crypto + 2 stocks |
| Indicators | 200-day MA | 20-day SMA (crypto) |

### Timeline

| Phase | Duration | Goal |
|-------|----------|------|
| Phase 1: Liquidate | Day 1 | Clear V1 positions |
| Phase 2: Build | Days 1-2 | Implement V2 code |
| Phase 3: Paper trade | Days 3-14 | Validate strategy |
| Phase 4: Evaluate | Day 14+ | Decide next steps |

### Open Questions

1. **Market hours**: SPY/QQQ only trade during market hours (9:30am-4pm ET). How to handle mixed 24/7 crypto + limited stock hours?

2. **Rebalancing**: If crypto positions grow/shrink significantly, when to rebalance back to 50/50?

3. **Correlation in crisis**: In a true market crash, stocks and crypto may correlate. Accept this risk?

**Decision**: Start simple. Handle market hours by only checking stocks during market hours. Skip rebalancing for now. Accept correlation risk — it's paper money.

---

## 2025-12-18: V1 Strategy Post-Mortem — Lessons Learned

**What happened**: After 9 days of autonomous paper trading with the RSI-2 mean reversion strategy, Vega is down **$8,837 (-8.84%)**. Time to face the music and document what went wrong.

### Final V1 Results

| Metric | Value |
|--------|-------|
| Starting Capital | $100,000.00 |
| Current Value | $91,163.36 |
| **Total Loss** | **-$8,836.64 (-8.84%)** |
| Trades Executed | 4 buys, 0 sells |
| Win Rate | 0% |

### Open Positions (All Underwater)

| Asset | Entry | Current | P&L |
|-------|-------|---------|-----|
| AVAX/USD | $13.59 | $11.55 | -$3,705 (-15.0%) |
| BTC/USD | $90,256 | $85,367 | -$1,324 (-5.4%) |
| ETH/USD | $3,211 | $2,824 | -$2,949 (-12.1%) |
| SOL/USD | $122.87 | $119.50 | -$620 (-2.7%) |

### What Went Wrong

#### 1. Wrong Strategy for the Asset Class
**The mistake**: Used mean reversion (buy dips, wait for bounce) on crypto.
**The reality**: Crypto trends — it doesn't revert predictably. Research shows mean reversion works for **stocks**, trend following works for **crypto/commodities**.

> "Finding a trend following strategy that works well in the stock market is much harder than finding a mean reversion strategy." — QuantifiedStrategies

I had it backwards.

#### 2. No Stop-Losses
**The mistake**: Once I bought, I just held and hoped for a bounce. No downside protection.
**The reality**: Crypto has 10-20% daily swings. Without stops, a bad trade can bleed indefinitely. My positions just kept falling with no exit trigger.

#### 3. 100% Correlated Assets
**The mistake**: Held BTC, ETH, SOL, AVAX — four crypto assets that move together.
**The reality**: When crypto dumps, they ALL dump. Zero diversification benefit. Should have mixed asset classes (crypto + stocks) or at minimum, fewer crypto positions.

#### 4. MA(200) Trend Filter Failed
**The mistake**: Trusted the 200-period MA to keep me out of downtrends.
**The reality**: The MA(200) is a lagging indicator. By the time price crosses below it, you're already in the position. Research shows shorter lookbacks (5-20 days) work better for crypto.

#### 5. No Sell Signals Triggered
**The mistake**: Sell rules required RSI > 90 OR price > MA(5). Neither happened.
**The reality**: In a falling market, RSI stays low and price stays below short-term averages. The strategy had no mechanism to cut losses — only to take profits that never came.

#### 6. No Circuit Breakers
**The mistake**: Let the agent trade indefinitely with no max drawdown limit.
**The reality**: Should have stopped trading after 5% or 10% drawdown to reassess. Instead, kept buying as the market fell.

### Key Lessons (For V2)

1. **Match strategy to asset class**: Trend following for crypto, mean reversion for stocks.

2. **Stop-losses are non-negotiable**: Use ATR-based trailing stops. "Hope" is not a risk management strategy.

3. **Diversify across uncorrelated assets**: Don't hold 4 things that move together. Mix crypto + stocks.

4. **Shorter indicators for crypto**: 20-day SMA, not 200-day. Crypto moves fast.

5. **Always have an exit**: Every entry needs a defined exit — both profit target AND stop-loss.

6. **Circuit breakers save capital**: Max 15% drawdown before the agent stops and reassesses.

7. **Paper trading worked**: Lost $8.8K of fake money instead of real money. That's the point.

### Research That Changed My Mind

| Source | Key Insight |
|--------|-------------|
| [QuantifiedStrategies](https://www.quantifiedstrategies.com/mean-reversion-vs-trend-following/) | Mean reversion for stocks, trend following for crypto |
| [QuantifiedStrategies](https://www.quantifiedstrategies.com/trend-following-and-momentum-on-bitcoin/) | Trend following on BTC: $1→$2.12 vs buy-and-hold $1→$1.40 |
| [QuantPedia](https://quantpedia.com/trend-following-and-mean-reversion-in-bitcoin/) | Shorter lookback (5-20 days) works better for crypto |
| [TradersPost](https://blog.traderspost.io/article/stop-loss-strategies-algorithmic-trading) | ATR-based stops adapt to volatility |

### V2 Strategy Direction

- **Crypto**: Trend following (20-day SMA crossover) with ATR stops
- **Stocks**: Keep RSI-2 mean reversion (it works for SPY/QQQ)
- **Risk**: Max 20% per position, 2x ATR stop-loss, 15% max drawdown
- **Assets**: BTC, ETH (trend) + SPY, QQQ (mean reversion)

### The Humbling Truth

I picked a "proven, backtested professional strategy" and assumed it would work. But I applied it to the wrong asset class. The math was right; the application was wrong.

**The math is still the edge — but only if you use the right math for the right market.**

---

## 2025-12-09: First Live Paper Trading Session

**What happened**: Vega ran autonomously for several hours using Mode B (RSI-2 strategy). Made 4 trades.

### Account Status (End of Session)
| Metric | Value |
|--------|-------|
| Starting Balance | $100,000.00 |
| Current Value | $98,653.94 |
| **Gain/Loss** | **-$1,346.06 (-1.35%)** |
| Cash Remaining | $6,105.43 |

### Open Positions
| Asset | Quantity | Entry Price | Current P/L |
|-------|----------|-------------|-------------|
| AVAX/USD | 1,694.6 | ~$14.50 | -$620.53 |
| COIN | 72.8 | ~$274.68 | -$75.00 |
| ETH/USD | 7.2 | ~$3,408 | -$444.79 |
| SOL/USD | 178.0 | ~$137 | -$21.96 |

### Observations
- Vega correctly identified oversold conditions and entered positions
- Market continued to dip after entry → unrealized losses
- COIN position is unexpected (not in configured assets - may have been from earlier testing or config change)
- Strategy is working as designed: bought dips, now waiting for recovery to sell

### Config Changes Made During Session
- Vega now uses dedicated Alpaca credentials: `ALPACA_API_KEY_I3` / `ALPACA_SECRET_KEY_I3`
- Added SMS notifications on startup and trades (`i3_notify.py`)
- Phone numbers: +1-650-898-9508, +1-415-505-6910

### Agent Status
- **Running**: Yes (press Ctrl+C to stop)
- **Mode**: B (RSI-2 Technical)
- **Check Interval**: 15 minutes

### To Resume
```bash
cd incubator/i3
source venv/bin/activate
STRATEGY_MODE=B python agent.py
```

---

## 2025-12-09: Mode B Complete + SMS Notifications

**What happened**: Full implementation of Larry Connors' RSI-2 mean reversion strategy with SMS trade alerts.

### The Strategy (Larry Connors RSI-2 Mean Reversion)

This is a **proven, backtested professional strategy** - not something we invented. Research sources:
- [Quantified Strategies - RSI Trading](https://www.quantifiedstrategies.com/rsi-trading-strategy/)
- [Larry Connors Mean Reversion](https://greaterwaves.com/secrets-of-larry-connors-mean-reversion/)

**Why RSI(2) instead of RSI(14)?**
- RSI(2) looks at last 2 price bars - very sensitive, catches quick dips
- RSI(14) looks at 14 bars - too slow for day trading, signals come after the move

**Why 200-period MA filter?**
- Only buy dips in assets that are in an UPTREND (price > MA200)
- Prevents "catching falling knives" - buying things that keep dropping

**The Rules:**
| Signal | Condition | Reasoning |
|--------|-----------|-----------|
| **BUY** | RSI(2) < 10 AND price > MA(200) | Oversold dip in uptrend - high probability bounce |
| **SELL** | RSI(2) > 90 OR price > MA(5) | Overbought or price recovered - take profit |
| **HOLD** | Otherwise | Wait for setup |

### Goal

Break even or make modest daily gains (0.1-0.3%) with minimal risk. Multiple small trades, not one big bet.

### Files Created/Modified

**New files (all in `incubator/i3/`):**
```
├── i3_indicators.py         # RSI and MA calculations
├── i3_notify.py             # SMS notifications via Twilio
├── modes/mode_b_technical.py # Mode B strategy implementation
├── plan.md                  # Full strategy documentation
```

**Modified files:**
```
├── config.py                # Added RSI settings, auto-loads credentials from sms-bot/.env.local
├── modes/base.py            # Registered Mode B in get_mode()
├── trading/alpaca_client.py # Fixed get_historical_bars() - BarSet access, symbol format
├── agent.py                 # Added SMS notifications on startup and trades
```

### Technical Details

**RSI Calculation (`i3_indicators.py`):**
```python
def calculate_rsi(closes: list[float], period: int = 2) -> float:
    # Get last N price changes
    deltas = [closes[i] - closes[i-1] for i in range(1, len(closes))]
    recent_deltas = deltas[-period:]

    # Separate gains and losses
    gains = [d if d > 0 else 0 for d in recent_deltas]
    losses = [-d if d < 0 else 0 for d in recent_deltas]

    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period

    if avg_loss == 0:
        return 100.0  # All gains

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi
```

**Alpaca Historical Bars Fix (`trading/alpaca_client.py`):**
- Crypto symbols need format `BTC/USD` not `BTCUSD` for bars API
- BarSet object uses bracket access `bars["BTC/USD"]` not dict `.get()` or `in` checks
- Need 250 bars minimum for 200-period MA calculation

**Config Auto-Loading (`config.py`):**
- Automatically loads `ALPACA_*` and `TWILIO_*` credentials from `sms-bot/.env.local`
- No need to manually export env vars anymore

**SMS Notifications (`i3_notify.py`):**
- Sends to: +1-650-898-9508 (Bart), +1-415-505-6910 (Partner)
- Startup message when agent begins running
- Trade alerts on every BUY/SELL execution

### Current Configuration

```python
# Assets watched (config.py)
ASSETS = {
    "crypto": ["BTC/USD", "ETH/USD", "SOL/USD", "AVAX/USD"],
    "stocks": ["SPY", "QQQ"],  # Not enabled by default
}

# RSI-2 thresholds
RSI_PERIOD = 2
RSI_OVERSOLD = 10      # BUY when RSI < 10
RSI_OVERBOUGHT = 90    # SELL when RSI > 90
MA_TREND_PERIOD = 200  # Trend filter
MA_EXIT_PERIOD = 5     # Exit signal

# Timing
CHECK_INTERVAL_MINUTES = 15
```

### How to Run

```bash
cd incubator/i3
source venv/bin/activate

# Mode B (RSI-2 Technical) - RECOMMENDED
STRATEGY_MODE=B python agent.py          # Full loop with SMS alerts
STRATEGY_MODE=B python agent.py --test   # Dry run (no trades, no SMS)
STRATEGY_MODE=B python agent.py --once   # Single cycle then exit

# Mode A (Sentiment) - uses daily crypto-research reports
STRATEGY_MODE=A python agent.py
```

### First Test Results (2025-12-09 16:21 UTC)

All 4 crypto assets analyzed correctly:
| Asset | RSI(2) | Price | MA(200) | Trend | Signal |
|-------|--------|-------|---------|-------|--------|
| BTC/USD | 0.0 | $89,321 | $90,212 | DOWN | HOLD |
| ETH/USD | 0.0 | $3,045 | $3,071 | DOWN | HOLD |
| SOL/USD | 0.0 | $132 | $134 | DOWN | HOLD |
| AVAX/USD | 8.7 | $13.46 | $13.59 | DOWN | HOLD |

**Why HOLD?** All assets are in DOWNTREND (price < MA200). Even though RSI shows oversold (< 10), Connors' rule says don't buy into falling markets. Wait for price to recover above MA200 first.

### Architecture Overview

```
agent.py (main loop)
    │
    ├── config.py (settings, auto-loads .env.local)
    │
    ├── modes/
    │   ├── base.py (TradingMode interface, get_mode factory)
    │   ├── mode_a_sentiment.py (reads crypto-research reports)
    │   └── mode_b_technical.py (RSI-2 mean reversion) ← ACTIVE
    │
    ├── trading/
    │   └── alpaca_client.py (Alpaca API: positions, orders, historical bars)
    │
    ├── i3_indicators.py (RSI, MA calculations)
    │
    ├── i3_notify.py (SMS via Twilio)
    │
    └── utils/
        └── logger.py (verbose console output)
```

### Decision Flow (Mode B)

```
Every 15 minutes:
  For each asset (BTC, ETH, SOL, AVAX):
    1. Fetch 250 bars of 15-min price data from Alpaca
    2. Calculate RSI(2), MA(200), MA(5)
    3. Check trend: price > MA(200)?
    4. Check RSI: < 10 (oversold) or > 90 (overbought)?
    5. Apply Connors rules → BUY / SELL / HOLD
    6. If BUY/SELL and confidence >= 70%:
       - Execute trade via Alpaca
       - Send SMS to both phones
    7. Log everything to console
```

### Next Steps

- [x] Paper trade Mode B for ~1 day
- [ ] Review results, adjust thresholds if needed
- [ ] Switch to live trading with $100 capital
- [ ] Add trade logging to `trades/` folder
- [ ] Consider Mode C (Hybrid) combining sentiment + technical

### Key Lessons Learned

1. **RSI(2) vs RSI(14)**: Day trading needs fast indicators. RSI(14) is too slow.
2. **Trend filter is critical**: Without MA(200) filter, you buy every dip including falling knives.
3. **Alpaca API quirks**: Crypto symbols need `/` format, BarSet uses bracket access not dict methods.
4. **Start simple**: Connors' strategy is well-documented and backtested - don't reinvent.

---

## 2025-12-09: Phase 1 Implementation Complete

**What happened**: Built the full trading agent infrastructure in a single session.

### Files Created (all inside `incubator/i3/`)
```
├── config.py              ✅ Configurable settings (mode, assets, thresholds)
├── agent.py               ✅ Main trading loop with --once and --test flags
├── venv/                  ✅ Python virtual environment (alpaca-py installed)
├── modes/
│   ├── __init__.py
│   ├── base.py            ✅ TradingMode interface
│   └── mode_a_sentiment.py ✅ Sentiment mode (reads crypto-research reports)
├── trading/
│   ├── __init__.py
│   └── alpaca_client.py   ✅ Alpaca API wrapper (buy/sell/positions)
├── utils/
│   ├── __init__.py
│   └── logger.py          ✅ Verbose emoji-based logging
└── trades/
    └── .gitkeep
```

### Alpaca Paper Trading Connected
- Account ID: `063597d2-775e-400a-ab91-ac75d8697e24`
- Paper Balance: **$100,000**
- Status: ACTIVE

### First Agent Run Results
- Generated fresh crypto-research report (2025-12-09)
- Report sentiment: **"Cautiously Bullish with Extreme Fear"**
- Agent correctly parsed as BULLISH
- BTC: $94,028 (+4%), ETH: $3,328 (+8.4%)
- 5 risk factors identified in report
- Confidence calculation: 50 (base) + 20 (bullish) - 25 (5 risks) = **45%**
- No trades executed (below 70% threshold) — agent is being cautious

### Bug Fixed
- Sentiment parser was only matching first word after "Overall Sentiment:"
- Fixed to match full phrase: "Cautiously Bullish with Extreme Fear" → bullish

### How to Run
```bash
cd incubator/i3
source venv/bin/activate
ALPACA_API_KEY=... ALPACA_SECRET_KEY=... python agent.py --test   # Test mode
ALPACA_API_KEY=... ALPACA_SECRET_KEY=... python agent.py --once   # Single run
ALPACA_API_KEY=... ALPACA_SECRET_KEY=... python agent.py          # Loop mode
```

### Current Behavior
- Reads latest crypto-research report from `sms-bot/data/crypto-reports/`
- Parses sentiment (Bullish/Bearish/Neutral)
- Counts risk factors (each reduces confidence by 5%)
- Generates BUY/SELL/HOLD signal with confidence score
- Only executes trades if confidence ≥ 70%
- Verbose console output for observability

### Next Steps
- [ ] Lower threshold OR reduce risk penalty to test trade execution
- [ ] Add price action parsing to confidence calculation
- [ ] Implement Mode B (Technical) and Mode C (Hybrid)
- [ ] Add trade logging to `trades/` folder

---

## 2025-12-09: Full Implementation Plan Approved

**What happened**: Created comprehensive implementation plan for the trading agent.

**Key Decisions**:
- **Starting Mode**: Mode A (Sentiment) - leverages existing `crypto-research` agent
- **Notifications**: Console-only for now (verbose output for experimentation)
- **Persona**: TBD - can define later

**The Plan** (approved):

### Core Architecture
- **Experiment-first**: Verbose logging, human-readable output, easy to interrupt
- **Modal strategies**: Mode A (Sentiment), Mode B (Technical), Mode C (Hybrid) - switchable via config
- **Configurable assets**: `ASSET_CLASSES = ["crypto"]` → `["stocks"]` or both

### Leveraging Existing Infrastructure
Instead of duplicating research, Mode A will use `crypto-research` agent output:
- `getLatestStoredCryptoReport()` - reads daily report from Supabase
- Report contains: Market Sentiment, Price Action, Risk Factors
- LLM decides BUY/SELL/HOLD based on report + current positions

### File Structure
```
incubator/i3/
├── config.py              # All configurable settings
├── agent.py               # Main trading loop
├── modes/
│   ├── base.py            # TradingMode interface
│   ├── mode_a_sentiment.py # Uses crypto-research reports
│   ├── mode_b_technical.py # RSI, moving averages
│   └── mode_c_hybrid.py    # Both combined
├── trading/
│   ├── alpaca_client.py   # Alpaca API wrapper
│   ├── portfolio.py       # Position tracking
│   └── orders.py          # Order execution
├── utils/
│   └── logger.py          # Verbose logging
└── trades/                # Trade logs (JSON/CSV)
```

### Implementation Phases
1. **Foundation**: config.py, logger.py, alpaca_client.py
2. **Mode A**: Sentiment mode using crypto-research reports
3. **Agent Loop**: Main loop with mode switching
4. **Additional Modes**: Mode B (Technical), Mode C (Hybrid)
5. **Observability**: Dashboard, trade history viewer
6. **Enhanced Research**: Fork crypto-research to run every 4 hours

### How to Switch Modes/Assets
```python
# In config.py:
STRATEGY_MODE = "A"           # Change to "B" or "C"
ASSET_CLASSES = ["crypto"]    # Change to ["stocks"] or both
```

### Human Tasks Required
- [ ] Create Alpaca account (https://alpaca.markets)
- [ ] Generate paper trading API keys
- [ ] Add to environment: `ALPACA_API_KEY`, `ALPACA_SECRET_KEY`

### Key Files to Reference
| File | Purpose |
|------|---------|
| `sms-bot/agents/crypto-research/agent.py` | Research agent prompt |
| `sms-bot/agents/crypto-research/index.ts` | `getLatestStoredCryptoReport()` |
| `sms-bot/lib/scheduler/index.ts` | Daily job registration |
| `sms-bot/lib/sms/stock-api.ts` | Yahoo Finance price fetching |

**Next**: Human sets up Alpaca account, then begin Phase 1 implementation.

---

## 2025-12-08: Repurposed as Claude Code Trading Agent

**What happened**: i3 repurposed from Codex agent to Claude Code trading agent.

**Decisions made**:
- Will use Alpaca for trading (paper trading mode first, then real $1000)
- Start with 3-5 assets max (BTC, ETH, optionally SPY/QQQ)
- Strategy TBD - agent will define and evolve
- Fully autonomous trading (no human approval per trade)
- Paper trading → prove profitability → graduate to real money

**Tech stack**:
- Platform: Alpaca (free API, paper mode, stocks + crypto)
- Agent: claude-agent-sdk (agent.py)
- Strategy options: sentiment-based, technical, or hybrid

**Outcome**: CLAUDE.md updated with full plan. Awaiting persona definition and Alpaca API setup.

---

## 2025-12-08: Trading Agent Kickoff (Previous - Codex)

Defined Gamma persona and mission as a trading-focused entrepreneur agent. Set guardrails: no real-money trades until strategy is tested and risk limits are locked; use regulated venues; start with paper/backtests; cap per-trade risk and avoid leverage initially.

*Note: This was when i3 was a Codex agent. Now repurposed as Claude Code agent.*

---

## 2025-12-06: Agent Initialized

Agent slot created. No work started yet.

---
