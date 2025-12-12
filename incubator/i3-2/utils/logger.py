"""
Console logger for Drift trading agent.

Logs all [Drift] messages to a single console.md file.
- Cycles are in REVERSE chronological order (newest cycle at top)
- Entries WITHIN each cycle are in normal chronological order
"""

import os
from datetime import datetime
from pathlib import Path
import pytz

ET = pytz.timezone('America/New_York')

# Single log file
LOG_FILE = Path(__file__).parent.parent / "console.md"
HEADER = "# Drift Console Log\n\n*Continuous log of all trading activity. Newest entries at top.*\n\n---\n"

# Track current cycle's entries (buffer until cycle ends)
_cycle_buffer = []
_in_cycle = False


def _ensure_file():
    """Ensure log file exists with header."""
    if not LOG_FILE.exists():
        with open(LOG_FILE, "w") as f:
            f.write(HEADER)


def _prepend_cycle(cycle_lines: list[str]):
    """Prepend a complete cycle to the log file (after date header)."""
    try:
        _ensure_file()
        content = LOG_FILE.read_text()

        now = datetime.now(ET)
        today = now.strftime("%Y-%m-%d")
        today_header = f"## {today}"

        # Find header end
        header_end = content.find("---\n") + 4

        # Check if today's date exists
        if today_header not in content:
            # New day - add date header then cycle
            insert_content = f"\n{today_header}\n\n" + "\n".join(cycle_lines) + "\n\n"
            new_content = content[:header_end] + insert_content + content[header_end:]
        else:
            # Same day - insert cycle right after date header
            date_pos = content.find(today_header)
            # Find the end of "## 2025-12-12\n\n"
            insert_pos = content.find("\n\n", date_pos) + 2
            insert_content = "\n".join(cycle_lines) + "\n\n"
            new_content = content[:insert_pos] + insert_content + content[insert_pos:]

        with open(LOG_FILE, "w") as f:
            f.write(new_content)

    except Exception as e:
        print(f"Logger error: {e}")


def log(message: str):
    """
    Print message and buffer for cycle-based logging.

    Entries are buffered during a cycle, then written as a block
    when the cycle ends (preserving chronological order within cycle).
    """
    global _cycle_buffer, _in_cycle

    # Always print to console
    print(message)

    now = datetime.now(ET)
    timestamp = now.strftime("%H:%M:%S")

    # Build the line
    if message.startswith("[Drift]") or message.startswith("---") or message.startswith("["):
        line = f"`{timestamp}` {message}"
    else:
        line = message

    # Check if this is a cycle start
    if "--- Cycle" in message:
        _in_cycle = True
        _cycle_buffer = [line]
    elif _in_cycle:
        _cycle_buffer.append(line)

        # Check if cycle ended
        if "completed:" in message or "ET] completed" in message:
            # Write the buffered cycle
            _prepend_cycle(_cycle_buffer)
            _cycle_buffer = []
            _in_cycle = False
    else:
        # Not in a cycle - write directly (rare)
        _cycle_buffer = [line]
        _prepend_cycle(_cycle_buffer)
        _cycle_buffer = []


def log_cycle_start(cycle_num: int, mode: str):
    """Log start of a trading cycle."""
    log(f"--- Cycle {cycle_num} ({mode}) ---")


def log_cycle_end(status: str, message: str):
    """Log end of a trading cycle."""
    timestamp = datetime.now(ET).strftime("%H:%M:%S ET")
    log(f"[{timestamp}] {status}: {message}")


def log_trade(signal: str, symbol: str, amount: float, thesis: str):
    """Log a trade execution."""
    if signal == "BUY":
        log(f"[Drift] BUY {symbol} ${amount:.2f}")
    elif signal == "SELL":
        log(f"[Drift] SELL {symbol}")


def log_research(symbol: str, decision: str, confidence: int, thesis: str):
    """Log research result."""
    log(f"[Drift] {symbol}: {decision} (confidence: {confidence}%)")
