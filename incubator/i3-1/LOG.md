# Pulse Log (i3-1)

Newest entries at top.

---

## 2025-12-09: Complete Two-Tier Trading System Implemented and Tested

**Session Summary**: Built and tested a full "Weekly Strategist + Daily Executor" trading system from scratch.

### The Problem We Solved

The original i3 trading agent had infrastructure (Alpaca connection, trade execution) but no coherent strategy:
- **Data mismatch**: Used a daily crypto research report but checked every 15 minutes
- **No position management**: No stop-loss, take-profit, or holding period logic
- **Only 2 assets**: BTC and ETH, missing broader opportunities
- **Arbitrary thresholds**: No clear reasoning for when to trade

### The Solution: Two-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  WEEKLY STRATEGIST (LLM + WebSearch)                        │
│  Runs: Once per week (manual trigger)                       │
│  Cost: ~$0.50-1.00 per run                                  │
│  Output: state/strategy.json                                │
├─────────────────────────────────────────────────────────────┤
│  Researches via WebSearch:                                  │
│  - Fed/macro outlook                                        │
│  - Crypto sentiment & ETF flows                             │
│  - Tech sector momentum                                     │
│  - Key events calendar                                      │
│                                                             │
│  Produces:                                                  │
│  - Market thesis (2-3 sentences)                            │
│  - Market regime (risk_on / risk_off / mixed)               │
│  - Focus assets (4-8 to trade)                              │
│  - Avoid assets (stay away)                                 │
│  - Per-asset biases (bullish/bearish/neutral + reasoning)   │
│  - Max exposure % (how much capital to deploy)              │
│  - Key events to watch                                      │
└─────────────────────────┬───────────────────────────────────┘
                          │ writes JSON
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  state/strategy.json                                        │
│  Valid for 7 days, refreshed weekly                         │
└─────────────────────────┬───────────────────────────────────┘
                          │ reads JSON
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  DAILY EXECUTOR (Mechanical Rules)                          │
│  Runs: Every 4h for crypto, market open/close for stocks    │
│  Cost: $0 (no LLM calls)                                    │
│  Trades: Via Alpaca API (paper or live)                     │
├─────────────────────────────────────────────────────────────┤
│  For each asset in focus_assets:                            │
│  1. Get price history from Alpaca (30 days)                 │
│  2. Calculate signals:                                      │
│     - Trend: 5-day MA vs 20-day MA                          │
│     - RSI: 14-period relative strength                      │
│     - Dip: Current price vs 5-day high                      │
│  3. Decision logic:                                         │
│     - BUY if: bullish bias + (trend_up OR dip>3% OR RSI<35) │
│     - SELL if: bearish bias OR stop_loss_hit (5%)           │
│     - HOLD otherwise                                        │
│  4. Execute via Alpaca, send SMS notification               │
└─────────────────────────────────────────────────────────────┘
```

### Why This Design?

1. **LLM for strategy, not execution**: The LLM is great at synthesizing information and reasoning about markets. But running it on every trade decision is expensive and slow. By having it set strategy weekly, we get the reasoning benefits at ~$4/month instead of ~$100+/month.

2. **Mechanical rules for execution**: Price rules (MA crossover, RSI, dip detection) are deterministic, fast, and free. They translate the strategist's bias into actual trade timing.

3. **Clear separation of concerns**: Strategy changes weekly (macro view). Execution happens daily (price timing). Each layer does what it's good at.

4. **20 assets for diversification**: 10 crypto + 10 stocks covers major opportunities without being overwhelming.

### Files Created

| File | Purpose |
|------|---------|
| `strategist/weekly_strategist.py` | LLM agent using claude-code-sdk with WebSearch. Researches markets and writes strategy.json. |
| `strategist/types.py` | TypedDicts for WeeklyStrategy, AssetBias. Helper functions: load_strategy(), save_strategy(), is_strategy_valid(), get_asset_bias(). |
| `strategist/__init__.py` | Module init |
| `modes/mode_d_executor.py` | Daily executor implementing TradingMode interface. Reads strategy, gets prices, applies rules, executes trades. |
| `utils/price_rules.py` | Price signal calculations: calculate_moving_average(), calculate_rsi(), get_trend(), get_dip_percentage(), should_buy(), should_sell(). |
| `utils/market_hours.py` | Market hours logic: is_trading_time(), is_market_open_now(), should_check_stocks_now(), get_market_status(). |
| `utils/sms_notifier.py` | Trade notifications via Twilio: send_trade_alert(), send_daily_summary(). |
| `i3_1_run_strategist.py` | CLI entry point for weekly strategist. Usage: `python i3_1_run_strategist.py --verbose` |
| `i3_1_run_executor.py` | CLI entry point for daily executor. Usage: `python i3_1_run_executor.py --once` or `--loop` or `--status` |
| `state/strategy.json` | Generated strategy file (created by strategist) |
| `state/strategy.example.json` | Example strategy for reference |

### Files Modified

| File | Changes |
|------|---------|
| `config.py` | Added 20 assets (ASSETS dict), timing configs (CRYPTO_CHECK_INTERVAL_HOURS, STOCK_CHECK_TIMES), state paths (STATE_DIR, STRATEGY_FILE), risk limits (STOP_LOSS_PCT). |
| `modes/base.py` | Registered Mode D in get_mode() factory. |
| `trading/alpaca_client.py` | Added get_historical_bars(symbol, days) and get_close_prices(symbol, days) for price history. |

### Asset Coverage (20 total)

**Crypto (10)**: BTC/USD, ETH/USD, SOL/USD, AVAX/USD, LINK/USD, DOGE/USD, MATIC/USD, DOT/USD, ATOM/USD, UNI/USD

**Stocks (10)**: SPY, QQQ, NVDA, TSLA, AAPL, MSFT, GOOGL, AMZN, COIN, MSTR

### How to Run

```bash
# Set environment variables (or source from .env file)
export ALPACA_API_KEY=your_key
export ALPACA_SECRET_KEY=your_secret

