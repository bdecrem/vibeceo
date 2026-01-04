"""
Drift (i3-2) - Trade Journal

Logs all decisions with full reasoning for:
1. Learning what works
2. Entertainment/transparency (the "story" of each trade)
3. Debugging when things go wrong
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Literal
import pytz

ET = pytz.timezone('America/New_York')

# Journal directory
JOURNAL_DIR = Path(__file__).parent.parent / "journal"
JOURNAL_DIR.mkdir(exist_ok=True)


class TradeJournal:
    """
    Records all trading decisions with full context.

    Each entry includes:
    - Timestamp
    - Decision type (scan, research, entry, exit, pass)
    - Symbol(s) involved
    - Full reasoning/thesis
    - Confidence level
    - Outcome (when known)
    """

    def __init__(self):
        self.today_file = self._get_today_file()

    def _get_today_file(self) -> Path:
        """Get journal file for today."""
        today = datetime.now(ET).strftime("%Y-%m-%d")
        return JOURNAL_DIR / f"{today}.json"

    def _load_today(self) -> list[dict]:
        """Load today's journal entries."""
        if self.today_file.exists():
            try:
                with open(self.today_file, 'r') as f:
                    return json.load(f)
            except Exception:
                pass
        return []

    def _save_today(self, entries: list[dict]):
        """Save journal entries."""
        # Rotate file if date changed
        self.today_file = self._get_today_file()

        with open(self.today_file, 'w') as f:
            json.dump(entries, f, indent=2, default=str)

    def _add_entry(self, entry: dict):
        """Add entry to journal."""
        entry["timestamp"] = datetime.now(ET).isoformat()
        entry["timestamp_human"] = datetime.now(ET).strftime("%I:%M %p ET")

        entries = self._load_today()
        entries.append(entry)
        self._save_today(entries)

        return entry

    def log_scan(
        self,
        portfolio_value: float,
        positions: list[dict],
        findings: str,
        triggers: list[str],
    ) -> dict:
        """
        Log a light scan cycle.

        Args:
            portfolio_value: Current portfolio value
            positions: Current positions summary
            findings: What the scan found
            triggers: Any triggers identified for research
        """
        return self._add_entry({
            "type": "scan",
            "portfolio_value": portfolio_value,
            "position_count": len(positions),
            "findings": findings,
            "triggers": triggers,
            "action": "research_triggered" if triggers else "no_action",
        })

    def log_research(
        self,
        symbol: str,
        trigger: str,
        searches: list[dict],
        findings: str,
        decision: Literal["buy", "sell", "hold", "pass"],
        confidence: int,
        thesis: str,
    ) -> dict:
        """
        Log a research session.

        Args:
            symbol: Stock being researched
            trigger: What triggered the research
            searches: List of web searches performed
            findings: Summary of what was found
            decision: The decision made
            confidence: Confidence level (0-100)
            thesis: The thesis behind the decision
        """
        return self._add_entry({
            "type": "research",
            "symbol": symbol,
            "trigger": trigger,
            "searches": searches,
            "findings": findings,
            "decision": decision,
            "confidence": confidence,
            "thesis": thesis,
        })

    def log_entry(
        self,
        symbol: str,
        notional: float,
        price: float,
        confidence: int,
        thesis: str,
        stop_loss: Optional[float] = None,
        target: Optional[float] = None,
        order_id: Optional[str] = None,
    ) -> dict:
        """
        Log a trade entry.

        Args:
            symbol: Stock symbol
            notional: Dollar amount invested
            price: Entry price
            confidence: Confidence level
            thesis: Why we entered
            stop_loss: Stop loss price
            target: Target exit price
            order_id: Alpaca order ID
        """
        return self._add_entry({
            "type": "entry",
            "symbol": symbol,
            "notional": notional,
            "price": price,
            "confidence": confidence,
            "thesis": thesis,
            "stop_loss": stop_loss,
            "target": target,
            "order_id": order_id,
        })

    def log_exit(
        self,
        symbol: str,
        qty: float,
        entry_price: float,
        exit_price: float,
        pnl: float,
        pnl_pct: float,
        reason: str,
        thesis_grade: Optional[str] = None,
        lessons: Optional[str] = None,
        order_id: Optional[str] = None,
        was_day_trade: bool = False,
    ) -> dict:
        """
        Log a trade exit.

        Args:
            symbol: Stock symbol
            qty: Quantity sold
            entry_price: Original entry price
            exit_price: Exit price
            pnl: Dollar P&L
            pnl_pct: Percentage P&L
            reason: Why we exited
            thesis_grade: Grade for the original thesis (A/B/C/D/F)
            lessons: What we learned
            order_id: Alpaca order ID
            was_day_trade: Whether this was a day trade
        """
        return self._add_entry({
            "type": "exit",
            "symbol": symbol,
            "qty": qty,
            "entry_price": entry_price,
            "exit_price": exit_price,
            "pnl": pnl,
            "pnl_pct": pnl_pct,
            "reason": reason,
            "thesis_grade": thesis_grade,
            "lessons": lessons,
            "order_id": order_id,
            "was_day_trade": was_day_trade,
        })

    def log_pass(
        self,
        symbol: str,
        reason: str,
        confidence: int,
    ) -> dict:
        """
        Log a decision to pass on a trade.

        Args:
            symbol: Stock we passed on
            reason: Why we passed
            confidence: Confidence in the pass (high = definitely don't want it)
        """
        return self._add_entry({
            "type": "pass",
            "symbol": symbol,
            "reason": reason,
            "confidence_in_pass": confidence,
        })

    def log_error(
        self,
        context: str,
        error: str,
        details: Optional[dict] = None,
    ) -> dict:
        """Log an error."""
        return self._add_entry({
            "type": "error",
            "context": context,
            "error": error,
            "details": details or {},
        })

    def get_today_summary(self) -> dict:
        """Get summary of today's activity."""
        entries = self._load_today()

        summary = {
            "date": datetime.now(ET).strftime("%Y-%m-%d"),
            "total_entries": len(entries),
            "scans": 0,
            "research_sessions": 0,
            "entries": 0,
            "exits": 0,
            "passes": 0,
            "errors": 0,
            "total_pnl": 0.0,
            "trades": [],
        }

        for entry in entries:
            entry_type = entry.get("type")
            if entry_type == "scan":
                summary["scans"] += 1
            elif entry_type == "research":
                summary["research_sessions"] += 1
            elif entry_type == "entry":
                summary["entries"] += 1
                summary["trades"].append({
                    "symbol": entry.get("symbol"),
                    "action": "BUY",
                    "time": entry.get("timestamp_human"),
                    "thesis": entry.get("thesis", "")[:50] + "...",
                })
            elif entry_type == "exit":
                summary["exits"] += 1
                summary["total_pnl"] += entry.get("pnl", 0)
                summary["trades"].append({
                    "symbol": entry.get("symbol"),
                    "action": "SELL",
                    "time": entry.get("timestamp_human"),
                    "pnl": entry.get("pnl", 0),
                    "pnl_pct": entry.get("pnl_pct", 0),
                })
            elif entry_type == "pass":
                summary["passes"] += 1
            elif entry_type == "error":
                summary["errors"] += 1

        return summary

    def get_recent_entries(self, n: int = 10) -> list[dict]:
        """Get most recent journal entries."""
        entries = self._load_today()
        return entries[-n:]


def test_journal():
    """Test journal functionality."""
    journal = TradeJournal()

    # Log a test scan
    journal.log_scan(
        portfolio_value=1000.0,
        positions=[{"symbol": "AAPL", "pnl": 5.0}],
        findings="All positions stable. NVDA down 3% - worth investigating.",
        triggers=["NVDA"],
    )

    # Log a test research
    journal.log_research(
        symbol="NVDA",
        trigger="Down 3% with no obvious news",
        searches=[
            {"query": "NVDA news today", "result": "Profit taking after run-up"},
            {"query": "NVDA analyst ratings", "result": "Still bullish, avg target $155"},
        ],
        findings="Profit-taking dip, not fundamental. Analysts still bullish.",
        decision="buy",
        confidence=72,
        thesis="Buying the fear. Technical oversold, fundamentals intact.",
    )

    # Print summary
    summary = journal.get_today_summary()
    print("\n📔 Journal Summary:")
    print(f"   Date: {summary['date']}")
    print(f"   Scans: {summary['scans']}")
    print(f"   Research: {summary['research_sessions']}")
    print(f"   Entries: {summary['entries']}")
    print(f"   Exits: {summary['exits']}")

    return True


if __name__ == "__main__":
    test_journal()
