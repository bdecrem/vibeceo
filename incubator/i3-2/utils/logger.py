"""
Console logger for Drift trading agent.

Logs all [Drift] messages to a single console.md file.
"""

import os
from datetime import datetime
from pathlib import Path
import pytz

ET = pytz.timezone('America/New_York')

# Single log file
LOG_FILE = Path(__file__).parent.parent / "console.md"


def _ensure_header():
    """Ensure log file has header."""
    if not LOG_FILE.exists():
        with open(LOG_FILE, "w") as f:
            f.write("# Drift Console Log\n\n*Continuous log of all trading activity.*\n\n---\n\n")


_last_logged_date = None

def log(message: str):
    """
    Print message and append to console.md log file.

    Args:
        message: Message to log (will be printed and written to file)
    """
    global _last_logged_date

    # Always print to console
    print(message)

    # Append to log file
    try:
        _ensure_header()
        now = datetime.now(ET)
        today = now.strftime("%Y-%m-%d")
        timestamp = now.strftime("%H:%M:%S")

        with open(LOG_FILE, "a") as f:
            # Add date header when date changes
            if _last_logged_date != today:
                f.write(f"\n## {today}\n\n")
                _last_logged_date = today

            # Add timestamp prefix for [Drift] messages
            if message.startswith("[Drift]") or message.startswith("---") or message.startswith("["):
                f.write(f"`{timestamp}` {message}\n")
            else:
                f.write(f"{message}\n")
    except Exception as e:
        # Don't crash if logging fails
        pass


def log_cycle_start(cycle_num: int, mode: str):
    """Log start of a trading cycle."""
    log(f"\n--- Cycle {cycle_num} ({mode}) ---")


def log_cycle_end(status: str, message: str):
    """Log end of a trading cycle."""
    timestamp = datetime.now(ET).strftime("%H:%M:%S ET")
    log(f"[{timestamp}] {status}: {message}")


def log_trade(signal: str, symbol: str, amount: float, thesis: str):
    """Log a trade execution."""
    if signal == "BUY":
        log(f"[Drift] ✅ BUY {symbol} ${amount:.2f}")
    elif signal == "SELL":
        log(f"[Drift] ✅ SELL {symbol}")
    log(f"        Thesis: {thesis[:150]}...")


def log_research(symbol: str, decision: str, confidence: int, thesis: str):
    """Log research result."""
    log(f"[Drift] {symbol}: {decision} (confidence: {confidence}%)")
    log(f"        Thesis: {thesis[:150]}...")
