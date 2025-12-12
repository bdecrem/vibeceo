#!/usr/bin/env python3
"""
Drift (i3-2) - Runner Script

Runs the trading agent on a schedule during market hours.

Usage:
    python run.py              # Run once
    python run.py --loop       # Run continuously every 15 minutes
    python run.py --status     # Show status only
    python run.py --test       # Test connections
"""

import argparse
import time
import sys
import os
from datetime import datetime
import pytz

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import SCAN_INTERVAL_MINUTES, VERBOSE, TRADING_MODE, print_config
from agent import DriftAgent
from trading.alpaca_client import is_market_open, get_market_status, test_connection
from utils.pdt_tracker import PDTTracker
from utils.journal import TradeJournal

ET = pytz.timezone('America/New_York')


def run_once(agent: DriftAgent) -> dict:
    """Run a single trading cycle."""
    print(f"\n[{datetime.now(ET).strftime('%H:%M:%S ET')}] Running cycle...")
    result = agent.run_cycle()
    print(f"[{datetime.now(ET).strftime('%H:%M:%S ET')}] {result['status']}: {result['message']}")
    return result


def run_loop(agent: DriftAgent):
    """Run trading loop 24/7 - stocks during market hours, crypto after hours."""
    print("\n" + "=" * 60)
    print("DRIFT - CONTINUOUS TRADING MODE")
    print("=" * 60)
    print(f"Interval: {SCAN_INTERVAL_MINUTES} minutes")
    print("Stocks: Market hours | Crypto: 24/7")
    print("Press Ctrl+C to stop")
    print("=" * 60)

    cycle_count = 0

    try:
        while True:
            market = get_market_status()
            cycle_count += 1

            if market["is_open"]:
                # Market open: scan stocks
                print(f"\n--- Cycle {cycle_count} (stocks) ---")
                result = agent.run_cycle(crypto_only=False)
            else:
                # Market closed: scan crypto only
                print(f"\n--- Cycle {cycle_count} (crypto) ---")
                result = agent.run_cycle(crypto_only=True)

            print(f"[{datetime.now(ET).strftime('%H:%M:%S ET')}] {result['status']}: {result['message']}")

            # Wait for next cycle
            time.sleep(SCAN_INTERVAL_MINUTES * 60)

    except KeyboardInterrupt:
        print("\n\nStopped by user.")
        show_status(agent)


def show_status(agent: DriftAgent):
    """Show current status."""
    status = agent.get_status()

    print("\n" + "=" * 60)
    print("DRIFT STATUS")
    print("=" * 60)
    print(f"Mode: {status['mode']}")
    print(f"Market: {'OPEN' if status['market']['is_open'] else 'CLOSED'}")
    print(f"Time: {status['market']['current_time_et']}")
    print("-" * 40)
    print(f"Portfolio Value: ${status['portfolio_value']:,.2f}")
    print(f"Cash: ${status['cash']:,.2f}")
    print(f"Positions: {status['positions']}")
    print(f"PDT Remaining: {status['pdt_remaining']}/3")
    print("-" * 40)
    print(f"Today's Trades: {status['today_trades']}")
    print(f"Today's P&L: ${status['today_pnl']:,.2f}")
    print("=" * 60)


def run_tests():
    """Test all connections."""
    print("\n" + "=" * 60)
    print("DRIFT - CONNECTION TESTS")
    print("=" * 60)

    # Test Alpaca
    print("\n1. Testing Alpaca connection...")
    alpaca_ok = test_connection()

    # Test PDT tracker
    print("\n2. Testing PDT tracker...")
    try:
        pdt = PDTTracker()
        status = pdt.get_status()
        print(f"   ✅ PDT tracker OK")
        print(f"   Day trades remaining: {status['day_trades_remaining']}")
    except Exception as e:
        print(f"   ❌ PDT tracker error: {e}")

    # Test Journal
    print("\n3. Testing Journal...")
    try:
        journal = TradeJournal()
        summary = journal.get_today_summary()
        print(f"   ✅ Journal OK")
        print(f"   Today's entries: {summary['total_entries']}")
    except Exception as e:
        print(f"   ❌ Journal error: {e}")

    # Test Anthropic
    print("\n4. Testing Anthropic API...")
    try:
        import anthropic
        client = anthropic.Anthropic()
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=50,
            messages=[{"role": "user", "content": "Say 'API working' in 3 words or less"}],
        )
        print(f"   ✅ Anthropic API OK")
        print(f"   Response: {response.content[0].text}")
    except ImportError:
        print("   ❌ anthropic package not installed")
    except Exception as e:
        print(f"   ❌ Anthropic API error: {e}")

    print("\n" + "=" * 60)
    print("Tests complete.")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Drift Trading Agent")
    parser.add_argument("--loop", action="store_true", help="Run continuously")
    parser.add_argument("--status", action="store_true", help="Show status only")
    parser.add_argument("--test", action="store_true", help="Test connections")
    parser.add_argument("--live", action="store_true", help="Use live trading (DANGER)")

    args = parser.parse_args()

    if args.test:
        run_tests()
        return

    # Initialize agent - use config to determine paper vs live
    paper = (TRADING_MODE != "live")
    if not paper:
        print("\n⚠️  LIVE TRADING MODE - REAL MONEY ⚠️")

    agent = DriftAgent(paper=paper)

    if args.status:
        show_status(agent)
    elif args.loop:
        run_loop(agent)
    else:
        # Single run
        show_status(agent)
        if is_market_open():
            run_once(agent)
        else:
            print("\nMarket closed. Use --loop to wait for market open.")


if __name__ == "__main__":
    main()
