#!/usr/bin/env python3
"""
Drift Control Runner - Paper Trading Blind RSI Experiment

Runs the control agent (blind RSI, no research) for paper trading.
Used to compare against Drift's research-based live trading.

Usage:
    python run_control.py          # Run one cycle
    python run_control.py --loop   # Run continuously every 15 min
    python run_control.py --status # Show paper account status

IMPORTANT: This uses PAPER trading keys, not live keys!
"""

import os
import sys
import time
import argparse
from datetime import datetime
from pathlib import Path

# ============ OVERRIDE API KEYS FOR PAPER TRADING ============
# Must happen BEFORE any imports that use config.py

# Load from sms-bot/.env.local
env_file = Path(__file__).parent.parent.parent / "sms-bot" / ".env.local"
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            if line.strip() and not line.startswith("#") and "=" in line:
                key, value = line.strip().split("=", 1)
                if key == "ALPACA_API_KEY_PAPER":
                    os.environ["ALPACA_API_KEY"] = value
                elif key == "ALPACA_SECRET_KEY_PAPER":
                    os.environ["ALPACA_SECRET_KEY"] = value

# Verify we have paper keys
api_key = os.getenv("ALPACA_API_KEY", "")
if not api_key.startswith("PK"):
    print("ERROR: Expected paper API key (starts with PK), got:", api_key[:10] if api_key else "None")
    print("Make sure ALPACA_API_KEY_PAPER is set in sms-bot/.env.local")
    sys.exit(1)

# Now we can import (will use paper keys)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from control_agent import ControlAgent
from config import SCAN_INTERVAL_MINUTES
from trading.alpaca_client import get_market_status


def run_once(cycle_number: int = 1):
    """Run one trading cycle."""
    print(f"\n{'='*60}")
    print(f"[Control] Cycle {cycle_number} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")

    agent = ControlAgent(paper=True)
    result = agent.run_cycle(cycle_number=cycle_number)

    print(f"\n[Control] Result: {result['status']}")
    if result.get("actions"):
        for action in result["actions"]:
            print(f"  - {action.get('action', 'unknown').upper()} {action.get('symbol')}")

    return result


def run_loop():
    """Run continuously every 15 minutes."""
    print("[Control] Starting paper trading loop...")
    print(f"[Control] Using PAPER API key: {os.getenv('ALPACA_API_KEY', '')[:10]}...")
    print(f"[Control] Scan interval: {SCAN_INTERVAL_MINUTES} minutes")

    cycle = 1
    while True:
        try:
            run_once(cycle_number=cycle)
            cycle += 1

            # Wait for next cycle
            print(f"\n[Control] Sleeping {SCAN_INTERVAL_MINUTES} minutes...")
            time.sleep(SCAN_INTERVAL_MINUTES * 60)

        except KeyboardInterrupt:
            print("\n[Control] Stopped by user")
            break
        except Exception as e:
            print(f"[Control] Error: {e}")
            time.sleep(60)  # Wait 1 min on error


def show_status():
    """Show paper account status."""
    agent = ControlAgent(paper=True)

    print("\n[Control] Paper Account Status")
    print("=" * 40)

    try:
        account = agent.alpaca.get_account()
        positions = agent.alpaca.get_positions()

        print(f"Portfolio Value: ${account['portfolio_value']:,.2f}")
        print(f"Cash: ${account['cash']:,.2f}")
        print(f"Buying Power: ${account['buying_power']:,.2f}")

        if positions:
            print(f"\nPositions ({len(positions)}):")
            for p in positions:
                print(f"  {p['symbol']}: ${p['market_value']:.2f} ({p['unrealized_plpc']:+.1f}%)")
        else:
            print("\nNo positions")

        market = get_market_status()
        print(f"\nMarket: {'OPEN' if market['is_open'] else 'CLOSED'}")
        print(f"Time: {market['current_time_et']}")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Drift Control - Blind RSI Paper Trader")
    parser.add_argument("--loop", action="store_true", help="Run continuously")
    parser.add_argument("--status", action="store_true", help="Show account status")

    args = parser.parse_args()

    if args.status:
        show_status()
    elif args.loop:
        run_loop()
    else:
        run_once()
