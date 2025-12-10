# i3-1 Trading Agent - Log

Newest entries at top.

---

## 2025-12-09: Weekly Strategist + Daily Executor Architecture Complete

**What happened**: Implemented the full "Proposal D" two-tier trading system.

### Architecture
```
Weekly Strategist (LLM)  →  state/strategy.json  →  Daily Executor (Mechanical)
     ↓                                                      ↓
 WebSearch for:                                    Price rules for:
 - Macro/Fed                                       - MA crossover
 - Crypto sentiment                                - RSI
 - Sector momentum                                 - Dip detection
 - Key events                                      - Stop loss
```

### Files Created
- `strategist/weekly_strategist.py` - LLM agent using claude-agent-sdk + WebSearch
- `strategist/types.py` - WeeklyStrategy TypedDict, load/save helpers
- `modes/mode_d_executor.py` - Mechanical executor (Mode D)
- `utils/price_rules.py` - MA, RSI, trend calculations
- `utils/market_hours.py` - Market hours checking
- `utils/sms_notifier.py` - Trade alerts via Twilio
- `i3_1_run_strategist.py` - Weekly strategist CLI
- `i3_1_run_executor.py` - Daily executor CLI
- `state/strategy.example.json` - Example strategy file

### Files Modified
- `config.py` - 20 assets (10 crypto, 10 stocks), timing configs, state paths
- `modes/base.py` - Registered Mode D
- `trading/alpaca_client.py` - Added get_historical_bars(), get_close_prices()

### Asset Coverage (20 total)
**Crypto**: BTC, ETH, SOL, AVAX, LINK, DOGE, MATIC, DOT, ATOM, UNI
**Stocks**: SPY, QQQ, NVDA, TSLA, AAPL, MSFT, GOOGL, AMZN, COIN, MSTR

### How It Works
1. **Weekly** (manual): Run `python i3_1_run_strategist.py --verbose`
   - LLM researches markets via WebSearch
   - Produces `state/strategy.json` with thesis, focus assets, biases
2. **Daily** (or more frequent): Run `python i3_1_run_executor.py --once`
   - Reads strategy.json
   - Gets prices from Alpaca
   - Applies price rules (trend + dip + RSI)
   - Executes trades if bias + signals align
   - Sends SMS on trades

### Key Design Decisions
- **No LLM for daily execution** - pure mechanical rules = lower cost
- **Strategy valid for 7 days** - rerun strategist weekly
- **5% hard stop loss** - simple risk management
- **SMS on every trade** - transparency

### Next Steps
- [ ] Test strategist end-to-end
- [ ] Test executor with paper trades
- [ ] Add execution_log.json for trade history
- [ ] Consider auto-scheduling strategist

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

**Next**: Design a simple but coherent trading strategy that matches data sources to trading frequency.

---
