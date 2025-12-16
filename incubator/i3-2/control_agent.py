"""
Drift Control Agent - Pure Connors RSI-2 (Paper Trading)

The REAL control experiment: Can Drift's research beat a proven,
public strategy that's been working since 1993?

This implements Larry Connors' original RSI-2 strategy exactly:
- Entry: RSI(2) < 5 AND price > 200-day MA
- Exit: Price closes above 5-day MA
- No stops (Connors found stops hurt performance)
- Daily timeframe only (scan once at market close)

If Drift can't beat this, the research layer is expensive noise.

Reference: "Short Term Trading Strategies That Work" by Larry Connors
Backtest results: 75% win rate, 0.5% avg gain per trade (1993-present)
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import (
    WATCHLIST,
    MAX_POSITIONS,
    MIN_POSITION_SIZE,
    MAX_POSITION_SIZE,
    SECTOR_MAP,
    MAX_POSITIONS_PER_SECTOR,
)
from trading.alpaca_client import AlpacaClient, get_market_status
from utils.technicals import calculate_rsi, calculate_sma

# ============ PURE CONNORS PARAMETERS ============
# These match the original strategy exactly
RSI_ENTRY_THRESHOLD = 5      # Original Connors: RSI(2) < 5
RSI_PERIOD = 2               # 2-period RSI
MA_TREND_PERIOD = 200        # 200-day MA trend filter
MA_EXIT_PERIOD = 5           # Exit when price > 5-day MA
POSITION_SIZE = 50           # Fixed $50 per position (middle of our range)

# Control-specific config
CONTROL_JOURNAL_DIR = Path(__file__).parent / "journal_control"
CONTROL_JOURNAL_DIR.mkdir(parents=True, exist_ok=True)


class ControlAgent:
    """
    Pure Connors RSI-2 trader for paper trading control experiment.

    No LLM calls. No research. Just the rules that worked since 1993.
    """

    def __init__(self, paper: bool = True):
        if not paper:
            raise ValueError("ControlAgent must run in paper mode!")

        self.alpaca = AlpacaClient(paper=True)
        self.paper = paper

    def run_cycle(self, cycle_number: int = 1) -> dict:
        """
        Run one trading cycle with Pure Connors RSI-2 logic.

        Should be called once daily near market close (3:55 PM ET).
        """
        cycle_start = datetime.now()

        # Check if market is open
        market = get_market_status()
        if not market["is_open"]:
            return {
                "status": "market_closed",
                "message": f"Market closed. Time: {market['current_time_et']}",
                "actions": [],
            }

        # Get current state
        try:
            account = self.alpaca.get_account()
            positions = self.alpaca.get_positions()
        except Exception as e:
            return {"status": "error", "message": str(e), "actions": []}

        portfolio_value = account["portfolio_value"]
        cash = account["cash"]
        held_symbols = {p["symbol"] for p in positions}

        actions = []
        log_entries = []

        log_entries.append(f"Cycle {cycle_number} | Portfolio: ${portfolio_value:.2f} | Cash: ${cash:.2f} | Positions: {len(positions)}")
        log_entries.append(f"Pure Connors RSI-2: Entry RSI<{RSI_ENTRY_THRESHOLD}, 200MA filter, exit on 5MA")

        # ========== CHECK EXISTING POSITIONS FOR EXIT ==========
        for pos in positions:
            symbol = pos["symbol"]
            current_price = pos["current_price"]

            try:
                # Get enough bars for 5-day MA
                bars = self.alpaca.get_bars(symbol, days=10)
                if not bars or len(bars) < 5:
                    log_entries.append(f"HOLD {symbol}: Insufficient data for exit check")
                    continue

                closes = [bar["close"] for bar in bars]
                sma_5 = calculate_sma(closes, 5)

                if sma_5 is None:
                    log_entries.append(f"HOLD {symbol}: Cannot calculate 5-day MA")
                    continue

                # CONNORS EXIT: Price closes above 5-day MA
                if current_price > sma_5:
                    pnl_pct = pos["unrealized_plpc"]
                    log_entries.append(f"EXIT SIGNAL: {symbol} price ${current_price:.2f} > 5MA ${sma_5:.2f} (P&L: {pnl_pct:+.1f}%)")
                    result = self._execute_sell(symbol, f"Connors exit: price > 5-day MA")
                    actions.append(result)
                else:
                    pnl_pct = pos["unrealized_plpc"]
                    log_entries.append(f"HOLD {symbol}: ${current_price:.2f} < 5MA ${sma_5:.2f} (P&L: {pnl_pct:+.1f}%)")

            except Exception as e:
                log_entries.append(f"HOLD {symbol}: Error checking exit - {e}")

        # ========== SCAN FOR BUY OPPORTUNITIES ==========
        # Only if we have cash and room for positions
        if cash >= MIN_POSITION_SIZE and len(positions) < MAX_POSITIONS:

            candidates = []

            for symbol in WATCHLIST:
                # Skip if already holding
                if symbol in held_symbols:
                    continue

                try:
                    # Get 365 calendar days to ensure 200+ trading days for MA
                    bars = self.alpaca.get_bars(symbol, days=365)
                    if not bars or len(bars) < 200:
                        continue

                    closes = [bar["close"] for bar in bars]
                    current_price = closes[-1]

                    # Calculate indicators
                    rsi_2 = calculate_rsi(closes, period=2)
                    sma_200 = calculate_sma(closes, 200)

                    if rsi_2 is None or sma_200 is None:
                        continue

                    # CONNORS ENTRY CONDITIONS:
                    # 1. RSI(2) < 5 (deeply oversold)
                    # 2. Price > 200-day MA (in uptrend)

                    if rsi_2 < RSI_ENTRY_THRESHOLD and current_price > sma_200:
                        candidates.append({
                            "symbol": symbol,
                            "rsi_2": rsi_2,
                            "price": current_price,
                            "sma_200": sma_200,
                            "pct_above_200ma": ((current_price - sma_200) / sma_200) * 100
                        })
                        log_entries.append(f"CANDIDATE: {symbol} RSI-2={rsi_2:.1f}, price ${current_price:.2f} > 200MA ${sma_200:.2f}")

                except Exception as e:
                    continue

            # Sort by RSI (most oversold first)
            candidates.sort(key=lambda x: x["rsi_2"])

            # Execute buys (respecting sector limits and cash)
            for candidate in candidates:
                symbol = candidate["symbol"]

                # Check sector concentration
                symbol_sector = SECTOR_MAP.get(symbol, "other")
                sector_count = sum(1 for s in held_symbols if SECTOR_MAP.get(s, "other") == symbol_sector)
                if sector_count >= MAX_POSITIONS_PER_SECTOR:
                    log_entries.append(f"SKIP {symbol}: Sector limit reached ({symbol_sector})")
                    continue

                # Check cash
                if cash < POSITION_SIZE:
                    log_entries.append(f"SKIP {symbol}: Insufficient cash (${cash:.2f})")
                    break

                # Execute buy
                log_entries.append(f"BUY SIGNAL: {symbol} RSI-2={candidate['rsi_2']:.1f} < {RSI_ENTRY_THRESHOLD}, above 200MA")
                result = self._execute_buy(
                    symbol,
                    POSITION_SIZE,
                    f"Connors entry: RSI-2={candidate['rsi_2']:.1f}, price > 200MA"
                )

                if result.get("status") == "executed":
                    actions.append(result)
                    cash -= POSITION_SIZE
                    held_symbols.add(symbol)

            if not candidates:
                log_entries.append("No stocks meet Connors criteria (RSI<5 AND price>200MA)")

        # Log the cycle
        self._log_cycle(cycle_number, log_entries, actions)

        return {
            "status": "completed",
            "message": f"Cycle {cycle_number}: {len(actions)} actions",
            "actions": actions,
            "cycle_time_seconds": (datetime.now() - cycle_start).total_seconds(),
        }

    def _execute_buy(self, symbol: str, amount: float, reason: str) -> dict:
        """Execute a buy order."""
        try:
            order = self.alpaca.buy(symbol, notional=amount, reason=reason)
            if order:
                print(f"[Connors] BUY {symbol} ${amount:.2f} - {reason}")
                return {
                    "status": "executed",
                    "action": "buy",
                    "symbol": symbol,
                    "amount": amount,
                    "reason": reason,
                }
        except Exception as e:
            print(f"[Connors] BUY FAILED {symbol}: {e}")
            return {"status": "failed", "action": "buy", "symbol": symbol, "error": str(e)}

        return {"status": "failed", "action": "buy", "symbol": symbol, "error": "Unknown error"}

    def _execute_sell(self, symbol: str, reason: str) -> dict:
        """Execute a sell order (close entire position)."""
        try:
            order = self.alpaca.sell(symbol, reason=reason)
            if order:
                print(f"[Connors] SELL {symbol} - {reason}")
                return {
                    "status": "executed",
                    "action": "sell",
                    "symbol": symbol,
                    "reason": reason,
                }
        except Exception as e:
            print(f"[Connors] SELL FAILED {symbol}: {e}")
            return {"status": "failed", "action": "sell", "symbol": symbol, "error": str(e)}

        return {"status": "failed", "action": "sell", "symbol": symbol, "error": "Unknown error"}

    def _log_cycle(self, cycle_number: int, entries: list, actions: list):
        """Log cycle to journal file."""
        today = datetime.now().strftime("%Y-%m-%d")
        journal_file = CONTROL_JOURNAL_DIR / f"{today}.json"

        # Load existing entries
        existing = []
        if journal_file.exists():
            try:
                existing = json.loads(journal_file.read_text())
            except Exception:
                existing = []

        # Add new entry
        entry = {
            "cycle": cycle_number,
            "timestamp": datetime.now().isoformat(),
            "strategy": "Pure Connors RSI-2",
            "entries": entries,
            "actions": actions,
        }
        existing.append(entry)

        # Write back
        try:
            journal_file.write_text(json.dumps(existing, indent=2))
        except Exception as e:
            print(f"[Connors] Journal write error: {e}")


if __name__ == "__main__":
    # Quick test
    agent = ControlAgent(paper=True)
    result = agent.run_cycle(cycle_number=1)
    print(f"Result: {result}")
