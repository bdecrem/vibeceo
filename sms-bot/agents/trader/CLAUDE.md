# Trader Agent

Commodity ETF trading bot. Runs every 15 min during market hours on Railway, or locally via `monitor`.

## Quick Commands (Local)

```bash
cd sms-bot/agents/trader

python3 trader.py status   # Show portfolio, positions, P&L
python3 trader.py run      # Single trading check
python3 trader.py monitor  # Run continuously (15 min intervals)
```

## Check Status

```bash
python3 trader.py status
```

Shows: account balance, all positions with P&L, market open/closed.

## Current Strategy

- **Assets**: SGOL (gold), CPER (copper), SCO (inverse oil)
- **Entry**: Buy on 2% pullback from 10-day high
- **Exit**: +5% profit, -5% stop loss, or end of day
- **Budget**: $250 per position (configurable in `config.py`)

## Modify Trading Logic

Edit `trader.py`:

- **Entry logic**: Search for `# ENTRY LOGIC` (~line 270)
- **Exit logic**: Search for `# EXIT LOGIC` (~line 230)
- **Thresholds**: In `config.py` — `PULLBACK_THRESHOLD`, `PROFIT_TARGET`, `STOP_LOSS`

## Add a New Position Manually

Use the Alpaca client directly:

```python
from alpaca_client import AlpacaClient

client = AlpacaClient()
client.buy("SYMBOL", 250.0, reason="manual entry")  # $250 notional
client.sell("SYMBOL", reason="manual exit")         # Sell entire position
```

Or run as one-liner:
```bash
python3 -c "from alpaca_client import AlpacaClient; AlpacaClient().buy('GLD', 100, reason='test')"
```

## Add a New Asset to Strategy

1. Add symbol to `config.py`:
   ```python
   NEW_SYMBOL = "XYZ"
   ```

2. Add to `trader.py` imports and price fetching (~line 150)

3. Add entry/exit logic blocks (copy gold/copper pattern)

4. Add position tracking in state

## State Storage

State stored in Supabase `amber_state` table:
- `type: 'trader_state'` — Current positions, day counter
- `type: 'trader_log'` — Trade history

Query recent trades:
```sql
SELECT * FROM amber_state
WHERE type = 'trader_log'
ORDER BY created_at DESC LIMIT 10;
```

## Environment

Requires in `.env.local` or Railway:
- `ALPACA_API_KEY`
- `ALPACA_SECRET_KEY`
- `TRADING_MODE` (default: `live`)
