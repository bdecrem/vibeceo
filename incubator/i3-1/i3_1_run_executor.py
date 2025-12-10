#!/usr/bin/env python3
"""
i3-1 Daily Executor Runner

Runs the mechanical trading executor based on weekly strategy + price rules.
Reads state/strategy.json and executes trades via Alpaca.

Usage:
    python i3_1_run_executor.py --once          # Run once
    python i3_1_run_executor.py --once --test   # Test mode (no actual trades)
    python i3_1_run_executor.py --loop          # Continuous loop
    python i3_1_run_executor.py --status        # Show current status
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
    STRATEGY_MODE,
    CRYPTO_CHECK_INTERVAL_HOURS,
    STOCK_CHECK_TIMES,
    VERBOSE,
    get_enabled_assets,
    print_config,
    STRATEGY_FILE,
)
from utils.logger import (
    log_banner,
    log_decision,
    log_portfolio,
    log_sleep,
    log_error,
    log_info,
    log_success,
    log_warning,
)
from utils.market_hours import (
    is_trading_time,
    is_crypto,
    should_check_stocks_now,
    get_market_status,
)
from trading.alpaca_client import AlpacaClient
from modes.base import get_mode
from modes.mode_d_executor import get_executor_status


class DailyExecutor:
    """
    Daily Executor - runs the Mode D trading logic.
    """

    def __init__(self, test_mode: bool = False):
        self.test_mode = test_mode
        self.client = AlpacaClient(paper=True)  # Always paper for now
        self.mode = get_mode("D")  # Force Mode D
        self.trades_today = 0
        self.last_trade_date = None

    async def run_once(self) -> dict:
        """
        Run one iteration of the executor.

        Returns summary of actions taken.
        """
        summary = {
            "timestamp": datetime.now().isoformat(),
            "mode": "D (Executor)",
            "assets_analyzed": 0,
            "trades_executed": 0,
            "decisions": [],
        }

        # Reset daily counter if new day
        today = datetime.now().date()
        if self.last_trade_date != today:
            self.trades_today = 0
            self.last_trade_date = today

        # Get portfolio state
        positions = self.client.get_positions()
        cash = self.client.get_cash()
        portfolio_value = self.client.get_portfolio_value()

        if VERBOSE:
            log_portfolio(positions, cash, portfolio_value)

        # Get all enabled assets
        all_assets = get_enabled_assets()

        # Filter to tradeable assets (check market hours)
        tradeable_assets = [a for a in all_assets if is_trading_time(a)]

        if not tradeable_assets:
            log_info("No assets currently tradeable (markets closed)")
            return summary

        log_info(f"Analyzing {len(tradeable_assets)} tradeable assets...")

        # Analyze each asset
        for asset in tradeable_assets:
            summary["assets_analyzed"] += 1

            try:
                decision = await self.mode.analyze(asset, positions, cash)

                if VERBOSE:
                    log_decision(
                        action=decision["signal"],
                        asset=decision["asset"],
                        reasoning=decision["reasoning"],
                        confidence=decision["confidence"],
                        mode="D (Executor)",
                    )

                summary["decisions"].append(decision)

                # Execute if not HOLD and not test mode
                if decision["signal"] != "HOLD" and not self.test_mode:
                    trade_result = await self._execute_trade(
                        decision, cash, portfolio_value
                    )
                    if trade_result:
                        summary["trades_executed"] += 1
                        # Refresh cash after trade
                        cash = self.client.get_cash()

                        # TODO: Send SMS notification
                        await self._send_trade_notification(decision, trade_result)

            except Exception as e:
                log_error(f"analyzing {asset}", e)

        return summary

    async def _execute_trade(self, decision: dict, cash: float, portfolio_value: float) -> dict:
        """Execute a trade based on decision."""
        signal = decision["signal"]
        asset = decision["asset"]
        reasoning = decision["reasoning"]

        try:
            if signal == "BUY":
                # Position sizing: 20% of portfolio per position
                max_spend = portfolio_value * 0.20
                spend_amount = min(max_spend, cash * 0.9)

                if spend_amount < 10:
                    log_warning(f"Insufficient funds for {asset}")
                    return None

                log_info(f"Executing BUY: ${spend_amount:.2f} of {asset}")
                result = self.client.buy(asset, spend_amount, reasoning)

                if result:
                    self.trades_today += 1
                    log_success(f"BUY order: {result['id']}")
                    return result

            elif signal == "SELL":
                log_info(f"Executing SELL: all {asset}")
                result = self.client.sell(asset, reason=reasoning)

                if result:
                    self.trades_today += 1
                    log_success(f"SELL order: {result['id']}")
                    return result

        except Exception as e:
            log_error(f"executing {signal} {asset}", e)

        return None

    async def _send_trade_notification(self, decision: dict, trade_result: dict):
        """Send SMS notification for executed trade."""
        from utils.sms_notifier import send_trade_alert, is_sms_configured

        if not is_sms_configured():
            log_info(f"📱 SMS skipped (not configured): {decision['signal']} {decision['asset']}")
            return

        send_trade_alert(
            signal=decision['signal'],
            asset=decision['asset'],
            reasoning=decision['reasoning'],
            confidence=decision['confidence'],
            order_id=trade_result.get('id'),
        )

    async def run_loop(self):
        """
        Run the executor in continuous loop.

        Checks crypto every CRYPTO_CHECK_INTERVAL_HOURS.
        Checks stocks at STOCK_CHECK_TIMES.
        """
        log_banner()
        print_config()

        log_info(f"Starting Daily Executor (Mode D)")
        log_info(f"Crypto check interval: {CRYPTO_CHECK_INTERVAL_HOURS} hours")
        log_info(f"Stock check times: {', '.join(STOCK_CHECK_TIMES)} ET")

        if self.test_mode:
            log_warning("TEST MODE: No actual trades will be executed")

        last_crypto_check = None
        check_interval_seconds = CRYPTO_CHECK_INTERVAL_HOURS * 3600

        while True:
            try:
                now = datetime.now()
                should_check = False
                reason = ""

                # Check if we should run crypto analysis
                if last_crypto_check is None:
                    should_check = True
                    reason = "Initial check"
                elif (now - last_crypto_check).seconds >= check_interval_seconds:
                    should_check = True
                    reason = f"{CRYPTO_CHECK_INTERVAL_HOURS}h interval"

                # Check if we should run stock analysis
                if should_check_stocks_now(STOCK_CHECK_TIMES):
                    should_check = True
                    reason = "Stock check time"

                if should_check:
                    log_info(f"Running check: {reason}")
                    summary = await self.run_once()
                    last_crypto_check = now

                    log_info(
                        f"Cycle complete: {summary['assets_analyzed']} analyzed, "
                        f"{summary['trades_executed']} trades"
                    )

                # Sleep for 5 minutes between checks
                log_sleep(5)
                await asyncio.sleep(300)

            except KeyboardInterrupt:
                log_info("Interrupted. Exiting.")
                break
            except Exception as e:
                log_error("executor loop", e)
                log_info("Retrying in 60 seconds...")
                await asyncio.sleep(60)


def show_status():
    """Show current executor status."""
    status = get_executor_status()
    market = get_market_status()

    print("\n" + "=" * 60)
    print("i3-1 DAILY EXECUTOR STATUS")
    print("=" * 60)

    print(f"\n📋 Strategy:")
    print(f"   Loaded: {'✅' if status['strategy_loaded'] else '❌'}")
    print(f"   Valid:  {'✅' if status['strategy_valid'] else '❌'}")
    print(f"   Regime: {status['market_regime']}")
    print(f"   Thesis: {status['thesis']}")
    print(f"   Focus:  {', '.join(status['focus_assets'][:5])}")

    print(f"\n📈 Market:")
    print(f"   Open:   {'✅' if market['is_open'] else '❌'}")
    print(f"   Day:    {market.get('weekday', 'N/A')}")
    print(f"   Time:   {market.get('current_time_et', 'N/A')}")

    if not market['is_open'] and 'next_open' in market:
        print(f"   Next:   {market['next_open']}")

    print("\n" + "=" * 60)


def parse_args():
    parser = argparse.ArgumentParser(
        description="i3-1 Daily Executor - Trade based on weekly strategy"
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run once and exit",
    )
    parser.add_argument(
        "--loop",
        action="store_true",
        help="Run in continuous loop",
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Test mode (analyze but don't trade)",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show current status and exit",
    )
    return parser.parse_args()


async def main():
    args = parse_args()

    if args.status:
        show_status()
        return

    if not args.once and not args.loop:
        print("Specify --once or --loop")
        print("Use --status to see current state")
        return

    executor = DailyExecutor(test_mode=args.test)

    if args.once:
        log_banner()
        print_config()
        summary = await executor.run_once()
        print(f"\nSummary: {summary}")
    else:
        await executor.run_loop()


if __name__ == "__main__":
    asyncio.run(main())
