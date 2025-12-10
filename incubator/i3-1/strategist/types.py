"""
i3-1 Trading Agent - Strategist Types

Type definitions for the Weekly Strategist output and related structures.
"""

from typing import TypedDict, Literal, Optional
from datetime import datetime
import json
import os

Bias = Literal["bullish", "bearish", "neutral"]
MarketRegime = Literal["risk_on", "risk_off", "mixed"]


class AssetBias(TypedDict):
    """Bias for a specific asset."""
    asset: str
    bias: Bias
    reasoning: str
    confidence: int  # 0-100


class WeeklyStrategy(TypedDict):
    """Output of the Weekly Strategist - persisted to state/strategy.json."""
    generated_at: str              # ISO timestamp
    valid_until: str               # ISO timestamp (7 days later)
    thesis: str                    # 2-3 sentence market thesis
    market_regime: MarketRegime    # Overall market mode
    focus_assets: list[str]        # Assets to actively trade
    avoid_assets: list[str]        # Assets to avoid
    biases: list[AssetBias]        # Per-asset bias and reasoning
    max_exposure_pct: int          # Max portfolio % to deploy (0-100)
    key_events: list[str]          # Events to watch (Fed, earnings, etc.)
    sources: list[str]             # URLs used in research


def load_strategy(strategy_file: str) -> Optional[WeeklyStrategy]:
    """
    Load the current weekly strategy from file.

    Returns None if file doesn't exist or is invalid.
    """
    if not os.path.exists(strategy_file):
        return None

    try:
        with open(strategy_file, 'r') as f:
            data = json.load(f)

        # Validate required fields
        required = ['generated_at', 'valid_until', 'thesis', 'focus_assets', 'biases']
        for field in required:
            if field not in data:
                print(f"Warning: strategy.json missing required field: {field}")
                return None

        return data
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading strategy: {e}")
        return None


def save_strategy(strategy: WeeklyStrategy, strategy_file: str) -> bool:
    """
    Save a weekly strategy to file.

    Returns True if successful.
    """
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(strategy_file), exist_ok=True)

        with open(strategy_file, 'w') as f:
            json.dump(strategy, f, indent=2)

        return True
    except IOError as e:
        print(f"Error saving strategy: {e}")
        return False


def is_strategy_valid(strategy: Optional[WeeklyStrategy]) -> bool:
    """
    Check if a strategy is still valid (not expired).
    """
    if strategy is None:
        return False

    try:
        valid_until = datetime.fromisoformat(strategy['valid_until'].replace('Z', '+00:00'))
        return datetime.now(valid_until.tzinfo) < valid_until
    except (KeyError, ValueError):
        return False


def get_asset_bias(strategy: WeeklyStrategy, asset: str) -> Optional[AssetBias]:
    """
    Get the bias for a specific asset from the strategy.

    Returns None if asset not in biases.
    """
    for bias in strategy.get('biases', []):
        if bias['asset'] == asset:
            return bias
    return None


def create_empty_strategy() -> WeeklyStrategy:
    """
    Create an empty/default strategy for testing.
    """
    now = datetime.utcnow()
    valid_until = datetime(now.year, now.month, now.day + 7)

    return WeeklyStrategy(
        generated_at=now.isoformat() + 'Z',
        valid_until=valid_until.isoformat() + 'Z',
        thesis="No strategy generated yet. Run the strategist first.",
        market_regime="mixed",
        focus_assets=[],
        avoid_assets=[],
        biases=[],
        max_exposure_pct=0,
        key_events=[],
        sources=[],
    )
