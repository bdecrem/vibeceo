"""
i3-1 Trading Agent - Mode D: Daily Executor

Mechanical trading based on Weekly Strategist output + price rules.
No LLM calls - pure price math for entry/exit timing.

Flow:
1. Load strategy.json (weekly thesis)
2. Get prices from Alpaca
3. Calculate price signals (MA, RSI, trend)
4. Apply rules: bullish bias + price signal → BUY
5. Check stop losses for existing positions
"""

import os
import sys
from typing import Optional
from datetime import datetime

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from modes.base import TradingMode, TradeDecision, Signal
from strategist.types import (
    WeeklyStrategy, load_strategy, is_strategy_valid, get_asset_bias
)
from utils.price_rules import (
    calculate_price_signals, should_buy, should_sell, PriceSignals
)
from utils.market_hours import is_trading_time, is_crypto, get_market_status
from config import STRATEGY_FILE, STOP_LOSS_PCT


class ExecutorMode(TradingMode):
    """
    Daily Executor - mechanical trading based on weekly strategy + price rules.

    Uses:
    - Weekly strategy from state/strategy.json (focus assets, biases)
    - Price signals (MA, RSI, trend, dip) from Alpaca
    - Stop loss checks for existing positions

    No LLM calls - all decisions are rule-based.
    """

    name = "Daily Executor"
    description = "Mechanical execution based on weekly strategy + price rules"
    mode_id = "D"

    def __init__(self):
        self._strategy: Optional[WeeklyStrategy] = None
        self._strategy_loaded_at: Optional[datetime] = None
        self._alpaca_client = None

    def _ensure_strategy_loaded(self) -> bool:
        """Load or refresh the weekly strategy."""
        # Reload if not loaded or older than 1 hour
        should_reload = (
            self._strategy is None or
            self._strategy_loaded_at is None or
            (datetime.now() - self._strategy_loaded_at).seconds > 3600
        )

        if should_reload:
            self._strategy = load_strategy(STRATEGY_FILE)
            self._strategy_loaded_at = datetime.now()

            if self._strategy:
                print(f"📋 Loaded strategy from {STRATEGY_FILE}")
                print(f"   Thesis: {self._strategy.get('thesis', 'N/A')[:80]}...")
                print(f"   Focus: {', '.join(self._strategy.get('focus_assets', []))}")

        return self._strategy is not None and is_strategy_valid(self._strategy)

    def _get_alpaca_client(self):
        """Lazy-load Alpaca client."""
        if self._alpaca_client is None:
            from trading.alpaca_client import AlpacaClient
            from config import TRADING_MODE
            self._alpaca_client = AlpacaClient(paper=TRADING_MODE == "paper")
        return self._alpaca_client

    def get_data_sources(self) -> list[str]:
        return ["weekly strategy (strategy.json)", "Alpaca price API"]

    async def analyze(self, asset: str, positions: list[dict], cash: float) -> TradeDecision:
        """
        Analyze an asset using strategy + price rules.

        Decision flow:
        1. Check if strategy is valid
        2. Check if asset is in focus list
        3. Get price signals
        4. Apply buy/sell rules based on bias + signals
        5. Check stop losses for existing positions
        """
        # Default hold decision
        hold_decision = TradeDecision(
            signal="HOLD",
            asset=asset,
            reasoning="",
            confidence=0,
            data_sources=self.get_data_sources(),
        )

        # Check trading time for this asset
        if not is_trading_time(asset):
            market_status = get_market_status()
            hold_decision["reasoning"] = f"Market closed. {market_status.get('weekday', '')} {market_status.get('current_time_et', '')}"
            return hold_decision

        # Load strategy
        if not self._ensure_strategy_loaded():
            hold_decision["reasoning"] = "No valid strategy loaded. Run the Weekly Strategist first."
            return hold_decision

        strategy = self._strategy

        # Check if asset is in focus list
        focus_assets = strategy.get('focus_assets', [])
        avoid_assets = strategy.get('avoid_assets', [])

        if asset in avoid_assets:
            hold_decision["reasoning"] = f"Asset in avoid list per strategy"
            return hold_decision

        if asset not in focus_assets:
            hold_decision["reasoning"] = f"Asset not in focus list: {', '.join(focus_assets[:5])}"
            return hold_decision

        # Get asset bias from strategy
        asset_bias = get_asset_bias(strategy, asset)
        if not asset_bias:
            hold_decision["reasoning"] = f"No bias defined for {asset} in strategy"
            return hold_decision

        bias = asset_bias['bias']
        bias_confidence = asset_bias.get('confidence', 50)
        bias_reasoning = asset_bias.get('reasoning', '')

        # Get price data
        client = self._get_alpaca_client()
        prices = client.get_close_prices(asset, days=30)

        if len(prices) < 5:
            hold_decision["reasoning"] = f"Insufficient price history ({len(prices)} days)"
            return hold_decision

        current_price = client.get_latest_price(asset)
        if current_price is None:
            current_price = prices[-1] if prices else 0

        # Calculate price signals
        signals = calculate_price_signals(prices, current_price)

        # Check current position
        current_position = self._find_position(asset, positions)
        has_position = current_position is not None
        entry_price = float(current_position.get('avg_entry_price', 0)) if current_position else None

        # Decision logic
        # Check SELL first (stop loss, bearish bias)
        should_sell_now, sell_reason = should_sell(
            signals=signals,
            bias=bias,
            has_position=has_position,
            entry_price=entry_price,
            stop_loss_pct=STOP_LOSS_PCT,
        )

        if should_sell_now:
            return TradeDecision(
                signal="SELL",
                asset=asset,
                reasoning=f"{sell_reason}. Strategy: {bias_reasoning}",
                confidence=min(90, bias_confidence + 10),  # Higher confidence for sells
                data_sources=self.get_data_sources(),
            )

        # Check BUY
        should_buy_now, buy_reason = should_buy(
            signals=signals,
            bias=bias,
            min_dip_pct=3.0,
        )

        if should_buy_now and not has_position:
            # Check max exposure
            max_exposure = strategy.get('max_exposure_pct', 60)
            # TODO: Calculate current exposure and check against max

            return TradeDecision(
                signal="BUY",
                asset=asset,
                reasoning=f"{buy_reason}. Strategy: {bias_reasoning}",
                confidence=bias_confidence,
                data_sources=self.get_data_sources(),
            )

        # Default: HOLD
        hold_decision["reasoning"] = (
            f"Holding. Bias: {bias} ({bias_confidence}%). "
            f"Trend: {signals['trend']}, RSI: {signals['rsi']:.0f}, "
            f"Dip: {signals['dip_pct']:.1f}%"
        )
        hold_decision["confidence"] = 50

        return hold_decision

    def _find_position(self, asset: str, positions: list[dict]) -> Optional[dict]:
        """Find current position for an asset."""
        # Normalize asset symbol
        normalized = asset.replace("/USD", "USD").replace("/", "")

        for pos in positions:
            if pos["symbol"].upper() == normalized.upper():
                return pos

        return None


def get_executor_status(strategy_file: str = STRATEGY_FILE) -> dict:
    """
    Get the current executor status.

    Returns dict with strategy status, market status, etc.
    """
    strategy = load_strategy(strategy_file)
    market_status = get_market_status()

    return {
        "strategy_loaded": strategy is not None,
        "strategy_valid": is_strategy_valid(strategy),
        "thesis": strategy.get('thesis', 'N/A')[:100] if strategy else 'No strategy',
        "focus_assets": strategy.get('focus_assets', []) if strategy else [],
        "market_regime": strategy.get('market_regime', 'unknown') if strategy else 'unknown',
        "market_open": market_status.get('is_open', False),
        "current_time_et": market_status.get('current_time_et', ''),
    }
