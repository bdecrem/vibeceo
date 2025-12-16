"""
Drift Control Agent - Blind RSI Trader (Paper Trading)

A simplified version of Drift that trades purely on RSI-2 signals
WITHOUT any LLM research. Used as a control experiment to test
whether Drift's research layer actually adds value.

Decision Logic:
  BUY:  RSI-2 < 20 AND not already holding AND cash available
  SELL: Position up >5% OR position down >3%
  HOLD: Otherwise

Cost: $0/day (no LLM calls)
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
    RSI_OVERSOLD,
    PROFIT_TARGET_PCT,
    STOP_CHECK_PCT,
    SCAN_INTERVAL_MINUTES,
    SECTOR_MAP,
    MAX_POSITIONS_PER_SECTOR,
    get_position_size,
)
from trading.alpaca_client import AlpacaClient, get_market_status
from utils.technicals import get_technical_signals

# Control-specific config
CONTROL_JOURNAL_DIR = Path(__file__).parent / "journal_control"
VIRTUAL_BUDGET = 500.0  # Same as Drift's live budget
MIN_CONFIDENCE = 70  # Threshold for blind trades


class ControlAgent:
    """
    Blind RSI trader for paper trading control experiment.

    No LLM calls. Pure technical trading based on RSI-2.
    """

    def __init__(self, paper: bool = True):
        if not paper:
            raise ValueError("ControlAgent must run in paper mode!")

        self.alpaca = AlpacaClient(paper=True)
        self.paper = paper

        # Ensure journal directory exists
        CONTROL_JOURNAL_DIR.mkdir(parents=True, exist_ok=True)

    def run_cycle(self, cycle_number: int = 1) -> dict:
        """
        Run one trading cycle with blind RSI logic.

        Returns dict with cycle results.
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

        # Calculate effective budget (virtual $500 cap)
        invested = sum(p["market_value"] for p in positions)
        effective_cash = min(cash, VIRTUAL_BUDGET - invested)

        held_symbols = {p["symbol"] for p in positions}
        actions = []
        log_entries = []

        log_entries.append(f"Cycle {cycle_number} | Portfolio: ${portfolio_value:.2f} | Cash: ${cash:.2f} | Effective: ${effective_cash:.2f}")

        # ========== CHECK EXISTING POSITIONS FOR EXIT ==========
        for pos in positions:
            symbol = pos["symbol"]
            pnl_pct = pos["unrealized_plpc"]

            # SELL if profit target hit
            if pnl_pct >= PROFIT_TARGET_PCT:
                log_entries.append(f"SELL SIGNAL: {symbol} up {pnl_pct:.1f}% (target: {PROFIT_TARGET_PCT}%)")
                result = self._execute_sell(symbol, f"Profit target hit: {pnl_pct:.1f}%")
                actions.append(result)

            # SELL if stop loss hit
            elif pnl_pct <= STOP_CHECK_PCT:
                log_entries.append(f"SELL SIGNAL: {symbol} down {pnl_pct:.1f}% (stop: {STOP_CHECK_PCT}%)")
                result = self._execute_sell(symbol, f"Stop loss hit: {pnl_pct:.1f}%")
                actions.append(result)

            else:
                log_entries.append(f"HOLD: {symbol} at {pnl_pct:+.1f}%")

        # ========== SCAN FOR BUY OPPORTUNITIES ==========
        if effective_cash >= MIN_POSITION_SIZE and len(positions) < MAX_POSITIONS:
            for symbol in WATCHLIST:
                # Skip if already holding
                if symbol in held_symbols:
                    continue

                # Skip if insufficient cash
                if effective_cash < MIN_POSITION_SIZE:
                    break

                # Check sector concentration
                symbol_sector = SECTOR_MAP.get(symbol, "other")
                sector_count = sum(1 for p in positions if SECTOR_MAP.get(p["symbol"], "other") == symbol_sector)
                if sector_count >= MAX_POSITIONS_PER_SECTOR:
                    continue

                # Get technicals
                try:
                    bars = self.alpaca.get_bars(symbol, days=5)
                    if not bars or len(bars) < 2:
                        continue

                    signals = get_technical_signals(bars)
                    rsi_2 = signals.get("rsi_2", 50)

                    # BUY if RSI-2 < threshold (oversold)
                    if rsi_2 < RSI_OVERSOLD:
                        log_entries.append(f"BUY SIGNAL: {symbol} RSI-2={rsi_2:.1f} < {RSI_OVERSOLD}")

                        # Calculate position size
                        position_size = get_position_size(MIN_CONFIDENCE, effective_cash)
                        position_size = min(position_size, effective_cash)

                        result = self._execute_buy(symbol, position_size, f"RSI-2 oversold: {rsi_2:.1f}")
                        if result.get("status") == "executed":
                            actions.append(result)
                            effective_cash -= position_size
                            held_symbols.add(symbol)

                except Exception as e:
                    log_entries.append(f"Error checking {symbol}: {e}")

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
                print(f"[Control] BUY {symbol} ${amount:.2f} - {reason}")
                return {
                    "status": "executed",
                    "action": "buy",
                    "symbol": symbol,
                    "amount": amount,
                    "reason": reason,
                }
        except Exception as e:
            print(f"[Control] BUY FAILED {symbol}: {e}")

        return {"status": "failed", "symbol": symbol, "reason": str(e) if 'e' in dir() else "Unknown error"}

    def _execute_sell(self, symbol: str, reason: str) -> dict:
        """Execute a sell order."""
        try:
            order = self.alpaca.sell(symbol, reason=reason)
            if order:
                print(f"[Control] SELL {symbol} - {reason}")
                return {
                    "status": "executed",
                    "action": "sell",
                    "symbol": symbol,
                    "reason": reason,
                }
        except Exception as e:
            print(f"[Control] SELL FAILED {symbol}: {e}")

        return {"status": "failed", "symbol": symbol, "reason": str(e) if 'e' in dir() else "Unknown error"}

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
            "entries": entries,
            "actions": actions,
        }
        existing.append(entry)

        # Write back
        try:
            journal_file.write_text(json.dumps(existing, indent=2))
        except Exception as e:
            print(f"[Control] Journal write error: {e}")


if __name__ == "__main__":
    # Quick test
    agent = ControlAgent(paper=True)
    result = agent.run_cycle(cycle_number=1)
    print(f"Result: {result}")
