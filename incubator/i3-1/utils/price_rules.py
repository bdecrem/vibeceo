"""
i3-1 Trading Agent - Price Rules

Mechanical price-based signals: Moving Averages, RSI, Trend, Dip detection.
These are the core decision tools for the Daily Executor.
"""

from typing import Literal, TypedDict

TrendDirection = Literal["up", "down", "flat"]
MomentumState = Literal["overbought", "oversold", "neutral"]


class PriceSignals(TypedDict):
    """Price-based signals for an asset."""
    trend: TrendDirection           # 5-day MA vs 20-day MA
    dip_pct: float                  # % below 5-day MA (negative = above)
    rsi: float                      # 14-period RSI
    momentum: MomentumState         # Based on RSI thresholds
    current_price: float
    ma_5: float
    ma_20: float


def calculate_moving_average(prices: list[float], period: int) -> float:
    """
    Calculate simple moving average for the last N prices.

    Args:
        prices: List of prices (most recent last)
        period: Number of periods to average

    Returns:
        Moving average value
    """
    if len(prices) < period:
        # Not enough data, use what we have
        return sum(prices) / len(prices) if prices else 0.0

    return sum(prices[-period:]) / period


def calculate_rsi(prices: list[float], period: int = 14) -> float:
    """
    Calculate Relative Strength Index (RSI).

    Args:
        prices: List of prices (most recent last), needs at least period+1 prices
        period: RSI period (default 14)

    Returns:
        RSI value between 0 and 100
    """
    if len(prices) < period + 1:
        return 50.0  # Neutral if not enough data

    # Calculate price changes
    changes = [prices[i] - prices[i - 1] for i in range(1, len(prices))]

    # Take last 'period' changes
    recent_changes = changes[-period:]

    gains = [c for c in recent_changes if c > 0]
    losses = [-c for c in recent_changes if c < 0]

    avg_gain = sum(gains) / period if gains else 0
    avg_loss = sum(losses) / period if losses else 0

    if avg_loss == 0:
        return 100.0  # All gains, max RSI

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    return round(rsi, 2)


def get_trend(ma_short: float, ma_long: float, threshold_pct: float = 1.0) -> TrendDirection:
    """
    Determine trend direction based on MA crossover.

    Args:
        ma_short: Short-term MA (e.g., 5-day)
        ma_long: Long-term MA (e.g., 20-day)
        threshold_pct: Percentage difference to confirm trend (default 1%)

    Returns:
        "up" if short MA > long MA by threshold
        "down" if short MA < long MA by threshold
        "flat" otherwise
    """
    if ma_long == 0:
        return "flat"

    pct_diff = ((ma_short - ma_long) / ma_long) * 100

    if pct_diff > threshold_pct:
        return "up"
    elif pct_diff < -threshold_pct:
        return "down"
    else:
        return "flat"


def get_dip_percentage(current_price: float, reference_price: float) -> float:
    """
    Calculate how far current price is below a reference (e.g., MA).

    Returns:
        Positive number = price is below reference (dip)
        Negative number = price is above reference
    """
    if reference_price == 0:
        return 0.0

    return round(((reference_price - current_price) / reference_price) * 100, 2)


def get_momentum_state(rsi: float, overbought: float = 70, oversold: float = 30) -> MomentumState:
    """
    Classify momentum based on RSI.

    Args:
        rsi: RSI value (0-100)
        overbought: RSI threshold for overbought (default 70)
        oversold: RSI threshold for oversold (default 30)

    Returns:
        "overbought", "oversold", or "neutral"
    """
    if rsi >= overbought:
        return "overbought"
    elif rsi <= oversold:
        return "oversold"
    else:
        return "neutral"


def calculate_price_signals(prices: list[float], current_price: float = None) -> PriceSignals:
    """
    Calculate all price signals for an asset.

    Args:
        prices: Historical prices (most recent last), needs 20+ for full signals
        current_price: Current price (if None, uses last price in list)

    Returns:
        PriceSignals with trend, dip_pct, rsi, momentum
    """
    if not prices:
        return PriceSignals(
            trend="flat",
            dip_pct=0.0,
            rsi=50.0,
            momentum="neutral",
            current_price=0.0,
            ma_5=0.0,
            ma_20=0.0,
        )

    if current_price is None:
        current_price = prices[-1]

    ma_5 = calculate_moving_average(prices, 5)
    ma_20 = calculate_moving_average(prices, 20)
    rsi = calculate_rsi(prices)

    trend = get_trend(ma_5, ma_20)
    dip_pct = get_dip_percentage(current_price, ma_5)
    momentum = get_momentum_state(rsi)

    return PriceSignals(
        trend=trend,
        dip_pct=dip_pct,
        rsi=rsi,
        momentum=momentum,
        current_price=current_price,
        ma_5=round(ma_5, 2),
        ma_20=round(ma_20, 2),
    )


def should_buy(signals: PriceSignals, bias: str, min_dip_pct: float = 3.0) -> tuple[bool, str]:
    """
    Determine if we should BUY based on signals and strategy bias.

    Args:
        signals: Price signals for the asset
        bias: Strategy bias ("bullish", "bearish", "neutral")
        min_dip_pct: Minimum dip % to trigger buy (default 3%)

    Returns:
        (should_buy: bool, reason: str)
    """
    if bias != "bullish":
        return False, f"Bias is {bias}, not bullish"

    reasons = []

    # Check for buy conditions (any one triggers)
    if signals['trend'] == "up":
        reasons.append("trend is up")

    if signals['dip_pct'] >= min_dip_pct:
        reasons.append(f"dip of {signals['dip_pct']:.1f}% below MA")

    if signals['momentum'] == "oversold":
        reasons.append(f"RSI oversold at {signals['rsi']:.0f}")

    if reasons:
        return True, f"BUY: Bullish bias + {', '.join(reasons)}"
    else:
        return False, f"No buy signal (trend={signals['trend']}, dip={signals['dip_pct']:.1f}%, RSI={signals['rsi']:.0f})"


def should_sell(signals: PriceSignals, bias: str, has_position: bool, entry_price: float = None, stop_loss_pct: float = 5.0) -> tuple[bool, str]:
    """
    Determine if we should SELL based on signals and strategy bias.

    Args:
        signals: Price signals for the asset
        bias: Strategy bias ("bullish", "bearish", "neutral")
        has_position: Whether we currently hold this asset
        entry_price: Price we bought at (for stop loss check)
        stop_loss_pct: Stop loss percentage (default 5%)

    Returns:
        (should_sell: bool, reason: str)
    """
    if not has_position:
        return False, "No position to sell"

    # Check stop loss first
    if entry_price and signals['current_price'] > 0:
        loss_pct = ((entry_price - signals['current_price']) / entry_price) * 100
        if loss_pct >= stop_loss_pct:
            return True, f"SELL: Stop loss triggered ({loss_pct:.1f}% loss)"

    # Check bearish bias
    if bias == "bearish":
        return True, "SELL: Bearish bias, exiting position"

    # Check overbought + downtrend (take profit / avoid reversal)
    if signals['momentum'] == "overbought" and signals['trend'] == "down":
        return True, f"SELL: Overbought (RSI {signals['rsi']:.0f}) + downtrend"

    return False, f"Hold (bias={bias}, trend={signals['trend']}, RSI={signals['rsi']:.0f})"
