"""
Console logger for Drift trading agent.

Logs all [Drift] messages to a single console.md file in reverse chronological order.
"""

import os
from datetime import datetime
from pathlib import Path
import pytz

ET = pytz.timezone('America/New_York')

# Single log file
LOG_FILE = Path(__file__).parent.parent / "console.md"
HEADER = "# Drift Console Log\n\n*Continuous log of all trading activity. Newest entries at top.*\n\n---\n"


def _ensure_file():
    """Ensure log file exists with header."""
    if not LOG_FILE.exists():
        with open(LOG_FILE, "w") as f:
            f.write(HEADER)


_current_date_in_file = None

def log(message: str):
    """
    Print message and prepend to console.md log file (reverse chronological).

    Args:
        message: Message to log (will be printed and written to file)
    """
    global _current_date_in_file

    # Always print to console
    print(message)

    # Prepend to log file
    try:
        _ensure_file()
        now = datetime.now(ET)
        today = now.strftime("%Y-%m-%d")
        timestamp = now.strftime("%H:%M:%S")

        # Build the new line
        if message.startswith("[Drift]") or message.startswith("---") or message.startswith("["):
            new_line = f"`{timestamp}` {message}\n"
        else:
            new_line = f"{message}\n"

        # Read existing content
        content = LOG_FILE.read_text()

        # Find where to insert (after header ---)
        header_end = content.find("---\n") + 4
        before = content[:header_end]
        after = content[header_end:]

        # Check if today's date header exists in file
        today_header = f"## {today}"
        if today_header not in content:
            # New day - add date header
            new_line = f"\n{today_header}\n\n" + new_line
            _current_date_in_file = today
        else:
            # Same day - insert after the date header
            date_pos = after.find(today_header)
            if date_pos >= 0:
                # Find end of date header line
                newline_after_date = after.find("\n\n", date_pos) + 2
                insert_point = header_end + newline_after_date
                before = content[:insert_point]
                after = content[insert_point:]

        # Write back with new content
        with open(LOG_FILE, "w") as f:
            f.write(before + new_line + after)

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
