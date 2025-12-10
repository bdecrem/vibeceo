# Plan: i3 Trading Agent - Mode B (RSI-2 Mean Reversion)

## Goal

Build a trading agent that makes modest daily gains (0.1-0.3%) with minimal risk using the **Larry Connors RSI-2 Mean Reversion** strategy. Paper trade ~1 day to verify no bugs, then switch to live trading with $100 capital.

---

## Strategy: Larry Connors RSI-2

A proven, backtested professional strategy:

| Signal | Condition |
|--------|-----------|
| **BUY** | RSI(2) < 10 AND price > 200-period MA |
| **SELL** | RSI(2) > 90 OR price > 5-period MA (exit) |
| **HOLD** | Otherwise |

**Why RSI(2) not RSI(14)?**
- RSI(2) = looks at last 2 bars (very sensitive, catches quick dips)
- RSI(14) = looks at last 14 bars (too slow for day trading)

**Why 200-period MA filter?**
- Only buy dips in uptrending assets (avoids "catching falling knives")

---

## Assets

```python
ASSETS = {
    "crypto": ["BTC/USD", "ETH/USD", "SOL/USD", "AVAX/USD"],
    "stocks": ["SPY", "QQQ"],
}
```

6 total assets = more signal opportunities. Crypto trades 24/7, stocks during market hours.

---

## Data Source

**Alpaca API only** - no external feeds needed:
- 15-minute bars for RSI(2) and MA calculations
- Real-time quotes for execution
- Already have `get_historical_bars()` method in `alpaca_client.py`

Daily crypto-research reports become optional "veto" layer (check for major risks).

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `incubator/i3/indicators.py` | RSI(2), MA(200), MA(5) calculations |
| `incubator/i3/modes/mode_b_technical.py` | Mode B implementation |

### Files to Modify

| File | Change |
|------|--------|
| `incubator/i3/config.py` | Update ASSETS, add RSI thresholds |
| `incubator/i3/modes/base.py` | Register Mode B in `get_mode()` |

---

## Implementation Steps

### Step 1: Create `indicators.py`

```python
def calculate_rsi(closes: list[float], period: int = 2) -> float:
    """Calculate RSI for given period."""
    # Need period+1 prices minimum
    # Returns 0-100 value

def calculate_ma(closes: list[float], period: int) -> float:
    """Calculate simple moving average."""
    # Returns average of last N closes
```

### Step 2: Create `modes/mode_b_technical.py`

```python
class TechnicalMode(TradingMode):
    name = "Technical"
    mode_id = "B"

    async def analyze(self, asset, positions, cash) -> TradeDecision:
        # 1. Fetch 250 bars (enough for 200 MA)
        bars = client.get_historical_bars(asset, timeframe_minutes=15, limit=250)
        closes = [b["close"] for b in bars]

        # 2. Calculate indicators
        rsi = calculate_rsi(closes, period=2)
        ma_200 = calculate_ma(closes, period=200)
        ma_5 = calculate_ma(closes, period=5)
        current_price = closes[-1]

        # 3. Apply Connors rules
        if rsi < 10 and current_price > ma_200:
            signal = "BUY"
        elif rsi > 90 or current_price > ma_5:
            signal = "SELL" if has_position else "HOLD"
        else:
            signal = "HOLD"

        # 4. Return decision with reasoning
```

### Step 3: Update `config.py`

```python
ASSETS = {
    "crypto": ["BTC/USD", "ETH/USD", "SOL/USD", "AVAX/USD"],
    "stocks": ["SPY", "QQQ"],
}

# RSI settings
RSI_PERIOD = 2
RSI_OVERSOLD = 10
RSI_OVERBOUGHT = 90
MA_TREND_PERIOD = 200
MA_EXIT_PERIOD = 5
```

### Step 4: Register Mode B in `modes/base.py`

```python
def get_mode(mode_id: str) -> TradingMode:
    from modes.mode_a_sentiment import SentimentMode
    from modes.mode_b_technical import TechnicalMode  # Add this

    modes = {
        "A": SentimentMode,
        "B": TechnicalMode,  # Add this
    }
```

### Step 5: Test

```bash
# Paper trade Mode B
cd incubator/i3
source venv/bin/activate
STRATEGY_MODE=B python agent.py --test   # Dry run first
STRATEGY_MODE=B python agent.py --once   # Single cycle
STRATEGY_MODE=B python agent.py          # Full loop
```

---

## Risk Management

- **Position size**: ~$15-25 per trade (with $100 capital)
- **Stop-loss**: 2-3% below entry
- **Max positions**: Don't exceed 4 concurrent positions

---

## Timeline

1. Paper trade ~1 day to verify system works
2. Switch `TRADING_MODE=live` with $100
3. Monitor and iterate

---

## Success Criteria

- System runs without errors for 24 hours
- Generates signals that match Connors' rules
- Executes trades correctly on Alpaca
- Logs everything for review
