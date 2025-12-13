"""
Supabase logger for Drift trading agent.

Logs trading cycles to drift_console_logs table for:
1. Public viewing (superfan content)
2. Agent memory (strategy review)
"""

import os
import json
from datetime import datetime
from typing import Optional
import pytz

# Try to import supabase
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

ET = pytz.timezone('America/New_York')

# Supabase client (lazy init)
_supabase: Optional[Client] = None


def _get_client() -> Optional[Client]:
    """Get or create Supabase client."""
    global _supabase

    if not SUPABASE_AVAILABLE:
        return None

    if _supabase is None:
        url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

        if url and key:
            try:
                _supabase = create_client(url, key)
            except Exception as e:
                print(f"[Drift] Supabase init error: {e}")
                return None

    return _supabase


class CycleLogger:
    """
    Collects data during a trading cycle and logs to Supabase at the end.

    Usage:
        logger = CycleLogger(cycle_number=1, mode="crypto")
        logger.add_entry("Scanning 2 assets...")
        logger.add_research("BTC/USD", {...})
        logger.add_trade("buy", "BTC/USD", 50.0, {...})
        logger.complete(status="completed", message="Processed 2 triggers")
    """

    def __init__(self, cycle_number: int, mode: str):
        self.cycle_number = cycle_number
        self.mode = mode
        self.log_date = datetime.now(ET).date()
        self.started_at = datetime.now(ET)

        self.entries: list[dict] = []
        self.research_results: dict = {}
        self.trades: list[dict] = []
        self.portfolio_snapshot: dict = {}

        self.triggers_found = 0
        self.triggers_researched = 0
        self.web_searches_performed = 0

    def set_portfolio_snapshot(self, portfolio_value: float, cash: float, positions: list):
        """Capture portfolio state at cycle start."""
        self.portfolio_snapshot = {
            "portfolio_value": portfolio_value,
            "cash": cash,
            "positions": [
                {
                    "symbol": p.get("symbol"),
                    "qty": p.get("qty"),
                    "market_value": p.get("market_value"),
                    "unrealized_pl": p.get("unrealized_pl"),
                    "unrealized_plpc": p.get("unrealized_plpc"),
                }
                for p in positions
            ]
        }

    def add_entry(self, message: str):
        """Add a log entry."""
        self.entries.append({
            "timestamp": datetime.now(ET).isoformat(),
            "message": message,
        })

    def add_research(self, symbol: str, result: dict):
        """Record research result for a symbol."""
        self.triggers_researched += 1
        self.research_results[symbol] = {
            "decision": result.get("decision"),
            "confidence": result.get("confidence"),
            "thesis": result.get("thesis"),
            "searches_performed": result.get("searches_performed", []),
            "key_findings": result.get("key_findings", []),
        }

    def add_trade(self, action: str, symbol: str, amount: float, details: dict):
        """Record an executed trade."""
        self.trades.append({
            "timestamp": datetime.now(ET).isoformat(),
            "action": action,
            "symbol": symbol,
            "amount": amount,
            "status": details.get("status"),
            "order_id": details.get("order_id"),
            "pnl": details.get("pnl"),
        })

    def set_triggers_found(self, count: int):
        """Set the number of triggers found in scan."""
        self.triggers_found = count

    def add_web_searches(self, count: int):
        """Add to web search count."""
        self.web_searches_performed += count

    def complete(self, status: str, message: str) -> bool:
        """
        Complete the cycle and write to Supabase.

        Returns True if successfully logged, False otherwise.
        """
        completed_at = datetime.now(ET)
        duration = (completed_at - self.started_at).total_seconds()

        client = _get_client()
        if not client:
            print("[Drift] Supabase not available, skipping cycle log")
            return False

        try:
            data = {
                "cycle_number": self.cycle_number,
                "mode": self.mode,
                "log_date": self.log_date.isoformat(),
                "started_at": self.started_at.isoformat(),
                "completed_at": completed_at.isoformat(),
                "cycle_duration_seconds": duration,
                "status": status,
                "message": message,
                "triggers_found": self.triggers_found,
                "triggers_researched": self.triggers_researched,
                "actions_taken": len(self.trades),
                "web_searches_performed": self.web_searches_performed,
                "entries": self.entries,
                "research_results": self.research_results,
                "trades": self.trades,
                "portfolio_snapshot": self.portfolio_snapshot,
            }

            result = client.table("drift_console_logs").insert(data).execute()

            if result.data:
                return True
            else:
                print(f"[Drift] Supabase insert returned no data")
                return False

        except Exception as e:
            print(f"[Drift] Supabase log error: {e}")
            return False


def get_recent_cycles(limit: int = 20) -> list[dict]:
    """
    Fetch recent cycles from Supabase for strategy review.

    Returns list of cycle records, newest first.
    """
    client = _get_client()
    if not client:
        return []

    try:
        result = client.table("drift_console_logs") \
            .select("*") \
            .order("started_at", desc=True) \
            .limit(limit) \
            .execute()

        return result.data or []
    except Exception as e:
        print(f"[Drift] Supabase fetch error: {e}")
        return []


def get_cycles_by_date(date: str) -> list[dict]:
    """
    Fetch all cycles for a specific date.

    Args:
        date: Date string in YYYY-MM-DD format
    """
    client = _get_client()
    if not client:
        return []

    try:
        result = client.table("drift_console_logs") \
            .select("*") \
            .eq("log_date", date) \
            .order("started_at", desc=True) \
            .execute()

        return result.data or []
    except Exception as e:
        print(f"[Drift] Supabase fetch error: {e}")
        return []


def get_trades_summary(days: int = 7) -> dict:
    """
    Get summary of trades over the past N days.

    Returns:
        {
            "total_cycles": int,
            "total_trades": int,
            "buys": int,
            "sells": int,
            "symbols_traded": list[str],
        }
    """
    client = _get_client()
    if not client:
        return {}

    try:
        from datetime import timedelta
        cutoff = (datetime.now(ET) - timedelta(days=days)).date().isoformat()

        result = client.table("drift_console_logs") \
            .select("trades, status") \
            .gte("log_date", cutoff) \
            .execute()

        if not result.data:
            return {}

        total_trades = 0
        buys = 0
        sells = 0
        symbols = set()

        for cycle in result.data:
            trades = cycle.get("trades") or []
            for trade in trades:
                total_trades += 1
                if trade.get("action") == "buy":
                    buys += 1
                elif trade.get("action") == "sell":
                    sells += 1
                if trade.get("symbol"):
                    symbols.add(trade["symbol"])

        return {
            "total_cycles": len(result.data),
            "total_trades": total_trades,
            "buys": buys,
            "sells": sells,
            "symbols_traded": list(symbols),
        }
    except Exception as e:
        print(f"[Drift] Supabase summary error: {e}")
        return {}
