#!/usr/bin/env python3
"""
Drift Control Runner - Pure Connors RSI-2 (Paper Trading)

Runs the control agent implementing Larry Connors' original RSI-2 strategy.
This is the REAL test: can Drift's research beat a proven public strategy?

Usage:
    python run_control.py              # Run one cycle now
    python run_control.py --loop       # Run daily at 3:55 PM ET
    python run_control.py --status     # Show paper account status

IMPORTANT:
- This uses PAPER trading keys, not live keys!
- Should run ONCE DAILY at market close (3:55 PM ET)
- Not every 15 minutes - that's not how Connors RSI-2 works

Strategy: Larry Connors RSI-2 (1993-present, 75% win rate)
- Entry: RSI(2) < 5 AND price > 200-day MA
- Exit: Price closes above 5-day MA
- No stops
"""

import os
import sys
import time
import argparse
from datetime import datetime
from pathlib import Path
import pytz

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
from trading.alpaca_client import get_market_status


def get_et_time():
    """Get current time in Eastern timezone."""
    et = pytz.timezone('America/New_York')
    return datetime.now(et)


def minutes_until_close():
    """Calculate minutes until 3:55 PM ET."""
    et = get_et_time()
    target_hour = 15
    target_minute = 55

    target = et.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)

    if et >= target:
        # Already past 3:55 PM, wait until tomorrow
        return None

    delta = target - et
    return int(delta.total_seconds() / 60)


def is_weekday():
    """Check if today is a weekday."""
    return get_et_time().weekday() < 5  # Mon-Fri = 0-4


def run_once(cycle_number: int = 1):
    """Run one trading cycle."""
    print(f"\n{'='*60}")
    print(f"[Connors] Cycle {cycle_number} - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"[Connors] Strategy: Pure Connors RSI-2 (RSI<5 + 200MA filter)")
    print(f"{'='*60}")

    agent = ControlAgent(paper=True)
    result = agent.run_cycle(cycle_number=cycle_number)

    print(f"\n[Connors] Result: {result['status']}")
    if result.get("actions"):
        for action in result["actions"]:
            print(f"  - {action.get('action', 'unknown').upper()} {action.get('symbol')}")
    else:
        print("  - No trades")

    return result


def run_loop():
    """Run once daily at 3:55 PM ET."""
    print("[Connors] Starting Pure Connors RSI-2 daily loop...")
    print(f"[Connors] Using PAPER API key: {os.getenv('ALPACA_API_KEY', '')[:10]}...")
    print("[Connors] Will run once daily at 3:55 PM ET")
    print()

    cycle = 1

    while True:
        try:
            et_now = get_et_time()

            # Skip weekends
            if not is_weekday():
                print(f"[Connors] Weekend - sleeping until Monday...")
                # Sleep for 1 hour, check again
                time.sleep(3600)
                continue

            # Check if it's time to run (3:55 PM ET)
            mins_until = minutes_until_close()

            if mins_until is None:
                # Already past 3:55 PM today
                print(f"[Connors] {et_now.strftime('%H:%M ET')} - Past trading window, waiting for tomorrow")
                # Sleep until next morning
                time.sleep(3600)  # Check again in an hour
                continue

            if mins_until <= 5:
                # Within 5 minutes of target time - run now
                print(f"[Connors] {et_now.strftime('%H:%M ET')} - Running daily cycle...")
                run_once(cycle_number=cycle)
                cycle += 1

                # Sleep until tomorrow (wait at least 18 hours)
                print(f"[Connors] Done. Sleeping until tomorrow 3:55 PM ET...")
                time.sleep(18 * 3600)
            else:
                # Wait until closer to target time
                sleep_mins = max(mins_until - 5, 1)
                print(f"[Connors] {et_now.strftime('%H:%M ET')} - {mins_until} minutes until 3:55 PM. Sleeping {sleep_mins} min...")
                time.sleep(sleep_mins * 60)

        except KeyboardInterrupt:
            print("\n[Connors] Stopped by user")
            break
        except Exception as e:
            print(f"[Connors] Error: {e}")
            time.sleep(300)  # Wait 5 min on error


def show_status():
    """Show paper account status."""
    agent = ControlAgent(paper=True)

    print("\n[Connors] Pure Connors RSI-2 Control Experiment")
    print("=" * 50)
    print("Strategy: RSI(2) < 5 AND price > 200-day MA")
    print("Exit: Price closes above 5-day MA")
    print("No stops. Daily timeframe only.")
    print("=" * 50)

    try:
        account = agent.alpaca.get_account()
        positions = agent.alpaca.get_positions()

        print(f"\nPortfolio Value: ${account['portfolio_value']:,.2f}")
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
    parser = argparse.ArgumentParser(description="Pure Connors RSI-2 Control Experiment")
    parser.add_argument("--loop", action="store_true", help="Run daily at 3:55 PM ET")
    parser.add_argument("--status", action="store_true", help="Show account status")

    args = parser.parse_args()

    if args.status:
        show_status()
    elif args.loop:
        run_loop()
    else:
        run_once()
