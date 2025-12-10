"""
i3 Trading Agent - Mode B: Technical (RSI-2 Mean Reversion)

Implements Larry Connors' RSI-2 strategy:
- BUY when RSI(2) < 10 AND price > 200 MA (oversold in uptrend)
- SELL when RSI(2) > 90 OR price > 5 MA (take profit)
- HOLD otherwise
"""

import sys
from pathlib import Path
from typing import Optional

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from modes.base import TradingMode, TradeDecision, Signal
from i3_indicators import calculate_rsi, calculate_ma, calculate_indicators
from trading.alpaca_client import AlpacaClient
from config import (
    RSI_PERIOD,
    RSI_OVERSOLD,
    RSI_OVERBOUGHT,
    MA_TREND_PERIOD,
    MA_EXIT_PERIOD,
    VERBOSE,
)


class TechnicalMode(TradingMode):
    """
    RSI-2 Mean Reversion strategy (Larry Connors).

    Buy oversold dips in uptrending assets, sell when overbought or price recovers.
    """

    name = "Technical (RSI-2)"
    description = "Connors RSI-2 mean reversion strategy"
    mode_id = "B"

    def __init__(self):
        self._client: Optional[AlpacaClient] = None

    @property
    def client(self) -> AlpacaClient:
        if self._client is None:
            from config import TRADING_MODE
            self._client = AlpacaClient(paper=TRADING_MODE == "paper")
        return self._client

    def get_data_sources(self) -> list[str]:
        return ["Alpaca 15-min bars", "RSI(2)", "MA(200)", "MA(5)"]

    async def analyze(self, asset: str, positions: list[dict], cash: float) -> TradeDecision:
        """
        Analyze asset using RSI-2 mean reversion strategy.
        """
        # Fetch historical bars (need 250 for 200 MA + buffer)
        bars = self.client.get_historical_bars(asset, timeframe_minutes=15, limit=250)

        if len(bars) < MA_TREND_PERIOD:
            return TradeDecision(
                signal="HOLD",
                asset=asset,
                reasoning=f"Insufficient data: got {len(bars)} bars, need {MA_TREND_PERIOD}+",
                confidence=0,
                data_sources=["insufficient data"],
            )

        # Extract closes
        closes = [b["close"] for b in bars]

        # Calculate indicators
        indicators = calculate_indicators(closes)
        rsi = indicators["rsi_2"]
        ma_200 = indicators["ma_200"]
        ma_5 = indicators["ma_5"]
        current_price = indicators["current_price"]

        # Check if we have a position
        has_position = self._find_position(asset, positions) is not None

        # Apply Connors RSI-2 rules
        signal, reasoning, confidence = self._apply_rules(
            asset=asset,
            rsi=rsi,
            current_price=current_price,
            ma_200=ma_200,
            ma_5=ma_5,
            has_position=has_position,
            cash=cash,
        )

        return TradeDecision(
            signal=signal,
            asset=asset,
            reasoning=reasoning,
            confidence=confidence,
            data_sources=[
                f"RSI(2): {rsi:.1f}",
                f"Price: ${current_price:,.2f}",
                f"MA(200): ${ma_200:,.2f}",
                f"MA(5): ${ma_5:,.2f}",
            ],
        )

    def _find_position(self, asset: str, positions: list[dict]) -> Optional[dict]:
        """Find current position for an asset."""
        normalized = asset.replace("/USD", "USD").replace("/", "")
        for pos in positions:
            if pos["symbol"].upper() == normalized.upper():
                return pos
        return None

    def _apply_rules(
        self,
        asset: str,
        rsi: float,
        current_price: float,
        ma_200: float,
        ma_5: float,
        has_position: bool,
        cash: float,
    ) -> tuple[Signal, str, int]:
        """
        Apply Connors RSI-2 trading rules.

        Returns:
            (signal, reasoning, confidence)
        """
        reasoning_parts = []
        confidence = 50  # Base confidence

        # Check trend (price vs 200 MA)
        in_uptrend = current_price > ma_200
        trend_str = "UPTREND" if in_uptrend else "DOWNTREND"
        reasoning_parts.append(f"Trend: {trend_str} (price ${current_price:,.0f} vs MA200 ${ma_200:,.0f})")

        # RSI status
        if rsi < RSI_OVERSOLD:
            rsi_status = "OVERSOLD"
            confidence += 25
        elif rsi > RSI_OVERBOUGHT:
            rsi_status = "OVERBOUGHT"
            confidence += 25
        else:
            rsi_status = "NEUTRAL"

        reasoning_parts.append(f"RSI(2): {rsi:.1f} ({rsi_status})")

        # Decision logic
        signal: Signal = "HOLD"

        # BUY: RSI oversold AND in uptrend AND no position
        if rsi < RSI_OVERSOLD and in_uptrend and not has_position:
            signal = "BUY"
            confidence += 20
            reasoning_parts.append("Signal: BUY - oversold dip in uptrend")

        # SELL: RSI overbought OR price recovered above MA(5)
        elif has_position:
            if rsi > RSI_OVERBOUGHT:
                signal = "SELL"
                confidence += 20
                reasoning_parts.append("Signal: SELL - overbought, take profit")
            elif current_price > ma_5:
                signal = "SELL"
                confidence += 15
                reasoning_parts.append(f"Signal: SELL - price recovered above MA(5) ${ma_5:,.0f}")
            else:
                reasoning_parts.append("Signal: HOLD - waiting for exit condition")

        # No position and not oversold
        elif not has_position:
            if not in_uptrend:
                reasoning_parts.append("Signal: HOLD - not in uptrend, waiting")
            else:
                reasoning_parts.append(f"Signal: HOLD - RSI not oversold (need < {RSI_OVERSOLD})")

        # Cash check
        if signal == "BUY" and cash < 10:
            signal = "HOLD"
            confidence = 0
            reasoning_parts.append(f"Blocked: insufficient cash (${cash:.2f})")

        # Clamp confidence
        confidence = max(0, min(100, confidence))

        reasoning = " | ".join(reasoning_parts)
        return signal, reasoning, confidence
