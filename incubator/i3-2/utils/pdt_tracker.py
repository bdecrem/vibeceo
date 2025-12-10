"""
Drift (i3-2) - PDT (Pattern Day Trader) Tracker

Tracks day trades to ensure we stay under the PDT limit.
With < $25,000 account, we can only make 3 day trades per 5 business days.

A day trade = buying and selling the same stock on the same day.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
import pytz

ET = pytz.timezone('America/New_York')

# PDT state file
STATE_FILE = Path(__file__).parent.parent / "state" / "pdt_tracker.json"


class PDTTracker:
    """
    Tracks day trades to comply with PDT rules.

    PDT Rule: 4+ day trades in 5 business days = Pattern Day Trader
    Pattern Day Traders need $25,000 minimum account balance.

    We limit ourselves to 3 day trades per rolling 5 business days,
    reserving them for emergencies only.
    """

    def __init__(self, max_day_trades: int = 3):
        self.max_day_trades = max_day_trades
        self.state = self._load_state()

    def _load_state(self) -> dict:
        """Load state from file."""
        if STATE_FILE.exists():
            try:
                with open(STATE_FILE, 'r') as f:
                    return json.load(f)
            except Exception:
                pass

        return {
            "day_trades": [],  # List of {symbol, buy_time, sell_time}
            "positions_opened_today": {},  # symbol -> open_time
        }

    def _save_state(self):
        """Save state to file."""
        STATE_FILE.parent.mkdir(exist_ok=True)
        with open(STATE_FILE, 'w') as f:
            json.dump(self.state, f, indent=2, default=str)

    def _get_business_days_ago(self, days: int) -> datetime:
        """Get datetime for N business days ago."""
        now = datetime.now(ET)
        count = 0
        current = now

        while count < days:
            current -= timedelta(days=1)
            # Skip weekends
            if current.weekday() < 5:
                count += 1

        return current.replace(hour=0, minute=0, second=0, microsecond=0)

    def _cleanup_old_trades(self):
        """Remove day trades older than 5 business days."""
        cutoff = self._get_business_days_ago(5)
        cutoff_str = cutoff.isoformat()

        self.state["day_trades"] = [
            trade for trade in self.state["day_trades"]
            if trade.get("sell_time", "") >= cutoff_str
        ]

        # Clean up positions opened today if it's a new day
        today = datetime.now(ET).strftime("%Y-%m-%d")
        self.state["positions_opened_today"] = {
            symbol: open_time
            for symbol, open_time in self.state["positions_opened_today"].items()
            if open_time.startswith(today)
        }

        self._save_state()

    def get_day_trades_used(self) -> int:
        """Get number of day trades used in last 5 business days."""
        self._cleanup_old_trades()
        return len(self.state["day_trades"])

    def get_day_trades_remaining(self) -> int:
        """Get number of day trades remaining."""
        return max(0, self.max_day_trades - self.get_day_trades_used())

    def can_day_trade(self) -> bool:
        """Check if we can make another day trade."""
        return self.get_day_trades_remaining() > 0

    def record_buy(self, symbol: str):
        """Record that we bought a position (might become a day trade if sold today)."""
        now = datetime.now(ET)
        self.state["positions_opened_today"][symbol] = now.isoformat()
        self._save_state()

    def is_same_day_position(self, symbol: str) -> bool:
        """Check if this position was opened today (selling would be a day trade)."""
        if symbol not in self.state["positions_opened_today"]:
            return False

        open_time = self.state["positions_opened_today"][symbol]
        today = datetime.now(ET).strftime("%Y-%m-%d")

        return open_time.startswith(today)

    def would_be_day_trade(self, symbol: str) -> bool:
        """Check if selling this symbol would count as a day trade."""
        return self.is_same_day_position(symbol)

    def record_day_trade(self, symbol: str, buy_time: str, sell_time: Optional[str] = None):
        """Record a completed day trade."""
        if sell_time is None:
            sell_time = datetime.now(ET).isoformat()

        self.state["day_trades"].append({
            "symbol": symbol,
            "buy_time": buy_time,
            "sell_time": sell_time,
        })

        # Remove from positions opened today
        if symbol in self.state["positions_opened_today"]:
            del self.state["positions_opened_today"][symbol]

        self._save_state()

    def approve_sell(self, symbol: str) -> tuple[bool, str]:
        """
        Check if we can sell this position.

        Returns:
            (approved, reason) - True if sell is approved, with reason
        """
        # If not a same-day position, always OK (not a day trade)
        if not self.is_same_day_position(symbol):
            return True, "Position held overnight - not a day trade"

        # It would be a day trade - check if we have allowance
        if self.can_day_trade():
            remaining = self.get_day_trades_remaining()
            return True, f"Using day trade ({remaining} remaining after this)"

        # No day trades remaining
        used = self.get_day_trades_used()
        return False, f"BLOCKED: Would exceed PDT limit ({used}/{self.max_day_trades} used)"

    def get_status(self) -> dict:
        """Get current PDT status."""
        self._cleanup_old_trades()

        return {
            "day_trades_used": self.get_day_trades_used(),
            "day_trades_remaining": self.get_day_trades_remaining(),
            "max_day_trades": self.max_day_trades,
            "can_day_trade": self.can_day_trade(),
            "positions_opened_today": list(self.state["positions_opened_today"].keys()),
            "recent_day_trades": self.state["day_trades"][-5:],  # Last 5
        }


def test_pdt_tracker():
    """Test PDT tracker."""
    tracker = PDTTracker()

    print("\n📊 PDT Tracker Status:")
    status = tracker.get_status()
    print(f"   Day trades used: {status['day_trades_used']}/{status['max_day_trades']}")
    print(f"   Day trades remaining: {status['day_trades_remaining']}")
    print(f"   Can day trade: {status['can_day_trade']}")
    print(f"   Positions opened today: {status['positions_opened_today']}")

    return True


if __name__ == "__main__":
    test_pdt_tracker()
