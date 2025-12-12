"""
Console logger for Drift trading agent.

Logs all [Drift] messages to daily .md files for review.
"""

import os
from datetime import datetime
from pathlib import Path
import pytz

ET = pytz.timezone('America/New_York')

# Log directory
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)


def _get_log_file() -> Path:
    """Get today's log file path."""
    today = datetime.now(ET).strftime("%Y-%m-%d")
    return LOG_DIR / f"{today}.md"


def _ensure_header():
    """Ensure log file has header."""
    log_file = _get_log_file()
    if not log_file.exists():
        today = datetime.now(ET).strftime("%Y-%m-%d")
        with open(log_file, "w") as f:
            f.write(f"# Drift Console Log - {today}\n\n")


def log(message: str):
    """
    Print message and append to daily log file.

    Args:
        message: Message to log (will be printed and written to file)
    """
    # Always print to console
    print(message)

    # Append to log file
    try:
        _ensure_header()
        log_file = _get_log_file()
        timestamp = datetime.now(ET).strftime("%H:%M:%S")

        with open(log_file, "a") as f:
            # Add timestamp prefix for [Drift] messages
            if message.startswith("[Drift]") or message.startswith("---"):
                f.write(f"`{timestamp}` {message}\n")
            elif message.startswith("["):
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
