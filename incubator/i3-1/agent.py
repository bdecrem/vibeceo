#!/usr/bin/env python3
"""
i3-1 Trading Agent - Main Loop

An experimental, observable trading agent for Token Tank.
Trades autonomously using configurable strategy modes.

Usage:
    python agent.py              # Run trading loop
    python agent.py --once       # Run once and exit
    python agent.py --test       # Test mode (no trades)
"""

import asyncio
import argparse
import sys
import os
from datetime import datetime
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from config import (
    TRADING_MODE,
    STRATEGY_MODE,
    CHECK_INTERVAL_MINUTES,
    MIN_CONFIDENCE,
    MAX_POSITION_SIZE_PCT,
    VERBOSE,
    get_enabled_assets,
    get_mode_name,
    print_config,
)
from utils.logger import (
    log_banner,
    log_decision,
    log_portfolio,
    log_analysis_start,
    log_analysis_data,
    log_sleep,
    log_error,
    log_info,
    log_success,
    log_warning,
)
from trading.alpaca_client import AlpacaClient
from modes.base import get_mode


class TradingAgent:
    """
    Main trading agent that orchestrates the trading loop.
    """

    def __init__(self, test_mode: bool = False):
        """
        Initialize the trading agent.

        Args:
            test_mode: If True, don't execute actual trades
        """
        self.test_mode = test_mode
        self.client = AlpacaClient(paper=TRADING_MODE == "paper")
        self.mode = get_mode(STRATEGY_MODE)
        self.trades_today = 0
        self.last_trade_date = None

    async def run_once(self) -> dict:
        """
        Run one iteration of the trading loop.

        Returns:
            Summary of actions taken
        """
        summary = {
            "timestamp": datetime.now().isoformat(),
            "mode": STRATEGY_MODE,
            "assets_analyzed": 0,
            "trades_executed": 0,
            "decisions": [],
        }

        # Reset daily trade counter if new day
        today = datetime.now().date()
        if self.last_trade_date != today:
            self.trades_today = 0
            self.last_trade_date = today

        # Get current portfolio state
        positions = self.client.get_positions()
        cash = self.client.get_cash()
        portfolio_value = self.client.get_portfolio_value()

        if VERBOSE:
            log_portfolio(positions, cash, portfolio_value)

        # Analyze each enabled asset
        for asset in get_enabled_assets():
            summary["assets_analyzed"] += 1

            if VERBOSE:
                log_analysis_start(asset, STRATEGY_MODE)

            try:
                # Get trading decision from mode
                decision = await self.mode.analyze(asset, positions, cash)

                if VERBOSE:
                    log_decision(
                        action=decision["signal"],
                        asset=decision["asset"],
                        reasoning=decision["reasoning"],
                        confidence=decision["confidence"],
                        mode=f"{STRATEGY_MODE} ({self.mode.name})",
                    )

                summary["decisions"].append(decision)

                # Execute trade if conditions met
                if self._should_execute(decision):
                    trade_result = await self._execute_trade(decision, cash, portfolio_value)
                    if trade_result:
                        summary["trades_executed"] += 1
                        # Refresh cash after trade
                        cash = self.client.get_cash()

            except Exception as e:
                log_error(f"analyzing {asset}", e)

        return summary

    def _should_execute(self, decision: dict) -> bool:
        """Check if we should execute a trade based on decision."""
        # Don't execute HOLDs
        if decision["signal"] == "HOLD":
            return False

        # Check confidence threshold
        if decision["confidence"] < MIN_CONFIDENCE:
            if VERBOSE:
                log_warning(
                    f"Confidence {decision['confidence']}% below threshold {MIN_CONFIDENCE}%, skipping."
                )
            return False

        # Check test mode
        if self.test_mode:
            if VERBOSE:
                log_warning("Test mode enabled, skipping trade execution.")
            return False

        return True

    async def _execute_trade(self, decision: dict, cash: float, portfolio_value: float) -> bool:
        """
        Execute a trade based on decision.

        Returns:
            True if trade was executed successfully
        """
        signal = decision["signal"]
        asset = decision["asset"]
        reasoning = decision["reasoning"]

        try:
            if signal == "BUY":
                # Calculate position size
                max_spend = portfolio_value * (MAX_POSITION_SIZE_PCT / 100)
                spend_amount = min(max_spend, cash * 0.9)  # Leave 10% cash buffer

                if spend_amount < 10:
                    log_warning(f"Insufficient funds for {asset} (${spend_amount:.2f})")
                    return False

                if VERBOSE:
                    log_info(f"Executing BUY: ${spend_amount:.2f} of {asset}")

                result = self.client.buy(asset, spend_amount, reasoning)

                if result:
                    self.trades_today += 1
                    log_success(f"BUY order submitted: {result['id']}")
                    return True

            elif signal == "SELL":
                if VERBOSE:
                    log_info(f"Executing SELL: all {asset}")

                result = self.client.sell(asset, reason=reasoning)

                if result:
                    self.trades_today += 1
                    log_success(f"SELL order submitted: {result['id']}")
                    return True

        except Exception as e:
            log_error(f"executing {signal} {asset}", e)

        return False

    async def run_loop(self):
        """
        Run the main trading loop continuously.
        """
        if VERBOSE:
            log_banner()
            print_config()

        log_info(f"Starting trading loop (Mode {STRATEGY_MODE}: {self.mode.name})")
        log_info(f"Watching: {', '.join(get_enabled_assets())}")
        log_info(f"Check interval: {CHECK_INTERVAL_MINUTES} minutes")

        if self.test_mode:
            log_warning("TEST MODE: No actual trades will be executed")

        while True:
            try:
                summary = await self.run_once()

                if VERBOSE:
                    log_info(
                        f"Cycle complete: {summary['assets_analyzed']} analyzed, "
                        f"{summary['trades_executed']} trades"
                    )

                log_sleep(CHECK_INTERVAL_MINUTES)
                await asyncio.sleep(CHECK_INTERVAL_MINUTES * 60)

            except KeyboardInterrupt:
                log_info("Interrupted by user. Exiting.")
                break
            except Exception as e:
                log_error("trading loop", e)
                log_info("Retrying in 60 seconds...")
                await asyncio.sleep(60)


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="i3-1 Trading Agent - Token Tank Experiment"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run once and exit (don't loop)",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Test mode (analyze but don't execute trades)",
    )
    return parser.parse_args()


async def main():
    """Main entry point."""
    args = parse_args()

    agent = TradingAgent(test_mode=args.test)

    if args.once:
        if VERBOSE:
            log_banner()
            print_config()
        summary = await agent.run_once()
        print(f"\nSummary: {summary}")
    else:
        await agent.run_loop()


if __name__ == "__main__":
    asyncio.run(main())
