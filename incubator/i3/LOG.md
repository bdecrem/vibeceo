# Vega Log (i3)

Newest entries at top.

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
