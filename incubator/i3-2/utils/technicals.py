"""
Technical analysis utilities for Drift.

Calculates RSI, moving averages, and other indicators used for
quantitative pre-screening before LLM research.
"""

from typing import Optional


def calculate_rsi(prices: list[float], period: int = 2) -> Optional[float]:
    """
    Calculate RSI (Relative Strength Index).

    Args:
        prices: List of closing prices (oldest first)
        period: RSI period (default 2 for Connors RSI-2)

    Returns:
        RSI value 0-100, or None if insufficient data
    """
    if len(prices) < period + 1:
        return None

    # Calculate price changes
    changes = [prices[i] - prices[i-1] for i in range(1, len(prices))]

    # Get recent changes for the period
    recent_changes = changes[-period:]

    # Separate gains and losses
    gains = [c if c > 0 else 0 for c in recent_changes]
    losses = [-c if c < 0 else 0 for c in recent_changes]

    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    return round(rsi, 1)


def calculate_sma(prices: list[float], period: int) -> Optional[float]:
    """
    Calculate Simple Moving Average.

    Args:
        prices: List of closing prices (oldest first)
        period: SMA period (e.g., 20, 50, 200)

    Returns:
        SMA value or None if insufficient data
    """
    if len(prices) < period:
        return None

    return sum(prices[-period:]) / period


def calculate_price_change(prices: list[float], days: int) -> Optional[float]:
    """
    Calculate percentage price change over N days.

    Args:
        prices: List of closing prices (oldest first)
        days: Number of days to look back

    Returns:
        Percentage change or None if insufficient data
    """
    if len(prices) < days + 1:
        return None

    old_price = prices[-(days + 1)]
    current_price = prices[-1]

    if old_price == 0:
        return None

    return round(((current_price - old_price) / old_price) * 100, 2)


def get_technical_signals(bars: list[dict]) -> dict:
    """
    Calculate all technical signals for a stock.

    Args:
        bars: List of daily bars from Alpaca (must have 'close' key)

    Returns:
        Dict with RSI-2, price changes, MA relationships
    """
    if not bars or len(bars) < 5:
        return {"error": "Insufficient data"}

    # Extract closing prices
    closes = [bar["close"] for bar in bars]
    current_price = closes[-1]

    signals = {
        "price": current_price,
        "rsi_2": calculate_rsi(closes, period=2),
        "change_1d": calculate_price_change(closes, 1),
        "change_5d": calculate_price_change(closes, 5),
    }

    # Add moving averages if we have enough data
    sma_20 = calculate_sma(closes, 20)
    sma_50 = calculate_sma(closes, 50)
    sma_200 = calculate_sma(closes, 200)

    if sma_20:
        signals["sma_20"] = round(sma_20, 2)
        signals["vs_sma_20"] = round(((current_price - sma_20) / sma_20) * 100, 2)

    if sma_50:
        signals["sma_50"] = round(sma_50, 2)
        signals["vs_sma_50"] = round(((current_price - sma_50) / sma_50) * 100, 2)

    if sma_200:
        signals["sma_200"] = round(sma_200, 2)
        signals["vs_sma_200"] = round(((current_price - sma_200) / sma_200) * 100, 2)
        signals["above_200ma"] = current_price > sma_200

    return signals


def screen_for_triggers(symbol: str, signals: dict, thresholds: dict) -> list[dict]:
    """
    Check if a stock's signals meet any trigger conditions.

    Args:
        symbol: Stock symbol
        signals: Output from get_technical_signals()
        thresholds: Dict with RSI_OVERSOLD, PULLBACK_THRESHOLD, etc.

    Returns:
        List of trigger dicts, empty if no triggers
    """
    triggers = []

    if "error" in signals:
        return triggers

    rsi = signals.get("rsi_2")
    change_5d = signals.get("change_5d")
    vs_sma_20 = signals.get("vs_sma_20")
    above_200ma = signals.get("above_200ma", True)  # Default True if no data

    # Check if trend filter is required
    require_uptrend = thresholds.get("REQUIRE_UPTREND", False)

    # Oversold bounce setup
    if rsi is not None and rsi < thresholds.get("RSI_OVERSOLD", 20):
        # Apply 200MA trend filter if enabled
        if require_uptrend and not above_200ma:
            # Skip - stock is in downtrend (below 200MA)
            # This prevents catching falling knives
            pass
        else:
            triggers.append({
                "symbol": symbol,
                "trigger_type": "oversold",
                "reason": f"RSI-2 at {rsi} (oversold < {thresholds.get('RSI_OVERSOLD', 20)})",
                "signals": signals,
            })

    # Pullback in potential uptrend
    if change_5d is not None and change_5d < thresholds.get("PULLBACK_THRESHOLD", -2.0):
        # Only flag if not already triggered by RSI
        if not any(t["trigger_type"] == "oversold" for t in triggers):
            triggers.append({
                "symbol": symbol,
                "trigger_type": "pullback",
                "reason": f"Down {change_5d}% in 5 days",
                "signals": signals,
            })

    # Near support (20-day MA)
    if vs_sma_20 is not None and -2.0 < vs_sma_20 < 0:
        triggers.append({
            "symbol": symbol,
            "trigger_type": "support_test",
            "reason": f"Testing 20-day MA ({vs_sma_20}% from SMA20)",
            "signals": signals,
        })

    # Breakout (up big)
    if change_5d is not None and change_5d > thresholds.get("BREAKOUT_THRESHOLD", 3.0):
        triggers.append({
            "symbol": symbol,
            "trigger_type": "breakout",
            "reason": f"Up {change_5d}% in 5 days (momentum)",
            "signals": signals,
        })

    return triggers
