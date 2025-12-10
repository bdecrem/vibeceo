"""
i3-1 Trading Agent - Market Hours

Utilities for checking market hours and scheduling.
Crypto trades 24/7, stocks trade during market hours.
"""

from datetime import datetime, time
from typing import Literal
import pytz

AssetType = Literal["crypto", "stock"]

# US Eastern timezone for stock market
ET = pytz.timezone('America/New_York')

# Stock market hours (EST/EDT)
MARKET_OPEN = time(9, 30)   # 9:30 AM ET
MARKET_CLOSE = time(16, 0)  # 4:00 PM ET

# Extended hours (for reference, not used for trading)
PRE_MARKET_OPEN = time(4, 0)    # 4:00 AM ET
AFTER_HOURS_CLOSE = time(20, 0)  # 8:00 PM ET


def get_asset_type(symbol: str) -> AssetType:
    """
    Determine if an asset is crypto or stock.

    Crypto symbols contain "/" (e.g., "BTC/USD") or end in "USD" (e.g., "BTCUSD").
    Everything else is assumed to be a stock.
    """
    if "/" in symbol or symbol.endswith("USD"):
        return "crypto"
    return "stock"


def is_crypto(symbol: str) -> bool:
    """Check if symbol is a cryptocurrency."""
    return get_asset_type(symbol) == "crypto"


def is_stock(symbol: str) -> bool:
    """Check if symbol is a stock."""
    return get_asset_type(symbol) == "stock"


def is_market_open_now() -> bool:
    """
    Check if US stock market is currently open.

    Market is open Monday-Friday, 9:30 AM - 4:00 PM ET.
    Excludes holidays (simplified - doesn't check holidays).
    """
    now_et = datetime.now(ET)

    # Check if weekday (Monday = 0, Sunday = 6)
    if now_et.weekday() >= 5:  # Saturday or Sunday
        return False

    current_time = now_et.time()
    return MARKET_OPEN <= current_time < MARKET_CLOSE


def is_trading_time(symbol: str) -> bool:
    """
    Check if we can trade this symbol right now.

    Crypto: Always tradeable (24/7)
    Stocks: Only during market hours
    """
    if is_crypto(symbol):
        return True
    return is_market_open_now()


def get_next_market_open() -> datetime:
    """
    Get the next time the stock market opens.

    Returns datetime in ET timezone.
    """
    now_et = datetime.now(ET)

    # If before market open today, return today's open
    if now_et.weekday() < 5 and now_et.time() < MARKET_OPEN:
        return now_et.replace(hour=9, minute=30, second=0, microsecond=0)

    # Otherwise, find next weekday
    days_ahead = 1
    next_day = now_et

    while True:
        next_day = now_et.replace(hour=9, minute=30, second=0, microsecond=0)
        next_day = next_day.replace(day=next_day.day + days_ahead)
        if next_day.weekday() < 5:  # Monday-Friday
            return next_day
        days_ahead += 1
        if days_ahead > 7:  # Safety limit
            break

    return now_et  # Fallback


def get_time_until_market_open() -> int:
    """
    Get seconds until market opens.

    Returns 0 if market is open.
    """
    if is_market_open_now():
        return 0

    now_et = datetime.now(ET)
    next_open = get_next_market_open()
    delta = next_open - now_et
    return max(0, int(delta.total_seconds()))


def should_check_stocks_now(check_times: list[str]) -> bool:
    """
    Check if current time matches one of the stock check times.

    Args:
        check_times: List of times like ["09:45", "15:45"]

    Returns:
        True if within 5 minutes of a check time
    """
    if not is_market_open_now():
        return False

    now_et = datetime.now(ET)
    current_minutes = now_et.hour * 60 + now_et.minute

    for check_time in check_times:
        try:
            parts = check_time.strip().split(':')
            check_hour = int(parts[0])
            check_minute = int(parts[1])
            check_minutes = check_hour * 60 + check_minute

            # Within 5 minute window
            if abs(current_minutes - check_minutes) <= 5:
                return True
        except (ValueError, IndexError):
            continue

    return False


def get_market_status() -> dict:
    """
    Get current market status summary.

    Returns dict with:
        - is_open: bool
        - current_time_et: str
        - next_open: str (if closed)
        - time_until_open: int seconds (if closed)
    """
    now_et = datetime.now(ET)
    is_open = is_market_open_now()

    status = {
        "is_open": is_open,
        "current_time_et": now_et.strftime("%Y-%m-%d %H:%M:%S %Z"),
        "weekday": now_et.strftime("%A"),
    }

    if not is_open:
        status["next_open"] = get_next_market_open().strftime("%Y-%m-%d %H:%M:%S %Z")
        status["time_until_open_seconds"] = get_time_until_market_open()

    return status
