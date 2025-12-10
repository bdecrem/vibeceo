"""
i3 Trading Agent - Base Mode Interface

All trading strategy modes inherit from this base class.
"""

from abc import ABC, abstractmethod
from typing import Literal, TypedDict


Signal = Literal["BUY", "SELL", "HOLD"]


class TradeDecision(TypedDict):
    """Result of a mode analysis."""
    signal: Signal
    asset: str
    reasoning: str
    confidence: int  # 0-100
    data_sources: list[str]


class TradingMode(ABC):
    """
    Base class for all trading strategy modes.

    Each mode implements its own signal generation logic:
    - Mode A (Sentiment): Uses crypto-research reports
    - Mode B (Technical): Uses price indicators
    - Mode C (Hybrid): Combines both
    """

    name: str
    description: str
    mode_id: str  # "A", "B", or "C"

    @abstractmethod
    async def analyze(self, asset: str, positions: list[dict], cash: float) -> TradeDecision:
        """
        Analyze an asset and return a trading decision.

        Args:
            asset: Asset symbol (e.g., "BTC/USD", "ETH/USD")
            positions: Current open positions
            cash: Available cash

        Returns:
            TradeDecision with signal, reasoning, and confidence
        """
        pass

    @abstractmethod
    def get_data_sources(self) -> list[str]:
        """Return list of data sources this mode uses."""
        pass


def get_mode(mode_id: str) -> TradingMode:
    """
    Factory function to get a mode instance by ID.

    Args:
        mode_id: "A", "B", or "C"

    Returns:
        TradingMode instance
    """
    from modes.mode_a_sentiment import SentimentMode
    from modes.mode_b_technical import TechnicalMode

    modes = {
        "A": SentimentMode,
        "B": TechnicalMode,
        # "C": HybridMode,     # TODO
    }

    if mode_id not in modes:
        raise ValueError(f"Unknown mode: {mode_id}. Available: {list(modes.keys())}")

    return modes[mode_id]()