# Step 1: Generate weekly strategy (run once per week)
python i3_1_run_strategist.py --verbose
# Takes ~2 minutes, uses WebSearch to research markets
# Outputs: state/strategy.json

# Step 2: Check executor status
python i3_1_run_executor.py --status
# Shows: strategy loaded, market hours, focus assets

# Step 3: Run executor (during market hours)
python i3_1_run_executor.py --once        # Single run
python i3_1_run_executor.py --once --test # Dry run (no trades)
python i3_1_run_executor.py --loop        # Continuous loop
```

### Dependencies

```bash
pip install alpaca-py      # Alpaca trading API
pip install claude-code-sdk # LLM agent for strategist
```

### Test Results (Dec 9, 2025)

**Strategist Test**:
- Ran successfully, took ~2 minutes
- WebSearch researched: Fed outlook, crypto sentiment, tech momentum
- Generated strategy with thesis: "Fed rate cut expected but already priced in..."
- Market regime: risk_off
- Focus: MSFT, NVDA, GOOGL, QQQ, SPY (stocks only)
- Avoid: All crypto + TSLA (due to ETF outflows, fear sentiment)

**Executor Test**:
- Connected to Alpaca paper trading ($100k cash)
- Loaded strategy successfully
- Analyzed 10 crypto assets (market closed for stocks at 7:23pm EST)
- All HOLD decisions (correct! crypto in avoid/not-in-focus list)
- Ready to analyze stocks when market opens

### Decision Logic Deep Dive

The executor's `analyze()` method in `modes/mode_d_executor.py`:

```python
# 1. Check if asset is in focus
if asset not in strategy['focus_assets']:
    if asset in strategy.get('avoid_assets', []):
        return HOLD ("Asset in avoid list")
    return HOLD ("Asset not in focus")

# 2. Get bias from strategy
bias = get_asset_bias(strategy, asset)  # bullish/bearish/neutral

# 3. Check for existing position
have_position = asset in positions

# 4. SELL logic (for existing positions)
if have_position:
    if bias == 'bearish':
        return SELL ("Bias turned bearish")
    if unrealized_loss > 5%:
        return SELL ("Stop loss triggered")

# 5. BUY logic (for new positions)
if bias == 'bullish' and not have_position:
    signals = calculate_price_signals(prices)  # MA, RSI, dip
    if signals['trend_up'] or signals['dip_pct'] > 3 or signals['rsi'] < 35:
        return BUY (f"Bullish bias + {signal_reason}")

# 6. Default
return HOLD
```

### Configuration Details (config.py)

```python
# Timing
CRYPTO_CHECK_INTERVAL_HOURS = 4  # Check crypto every 4 hours
STOCK_CHECK_TIMES = ["09:35", "15:55"]  # Check stocks at open+close

# Risk
MAX_POSITION_PCT = 25  # Max 25% of portfolio per position
STOP_LOSS_PCT = 5  # Sell if down 5%

# State
STATE_DIR = "./state"
STRATEGY_FILE = "./state/strategy.json"
```

### Known Limitations

1. **No execution_log.json yet**: Trades aren't persisted to a log file (only Alpaca records them)
2. **Manual strategist trigger**: No auto-scheduling yet (cron could be added)
3. **SMS requires Twilio config**: Set TWILIO_* env vars for notifications
4. **Paper trading only**: TRADING_MODE must be explicitly set to "live" for real money

### Next Steps for Future Sessions

1. **Run during market hours**: Test executor when stocks are tradeable (9:30am-4pm EST)
2. **Execute a paper trade**: Verify full flow including order submission
3. **Add execution_log.json**: Persist trade history locally
4. **Auto-schedule strategist**: Cron job or Railway scheduled task
5. **Monitor and iterate**: Watch performance, adjust strategy parameters

### Environment Variables Needed

```bash
# Required for trading
ALPACA_API_KEY=xxx
ALPACA_SECRET_KEY=xxx

# Required for strategist
CLAUDE_CODE_OAUTH_TOKEN=xxx  # Or use claude-code auth

# Optional for SMS notifications
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_FROM_NUMBER=+1xxx
TWILIO_TO_NUMBER=+1xxx
```

---

## 2025-12-09: Forked from i3

**What happened**: Created i3-1 as a clone of i3 to develop a coherent trading strategy.

**Context**: The original i3 had infrastructure (Alpaca connection, trade execution, logging) but no coherent strategy. Key issues identified:
- Data source mismatch: Daily research report checked every 15 minutes
- No position management: No take-profit, stop-loss, or holding period logic
- Arbitrary confidence thresholds

**Decisions made**:
- Start fresh with LOG.md for i3-1
- Keep the infrastructure code, rethink the strategy
- Need to define: trading frequency, holding period, entry/exit rules

---
