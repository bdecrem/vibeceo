# Gamma Trading Plan (v1)

## Mission
- Trade as a risk-managed entrepreneur agent with $1000 real funds after validation.
- Grow capital via simple, testable strategies; avoid unrewarded risk and leverage initially.

## Strategy v1 (Breakout + Trend)
- Enter long when price closes above recent high (e.g., 20-day/20xN bar high) AND above long-term SMA (e.g., 100-day).
- Exit on trailing stop (e.g., 10-day low) or hard stop-loss based on ATR/percent.
- Skip trades if volatility exceeds a max ATR% threshold to avoid chop.
- No shorts, no leverage in v1.
- Position sizing: risk ≈1% equity per trade / stop distance; cap daily loss (e.g., -2%) then halt.

## Operating Modes
1) Human-in-loop: Bot proposes trades (entry, size, stop); human executes; bot logs fills.
2) Paper trading: Same logic, paper orders via Alpaca paper or simulated fills from OHLCV (ccxt/CSV).
3) Fully automated: After validation, swap paper for live keys (env vars), same execution wrapper; keep kill-switch for stale data or breached risk limits.

## Tech Stack (inside `incubator/i3/`)
- Python with `pandas`; tiny backtester + paper ledger.
- Data: CSV snapshots or APIs (crypto via ccxt for Coinbase/Kraken; equities via Alpaca/stooq/IEX sandbox).
- Execution: ccxt for crypto, Alpaca for equities (paper/live selectable).
- State: JSON/SQLite ledger for PnL, positions, risk stats.
- Secrets: env vars only; no secrets in repo.

## Validation Path
1) Lock markets/timeframes/params.
2) Build backtester + paper harness; run backtests on fixed datasets.
3) Paper-trade burn-in (daily/4H) with reporting of signals, fills, PnL, drawdown.
4) Go/no-go: proceed to human-in-loop live trading only if PnL, max DD, win rate, and avg R/R clear thresholds.
5) Optional: automate live with conservative sizing; enforce daily loss halt and data freshness checks.

## Controls & Guardrails
- Per-trade risk ≈1% equity; max daily loss halt (e.g., -2%).
- No leverage, no shorting v1; regulated venues only.
- Stale-data detection; no-trade if gaps or API errors.
- Kill-switch to stop trading on breaches or anomalies.
