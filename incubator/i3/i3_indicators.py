"""
i3 Trading Agent - Technical Indicators

RSI and Moving Average calculations for the Connors RSI-2 strategy.
"""


def calculate_rsi(closes: list[float], period: int = 2) -> float:
    """
    Calculate Relative Strength Index.

    Args:
        closes: List of closing prices (oldest first)
        period: RSI period (default 2 for Connors strategy)

    Returns:
        RSI value 0-100, or 50 if insufficient data
    """
    if len(closes) < period + 1:
        return 50.0  # Neutral if insufficient data

    # Calculate price changes
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]

    # Get the last 'period' changes
    recent_deltas = deltas[-period:]

    # Separate gains and losses
    gains = [d if d > 0 else 0 for d in recent_deltas]
    losses = [-d if d < 0 else 0 for d in recent_deltas]

    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period

    if avg_loss == 0:
        return 100.0  # All gains, max RSI

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    return round(rsi, 2)


def calculate_ma(closes: list[float], period: int) -> float:
    """
    Calculate Simple Moving Average.

    Args:
        closes: List of closing prices (oldest first)
        period: MA period (e.g., 200 for trend, 5 for exit)

    Returns:
        MA value, or last close if insufficient data
    """
    if len(closes) < period:
        return closes[-1] if closes else 0.0

    return sum(closes[-period:]) / period


def calculate_indicators(closes: list[float]) -> dict:
    """
    Calculate all indicators needed for Connors RSI-2 strategy.

    Args:
        closes: List of closing prices (oldest first, need 200+ for full MA)

    Returns:
        Dict with rsi_2, ma_200, ma_5, current_price
    """
    return {
        "rsi_2": calculate_rsi(closes, period=2),
        "ma_200": calculate_ma(closes, period=200),
        "ma_5": calculate_ma(closes, period=5),
        "current_price": closes[-1] if closes else 0.0,
    }


if __name__ == "__main__":
    # Quick test
    test_closes = [100, 101, 99, 98, 97, 99, 101, 102, 100, 99]
    print(f"Test closes: {test_closes}")
    print(f"RSI(2): {calculate_rsi(test_closes, 2)}")
    print(f"MA(5): {calculate_ma(test_closes, 5)}")
